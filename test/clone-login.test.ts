import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boot, type AppMetadata } from "../src/index.js";
import { createApp } from "../src/http/app.js";

function randomPassword(prefix: string): string {
  return `${prefix}-${randomBytes(24).toString("hex")}`;
}

async function login(
  app: ReturnType<typeof createApp>,
  password: string,
): Promise<{ response: Response; cookie: string }> {
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password }),
  });
  return { response, cookie: response.headers.get("set-cookie") ?? "" };
}

test("standalone clone-to-login persists rotated credentials and metadata across restart", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "mw-edge-clone-login-"));
  const initialPassword = randomPassword("initial");
  const rotatedPassword = randomPassword("rotated");
  let env: Awaited<ReturnType<typeof boot>> | undefined;

  try {
    process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = initialPassword;
    env = await boot({ profile: "standalone-business", dataDir });
    let app = createApp(env);

    const firstLogin = await login(app, initialPassword);
    assert.equal(firstLogin.response.status, 200);
    assert.match(firstLogin.cookie, /HttpOnly/i);

    let response = await app.request("/api/meta/app", {
      headers: { cookie: firstLogin.cookie },
    });
    assert.equal(response.status, 200);
    const before = (await response.json()) as AppMetadata;
    assert.ok(before.components.length > 0);
    assert.ok(before.resources.length > 0);

    response = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: {
        cookie: firstLogin.cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({ password: rotatedPassword }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    env.close();
    env = undefined;

    // A new bootstrap value must not overwrite persisted standalone state.
    process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = randomPassword("ignored");
    env = await boot({ profile: "standalone-business", dataDir });
    app = createApp(env);

    const staleLogin = await login(app, initialPassword);
    assert.equal(staleLogin.response.status, 403);

    const persistedLogin = await login(app, rotatedPassword);
    assert.equal(persistedLogin.response.status, 200);

    response = await app.request("/api/meta/app", {
      headers: { cookie: persistedLogin.cookie },
    });
    assert.equal(response.status, 200);
    const after = (await response.json()) as AppMetadata;
    assert.equal(after.components.length, before.components.length);
    assert.equal(after.resources.length, before.resources.length);
  } finally {
    env?.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    await rm(dataDir, { recursive: true, force: true });
  }
});
