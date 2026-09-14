import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createStockMovement } from "../plugins/inventory/movements.js";

async function fixture() {
  const env = await boot({ profile: "erp", memory: true });
  env.orm.model("inventory.item").create({
    item_ref: "item-1",
    tenant_ref: "tenant-1",
    name: "Router",
    item_kind: "physical",
  });
  const locations = env.orm.model("inventory.location");
  locations.create({ location_ref: "loc-a", tenant_ref: "tenant-1", name: "A", location_kind: "warehouse" });
  locations.create({ location_ref: "loc-b", tenant_ref: "tenant-1", name: "B", location_kind: "warehouse" });
  return env;
}

const base = {
  tenant_ref: "tenant-1",
  item_ref: "item-1",
  quantity: 1,
  occurred_at: "2026-09-14T00:00:00.000Z",
} as const;

test("stock movement validates kind-specific locations before persistence", async () => {
  const env = await fixture();
  try {
    const movements = env.orm.model("inventory.stock_movement");
    assert.throws(
      () => createStockMovement(env.orm, { ...base, movement_ref: "bad-1", movement_kind: "receipt", quantity: 0, destination_location_ref: "loc-a" }),
      /quantity must be positive/,
    );
    assert.throws(
      () => createStockMovement(env.orm, { ...base, movement_ref: "bad-2", movement_kind: "receipt", source_location_ref: "loc-a", destination_location_ref: "loc-b" }),
      /receipt movement forbids source_location_ref/,
    );
    assert.throws(
      () => createStockMovement(env.orm, { ...base, movement_ref: "bad-3", movement_kind: "transfer", source_location_ref: "loc-a", destination_location_ref: "loc-a" }),
      /source and destination must differ/,
    );
    assert.throws(
      () => createStockMovement(env.orm, { ...base, movement_ref: "bad-4", movement_kind: "adjustment", source_location_ref: "loc-a", destination_location_ref: "loc-b" }),
      /adjustment movement requires exactly one location/,
    );
    assert.equal(movements.count(), 0);
  } finally {
    env.close();
  }
});

test("stock movement keeps ORM relation checks as final defense", async () => {
  const env = await fixture();
  try {
    const movements = env.orm.model("inventory.stock_movement");
    assert.throws(
      () => createStockMovement(env.orm, { ...base, movement_ref: "bad-relation", movement_kind: "transfer", source_location_ref: "loc-a", destination_location_ref: "missing" }),
      /Missing relation target inventory\.location\.location_ref=missing/,
    );
    assert.equal(movements.count(), 0);
  } finally {
    env.close();
  }
});

test("valid receipt transfer issue and adjustment persist", async () => {
  const env = await fixture();
  try {
    createStockMovement(env.orm, { ...base, movement_ref: "receipt-1", movement_kind: "receipt", destination_location_ref: "loc-a" });
    createStockMovement(env.orm, { ...base, movement_ref: "transfer-1", movement_kind: "transfer", source_location_ref: "loc-a", destination_location_ref: "loc-b" });
    createStockMovement(env.orm, { ...base, movement_ref: "issue-1", movement_kind: "issue", source_location_ref: "loc-b" });
    createStockMovement(env.orm, { ...base, movement_ref: "adjust-1", movement_kind: "adjustment", destination_location_ref: "loc-a" });
    assert.equal(env.orm.model("inventory.stock_movement").count(), 4);
  } finally {
    env.close();
  }
});
