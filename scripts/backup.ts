import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { planProfile, projectRoot } from "../src/kernel/plugins/host.js";
import { verifyPluginLock } from "../src/kernel/plugins/lock.js";

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const profile = value("--profile") ?? process.env.MW_PROFILE ?? "standalone-business";
const dataDir = resolve(value("--data-dir") ?? process.env.MW_DATA_DIR ?? resolve(projectRoot, "data"));
const stamp = new Date().toISOString().replaceAll(":", "-");
const backupDir = resolve(value("--output-dir") ?? resolve(dataDir, "backups", stamp));

const sha256File = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const sqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const { manifests, ordered } = await planProfile(profile);
const pluginLock = await verifyPluginLock(projectRoot);
const domains = [...new Set(
  ordered
    .map((id) => manifests.get(id)?.domain)
    .filter((domain): domain is string => Boolean(domain)),
)].sort();

if (domains.length === 0) throw new Error(`Profile ${profile} has no owned domains`);
for (const domain of domains) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(domain)) throw new Error(`Unsafe domain id ${domain}`);
}
if (existsSync(backupDir)) throw new Error(`Backup destination already exists: ${backupDir}`);
mkdirSync(dirname(backupDir), { recursive: true });
mkdirSync(backupDir);

type MigrationRow = {
  readonly component_id: string;
  readonly component_version: string;
  readonly migration_id: string;
  readonly checksum: string;
  readonly applied_at: string;
};

const snapshots: Array<{
  domain: string;
  file: string;
  bytes: number;
  sha256: string;
  integrity: string;
  migrations: readonly MigrationRow[];
}> = [];

try {
  for (const domain of domains) {
    const source = resolve(dataDir, `${domain}.db`);
    if (!existsSync(source)) continue;

    const destination = resolve(backupDir, `${domain}.db`);
    const db = new SqliteDatabase(source);
    try {
      const integrityRows = db.all<{ integrity_check: string }>("PRAGMA integrity_check");
      const integrity = integrityRows.map((row) => row.integrity_check).join("\n");
      if (integrity !== "ok") throw new Error(`SQLite integrity check failed for ${domain}: ${integrity}`);

      const migrations = db.all<MigrationRow>(
        "SELECT component_id, component_version, migration_id, checksum, applied_at FROM mw_migrations ORDER BY component_id, migration_id",
      );
      db.exec(`VACUUM INTO ${sqlString(destination)}`);

      snapshots.push({
        domain,
        file: `${domain}.db`,
        bytes: statSync(destination).size,
        sha256: sha256File(destination),
        integrity,
        migrations,
      });
    } finally {
      db.close();
    }
  }

  if (snapshots.length === 0) throw new Error(`No existing MW Edge domain databases found in ${dataDir}`);

  const manifest = {
    schema_version: "1.0.0",
    created_at: new Date().toISOString(),
    profile,
    domains: snapshots,
    plugin_lock: pluginLock,
  } as const;

  const manifestPath = resolve(backupDir, "backup.manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  console.log(JSON.stringify({
    status: "backup-complete",
    profile,
    backup_dir: backupDir,
    manifest: manifestPath,
    domains: snapshots.map(({ domain, bytes, sha256 }) => ({ domain, bytes, sha256 })),
  }, null, 2));
} catch (error) {
  rmSync(backupDir, { recursive: true, force: true });
  throw error;
}
