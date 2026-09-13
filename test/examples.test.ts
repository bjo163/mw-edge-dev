import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boot } from "../src/index.js";
import { validateComponentContracts } from "../src/kernel/plugins/contracts.js";
import { validateManifest } from "../src/kernel/plugins/manifest.js";

test("minimal plugin and addon run through the production loader", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "mw-edge-example-"));
  try {
    const env = await boot({ profile: "example", dataDir });
    try {
      assert.deepEqual(env.ordered, ["mw.example", "mw.example.note"]);
      assert.equal(env.lifecycle["mw.example"], "active");
      assert.equal(env.lifecycle["mw.example.note"], "active");

      const item = env.orm.model("example.item").get("example.seed-item");
      assert.equal(item?.name, "Seed item");
      const note = env.orm.model("example.note").get("example.seed-note");
      assert.equal(note?.item_ref, "example.seed-item");

      env.orm.model("example.item").create({
        item_ref: "example.runtime-item",
        name: "Runtime item",
        rank: 2,
        active: true,
        state: "active",
      });
      const created = env.orm.model("example.note").create({
        note_ref: "example.runtime-note",
        item_ref: "example.runtime-item",
        body: "Created through the supported ORM path",
      });
      assert.equal(created.item_ref, "example.runtime-item");

      const bindings = env.extensions.bindings.filter(
        (binding) => binding.addon_id === "mw.example.note",
      );
      assert.deepEqual(
        bindings.map((binding) => binding.extension_point).sort(),
        ["example.commands@1", "example.ui@1"],
      );
    } finally {
      env.close();
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test("addon contract rejects undeclared host extension points", () => {
  const host = validateManifest({
    schema_version: "1.0.0",
    id: "mw.example",
    kind: "domain_plugin",
    version: "0.1.0",
    host_api: "^1.0.0",
    domain: "example",
    entrypoint: "./index.js",
    models: [],
    requires: [],
    database: { ownership: "exclusive_domain_owner", logical_name: "example" },
    extension_points: ["example.commands@1"],
    capabilities: { provides: ["domain.example.models@1"], requires: [] },
  });
  const addon = validateManifest({
    schema_version: "1.0.0",
    id: "mw.example.bad",
    kind: "addon",
    version: "0.1.0",
    host_api: "^1.0.0",
    domain: "example",
    entrypoint: "./index.js",
    models: [],
    extends: "mw.example",
    requires: ["mw.example"],
    database: { ownership: "shared_target_domain", logical_name: "example" },
    uses_extension_points: ["example.private@1"],
    capabilities: { provides: [], requires: ["domain.example.models@1"] },
  });
  assert.throws(
    () =>
      validateComponentContracts(
        new Map([
          [host.id, host],
          [addon.id, addon],
        ]),
        [host.id, addon.id],
      ),
    /Unknown extension point example\.private@1/,
  );
});
