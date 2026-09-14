import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { issueInvoice, markInvoiceOverdue, markInvoicePaid, voidInvoice } from "../plugins/billing/lifecycle.js";
import { transitionPaymentObservation } from "../addons/billing-payment/lifecycle.js";

async function invoiceFixture(ref: string) {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("billing.invoice").create({
    invoice_ref: ref,
    subscription_ref: "subscription-external",
    tenant_ref: "tenant-1",
    amount_ref: "amount-snapshot-1",
    amount: 120,
  });
  return env;
}

test("invoice issue is explicit, records issued_at, and does not imply payment", async () => {
  const env = await invoiceFixture("inv-1");
  try {
    const issued = issueInvoice(env.orm, "inv-1", "2026-09-14T00:00:00.000Z");
    assert.equal(issued.status, "issued");
    assert.equal(issued.issued_at, "2026-09-14T00:00:00.000Z");
    assert.equal(issued.amount, 120);
    assert.throws(() => issueInvoice(env.orm, "inv-1", "2026-09-15T00:00:00.000Z"), /issued -> issued/);
    assert.equal(env.orm.model("billing.payment").count(), 0);
  } finally {
    env.close();
  }
});

test("invoice paid void overdue matrix fails closed from invalid states", async () => {
  const env = await invoiceFixture("inv-2");
  try {
    assert.throws(() => markInvoicePaid(env.orm, "inv-2"), /draft -> paid/);
    assert.throws(() => voidInvoice(env.orm, "inv-2"), /draft -> void/);
    issueInvoice(env.orm, "inv-2", "2026-09-14T00:00:00.000Z");
    assert.equal(markInvoiceOverdue(env.orm, "inv-2").status, "overdue");
    assert.equal(markInvoicePaid(env.orm, "inv-2").status, "paid");
    assert.throws(() => voidInvoice(env.orm, "inv-2"), /paid -> void/);
    assert.throws(() => markInvoiceOverdue(env.orm, "inv-2"), /paid -> overdue/);
  } finally {
    env.close();
  }
});

test("succeeded payment remains an observation with no subscription allocation or provisioning side effects", async () => {
  const env = await invoiceFixture("inv-3");
  try {
    issueInvoice(env.orm, "inv-3", "2026-09-14T00:00:00.000Z");
    env.orm.model("billing.payment").create({
      payment_ref: "pay-1",
      invoice_ref: "inv-3",
      tenant_ref: "tenant-1",
      provider_ref: "provider-1",
      status: "pending",
      observed_at: "2026-09-14T01:00:00.000Z",
      provenance_ref: "provenance-1",
    });
    const subscriptions = env.orm.model("service.subscription").count();
    const allocations = env.orm.model("entitlement.allocation").count();
    const provisioning = env.orm.model("provisioning.reference").count();

    assert.equal(transitionPaymentObservation(env.orm, "pay-1", "succeeded").status, "succeeded");
    assert.equal(env.orm.model("billing.invoice").get("inv-3")?.status, "issued");
    assert.equal(env.orm.model("service.subscription").count(), subscriptions);
    assert.equal(env.orm.model("entitlement.allocation").count(), allocations);
    assert.equal(env.orm.model("provisioning.reference").count(), provisioning);
    assert.equal(transitionPaymentObservation(env.orm, "pay-1", "refunded").status, "refunded");
    assert.throws(() => transitionPaymentObservation(env.orm, "pay-1", "succeeded"), /refunded -> succeeded/);
  } finally {
    env.close();
  }
});
