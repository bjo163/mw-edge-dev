import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";

test("standalone login gates metadata and hides secrets", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "http-test-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env);

  let response = await app.request("/api/meta/app");
  assert.equal(response.status, 403);

  response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "http-test-password-123" }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie ?? "", /HttpOnly/i);

  response = await app.request("/api/meta/app", { headers: { cookie: cookie ?? "" } });
  assert.equal(response.status, 200);
  const metadata = (await response.json()) as { resources: readonly { resource_id: string; fields: Record<string, unknown> }[] };
  const principal = metadata.resources.find((resource) => resource.resource_id === "standalone.principal");
  assert.ok(principal);
  assert.ok(!Object.hasOwn(principal.fields, "password_hash"));

  env.close();
  delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
});
