import test from "node:test";
import assert from "node:assert/strict";
import {
  D1_DATABASE_CAPABILITIES,
  SQLITE_DATABASE_CAPABILITIES,
  requireDatabaseCapability,
} from "../src/kernel/database/adapter.js";
import { D1DatabaseAdapter } from "../src/kernel/database/d1.js";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";

test("database contract exposes SQLite and D1 capability differences", () => {
  assert.equal(SQLITE_DATABASE_CAPABILITIES.execution, "synchronous");
  assert.equal(SQLITE_DATABASE_CAPABILITIES.callback_transactions, true);
  assert.equal(SQLITE_DATABASE_CAPABILITIES.wal_checkpoint, true);
  assert.equal(D1_DATABASE_CAPABILITIES.execution, "asynchronous");
  assert.equal(D1_DATABASE_CAPABILITIES.callback_transactions, false);
  assert.equal(D1_DATABASE_CAPABILITIES.wal_checkpoint, false);

  const sqlite = new SqliteDatabase(":memory:");
  try {
    requireDatabaseCapability(sqlite, "callback_transactions");
    requireDatabaseCapability(sqlite, "wal_checkpoint");
  } finally {
    sqlite.close();
  }

  const d1 = new D1DatabaseAdapter();
  assert.throws(() => requireDatabaseCapability(d1, "callback_transactions"));
  assert.throws(() => d1.transaction(), /does not support.*callback transactions/i);
});

test("D1 skeleton is off by default and fails clearly without a binding", async () => {
  const d1 = new D1DatabaseAdapter();
  await assert.rejects(d1.exec("SELECT 1"), /requires an explicit D1 binding/i);
});
