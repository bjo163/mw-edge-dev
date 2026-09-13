import { createHash } from "node:crypto";
export const IDENTIFIER = /^[a-z][a-z0-9_]*$/;
export const MODEL_NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
export function assertIdentifier(value, label = "identifier") {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}
export const q = value => `"${assertIdentifier(value).replaceAll('"','""')}"`;
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => JSON.stringify(k)+":"+stableStringify(value[k])).join(",")}}`;
  return JSON.stringify(value);
}
export const sha256 = value => createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
export const nowIso = () => new Date().toISOString();
