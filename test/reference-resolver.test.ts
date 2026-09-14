import test from "node:test";
import assert from "node:assert/strict";
import { ReferenceResolverRegistry } from "../src/kernel/references.js";

test("reference resolver registry bounds result size and preserves opaque refs", async () => {
  const registry = new ReferenceResolverRegistry({ defaultLimit: 2, maxLimit: 3, timeoutMs: 100 });
  let observedLimit = 0;
  registry.register("tenant_scope", ({ limit, search }) => {
    observedLimit = limit;
    assert.equal(search, "acme");
    return [
      { ref: "tenant:001", label: "Acme One" },
      { ref: "tenant:002", label: "Acme Two" },
    ];
  });

  const result = await registry.resolve("tenant_scope", { search: " acme ", limit: 2 });
  assert.equal(observedLimit, 2);
  assert.deepEqual(result.map((item) => item.ref), ["tenant:001", "tenant:002"]);
  assert.throws(() => registry.resolve("tenant_scope", { limit: 4 }), /limited|between/i);
});

test("reference resolvers fail closed on unknown, duplicate, oversized, and slow results", async () => {
  const registry = new ReferenceResolverRegistry({ maxLimit: 2, timeoutMs: 10 });
  registry.register("external_customer", () => [
    { ref: "customer:1", label: "One" },
    { ref: "customer:2", label: "Two" },
    { ref: "customer:3", label: "Three" },
  ]);
  await assert.rejects(registry.resolve("external_customer", { limit: 2 }), /above limit/i);
  await assert.rejects(registry.resolve("missing"), /Unknown reference resolver/);

  const duplicate = new ReferenceResolverRegistry({ timeoutMs: 100 });
  duplicate.register("identity", () => [
    { ref: "user:1", label: "One" },
    { ref: "user:1", label: "Duplicate" },
  ]);
  await assert.rejects(duplicate.resolve("identity"), /Duplicate reference result/);

  const slow = new ReferenceResolverRegistry({ timeoutMs: 5 });
  slow.register("slow_source", ({ signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  await assert.rejects(slow.resolve("slow_source"), /timeout|aborted/i);
});
