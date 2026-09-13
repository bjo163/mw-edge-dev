import { resolve } from "node:path";
import { checkProfileIntegrity } from "../src/kernel/database/integrity.js";

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const profile = value("--profile") ?? process.env.MW_PROFILE ?? "standalone-business";
const dataDir = resolve(value("--data-dir") ?? process.env.MW_DATA_DIR ?? "data");

try {
  const report = await checkProfileIntegrity(profile, dataDir);
  console.log(JSON.stringify(report));
  if (!report.ok) process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify({
      profile,
      dataDir,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      domains: [],
    }),
  );
  process.exitCode = 1;
}
