import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { activateSubscription, cancelSubscription, expireSubscription, suspendSubscription } from "../plugins/service/lifecycle.js";

async function fixture(ref: string) {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("service.subscription").create({
    subscription_ref: ref,
    order_ref: "order-external",
    tenant_ref: "tenant-1",
    effective_at: "2026-09-14T00:00:00.000Z",
  });
  return env;
}

test("activation and suspension remain separate from payment allocation and provisioning", async () => {
  const env = await fixture("sub-1");
  try {
    const paymentCount = env.orm.model("billing.payment").count();
    const allocationCount = env.orm.model("entitlement.allocation").count();
    const provisioningCount = env.orm.model("provisioning.reference").count();
    assert.equal(activateSubscription(env.orm, "sub-1").lifecycle, "active");
    assert.equal(suspendSubscription(env.orm, "sub-1").lifecycle, "suspended");
    assert.equal(activateSubscription(env.orm, "sub-1").lifecycle, "active");
    assert.equal(env.orm.model("billing.payment").count(), paymentCount);
    assert.equal(env.orm.model("entitlement.allocation").count(), allocationCount);
    assert.equal(env.orm.model("provisioning.reference").count(), provisioningCount);
  } finally {
    env.close();
  }
});

test("cancelled and expired subscriptions are terminal", async () => {
  const cancelled = await fixture("sub-2");
  try {
    assert.equal(cancelSubscription(cancelled.orm, "sub-2").lifecycle, "cancelled");
    assert.throws(() => activateSubscription(cancelled.orm, "sub-2"), /cancelled -> active/);
  } finally {
    cancelled.close();
  }

  const expired = await fixture("sub-3");
  try {
    activateSubscription(expired.orm, "sub-3");
    assert.equal(expireSubscription(expired.orm, "sub-3").lifecycle, "expired");
    assert.throws(() => suspendSubscription(expired.orm, "sub-3"), /expired -> suspended/);
    assert.throws(() => cancelSubscription(expired.orm, "sub-3"), /expired -> cancelled/);
  } finally {
    expired.close();
  }
});

test("pending subscription cannot suspend or expire before activation", async () => {
  const env = await fixture("sub-4");
  try {
    assert.throws(() => suspendSubscription(env.orm, "sub-4"), /pending -> suspended/);
    assert.throws(() => expireSubscription(env.orm, "sub-4"), /pending -> expired/);
  } finally {
    env.close();
  }
});
