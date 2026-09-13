import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";

test("foundation and standalone baseline are never empty", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "test-bootstrap-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });
  assert.ok(env.orm.model("foundation.country").count() > 200);
  assert.ok(env.orm.model("foundation.currency").count() > 100);
  assert.ok(env.orm.model("foundation.timezone").count() > 200);
  const admin = env.orm.model("standalone.principal").get("mw.super-admin");
  const bot = env.orm.model("standalone.principal").get("mw.bot");
  assert.equal(admin?.username, "admin");
  assert.equal(admin?.is_superuser, true);
  assert.match(String(admin?.password_hash), /^scrypt\$1\$/);
  assert.equal(bot?.login_enabled, false);
  assert.equal(bot?.password_hash, null);
  env.close();
  delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
});
