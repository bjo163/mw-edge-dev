import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { COMPONENTS } from "../src/kernel/plugins/registry.js";
import { sha256, stableStringify } from "../src/kernel/util.js";
import { validateManifest } from "../src/kernel/plugins/manifest.js";

interface LockComponent {
  readonly component_id: string;
  readonly kind: "domain_plugin" | "addon";
  readonly version: string;
  readonly domain: string;
  readonly source: string;
  readonly manifest_sha256: string;
  readonly resolved_dependencies: readonly string[];
}

interface PluginLock {
  readonly schema_version: "1.0.0";
  readonly hash_algorithm: "sha256";
  readonly components: readonly LockComponent[];
}

const root = process.cwd();
const lockPath = resolve(root, "plugins.lock.json");

async function buildLock(): Promise<PluginLock> {
  const components: LockComponent[] = [];
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

const expected = await buildLock();
if (process.argv.includes("--write")) {
  await writeFile(lockPath, JSON.stringify(expected, null, 2) + "\n");
  console.log(`wrote ${lockPath}`);
} else {
  const actual = existsSync(lockPath) ? (JSON.parse(await readFile(lockPath, "utf8")) as unknown) : undefined;
  if (stableStringify(actual) !== stableStringify(expected)) {
    console.error("PLUGIN_LOCK_EXPECTED_START");
    console.error(JSON.stringify(expected, null, 2));
    console.error("PLUGIN_LOCK_EXPECTED_END");
    process.exit(1);
  }
  console.log(`plugin lock: ok (${expected.components.length} components)`);
}
