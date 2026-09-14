import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";

const PASSWORD = "csrf-test-password-123";

async function login(app: ReturnType<typeof createApp>, origin?: string): Promise<Response> {
  return app.request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify({ username: "admin", password: PASSWORD }),
  });
}

test("same-origin cookie writes succeed and cross-origin mutations fail closed", async () => {
  const previousPassword = process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = PASSWORD;
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env);

  try {
    const crossOrigin = await login(app, "https://attacker.example");
    assert.equal(crossOrigin.status, 403);
    const failure = (await crossOrigin.json()) as { error?: { code?: string } };
    assert.equal(failure.error?.code, "ACCESS_DENIED");

    const sameOrigin = await login(app, "http://localhost");
    assert.equal(sameOrigin.status, 200);
    assert.match(sameOrigin.headers.get("set-cookie") ?? "", /SameSite=Strict/i);
  } finally {
    env.close();
    if (previousPassword === undefined) delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    else process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = previousPassword;
  }
});

test("secure-cookie mode marks session cookies Secure", async () => {
  const previousPassword = process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  const previousSecure = process.env.MW_COOKIE_SECURE;
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = PASSWORD;
  process.env.MW_COOKIE_SECURE = "1";
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env);

  try {
    const response = await login(app, "http://localhost");
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Secure/i);
  } finally {
    env.close();
    if (previousPassword === undefined) delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
    else process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = previousPassword;
    if (previousSecure === undefined) delete process.env.MW_COOKIE_SECURE;
    else process.env.MW_COOKIE_SECURE = previousSecure;
  }
});
