import test from "node:test";
import assert from "node:assert/strict";
import { applyNumberedMigrations } from "../src/kernel/database/migrations.js";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";

const migrations = [
  {
    id: "0001-create-widget",
    checksum: "sha256:create-widget",
    up(db: SqliteDatabase) {
      db.exec("CREATE TABLE widgets (id TEXT PRIMARY KEY)");
    },
  },
  {
    id: "0002-add-widget-name",
    checksum: "sha256:add-widget-name",
    up(db: SqliteDatabase) {
      db.exec("ALTER TABLE widgets ADD COLUMN name TEXT");
    },
  },
] as const;

test("numbered migrations report no pending work after an idempotent rerun", () => {
  const db = new SqliteDatabase(":memory:");
  try {
    const first = applyNumberedMigrations({
      db,
      componentId: "example.widgets",
      componentVersion: "1.0.0",
      migrations,
    });
    assert.deepEqual(first, {
      applied: ["0001-create-widget", "0002-add-widget-name"],
      pending: 0,
    });

    const second = applyNumberedMigrations({
      db,
      componentId: "example.widgets",
      componentVersion: "1.0.0",
      migrations,
    });
    assert.deepEqual(second, { applied: [], pending: 0 });

    const recorded = db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM mw_migrations WHERE component_id=?",
      ["example.widgets"],
    );
    assert.equal(recorded?.count, 2);
  } finally {
    db.close();
  }
});
