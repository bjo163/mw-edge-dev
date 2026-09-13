import { createHash } from "node:crypto";

export const IDENTIFIER = /^[a-z][a-z0-9_]*$/;
export const MODEL_NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function assertIdentifier(value: string, label = "identifier"): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

export function q(value: string): string {
  return `"${assertIdentifier(value).replaceAll('"', '""')}"`;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  const input = typeof value === "string" ? value : stableStringify(value);
  return createHash("sha256").update(input).digest("hex");
}

export const nowIso = (): string => new Date().toISOString();
