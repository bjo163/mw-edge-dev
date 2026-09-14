import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface DoctorCheck {
  readonly id: string;
  readonly ok: boolean;
  readonly failure?: string;
  readonly recovery?: string;
}

interface DoctorReport {
  readonly schemaVersion: number;
  readonly ok: boolean;
  readonly exitCode: number;
  readonly checks: readonly DoctorCheck[];
}

test("doctor JSON contract deterministically prioritizes invalid configuration", () => {
  const missingDataDir = resolve(process.cwd(), ".tmp-doctor-contract-missing");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/doctor.ts",
      "--json",
      "--profile",
      "__doctor_contract_invalid_profile__",
      "--data-dir",
      missingDataDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 3, result.stderr);

  const report = JSON.parse(result.stdout) as DoctorReport;
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.ok, false);
  assert.equal(report.exitCode, 3);

  const profile = report.checks.find((check) => check.id === "configuration.profile");
  assert.deepEqual(profile?.ok, false);
  assert.equal(profile?.failure, "invalid_configuration");
  assert.ok(profile?.recovery, "invalid profile must include recovery guidance");

  const pluginLock = report.checks.find((check) => check.id === "configuration.plugin_lock");
  assert.deepEqual(pluginLock?.ok, true, "doctor must verify the repository plugin lock");
  assert.equal(pluginLock?.failure, undefined);
  assert.equal(pluginLock?.recovery, undefined);

  const dataDir = report.checks.find((check) => check.id === "storage.data_dir");
  assert.deepEqual(dataDir?.ok, false);
  assert.equal(dataDir?.failure, "missing_prerequisite");
  assert.ok(dataDir?.recovery, "missing data directory must include recovery guidance");

  assert.equal(
    report.checks.some((check) => check.id === "storage.sqlite_integrity"),
    false,
    "doctor must not run profile integrity against an invalid profile",
  );
});

test("doctor human output names failing checks and recovery actions", () => {
  const missingDataDir = resolve(process.cwd(), ".tmp-doctor-contract-human-missing");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/doctor.ts",
      "--profile",
      "__doctor_contract_invalid_profile__",
      "--data-dir",
      missingDataDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /^MW Edge doctor: unhealthy$/m);
  assert.match(result.stdout, /^FAIL configuration\.profile:/m);
  assert.match(
    result.stdout,
    /recovery: Select a valid profile and repair its plugin\/component registration\./,
  );
  assert.match(result.stdout, /^PASS configuration\.plugin_lock: \d+ components locked$/m);
  assert.match(result.stdout, /^FAIL storage\.data_dir:/m);
  assert.match(
    result.stdout,
    /recovery: Create or mount the configured data directory and grant the runtime read access\./,
  );
  assert.doesNotMatch(result.stdout, /storage\.sqlite_integrity/);
});

test("doctor output never exposes configured secret values", () => {
  const secret = "doctor-contract-secret-do-not-print";
  const missingDataDir = resolve(process.cwd(), ".tmp-doctor-contract-secret-missing");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/doctor.ts",
      "--json",
      "--profile",
      "__doctor_contract_invalid_profile__",
      "--data-dir",
      missingDataDir,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        MW_SESSION_SECRET: secret,
        MW_BOOTSTRAP_PASSWORD: secret,
      },
    },
  );

  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 3, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
});
