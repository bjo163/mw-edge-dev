import test from "node:test";
import assert from "node:assert/strict";
import { ModelRegistry } from "../src/kernel/model-registry.js";
import type { ModelDefinition } from "../src/kernel/types.js";

function model(component: string): ModelDefinition {
  return {
    name: "test.owned_record",
    domain: "test",
    component,
    authority: "CANONICAL",
    fields: {
      record_ref: { type: "String", required: true, unique: true },
    },
  };
}

test("model registry rejects missing model ownership metadata", () => {
  const registry = new ModelRegistry();
  assert.throws(
    () => registry.register(model(""), "mw.test"),
    /Missing model ownership for test\.owned_record/,
  );
});

test("model registry rejects missing registration owner", () => {
  const registry = new ModelRegistry();
  assert.throws(
    () => registry.register(model("mw.test"), ""),
    /Missing registration owner for test\.owned_record/,
  );
});

test("model registry rejects ambiguous ownership", () => {
  const registry = new ModelRegistry();
  assert.throws(
    () => registry.register(model("mw.test"), "mw.other"),
    /Ambiguous model ownership for test\.owned_record/,
  );
});

test("model registry exposes normalized ownership metadata", () => {
  const registry = new ModelRegistry();
  registry.register(model("mw.test"), "mw.test");

  const registered = registry.get("test.owned_record");
  assert.equal(registered.owner, "mw.test");
  assert.deepEqual(registered.ownership, {
    owner_component: "mw.test",
    authority_class: "CANONICAL",
    source_of_truth: true,
    mutation_owner: "mw.test",
    tenant_scope: "GLOBAL",
  });
  assert.equal(Object.isFrozen(registered.ownership), true);
});
