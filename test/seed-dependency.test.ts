import test from "node:test";
import assert from "node:assert/strict";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { resolveSeedOrder, seedKey, type SeedPlan } from "../src/kernel/seeds/dependency.js";

function plan(componentId: string, seedId: string, dependsOn: readonly string[] = []): SeedPlan {
  return {
    db: new SqliteDatabase(":memory:"),
    componentId,
    seedId,
    payload: { componentId, seedId },
    dependsOn,
    apply: () => undefined,
  };
}

function closeAll(seeds: readonly SeedPlan[]): void {
  for (const seed of seeds) seed.db.close();
}

test("seed dependency resolver orders dependencies deterministically", () => {
  const foundation = plan("foundation", "countries");
  const currency = plan("foundation", "currencies", [seedKey(foundation)]);
  const crm = plan("crm", "demo", [seedKey(currency)]);
  const seeds = [crm, currency, foundation];

  try {
    assert.deepEqual(resolveSeedOrder(seeds).map(seedKey), [
      seedKey(foundation),
      seedKey(currency),
      seedKey(crm),
    ]);
  } finally {
    closeAll(seeds);
  }
});

test("seed dependency resolver fails closed on missing dependencies", () => {
  const seed = plan("crm", "demo", ["foundation/countries@1"]);
  try {
    assert.throws(() => resolveSeedOrder([seed]), /missing seed dependency foundation\/countries@1/i);
  } finally {
    seed.db.close();
  }
});

test("seed dependency resolver fails closed on cycles", () => {
  const a = plan("a", "one", ["b/two@1"]);
  const b = plan("b", "two", ["a/one@1"]);
  try {
    assert.throws(() => resolveSeedOrder([b, a]), /seed dependency cycle/i);
  } finally {
    closeAll([a, b]);
  }
});
