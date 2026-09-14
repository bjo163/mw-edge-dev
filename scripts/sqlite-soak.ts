import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";

const durationSeconds = Number(process.env.MW_SQLITE_SOAK_SECONDS ?? 120);
if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 3600) {
  throw new Error("MW_SQLITE_SOAK_SECONDS must be > 0 and <= 3600");
}

const maxWalBytes = Number(process.env.MW_SQLITE_SOAK_MAX_WAL_BYTES ?? 32 * 1024 * 1024);
const maxDbBytes = Number(process.env.MW_SQLITE_SOAK_MAX_DB_BYTES ?? 16 * 1024 * 1024);
const maxRssGrowthBytes = Number(process.env.MW_SQLITE_SOAK_MAX_RSS_GROWTH_BYTES ?? 128 * 1024 * 1024);
const root = mkdtempSync(join(tmpdir(), "mw-edge-sqlite-soak-"));
const path = join(root, "soak.db");
const walPath = path + "-wal";
const size = (file: string): number => existsSync(file) ? statSync(file).size : 0;
const db = new SqliteDatabase(path, { busyTimeoutMs: 1000, walAutoCheckpointPages: 64 });

let operations = 0;
let checkpoints = 0;
let maxObservedWalBytes = 0;
const rssStart = process.memoryUsage().rss;
let maxRss = rssStart;
const started = performance.now();

try {
  db.exec("CREATE TABLE parent(id INTEGER PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL)");
  db.exec("CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id), observed INTEGER NOT NULL)");

  while (performance.now() - started < durationSeconds * 1000) {
    const id = (operations % 256) + 1;
    db.transaction(() => {
      db.run(
        "INSERT INTO parent(id,value,version) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET value=excluded.value, version=parent.version+1",
        [id, `parent-${operations}`],
      );
      db.run(
        "INSERT INTO child(id,parent_id,observed) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, observed=excluded.observed",
        [id, id, operations],
      );
    });

    const row = db.get<{ observed: number }>("SELECT observed FROM child WHERE id=?", [id]);
    if (!row || Number(row.observed) !== operations) throw new Error(`Read-after-write mismatch at operation ${operations}`);

    operations += 1;
    if (operations % 250 === 0) {
      const checkpoint = db.checkpoint("PASSIVE");
      if (checkpoint.busy !== 0) throw new Error(`Unexpected busy checkpoint at operation ${operations}`);
      checkpoints += 1;
    }

    maxObservedWalBytes = Math.max(maxObservedWalBytes, size(walPath));
    maxRss = Math.max(maxRss, process.memoryUsage().rss);
  }

  const quick = db.get<{ quick_check: string }>("PRAGMA quick_check");
  const foreignKeyViolations = db.all("PRAGMA foreign_key_check").length;
  const finalCheckpoint = db.checkpoint("TRUNCATE");
  const finalWalBytes = size(walPath);
  const databaseBytes = size(path);
  const rssGrowthBytes = Math.max(0, maxRss - rssStart);

  const checks = {
    workload_completed: operations > 0,
    quick_check: quick?.quick_check === "ok",
    foreign_keys: foreignKeyViolations === 0,
    checkpoint_not_busy: finalCheckpoint.busy === 0,
    wal_bounded: maxObservedWalBytes <= maxWalBytes && finalWalBytes <= 1024 * 1024,
    database_bounded: databaseBytes <= maxDbBytes,
    rss_bounded: rssGrowthBytes <= maxRssGrowthBytes,
  };
  const ok = Object.values(checks).every(Boolean);

  console.log(JSON.stringify({
    status: ok ? "ok" : "regression",
    duration_seconds: Number(((performance.now() - started) / 1000).toFixed(2)),
    operations,
    checkpoints,
    working_set_rows: 256,
    thresholds: {
      max_wal_bytes: maxWalBytes,
      max_database_bytes: maxDbBytes,
      max_rss_growth_bytes: maxRssGrowthBytes,
    },
    observations: {
      max_wal_bytes: maxObservedWalBytes,
      final_wal_bytes: finalWalBytes,
      database_bytes: databaseBytes,
      rss_growth_bytes: rssGrowthBytes,
      quick_check: quick?.quick_check ?? "missing",
      foreign_key_violations: foreignKeyViolations,
      final_checkpoint: finalCheckpoint,
    },
    checks,
  }));

  if (!ok) throw new Error("SQLite soak regression threshold failed");
} finally {
  db.close();
  rmSync(root, { recursive: true, force: true });
}
