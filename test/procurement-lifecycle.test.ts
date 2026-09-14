import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  fulfillPurchaseOrder,
  rejectPurchaseOrder,
  submitPurchaseOrder,
} from "../plugins/procurement/lifecycle.js";

async function fixture(ref: string) {
  const env = await boot({ profile: "erp", memory: true });
  const vendors = env.orm.model("procurement.vendor");
  const orders = env.orm.model("procurement.purchase_order");
  const vendorRef = `vendor-${ref}`;
  vendors.create({ vendor_ref: vendorRef, tenant_ref: "tenant-1", name: "Vendor" });
  orders.create({ purchase_order_ref: ref, tenant_ref: "tenant-1", vendor_ref: vendorRef });
  return env;
}

test("purchase order approval requires explicit authorization context", async () => {
  const env = await fixture("po-1");
  try {
    submitPurchaseOrder(env.orm, "po-1");
    assert.throws(
      () => approvePurchaseOrder(env.orm, "po-1", { authorizationRef: "", policyVersion: "v1" }),
      /requires authorization_ref/,
    );
    assert.throws(
      () => approvePurchaseOrder(env.orm, "po-1", { authorizationRef: "auth-1", policyVersion: "" }),
      /requires policy_version/,
    );
    const approved = approvePurchaseOrder(env.orm, "po-1", { authorizationRef: "auth-1", policyVersion: "v1" });
    assert.equal(approved.status, "approved");
    assert.equal(approved.authorization_ref, "auth-1");
    assert.equal(approved.policy_version, "v1");
    assert.equal(fulfillPurchaseOrder(env.orm, "po-1").status, "fulfilled");
  } finally {
    env.close();
  }
});

test("purchase order rejects invalid skips and terminal transitions", async () => {
  const env = await fixture("po-2");
  try {
    assert.throws(
      () => approvePurchaseOrder(env.orm, "po-2", { authorizationRef: "auth-2", policyVersion: "v1" }),
      /Invalid procurement\.purchase_order transition draft -> approved/,
    );
    submitPurchaseOrder(env.orm, "po-2");
    assert.equal(rejectPurchaseOrder(env.orm, "po-2").status, "rejected");
    assert.throws(() => cancelPurchaseOrder(env.orm, "po-2"), /transition rejected -> cancelled/);
  } finally {
    env.close();
  }
});

test("draft purchase order can be explicitly cancelled", async () => {
  const env = await fixture("po-3");
  try {
    assert.equal(cancelPurchaseOrder(env.orm, "po-3").status, "cancelled");
  } finally {
    env.close();
  }
});
