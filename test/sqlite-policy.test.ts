import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";

function pragmaValue(row: Record<string, unknown> | undefined): number {
  return Number(Object.values(row ?? {})[0] ?? -1);
}

test("sqlite configures explicit busy timeout and WAL checkpoint policy", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-sqlite-"));
  const path = join(dir, "policy.sqlite");
  const db = new SqliteDatabase(path, { busyTimeoutMs: 37, walAutoCheckpointPages: 29 });

  try {
    assert.equal(pragmaValue(db.get("PRAGMA busy_timeout")), 37);
    assert.equal(pragmaValue(db.get("PRAGMA wal_autocheckpoint")), 29);
    assert.equal(String(Object.values(db.get("PRAGMA journal_mode") ?? {})[0]).toLowerCase(), "wal");

    db.exec("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
    db.run("INSERT INTO sample(value) VALUES (?)", ["one"]);
    const checkpoint = db.checkpoint("PASSIVE");
    assert.equal(Number.isInteger(checkpoint.busy), true);
    assert.equal(Number.isInteger(checkpoint.log), true);
    assert.equal(Number.isInteger(checkpoint.checkpointed), true);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sqlite concurrent writers fail within configured busy timeout and recover", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-sqlite-lock-"));
  const path = join(dir, "lock.sqlite");
  const first = new SqliteDatabase(path, { busyTimeoutMs: 25, walAutoCheckpointPages: 16 });
  const second = new SqliteDatabase(path, { busyTimeoutMs: 25, walAutoCheckpointPages: 16 });

  try {
    first.exec("CREATE TABLE writes (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
    first.exec("BEGIN IMMEDIATE");
    first.run("INSERT INTO writes(value) VALUES (?)", ["first"]);

    const started = performance.now();
    assert.throws(
      () => second.run("INSERT INTO writes(value) VALUES (?)", ["blocked"]),
      /busy|locked/i,
    );
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 1000, `busy timeout should fail promptly, elapsed=${elapsed}ms`);

    first.exec("ROLLBACK");
    second.run("INSERT INTO writes(value) VALUES (?)", ["recovered"]);
    assert.equal(Number(second.get<{ count: number }>("SELECT COUNT(*) AS count FROM writes")?.count ?? 0), 1);
  } finally {
    try {
      first.exec("ROLLBACK");
    } catch {
      // No active transaction is fine during cleanup.
    }
    first.close();
    second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sqlite rejects nested transactions and rolls the outer transaction back", () => {
  const db = new SqliteDatabase(":memory:");
  try {
    db.exec("CREATE TABLE nested (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
    assert.throws(
      () => db.transaction(() => {
        db.run("INSERT INTO nested(value) VALUES (?)", ["outer"]);
        db.transaction(() => db.run("INSERT INTO nested(value) VALUES (?)", ["inner"]));
      }),
      /nested sqlite transactions are not supported/i,
    );
    assert.equal(Number(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM nested")?.count ?? 0), 0);

    db.transaction(() => db.run("INSERT INTO nested(value) VALUES (?)", ["after-error"]));
    assert.equal(Number(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM nested")?.count ?? 0), 1);
  } finally {
    db.close();
  }
});
