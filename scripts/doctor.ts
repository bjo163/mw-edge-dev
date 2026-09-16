import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { checkProfileIntegrity } from "../src/kernel/database/integrity.js";
import { planProfile } from "../src/kernel/plugins/host.js";
import { verifyPluginLock } from "../src/kernel/plugins/lock.js";

type DiagnosticCategory = "runtime" | "configuration" | "storage";
type DiagnosticFailure = "missing_prerequisite" | "invalid_configuration" | "runtime_failure";

interface DiagnosticCheck {
  readonly id: string;
  readonly category: DiagnosticCategory;
  readonly ok: boolean;
  readonly detail: string;
  readonly failure?: DiagnosticFailure;
  readonly recovery?: string;
}

interface DoctorReport {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly exitCode: number;
  readonly profile: string;
  readonly dataDir: string;
  readonly runtime: string;
  readonly checks: readonly DiagnosticCheck[];
}

const EXIT_OK = 0;
const EXIT_MISSING_PREREQUISITE = 2;
const EXIT_INVALID_CONFIGURATION = 3;
const EXIT_RUNTIME_FAILURE = 4;

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
const exitCodeFor = (items: readonly DiagnosticCheck[]): number => {
  const failures = new Set(items.filter((check) => !check.ok).map((check) => check.failure));
  if (failures.has("runtime_failure")) return EXIT_RUNTIME_FAILURE;
  if (failures.has("invalid_configuration")) return EXIT_INVALID_CONFIGURATION;
  if (failures.has("missing_prerequisite")) return EXIT_MISSING_PREREQUISITE;
  return EXIT_OK;
};

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
    failure: "invalid_configuration",
    recovery: "Select a valid profile and repair its plugin/component registration.",
  });
}

try {
  const lock = await verifyPluginLock(process.cwd());
  push({
    id: "configuration.plugin_lock",
    category: "configuration",
    ok: true,
    detail: `${lock.components.length} components locked`,
  });
} catch (error) {
  push({
    id: "configuration.plugin_lock",
    category: "configuration",
    ok: false,
    detail: errorMessage(error),
    failure: "invalid_configuration",
    recovery: "Run pnpm plugins:lock:write and review the resulting lock diff before startup.",
  });
}

try {
  await access(dataDir, constants.R_OK);
  push({ id: "storage.data_dir", category: "storage", ok: true, detail: "readable" });
} catch (error) {
  push({
    id: "storage.data_dir",
    category: "storage",
    ok: false,
    detail: errorMessage(error),
    failure: "missing_prerequisite",
    recovery: "Create or mount the configured data directory and grant the runtime read access.",
  });
}

const profileReady = checks.find((check) => check.id === "configuration.profile")?.ok === true;
const storageReady = checks.find((check) => check.id === "storage.data_dir")?.ok === true;
if (profileReady && storageReady) {
  try {
    const integrity = await checkProfileIntegrity(profile, dataDir);
    const failedDomains = integrity.domains.filter((domain) => !domain.ok).map((domain) => domain.domain);
    push({
      id: "storage.sqlite_integrity",
      category: "storage",
      ok: integrity.ok,
      detail: integrity.ok ? `${integrity.domains.length} domains healthy` : `failed domains: ${failedDomains.join(", ")}`,
      ...(integrity.ok
        ? {}
        : {
            failure: "runtime_failure" as const,
            recovery: "Inspect the reported domain databases and restore or repair corrupted SQLite state before startup.",
          }),
    });
  } catch (error) {
    push({
      id: "storage.sqlite_integrity",
      category: "storage",
      ok: false,
      detail: errorMessage(error),
      failure: "runtime_failure",
      recovery: "Verify database files are readable and migrations are complete, then rerun doctor.",
    });
  }
}

const exitCode = exitCodeFor(checks);
const report: DoctorReport = {
  schemaVersion: 1,
  ok: exitCode === EXIT_OK,
  exitCode,
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
    if (!check.ok && check.recovery) console.log(`  recovery: ${check.recovery}`);
  }
}

process.exitCode = report.exitCode;
