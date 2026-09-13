import assert from "node:assert/strict";
import { boot } from "../../src/index.js";
import { createApp } from "../../src/http/app.js";

const profile = process.env.MW_PROFILE ?? "standalone-business";
const env = await boot({ profile, memory: true });
try {
  const response = await createApp(env).request("/health");
  assert.equal(response.status, 200);
  const health = (await response.json()) as {
    status: string;
    profile: string;
    models: number;
    components: number;
  };
  assert.equal(health.status, "ok");
  assert.equal(health.profile, profile);
  assert.ok(health.models > 0);
  assert.ok(health.components > 0);
  console.log(JSON.stringify({ gate: "smoke", ...health }));
} finally {
  env.close();
}
