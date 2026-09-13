const ID=/^mw\.[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
export function validateManifest(m) {
  if (!m || typeof m!=="object") throw new Error("Manifest must be object");
  if (!ID.test(m.id)) throw new Error(`Invalid component id ${m.id}`);
  if (!["domain_plugin","addon"].includes(m.kind)) throw new Error(`Invalid component kind ${m.kind}`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) throw new Error(`Invalid semver ${m.version}`);
  if (!/^[a-z][a-z0-9_]*$/.test(m.domain)) throw new Error(`Invalid domain ${m.domain}`);
  if (!Array.isArray(m.models) || !Array.isArray(m.requires)) throw new Error(`Manifest arrays required for ${m.id}`);
  if (m.kind==="addon" && !m.extends) throw new Error(`Addon ${m.id} must extend exactly one plugin`);
  if (m.kind==="addon" && m.database?.ownership!=="shared_target_domain") throw new Error(`Addon ${m.id} cannot own a database`);
  return m;
}
