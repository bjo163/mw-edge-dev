import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { COMPONENTS } from "../src/kernel/plugins/registry.js";

test("component inventory is 17 domain plugins + 9 addons", () => {
  const values = Object.values(COMPONENTS);
  assert.equal(values.filter((entry) => entry.kind === "domain_plugin").length, 17);
  assert.equal(values.filter((entry) => entry.kind === "addon").length, 9);
});

test("full profile registers exactly 43 models and 17 domains", async () => {
  const env = await boot({ profile: "full", memory: true });
  assert.equal(env.registry.list().length, 43);
  assert.equal(new Set(env.registry.list().map((model) => model.domain)).size, 17);
  assert.equal(env.ordered.length, 26);
  env.close();
});

test("cross-domain relationships are References, never Relations", async () => {
  const env = await boot({ profile: "full", memory: true });
  for (const model of env.registry.list()) {
    for (const field of Object.values(model.fields)) {
      if (field.type !== "Relation" || !field.target) continue;
      const parts = field.target.split(".");
      parts.pop();
      const target = env.registry.get(parts.join("."));
      assert.equal(target.domain, model.domain, `${model.name} has cross-domain Relation`);
    }
  }
  env.close();
});

test("foundation metadata is read-only and sensitive standalone fields are hidden", async () => {
  const env = await boot({ profile: "full", memory: true });
  const country = env.metadata.resources.find((resource) => resource.resource_id === "foundation.country");
  assert.equal(country?.crud.create, false);
  assert.equal(country?.crud.update, false);
  const principal = env.metadata.resources.find((resource) => resource.resource_id === "standalone.principal");
  assert.ok(principal);
  assert.ok(!Object.hasOwn(principal.fields, "password_hash"));
  env.close();
});
