import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";
import { tokenHash } from "../src/standalone/auth.js";

function cookiePair(response: Response): string {
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

function tokenFromCookie(cookie: string): string {
  return cookie.slice(cookie.indexOf("=") + 1);
}

test("password change rotates the session and revoked or expired tokens fail closed", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "session-old-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env);

  try {
    let response = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "session-old-password-123" }),
    });
    assert.equal(response.status, 200);
    const oldCookie = cookiePair(response);
    assert.match(oldCookie, /^mw_session=.+/);

    response = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: oldCookie },
      body: JSON.stringify({ password: "session-new-password-456" }),
    });
    assert.equal(response.status, 200);
    const rotatedCookie = cookiePair(response);
    assert.match(rotatedCookie, /^mw_session=.+/);
    assert.notEqual(rotatedCookie, oldCookie);

    response = await app.request("/api/meta/app", { headers: { cookie: oldCookie } });
    assert.equal(response.status, 403, "revoked pre-rotation token must be rejected");

    response = await app.request("/api/meta/app", { headers: { cookie: rotatedCookie } });
    assert.equal(response.status, 200);

    const rotatedToken = tokenFromCookie(rotatedCookie);
    const rotatedSession = env.orm.model("standalone.session").findOne({
      filters: { token_hash: tokenHash(rotatedToken) },
    });
    assert.ok(rotatedSession);
    env.orm.model("standalone.session").update(String(rotatedSession.session_ref), {
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    response = await app.request("/api/meta/app", { headers: { cookie: rotatedCookie } });
    assert.equal(response.status, 403, "expired token must be rejected");

    response = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "session-new-password-456" }),
    });
    assert.equal(response.status, 200);
    const logoutCookie = cookiePair(response);

    response = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { cookie: logoutCookie },
    });
    assert.equal(response.status, 200);

    response = await app.request("/api/admin/resources/standalone.principal", {
      headers: { cookie: logoutCookie },
    });
    assert.equal(response.status, 403, "logged-out token must be revoked");
  } finally {
    env.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  }
});
