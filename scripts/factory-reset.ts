import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { boot } from "../src/index.js";
import { planProfile, projectRoot } from "../src/kernel/plugins/host.js";

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const profile = value("--profile") ?? process.env.MW_PROFILE ?? "standalone-business";

if (!args.includes("--yes")) throw new Error("Factory reset requires --yes");
if (!process.stdout.isTTY && process.env.MW_ALLOW_FACTORY_RESET !== "1") {
  throw new Error("Non-interactive reset requires MW_ALLOW_FACTORY_RESET=1");
}

const dataDir = resolve(value("--data-dir") ?? process.env.MW_DATA_DIR ?? resolve(projectRoot, "data"));
const { manifests, ordered } = await planProfile(profile);
const domains = [...new Set(ordered.map((id) => manifests.get(id)?.domain).filter((domain): domain is string => Boolean(domain)))];
const backup = resolve(dataDir, "backups", new Date().toISOString().replaceAll(":", "-"));
if (!args.includes("--no-backup")) mkdirSync(backup, { recursive: true });

for (const domain of domains) {
  for (const suffix of [".db", ".db-wal", ".db-shm"]) {
    const file = resolve(dataDir, `${domain}${suffix}`);
    if (!existsSync(file)) continue;
    if (!args.includes("--no-backup")) cpSync(file, resolve(backup, `${domain}${suffix}`));
    rmSync(file, { force: true });
  }
}

const bootstrapFile = resolve(dataDir, ".bootstrap/admin-credentials.json");
if (existsSync(bootstrapFile)) rmSync(bootstrapFile, { force: true });

const env = await boot({ profile, dataDir });
const referenceCounts: Record<string, number> = {};
if (env.registry.has("foundation.country")) {
  for (const name of [
    "foundation.country",
    "foundation.currency",
    "foundation.language",
    "foundation.timezone",
    "foundation.locale",
  ]) {
    referenceCounts[name] = env.orm.model(name).count();
  }
}
const result = {
  status: "reset-complete",
  profile,
  data_dir: dataDir,
  domains,
  models: env.registry.list().length,
  components: env.ordered.length,
  reference_counts: referenceCounts,
};
env.close();
console.log(JSON.stringify(result, null, 2));
