import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { COMPONENTS } from "../src/kernel/plugins/registry.js";

interface Manifest {
  readonly id: string;
  readonly kind: "domain_plugin" | "addon";
  readonly domain: string;
  readonly models: readonly string[];
}

const manifests: Manifest[] = [];
for (const entry of Object.values(COMPONENTS)) {
  const path = resolve(process.cwd(), entry.path, "plugin.json");
  const manifest = JSON.parse(await readFile(path, "utf8")) as Manifest;
  if (manifest.id !== entry.id || manifest.kind !== entry.kind || manifest.domain !== entry.domain) {
    throw new Error(`Registry/manifest drift for ${entry.id}`);
  }
  manifests.push(manifest);
}

const profiles = (await readdir(resolve(process.cwd(), "profiles"))).filter((name) => name.endsWith(".json")).sort();
const modelNames = new Set(manifests.flatMap((manifest) => [...manifest.models]));
const domainPlugins = manifests.filter((manifest) => manifest.kind === "domain_plugin");
const addons = manifests.filter((manifest) => manifest.kind === "addon");
const domains = new Set(domainPlugins.map((manifest) => manifest.domain));

const inventory = {
  domain_plugins: domainPlugins.length,
  addons: addons.length,
  components: manifests.length,
  logical_domain_databases: domains.size,
  unique_models: modelNames.size,
  profiles: profiles.length,
};

console.log(JSON.stringify(inventory, null, 2));
