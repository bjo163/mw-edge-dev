import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";
import {
  createProfileBackup,
  restoreProfileBackup,
} from "../src/kernel/database/backup.js";

const password = "dr-test-bootstrap-password-123456";

async function loginStatus(dataDir: string): Promise<number> {
  const env = await boot({ profile: "standalone-business", dataDir });
  try {
    const response = await createApp(env).request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password }),
    });
    return response.status;
  } finally {
    env.close();
  }
}

test("profile backup restores checksummed databases and standalone login", async () => {
  const root = mkdtempSync(join(tmpdir(), "mw-edge-dr-"));
  const source = join(root, "source");
  const backup = join(root, "backup");
  const restored = join(root, "restored");
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = password;

  try {
    assert.equal(await loginStatus(source), 200);

    const manifest = await createProfileBackup("standalone-business", source, backup);
    assert.ok(manifest.files.length > 0);
    for (const entry of manifest.files) {
      assert.match(entry.sha256, /^[a-f0-9]{64}$/);
      assert.ok(entry.size_bytes > 0);
    }

    const integrity = await restoreProfileBackup("standalone-business", backup, restored);
    assert.equal(integrity.ok, true);
    assert.equal(await loginStatus(restored), 200);
  } finally {
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    rmSync(root, { recursive: true, force: true });
  }
});

test("backup command snapshots only profile-owned domain databases", async () => {
  const root = mkdtempSync(join(tmpdir(), "mw-edge-backup-command-"));
  const source = join(root, "source");
  const backup = join(root, "backup");
  const foreign = join(source, "foreign.db");
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = password;

  try {
    assert.equal(await loginStatus(source), 200);
    writeFileSync(foreign, "not-owned-by-mw-edge", "utf8");

    const stdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/backup.ts",
        "--profile",
        "standalone-business",
        "--data-dir",
        source,
        "--output-dir",
        backup,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, MW_BOOTSTRAP_ADMIN_PASSWORD: password },
        encoding: "utf8",
      },
    );

    const result = JSON.parse(stdout) as { status: string; domains: Array<{ domain: string }> };
    const manifest = JSON.parse(readFileSync(join(backup, "backup.manifest.json"), "utf8")) as {
      domains: Array<{ domain: string; file: string; sha256: string }>;
    };

    assert.equal(result.status, "backup-complete");
    assert.ok(result.domains.length > 0);
    assert.ok(manifest.domains.length > 0);
    assert.equal(existsSync(join(backup, "foreign.db")), false);
    assert.equal(readFileSync(foreign, "utf8"), "not-owned-by-mw-edge");
    assert.equal(manifest.domains.some((entry) => entry.domain === "foreign"), false);
    for (const entry of manifest.domains) {
      assert.equal(entry.file, `${entry.domain}.db`);
      assert.match(entry.sha256, /^[a-f0-9]{64}$/);
      assert.equal(existsSync(join(backup, entry.file)), true);
    }
  } finally {
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    rmSync(root, { recursive: true, force: true });
  }
});
