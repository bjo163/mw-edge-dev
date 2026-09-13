import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  checkDomainIntegrity,
  checkProfileIntegrity,
  profileDatabaseDomains,
  type ProfileIntegrityReport,
} from "./integrity.js";

export interface BackupFileEvidence {
  readonly domain: string;
  readonly file: string;
  readonly sha256: string;
  readonly size_bytes: number;
}

export interface ProfileBackupManifest {
  readonly schema_version: "1";
  readonly profile: string;
  readonly created_at: string;
  readonly files: readonly BackupFileEvidence[];
}

function checksum(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sqliteLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function loadManifest(backupDir: string): ProfileBackupManifest {
  const value = JSON.parse(readFileSync(join(backupDir, "manifest.json"), "utf8")) as Partial<ProfileBackupManifest>;
  if (
    value.schema_version !== "1" ||
    typeof value.profile !== "string" ||
    !Array.isArray(value.files)
  ) {
    throw new Error("Invalid backup manifest");
  }
  return value as ProfileBackupManifest;
}

export async function createProfileBackup(
  profile: string,
  dataDir: string,
  backupDir: string,
): Promise<ProfileBackupManifest> {
  const domains = await profileDatabaseDomains(profile);
  mkdirSync(backupDir, { recursive: true });

  const files: BackupFileEvidence[] = [];
  for (const domain of domains) {
    const source = join(dataDir, `${domain}.db`);
    const target = join(backupDir, `${domain}.db`);
    if (!existsSync(source)) throw new Error(`Database file not found for ${domain}: ${source}`);
    if (existsSync(target)) throw new Error(`Backup target already exists: ${target}`);

    const database = new DatabaseSync(source);
    try {
      database.exec("PRAGMA wal_checkpoint(FULL)");
      database.exec(`VACUUM INTO '${sqliteLiteral(target)}'`);
    } finally {
      database.close();
    }

    const integrity = checkDomainIntegrity(domain, target);
    if (!integrity.ok) throw new Error(`Backup integrity check failed for ${domain}`);
    files.push({
      domain,
      file: `${domain}.db`,
      sha256: checksum(target),
      size_bytes: statSync(target).size,
    });
  }

  const manifest: ProfileBackupManifest = {
    schema_version: "1",
    profile,
    created_at: new Date().toISOString(),
    files,
  };
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });
  return manifest;
}

export async function restoreProfileBackup(
  profile: string,
  backupDir: string,
  dataDir: string,
): Promise<ProfileIntegrityReport> {
  const manifest = loadManifest(backupDir);
  if (manifest.profile !== profile) {
    throw new Error(`Backup profile mismatch: expected ${profile}, got ${manifest.profile}`);
  }

  const expectedDomains = [...(await profileDatabaseDomains(profile))].sort();
  const backupDomains = manifest.files.map((entry) => entry.domain).sort();
  if (JSON.stringify(expectedDomains) !== JSON.stringify(backupDomains)) {
    throw new Error("Backup domain set does not match the selected profile");
  }

  for (const entry of manifest.files) {
    const source = join(backupDir, entry.file);
    if (!existsSync(source)) throw new Error(`Backup file not found: ${source}`);
    if (checksum(source) !== entry.sha256) throw new Error(`Backup checksum mismatch for ${entry.domain}`);
    const integrity = checkDomainIntegrity(entry.domain, source);
    if (!integrity.ok) throw new Error(`Backup integrity check failed for ${entry.domain}`);
  }

  mkdirSync(dataDir, { recursive: true });
  for (const entry of manifest.files) {
    const target = join(dataDir, entry.file);
    for (const suffix of ["", "-wal", "-shm"]) {
      if (existsSync(`${target}${suffix}`)) {
        throw new Error(`Restore target is not clean: ${target}${suffix}`);
      }
    }
  }
  for (const entry of manifest.files) {
    copyFileSync(join(backupDir, entry.file), join(dataDir, entry.file));
  }

  const report = await checkProfileIntegrity(profile, dataDir);
  if (!report.ok) throw new Error("Restored profile failed integrity checks");
  return report;
}
