import type { ProfileDocument } from "../types.js";

const PROFILE_ID = /^[a-z][a-z0-9-]*$/;
const PROFILE_KEYS = new Set(["schema_version", "id", "description", "components"]);

export function validateProfile(value: unknown, expectedId?: string): ProfileDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Profile must be object");
  }
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!PROFILE_KEYS.has(key)) throw new Error(`Unknown profile field ${key}`);
  }
  if (raw.schema_version !== "1.0.0") {
    throw new Error(`Unsupported profile schema_version ${String(raw.schema_version)}`);
  }
  if (typeof raw.id !== "string" || !PROFILE_ID.test(raw.id)) {
    throw new Error(`Invalid profile id ${String(raw.id)}`);
  }
  if (expectedId && raw.id !== expectedId) {
    throw new Error(`Profile id mismatch: expected ${expectedId}, got ${raw.id}`);
  }
  if (typeof raw.description !== "string" || raw.description.length === 0) {
    throw new Error(`Profile ${raw.id} requires a description`);
  }
  if (!Array.isArray(raw.components) || raw.components.some((item) => typeof item !== "string")) {
    throw new Error(`Profile ${raw.id} components must be a string array`);
  }
  if (new Set(raw.components).size !== raw.components.length) {
    throw new Error(`Profile ${raw.id} components must be unique`);
  }
  return {
    schema_version: raw.schema_version,
    id: raw.id,
    description: raw.description,
    components: raw.components as string[],
  };
}
