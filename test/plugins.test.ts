import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { boot } from "../src/index.js";
import { COMPONENTS } from "../src/kernel/plugins/registry.js";
import { validateManifest } from "../src/kernel/plugins/manifest.js";
import { resolveComponents } from "../src/kernel/plugins/resolver.js";
import { validateComponentContracts } from "../src/kernel/plugins/contracts.js";
import { ExtensionRegistry } from "../src/kernel/plugins/extensions.js";
import { LifecycleRegistry } from "../src/kernel/plugins/lifecycle.js";
import { verifyPluginLock } from "../src/kernel/plugins/lock.js";
import type { PluginManifest } from "../src/kernel/types.js";

async function manifests(): Promise<Map<string, PluginManifest>> {
  const result = new Map<string, PluginManifest>();
  for (const component of Object.values(COMPONENTS)) {
    const raw = await readFile(resolve(process.cwd(), component.path, "plugin.json"), "utf8");
    const manifest = validateManifest(JSON.parse(raw) as unknown);
    result.set(manifest.id, manifest);
  }
  return result;
}
test("committed plugin lock matches all built-in manifests", async () => {
  const actual = await verifyPluginLock(process.cwd());
  assert.equal(actual.components.length, 28);
});
test("full graph satisfies extension and capability contracts", async () => {
  const all = await manifests();
  const ordered = resolveComponents(all, [...all.keys()]);
  validateComponentContracts(all, ordered);
  const registry = new ExtensionRegistry();
  for (const id of ordered) { const manifest = all.get(id); assert.ok(manifest); registry.declare(manifest); }
  for (const id of ordered) { const manifest = all.get(id); assert.ok(manifest); registry.bind(manifest); }
  registry.freeze();
  assert.equal(registry.snapshot().frozen, true);
  assert.ok(registry.snapshot().bindings.length > 0);
});
test("lifecycle is monotonic and fail-closed", () => {
  const lifecycle = new LifecycleRegistry();
  lifecycle.discover("mw.example");
  for (const state of ["validated","resolved","staged","migrated","active"] as const) lifecycle.transition("mw.example", state);
  assert.equal(lifecycle.get("mw.example"), "active");
  assert.throws(() => lifecycle.transition("mw.example", "staged"));
});

test("disabling an addon retains owned data and re-enable restores access", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "mw-edge-plugin-disable-"));
  try {
    const enabled = await boot({ profile: "example", dataDir });
    enabled.orm.model("example.item").create({ item_ref: "item-1", name: "Persistent Item" });
    enabled.orm.model("example.note").create({ note_ref: "note-1", item_ref: "item-1", body: "Retained note" });
    enabled.close();

    const disabled = await boot({ profile: "example-base", dataDir });
    assert.equal(disabled.ordered.includes("mw.example.note"), false);
    assert.throws(() => disabled.orm.model("example.note"), /unknown model/i);
    assert.equal(disabled.orm.model("example.item").get("item-1")?.name, "Persistent Item");
    disabled.close();

    const reenabled = await boot({ profile: "example", dataDir });
    assert.equal(reenabled.orm.model("example.note").get("note-1")?.body, "Retained note");
    reenabled.close();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
