import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boot } from "../src/index.js";
import type { BootEnvironment } from "../src/kernel/plugins/host.js";

const PROFILE = "standalone-business";
const PASSWORD = "test-reset-equivalence-password-123";

type Snapshot = {
  readonly schema: Readonly<Record<string, readonly { name: string; sql: string | null }[]>>;
  readonly seedCounts: Readonly<Record<string, number>>;
  readonly metadata: BootEnvironment["metadata"];
  readonly actors: {
    readonly admin: Readonly<Record<string, unknown>> | undefined;
    readonly bot: Readonly<Record<string, unknown>> | undefined;
  };
};

function normalizeActor(actor: Readonly<Record<string, unknown>> | undefined): Readonly<Record<string, unknown>> | undefined {
  if (!actor) return actor;
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, password_hash: _passwordHash, ...stable } = actor;
  return stable;
}

function snapshot(env: BootEnvironment): Snapshot {
  const domains = [...new Set(env.registry.list().map((model) => model.domain))].sort();
  const schema = Object.fromEntries(
    domains.map((domain) => [
      domain,
      env.router
        .get(domain)
        .all<{ name: string; sql: string | null }>(
          "SELECT name, sql FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name",
        )
        .map(({ name, sql }) => ({ name, sql })),
    ]),
  );
  const seedCounts = Object.fromEntries(
    env.registry
      .list()
      .map((model) => model.name)
      .sort()
      .map((name) => [name, env.orm.model(name).count()]),
  );
  const principal = env.orm.model("standalone.principal");
  return {
    schema,
    seedCounts,
    metadata: env.metadata,
    actors: {
      admin: normalizeActor(principal.get("mw.super-admin")),
      bot: normalizeActor(principal.get("mw.bot")),
    },
  };
}

test("factory reset recreates the same normalized baseline as a fresh install", async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), "mw-edge-reset-equivalence-"));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));

  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = PASSWORD;
  t.after(() => delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD);

  const fresh = await boot({ profile: PROFILE, dataDir });
  const freshSnapshot = snapshot(fresh);

  fresh.orm.model("standalone.principal").create({
    ref: "test.dirty-user",
    username: "dirty-user",
    password_hash: "not-a-real-secret",
    login_enabled: false,
    is_superuser: false,
  });
  assert.equal(fresh.orm.model("standalone.principal").count(), freshSnapshot.seedCounts["standalone.principal"] + 1);
  fresh.close();

  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/factory-reset.ts", "--yes", "--no-backup", "--profile", PROFILE, "--data-dir", dataDir],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MW_ALLOW_FACTORY_RESET: "1",
        MW_BOOTSTRAP_ADMIN_PASSWORD: PASSWORD,
      },
      stdio: "pipe",
    },
  );

  const reset = await boot({ profile: PROFILE, dataDir });
  const resetSnapshot = snapshot(reset);
  reset.close();

  assert.deepEqual(resetSnapshot.schema, freshSnapshot.schema);
  assert.deepEqual(resetSnapshot.seedCounts, freshSnapshot.seedCounts);
  assert.deepEqual(resetSnapshot.metadata, freshSnapshot.metadata);
  assert.deepEqual(resetSnapshot.actors, freshSnapshot.actors);
});
