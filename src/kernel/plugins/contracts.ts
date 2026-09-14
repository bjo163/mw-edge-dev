import type { PluginManifest } from "../types.js";

export function validateComponentContracts(
  manifests: ReadonlyMap<string, PluginManifest>,
  ordered: readonly string[],
): void {
  const active = new Set(ordered);
  const exclusiveOwners = new Map<string, string>();

  for (const id of ordered) {
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing manifest ${id}`);

    if (manifest.database.ownership === "exclusive_domain_owner") {
      const ownershipKey = `${manifest.domain}:${manifest.database.logical_name}`;
      const existing = exclusiveOwners.get(ownershipKey);
      if (existing && existing !== manifest.id) {
        throw new Error(
          `Incompatible component ownership for ${ownershipKey}: ${existing} and ${manifest.id} both claim exclusive ownership`,
        );
      }
      exclusiveOwners.set(ownershipKey, manifest.id);
    }

    for (const dependency of manifest.requires) {
      if (!active.has(dependency)) throw new Error(`Unresolved dependency ${manifest.id} -> ${dependency}`);
    }

    if (manifest.kind === "addon") {
      if (!manifest.extends) throw new Error(`Addon ${manifest.id} has no target`);
      const target = manifests.get(manifest.extends);
      if (!target || target.kind !== "domain_plugin") throw new Error(`Invalid addon target ${manifest.id}`);
      if (target.domain !== manifest.domain) throw new Error(`Addon domain mismatch ${manifest.id}`);

      const declared = new Set(target.extension_points ?? []);
      for (const point of manifest.uses_extension_points ?? []) {
        if (!declared.has(point)) {
          throw new Error(`Unknown extension point ${point} used by ${manifest.id}`);
        }
      }
    }

    const availableCapabilities = new Set<string>();
    for (const dependency of [...manifest.requires, ...(manifest.extends ? [manifest.extends] : [])]) {
      const provider = manifests.get(dependency);
      for (const capability of provider?.capabilities.provides ?? []) availableCapabilities.add(capability);
    }
    for (const capability of manifest.capabilities.requires) {
      if (!availableCapabilities.has(capability)) {
        throw new Error(`Capability ${capability} required by ${manifest.id} is not provided by its dependencies`);
      }
    }
  }
}
