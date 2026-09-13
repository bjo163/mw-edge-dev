import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import type { DbRow } from "../src/kernel/types.js";

const durationSeconds = Number(process.env.MW_SQLITE_SOAK_SECONDS ?? 120);
if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
  throw new Error("MW_SQLITE_SOAK_SECONDS must be a positive number");
}

const maxWalBytes = Number(process.env.MW_SQLITE_SOAK_MAX_WAL_BYTES ?? 32 * 1024 * 1024);
const maxRssGrowthBytes = Number(process.env.MW_SQLITE_SOAK_MAX_RSS_GROWTH_BYTES ?? 96 * 1024 * 1024);
const root = mkdtempSync(join(tmpdir(), "mw-edge-sqlite-soak-"));
const path = join(root, "soak.db");
const walPath = path + "-wal";
const db = new SqliteDatabase(path, { busyTimeoutMs: 1000, walAutoCheckpointPages: 64 });

let operations = 0;
let maxObservedWalBytes = 0;
const rssStart = process.memoryUsage().rss;
let maxRss = rssStart;
const started = performance.now();

try {
  db.exec("CREATE TABLE parent(id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
  db.exec("CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id), value TEXT NOT NULL)");

  while (performance.now() - started < durationSeconds * 1000) {
    const id = operations + 1;
    db.transaction(() => {
      db.run("INSERT INTO parent(id,value) VALUES(?,?)", [id, `parent-${id}`]);
      db.run("INSERT INTO child(id,parent_id,value) VALUES(?,?,?)", [id, id, `child-${id}`]);
    });

    const row = db.get<{ value: string }>("SELECT value FROM child WHERE id=?", [id]);
    if (row?.value !== `child-${id}`) throw new Error(`Read-after-write mismatch at operation ${id}`);

    operations += 1;
    if (operations % 100 === 0) {
      const checkpoint = db.checkpoint("PASSIVE");
      if (checkpoint.busy !== 0) throw new Error(`Unexpected busy checkpoint at operation ${operations}`);
    }

    if (existsSync(walPath)) maxObservedWalBytes = Math.max(maxObservedWalBytes, statSync(walPath).size);
    maxRss = Math.max(maxRss, process.memoryUsage().rss);
  }

  const quickRow = db.get<DbRow>("PRAGMA quick_check");
  const quickCheck = String(Object.values(quickRow ?? {})[0] ?? "unknown");
  const foreignKeyViolations = db.all("PRAGMA foreign_key_check").length;
  const finalCheckpoint = db.checkpoint("TRUNCATE");
  const finalWalBytes = existsSync(walPath) ? statSync(walPath).size : 0;
  const rssGrowthBytes = maxRss - rssStart;

  const checks = {
    workload_completed: operations > 0,
    quick_check: quickCheck === "ok",
    foreign_keys: foreignKeyViolations === 0,
    checkpoint_not_busy: finalCheckpoint.busy === 0,
    wal_bounded: maxObservedWalBytes <= maxWalBytes && finalWalBytes <= maxWalBytes,
    rss_bounded: rssGrowthBytes <= maxRssGrowthBytes,
  };
  const ok = Object.values(checks).every(Boolean);

  console.log(JSON.stringify({
    status: ok ? "ok" : "regression",
    duration_seconds: Math.round(((performance.now() - started) / 1000) * 100) / 100,
    operations,
    thresholds: {
      max_wal_bytes: maxWalBytes,
      max_rss_growth_bytes: maxRssGrowthBytes,
    },
    observations: {
      max_wal_bytes: maxObservedWalBytes,
      final_wal_bytes: finalWalBytes,
      rss_start_bytes: rssStart,
      max_rss_bytes: maxRss,
      rss_growth_bytes: rssGrowthBytes,
      quick_check: quickCheck,
      foreign_key_violations: foreignKeyViolations,
      final_checkpoint: finalCheckpoint,
    },
    checks,
  }, null, 2));

  if (!ok) process.exitCode = 1;
} finally {
  db.close();
  rmSync(root, { recursive: true, force: true });
}
