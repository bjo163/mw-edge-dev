import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";
import {
  createProfileBackup,
  restoreProfileBackup,
} from "../src/kernel/database/backup.js";

const profile = process.env.MW_PROFILE ?? "standalone-business";
const password = process.env.MW_DR_PASSWORD ?? "drill-bootstrap-password-123456";
const ownedRoot = !process.env.MW_DR_ROOT;
const root = process.env.MW_DR_ROOT
  ? resolve(process.env.MW_DR_ROOT)
  : mkdtempSync(join(tmpdir(), "mw-edge-drill-"));
const source = join(root, "source");
const backup = join(root, "backup");
const restored = join(root, "restored");

async function verifyLogin(dataDir: string): Promise<void> {
  const env = await boot({ profile, dataDir });
  try {
    if (!env.registry.has("standalone.principal")) return;
    const response = await createApp(env).request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password }),
    });
    if (response.status !== 200) throw new Error(`Standalone login recovery failed with status ${response.status}`);
  } finally {
    env.close();
  }
}

const timed = async <T>(operation: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  const started = performance.now();
  const value = await operation();
  return { value, ms: Math.round((performance.now() - started) * 100) / 100 };
};

process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = password;
try {
  const bootstrap = await timed(async () => verifyLogin(source));
  const backupResult = await timed(() => createProfileBackup(profile, source, backup));
  const restoreResult = await timed(() => restoreProfileBackup(profile, backup, restored));
  const loginResult = await timed(async () => verifyLogin(restored));

  console.log(
    JSON.stringify(
      {
        status: "ok",
        profile,
        evidence: {
          files: backupResult.value.files,
          integrity: restoreResult.value,
          timings_ms: {
            bootstrap_and_login: bootstrap.ms,
            backup: backupResult.ms,
            restore: restoreResult.ms,
            restored_login: loginResult.ms,
          },
        },
        unresolved_risks: [
          "The drill is single-host and does not validate off-host storage transport.",
          "Operator key management and backup retention policy remain deployment responsibilities.",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  if (ownedRoot) rmSync(root, { recursive: true, force: true });
}
