import type { PluginManifest } from "../types.js";

const ID = /^mw\.[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const DOMAIN = /^[a-z][a-z0-9_]*$/;
const MANIFEST_KEYS = new Set([
  "schema_version",
  "id",
  "kind",
  "version",
  "host_api",
  "domain",
  "entrypoint",
  "models",
  "requires",
  "extends",
  "extension_points",
  "uses_extension_points",
  "database",
  "capabilities",
]);

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be object`);
  }
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${name} must be a string array`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${name} must contain unique values`);
  return value as readonly string[];
}

function rejectUnknown(value: Record<string, unknown>, allowed: ReadonlySet<string>, name: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Unknown ${name} field ${key}`);
  }
}

export function validateManifest(value: unknown): PluginManifest {
  const raw = object(value, "Manifest");
  rejectUnknown(raw, MANIFEST_KEYS, "manifest");

  if (raw.schema_version !== "1.0.0") throw new Error(`Unsupported manifest schema_version ${String(raw.schema_version)}`);
  if (typeof raw.id !== "string" || !ID.test(raw.id)) throw new Error(`Invalid component id ${String(raw.id)}`);
  if (raw.kind !== "domain_plugin" && raw.kind !== "addon") throw new Error(`Invalid component kind ${String(raw.kind)}`);
  if (typeof raw.version !== "string" || !SEMVER.test(raw.version)) throw new Error(`Invalid semver ${String(raw.version)}`);
  if (typeof raw.host_api !== "string" || raw.host_api.length === 0) throw new Error(`Invalid host_api for ${raw.id}`);
  if (typeof raw.domain !== "string" || !DOMAIN.test(raw.domain)) throw new Error(`Invalid domain ${String(raw.domain)}`);
  if (typeof raw.entrypoint !== "string" || raw.entrypoint.length === 0) throw new Error(`Invalid entrypoint for ${raw.id}`);

  const models = stringArray(raw.models, `${raw.id}.models`);
  const requires = stringArray(raw.requires, `${raw.id}.requires`);
  const database = object(raw.database, `${raw.id}.database`);
  rejectUnknown(database, new Set(["ownership", "logical_name"]), "database");
  if (
    database.ownership !== "exclusive_domain_owner" &&
    database.ownership !== "shared_target_domain"
  ) {
    throw new Error(`Invalid database ownership for ${raw.id}`);
  }
  if (typeof database.logical_name !== "string" || database.logical_name.length === 0) {
    throw new Error(`Invalid database logical_name for ${raw.id}`);
  }

  const capabilities = object(raw.capabilities, `${raw.id}.capabilities`);
  rejectUnknown(capabilities, new Set(["provides", "requires"]), "capabilities");
  const provides = stringArray(capabilities.provides, `${raw.id}.capabilities.provides`);
  const capabilityRequires = stringArray(capabilities.requires, `${raw.id}.capabilities.requires`);

  const extensionPoints =
    raw.extension_points === undefined
      ? undefined
      : stringArray(raw.extension_points, `${raw.id}.extension_points`);
  const usesExtensionPoints =
    raw.uses_extension_points === undefined
      ? undefined
      : stringArray(raw.uses_extension_points, `${raw.id}.uses_extension_points`);

  if (raw.kind === "domain_plugin" && !extensionPoints) {
    throw new Error(`Domain plugin ${raw.id} must declare extension_points`);
  }
  if (raw.kind === "addon") {
    if (typeof raw.extends !== "string" || raw.extends.length === 0) {
      throw new Error(`Addon ${raw.id} must extend exactly one plugin`);
    }
    if (!usesExtensionPoints) throw new Error(`Addon ${raw.id} must declare uses_extension_points`);
    if (database.ownership !== "shared_target_domain") {
      throw new Error(`Addon ${raw.id} cannot own a database`);
    }
  } else if (raw.extends !== undefined || usesExtensionPoints !== undefined) {
    throw new Error(`Domain plugin ${raw.id} cannot use addon-only fields`);
  }

  return {
    schema_version: raw.schema_version,
    id: raw.id,
    kind: raw.kind,
    version: raw.version,
    host_api: raw.host_api,
    domain: raw.domain,
    entrypoint: raw.entrypoint,
    models,
    requires,
    database: {
      ownership: database.ownership,
      logical_name: database.logical_name,
    },
    ...(extensionPoints ? { extension_points: extensionPoints } : {}),
    ...(usesExtensionPoints ? { uses_extension_points: usesExtensionPoints } : {}),
    ...(typeof raw.extends === "string" ? { extends: raw.extends } : {}),
    capabilities: {
      provides,
      requires: capabilityRequires,
    },
  };
}
