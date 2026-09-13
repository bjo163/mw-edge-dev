import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { planProfile } from "../plugins/host.js";

export interface DomainIntegrityResult {
  readonly domain: string;
  readonly path: string;
  readonly ok: boolean;
  readonly quickCheck: readonly string[];
  readonly foreignKeyViolations: number;
  readonly error?: string;
}

export interface ProfileIntegrityReport {
  readonly profile: string;
  readonly dataDir: string;
  readonly ok: boolean;
  readonly domains: readonly DomainIntegrityResult[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function profileDatabaseDomains(profile: string): Promise<readonly string[]> {
  const { manifests, ordered } = await planProfile(profile);
  return [...new Set(ordered.map((id) => manifests.get(id)?.domain).filter((domain): domain is string => Boolean(domain)))].sort();
}

export function checkDomainIntegrity(domain: string, path: string): DomainIntegrityResult {
  if (!existsSync(path)) {
    return {
      domain,
      path,
      ok: false,
      quickCheck: [],
      foreignKeyViolations: 0,
      error: "database file not found",
    };
  }

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(path, { readOnly: true });
    const quickRows = database.prepare("PRAGMA quick_check").all() as readonly Record<string, unknown>[];
    const quickCheck = quickRows.map((row) => String(Object.values(row)[0] ?? "unknown"));
    const foreignKeyViolations = database.prepare("PRAGMA foreign_key_check").all().length;
    const ok = quickCheck.length === 1 && quickCheck[0] === "ok" && foreignKeyViolations === 0;
    return { domain, path, ok, quickCheck, foreignKeyViolations };
  } catch (error) {
    return {
      domain,
      path,
      ok: false,
      quickCheck: [],
      foreignKeyViolations: 0,
      error: errorMessage(error),
    };
  } finally {
    database?.close();
  }
}

export async function checkProfileIntegrity(profile: string, dataDir: string): Promise<ProfileIntegrityReport> {
  const domains = await profileDatabaseDomains(profile);
  const results = domains.map((domain) => checkDomainIntegrity(domain, join(dataDir, `${domain}.db`)));
  return {
    profile,
    dataDir,
    ok: results.every((result) => result.ok),
    domains: results,
  };
}
