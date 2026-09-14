import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { acceptOrder, cancelOrder, rejectOrder, submitOrder } from "../plugins/commerce/lifecycle.js";

async function fixture(ref: string) {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("commerce.order").create({
    order_ref: ref,
    offer_ref: "offer-1",
    tenant_ref: "tenant-1",
    subject_ref: "subject-1",
    authorization_ref: "auth-1",
    policy_version: "v1",
  });
  return env;
}

test("order submit is explicit and acceptance never creates a subscription", async () => {
  const env = await fixture("order-1");
  try {
    const subscriptionsBefore = env.orm.model("service.subscription").count();
    assert.equal(submitOrder(env.orm, "order-1").status, "submitted");
    assert.throws(() => submitOrder(env.orm, "order-1"), /submitted -> submitted/);
    assert.equal(acceptOrder(env.orm, "order-1").status, "accepted");
    assert.equal(env.orm.model("service.subscription").count(), subscriptionsBefore);
  } finally {
    env.close();
  }
});

test("order transition matrix rejects forbidden terminal and skipped states", async () => {
  const env = await fixture("order-2");
  try {
    assert.throws(() => acceptOrder(env.orm, "order-2"), /draft -> accepted/);
    assert.throws(() => rejectOrder(env.orm, "order-2"), /draft -> rejected/);
    assert.equal(cancelOrder(env.orm, "order-2").status, "cancelled");
    assert.throws(() => submitOrder(env.orm, "order-2"), /cancelled -> submitted/);
    assert.throws(() => acceptOrder(env.orm, "order-2"), /cancelled -> accepted/);
  } finally {
    env.close();
  }
});

test("submitted order may reject or cancel but terminal states cannot reopen", async () => {
  const rejectedEnv = await fixture("order-3");
  try {
    submitOrder(rejectedEnv.orm, "order-3");
    assert.equal(rejectOrder(rejectedEnv.orm, "order-3").status, "rejected");
    assert.throws(() => cancelOrder(rejectedEnv.orm, "order-3"), /rejected -> cancelled/);
  } finally {
    rejectedEnv.close();
  }

  const cancelledEnv = await fixture("order-4");
  try {
    submitOrder(cancelledEnv.orm, "order-4");
    assert.equal(cancelOrder(cancelledEnv.orm, "order-4").status, "cancelled");
    assert.throws(() => rejectOrder(cancelledEnv.orm, "order-4"), /cancelled -> rejected/);
  } finally {
    cancelledEnv.close();
  }
});
