import test from "node:test";
import assert from "node:assert/strict";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { ensureMetaTables } from "../src/kernel/schema.js";
import { applyReferenceSeedUpgrade } from "../src/kernel/seeds/reference-upgrade.js";

test("reference seed upgrades are forward-only and retain immutable history", () => {
  const db = new SqliteDatabase(":memory:");
  ensureMetaTables(db);
  let applied = 0;

  try {
    const v1 = applyReferenceSeedUpgrade({
      db,
      componentId: "mw.foundation",
      seedId: "currency",
      version: "1",
      payload: [{ code: "IDR" }],
      apply: () => { applied += 1; },
    });
    assert.equal(v1.applied, true);
    assert.equal(v1.previousVersion, null);

    const v2 = applyReferenceSeedUpgrade({
      db,
      componentId: "mw.foundation",
      seedId: "currency",
      version: "2",
      payload: [{ code: "IDR" }, { code: "USD" }],
      apply: () => { applied += 1; },
    });
    assert.equal(v2.applied, true);
    assert.equal(v2.previousVersion, "1");
    assert.equal(applied, 2);

    const history = db.all<{ seed_version: string }>(
      "SELECT seed_version FROM mw_seed_history WHERE component_id=? AND seed_id=? ORDER BY seed_version",
      ["mw.foundation", "currency"],
    );
    assert.deepEqual(history.map((row) => row.seed_version), ["1", "2"]);

    const historicalCheck = applyReferenceSeedUpgrade({
      db,
      componentId: "mw.foundation",
      seedId: "currency",
      version: "1",
      payload: [{ code: "IDR" }],
      apply: () => { applied += 1; },
    });
    assert.equal(historicalCheck.applied, false);
    assert.equal(applied, 2, "verifying historical checksum must not re-run old seed");

    assert.throws(
      () => applyReferenceSeedUpgrade({
        db,
        componentId: "mw.foundation",
        seedId: "currency",
        version: "0",
        payload: [],
        apply: () => { applied += 1; },
      }),
      /forward-only/i,
    );

    assert.throws(
      () => applyReferenceSeedUpgrade({
        db,
        componentId: "mw.foundation",
        seedId: "currency",
        version: "1",
        payload: [{ code: "IDR", changed: true }],
        apply: () => { applied += 1; },
      }),
      /checksum drift/i,
    );
  } finally {
    db.close();
  }
});

test("reference seed versions and prior seed mode fail closed", () => {
  const db = new SqliteDatabase(":memory:");
  ensureMetaTables(db);

  try {
    assert.throws(
      () => applyReferenceSeedUpgrade({
        db,
        componentId: "mw.foundation",
        seedId: "timezone",
        version: "next",
        payload: [],
        apply: () => undefined,
      }),
      /Invalid reference seed version/,
    );

    db.run(
      "INSERT INTO mw_seed_history(component_id,seed_id,seed_version,mode,checksum) VALUES(?,?,?,?,?)",
      ["mw.foundation", "country", "1", "required", "legacy"],
    );
    assert.throws(
      () => applyReferenceSeedUpgrade({
        db,
        componentId: "mw.foundation",
        seedId: "country",
        version: "2",
        payload: [],
        apply: () => undefined,
      }),
      /previously applied as required/,
    );
  } finally {
    db.close();
  }
});
