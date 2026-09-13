import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { boot } from "../src/index.js";
import { projectRoot } from "../src/kernel/plugins/host.js";

const args = process.argv.slice(2);
const index = args.indexOf("--domain");
const domain = index >= 0 ? args[index + 1] : undefined;
if (!domain || !args.includes("--yes")) throw new Error("Usage: db:reset -- --domain <domain> --yes");
if (!/^[a-z][a-z0-9_]*$/.test(domain)) throw new Error("Invalid domain");

const dataDir = resolve(projectRoot, "data");
for (const suffix of [".db", ".db-wal", ".db-shm"]) {
  const path = resolve(dataDir, `${domain}${suffix}`);
  if (existsSync(path)) rmSync(path, { force: true });
}

const env = await boot({ profile: process.env.MW_PROFILE ?? "full", dataDir });
env.close();
console.log(JSON.stringify({ status: "domain-reset", domain }));
