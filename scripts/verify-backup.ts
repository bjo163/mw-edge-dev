import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { planProfile, projectRoot } from "../src/kernel/plugins/host.js";
import { verifyPluginLock, type PluginLock } from "../src/kernel/plugins/lock.js";
import { stableStringify } from "../src/kernel/util.js";

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const backupDir = resolve(value("--backup-dir") ?? "");
const requestedProfile = value("--profile") ?? process.env.MW_PROFILE;
if (!value("--backup-dir")) throw new Error("--backup-dir is required");

interface MigrationRow {
  readonly component_id: string;
  readonly component_version: string;
  readonly migration_id: string;
  readonly checksum: string;
  readonly applied_at: string;
}

interface BackupDomain {
  readonly domain: string;
  readonly file: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly integrity: string;
  readonly migrations: readonly MigrationRow[];
}

interface BackupManifest {
  readonly schema_version: "1.0.0";
  readonly created_at: string;
  readonly profile: string;
  readonly domains: readonly BackupDomain[];
  readonly plugin_lock: PluginLock;
}

const sha256File = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const manifestPath = resolve(backupDir, "backup.manifest.json");
if (!existsSync(manifestPath)) throw new Error(`Backup manifest not found: ${manifestPath}`);

const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<BackupManifest>;
if (parsed.schema_version !== "1.0.0") {
  throw new Error(`Unsupported backup manifest schema: ${String(parsed.schema_version)}`);
}
if (!parsed.profile || !Array.isArray(parsed.domains) || !parsed.plugin_lock) {
  throw new Error("Backup manifest is missing profile, domains, or plugin_lock");
}

const manifest = parsed as BackupManifest;
if (requestedProfile && requestedProfile !== manifest.profile) {
  throw new Error(`Backup profile ${manifest.profile} does not match requested profile ${requestedProfile}`);
}

const [{ manifests, ordered }, currentPluginLock] = await Promise.all([
  planProfile(manifest.profile),
  verifyPluginLock(projectRoot),
]);

if (stableStringify(manifest.plugin_lock) !== stableStringify(currentPluginLock)) {
  throw new Error("Backup plugin lock is incompatible with the current runtime plugin lock");
}

const allowedDomains = new Set(
  ordered
    .map((id) => manifests.get(id)?.domain)
    .filter((domain): domain is string => Boolean(domain)),
);
const seenDomains = new Set<string>();
const verified: Array<{ domain: string; bytes: number; sha256: string; migrations: number }> = [];

if (manifest.domains.length === 0) throw new Error("Backup manifest contains no domain snapshots");

for (const entry of manifest.domains) {
  if (!entry || typeof entry.domain !== "string" || typeof entry.file !== "string") {
    throw new Error("Backup manifest contains an invalid domain entry");
  }
  if (!allowedDomains.has(entry.domain)) {
    throw new Error(`Backup domain ${entry.domain} is not owned by profile ${manifest.profile}`);
  }
  if (seenDomains.has(entry.domain)) throw new Error(`Duplicate backup domain ${entry.domain}`);
  seenDomains.add(entry.domain);

  const expectedFile = `${entry.domain}.db`;
  if (entry.file !== expectedFile || basename(entry.file) !== entry.file) {
    throw new Error(`Unsafe or unexpected backup file for ${entry.domain}: ${entry.file}`);
  }

  const snapshotPath = resolve(backupDir, entry.file);
  if (!existsSync(snapshotPath)) throw new Error(`Backup snapshot not found: ${entry.file}`);
  const bytes = statSync(snapshotPath).size;
  if (bytes !== entry.bytes) throw new Error(`Backup size mismatch for ${entry.domain}`);
  const sha256 = sha256File(snapshotPath);
  if (sha256 !== entry.sha256) throw new Error(`Backup checksum mismatch for ${entry.domain}`);

  const db = new SqliteDatabase(snapshotPath);
  try {
    const integrity = db.all<{ integrity_check: string }>("PRAGMA integrity_check")
      .map((row) => row.integrity_check)
      .join("\n");
    if (integrity !== "ok" || entry.integrity !== "ok") {
      throw new Error(`SQLite integrity check failed for ${entry.domain}: ${integrity}`);
    }

    const migrations = db.all<MigrationRow>(
      "SELECT component_id, component_version, migration_id, checksum, applied_at FROM mw_migrations ORDER BY component_id, migration_id",
    );
    if (stableStringify(migrations) !== stableStringify(entry.migrations)) {
      throw new Error(`Migration metadata mismatch for ${entry.domain}`);
    }

    for (const migration of migrations) {
      if (!currentPluginLock.components.some((component) => component.component_id === migration.component_id)) {
        throw new Error(`Unknown migration component ${migration.component_id} in ${entry.domain}`);
      }
    }

    verified.push({ domain: entry.domain, bytes, sha256, migrations: migrations.length });
  } finally {
    db.close();
  }
}

console.log(JSON.stringify({
  status: "restore-preflight-compatible",
  backup_dir: backupDir,
  profile: manifest.profile,
  schema_version: manifest.schema_version,
  domains: verified,
}, null, 2));
