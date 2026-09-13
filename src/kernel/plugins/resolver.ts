import type { PluginManifest } from "../types.js";

export function resolveComponents(manifests: ReadonlyMap<string, PluginManifest>, selected: readonly string[]): readonly string[] {
  const wanted = new Set(selected);
  let changed = true;

  while (changed) {
    changed = false;
    for (const id of [...wanted]) {
      const manifest = manifests.get(id);
      if (!manifest) throw new Error(`Selected component missing: ${id}`);
      const dependencies = [...manifest.requires, ...(manifest.extends ? [manifest.extends] : [])];
      for (const dependency of dependencies) {
        if (!wanted.has(dependency)) {
          wanted.add(dependency);
          changed = true;
        }
      }
    }
  }

  const temporary = new Set<string>();
  const done = new Set<string>();
  const ordered: string[] = [];

  const visit = (id: string): void => {
    if (done.has(id)) return;
    if (temporary.has(id)) throw new Error(`Component dependency cycle at ${id}`);
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing component ${id}`);
    temporary.add(id);
    for (const dependency of [...manifest.requires, ...(manifest.extends ? [manifest.extends] : [])]) visit(dependency);
    temporary.delete(id);
    done.add(id);
    ordered.push(id);
  };

  [...wanted].sort().forEach(visit);

  for (const id of ordered) {
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing component ${id}`);
    if (manifest.kind !== "addon") continue;
    const target = manifest.extends ? manifests.get(manifest.extends) : undefined;
    if (!target || target.kind !== "domain_plugin") throw new Error(`Invalid addon target ${manifest.id} -> ${String(manifest.extends)}`);
    if (target.domain !== manifest.domain) throw new Error(`Addon domain mismatch ${manifest.id}`);
  }

  return ordered;
}
