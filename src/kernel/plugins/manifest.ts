import type { PluginManifest } from "../types.js";

const ID = /^mw\.[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export function validateManifest(value: unknown): PluginManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manifest must be object");
  const manifest = value as Partial<PluginManifest>;

  if (!manifest.id || !ID.test(manifest.id)) throw new Error(`Invalid component id ${String(manifest.id)}`);
  if (!manifest.kind || !["domain_plugin", "addon"].includes(manifest.kind)) throw new Error(`Invalid component kind ${String(manifest.kind)}`);
  if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error(`Invalid semver ${String(manifest.version)}`);
  if (!manifest.domain || !/^[a-z][a-z0-9_]*$/.test(manifest.domain)) throw new Error(`Invalid domain ${String(manifest.domain)}`);
  if (!Array.isArray(manifest.models) || !Array.isArray(manifest.requires)) throw new Error(`Manifest arrays required for ${manifest.id}`);
  if (!manifest.database || !manifest.capabilities || !manifest.entrypoint || !manifest.host_api || !manifest.schema_version) {
    throw new Error(`Incomplete manifest ${manifest.id}`);
  }
  if (manifest.kind === "addon" && !manifest.extends) throw new Error(`Addon ${manifest.id} must extend exactly one plugin`);
  if (manifest.kind === "addon" && manifest.database.ownership !== "shared_target_domain") {
    throw new Error(`Addon ${manifest.id} cannot own a database`);
  }
  return manifest as PluginManifest;
}
