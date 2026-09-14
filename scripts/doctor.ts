import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { checkProfileIntegrity } from "../src/kernel/database/integrity.js";
import { planProfile } from "../src/kernel/plugins/host.js";

interface DiagnosticCheck {
  readonly id: string;
  readonly category: "runtime" | "configuration" | "storage";
  readonly ok: boolean;
  readonly detail: string;
}

interface DoctorReport {
  readonly ok: boolean;
  readonly profile: string;
  readonly dataDir: string;
  readonly runtime: string;
  readonly checks: readonly DiagnosticCheck[];
}

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const json = args.includes("--json");
const profile = value("--profile") ?? process.env.MW_PROFILE ?? "standalone-business";
const dataDir = resolve(value("--data-dir") ?? process.env.MW_DATA_DIR ?? "data");
const checks: DiagnosticCheck[] = [];

const push = (check: DiagnosticCheck): void => {
  checks.push(check);
};
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

push({ id: "runtime.node", category: "runtime", ok: true, detail: process.version });

try {
  const plan = await planProfile(profile);
  push({
    id: "configuration.profile",
    category: "configuration",
    ok: true,
    detail: `${plan.ordered.length} components resolved`,
  });
} catch (error) {
  push({
    id: "configuration.profile",
    category: "configuration",
    ok: false,
    detail: errorMessage(error),
  });
}

try {
  await access(dataDir, constants.R_OK);
  push({ id: "storage.data_dir", category: "storage", ok: true, detail: "readable" });
} catch (error) {
  push({ id: "storage.data_dir", category: "storage", ok: false, detail: errorMessage(error) });
}

if (checks.find((check) => check.id === "configuration.profile")?.ok) {
  try {
    const integrity = await checkProfileIntegrity(profile, dataDir);
    const failedDomains = integrity.domains.filter((domain) => !domain.ok).map((domain) => domain.domain);
    push({
      id: "storage.sqlite_integrity",
      category: "storage",
      ok: integrity.ok,
      detail: integrity.ok ? `${integrity.domains.length} domains healthy` : `failed domains: ${failedDomains.join(", ")}`,
    });
  } catch (error) {
    push({ id: "storage.sqlite_integrity", category: "storage", ok: false, detail: errorMessage(error) });
  }
}

const report: DoctorReport = {
  ok: checks.every((check) => check.ok),
  profile,
  dataDir,
  runtime: process.version,
  checks,
};

if (json) {
  console.log(JSON.stringify(report));
} else {
  console.log(`MW Edge doctor: ${report.ok ? "healthy" : "unhealthy"}`);
  console.log(`profile: ${report.profile}`);
  console.log(`dataDir: ${report.dataDir}`);
  for (const check of report.checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.detail}`);
  }
}

if (!report.ok) process.exitCode = 1;
