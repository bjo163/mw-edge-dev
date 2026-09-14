import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";
import { LoginRateLimiter, loginRateLimitKey } from "../src/standalone/login-rate-limit.js";

test("login limiter stores hashed dimensions and resets after the window", () => {
  const key = loginRateLimitKey(" Admin ");
  assert.notEqual(key, "admin");
  assert.equal(key, loginRateLimitKey("admin"));

  const limiter = new LoginRateLimiter({ maxFailures: 2, windowMs: 100, maxKeys: 2 });
  assert.equal(limiter.recordFailure(key, 1000), 0);
  assert.equal(limiter.recordFailure(key, 1000), 100);
  assert.equal(limiter.retryAfterMs(key, 1050), 50);
  assert.equal(limiter.retryAfterMs(key, 1100), 0);

  limiter.recordFailure(key, 1200);
  limiter.reset(key);
  assert.equal(limiter.retryAfterMs(key, 1200), 0);
});

test("standalone login throttles brute-force bursts without storing raw passwords", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "rate-limit-good-password";
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env, { loginRateLimit: { maxFailures: 2, windowMs: 10_000 } });

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: `wrong-${attempt}` }),
      });
      assert.equal(response.status, attempt === 1 ? 403 : 429);
    }

    const blocked = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "rate-limit-good-password" }),
    });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) >= 1);

    const otherUser = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "not-admin", password: "rate-limit-good-password" }),
    });
    assert.equal(otherUser.status, 403, "rate limit is scoped to a hashed username dimension");
  } finally {
    env.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  }
});
