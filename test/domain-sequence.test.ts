import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { nextDomainSequence } from "../src/kernel/database/sequence.js";

test("domain sequence allocation is collision-safe across database handles", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-sequence-"));
  const path = join(dir, "orders.sqlite");
  const first = new SqliteDatabase(path);
  const second = new SqliteDatabase(path);

  try {
    const values = new Set<number>();
    const references = new Set<string>();
    for (let index = 0; index < 100; index += 1) {
      const db = index % 2 === 0 ? first : second;
      const allocated = nextDomainSequence(db, {
        key: "order",
        prefix: "ORD-",
        padding: 5,
        start: 1,
      });
      assert.equal(values.has(allocated.value), false, `duplicate numeric value ${allocated.value}`);
      assert.equal(references.has(allocated.reference), false, `duplicate reference ${allocated.reference}`);
      values.add(allocated.value);
      references.add(allocated.reference);
    }

    assert.equal(values.size, 100);
    assert.equal(Math.min(...values), 1);
    assert.equal(Math.max(...values), 100);
    assert.ok(references.has("ORD-00001"));
    assert.ok(references.has("ORD-00100"));
  } finally {
    first.close();
    second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sequence state is domain-local and definitions fail closed", () => {
  const catalog = new SqliteDatabase(":memory:");
  const billing = new SqliteDatabase(":memory:");

  try {
    assert.equal(nextDomainSequence(catalog, { key: "invoice", start: 10 }).value, 10);
    assert.equal(nextDomainSequence(catalog, { key: "invoice", start: 10 }).value, 11);
    assert.equal(nextDomainSequence(billing, { key: "invoice", start: 10 }).value, 10);

    assert.throws(() => nextDomainSequence(catalog, { key: "INVALID KEY" }), /Invalid sequence key/);
    assert.throws(() => nextDomainSequence(catalog, { key: "ticket", padding: 33 }), /padding/);
  } finally {
    catalog.close();
    billing.close();
  }
});
