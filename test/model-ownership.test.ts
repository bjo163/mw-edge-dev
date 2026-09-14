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

test("model registry accepts one explicit matching owner", () => {
  const registry = new ModelRegistry();
  registry.register(model("mw.test"), "mw.test");
  assert.equal(registry.get("test.owned_record").owner, "mw.test");
});
