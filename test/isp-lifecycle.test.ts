import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { transitionSubscriber } from "../plugins/isp/lifecycle.js";
import { transitionPppoeAccount, transitionPppoeSession } from "../addons/isp-pppoe/lifecycle.js";

async function fixture() {
  const env = await boot({ profile: "isp", memory: true });
  env.orm.model("isp.subscriber").create({ subscriber_ref: "sub-1", tenant_ref: "tenant-1" });
  env.orm.model("isp.pppoe_account").create({
    pppoe_account_ref: "acct-1",
    tenant_ref: "tenant-1",
    subscriber_ref: "sub-1",
    username: "user-1",
    credential_ref: "secret://credential-1",
  });
  env.orm.model("isp.pppoe_session").create({
    session_ref: "session-1",
    tenant_ref: "tenant-1",
    subscriber_ref: "sub-1",
    pppoe_account_ref: "acct-1",
    status: "starting",
    observed_at: "2026-09-14T00:00:00.000Z",
  });
  return env;
}

test("subscriber lifecycle remains independent and terminal after termination", async () => {
  const env = await fixture();
  try {
    assert.equal(transitionSubscriber(env.orm, "sub-1", "active").status, "active");
    assert.equal(transitionSubscriber(env.orm, "sub-1", "suspended").status, "suspended");
    assert.equal(transitionSubscriber(env.orm, "sub-1", "active").status, "active");
    assert.equal(transitionSubscriber(env.orm, "sub-1", "terminated").status, "terminated");
    assert.throws(() => transitionSubscriber(env.orm, "sub-1", "active"), /terminated -> active/);
    assert.equal(env.orm.model("isp.pppoe_account").get("acct-1")?.status, "pending");
  } finally {
    env.close();
  }
});

test("PPPoE account lifecycle preserves opaque credential references", async () => {
  const env = await fixture();
  try {
    const before = env.orm.model("isp.pppoe_account").get("acct-1")?.credential_ref;
    assert.equal(transitionPppoeAccount(env.orm, "acct-1", "active").status, "active");
    assert.equal(transitionPppoeAccount(env.orm, "acct-1", "suspended").status, "suspended");
    assert.equal(transitionPppoeAccount(env.orm, "acct-1", "revoked").status, "revoked");
    assert.throws(() => transitionPppoeAccount(env.orm, "acct-1", "active"), /revoked -> active/);
    assert.equal(env.orm.model("isp.pppoe_account").get("acct-1")?.credential_ref, before);
  } finally {
    env.close();
  }
});

test("PPPoE session observation transitions never become authorization truth", async () => {
  const env = await fixture();
  try {
    transitionSubscriber(env.orm, "sub-1", "active");
    transitionPppoeAccount(env.orm, "acct-1", "active");
    assert.equal(transitionPppoeSession(env.orm, "session-1", "active").status, "active");
    assert.equal(transitionPppoeSession(env.orm, "session-1", "failed").status, "failed");
    assert.throws(() => transitionPppoeSession(env.orm, "session-1", "active"), /failed -> active/);
    assert.equal(env.orm.model("isp.subscriber").get("sub-1")?.status, "active");
    assert.equal(env.orm.model("isp.pppoe_account").get("acct-1")?.status, "active");
  } finally {
    env.close();
  }
});
