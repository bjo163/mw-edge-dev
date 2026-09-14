import test from "node:test";
import assert from "node:assert/strict";
import { validateComponentContracts } from "../src/kernel/plugins/contracts.js";
import type { PluginManifest } from "../src/kernel/types.js";

function plugin(id: string, logicalName: string): PluginManifest {
  return {
    schema_version: "1.0.0",
    id,
    kind: "domain_plugin",
    version: "1.0.0",
    host_api: "^1.0.0",
    domain: "example",
    entrypoint: `./${id}.js`,
    models: [],
    requires: [],
    database: {
      ownership: "exclusive_domain_owner",
      logical_name: logicalName,
    },
    extension_points: [],
    capabilities: { provides: [], requires: [] },
  };
}

test("component compatibility rejects two exclusive owners for one domain database", () => {
  const first = plugin("mw.example.first", "example");
  const second = plugin("mw.example.second", "example");
  const manifests = new Map<string, PluginManifest>([
    [first.id, first],
    [second.id, second],
  ]);

  assert.throws(
    () => validateComponentContracts(manifests, [first.id, second.id]),
    /Incompatible component ownership for example:example/,
  );
});

test("component compatibility allows distinct exclusive logical databases", () => {
  const first = plugin("mw.example.first", "primary");
  const second = plugin("mw.example.second", "analytics");
  const manifests = new Map<string, PluginManifest>([
    [first.id, first],
    [second.id, second],
  ]);

  assert.doesNotThrow(() => validateComponentContracts(manifests, [first.id, second.id]));
});
