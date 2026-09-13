import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { COMPONENTS } from "./registry.js";
import { validateManifest } from "./manifest.js";
import { sha256, stableStringify } from "../util.js";

export interface PluginLockComponent {
  readonly component_id: string;
  readonly kind: "domain_plugin" | "addon";
  readonly version: string;
  readonly domain: string;
  readonly source: string;
  readonly manifest_sha256: string;
  readonly resolved_dependencies: readonly string[];
}
export interface PluginLock {
  readonly schema_version: "1.0.0";
  readonly hash_algorithm: "sha256";
  readonly components: readonly PluginLockComponent[];
}

export async function buildPluginLock(root: string): Promise<PluginLock> {
  const components: PluginLockComponent[] = [];
  for (const component of Object.values(COMPONENTS)) {
    const manifestPath = resolve(root, component.path, "plugin.json");
    const raw = await readFile(manifestPath, "utf8");
    const manifest = validateManifest(JSON.parse(raw) as unknown);
    components.push({
      component_id: manifest.id,
      kind: manifest.kind,
      version: manifest.version,
      domain: manifest.domain,
      source: component.path,
      manifest_sha256: sha256(raw),
      resolved_dependencies: [...new Set([...manifest.requires, ...(manifest.extends ? [manifest.extends] : [])])].sort(),
    });
  }
  components.sort((a, b) => a.component_id.localeCompare(b.component_id));
  return { schema_version: "1.0.0", hash_algorithm: "sha256", components };
}
export async function readPluginLock(root: string): Promise<PluginLock> {
  const path = resolve(root, "plugins.lock.json");
  if (!existsSync(path)) throw new Error("plugins.lock.json is required");
  return JSON.parse(await readFile(path, "utf8")) as PluginLock;
}
export async function verifyPluginLock(root: string): Promise<PluginLock> {
  const [actual, expected] = await Promise.all([readPluginLock(root), buildPluginLock(root)]);
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new Error("Plugin manifest drift detected. Run pnpm plugins:lock:write and review the lock diff.");
  }
  return actual;
}
