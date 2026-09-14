import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { transitionAllocation } from "../plugins/entitlement/lifecycle.js";

async function fixture(ref: string, authorizationRef = "auth-1") {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("entitlement.allocation").create({
    allocation_ref: ref,
    subscription_ref: "subscription-external",
    tenant_ref: "tenant-1",
    resource_ref: "resource-1",
    authorization_ref: authorizationRef,
    policy_version: "v1",
  });
  return env;
}

test("allocation activation requires authorization context and performs no provider operation", async () => {
  const invalid = await fixture("allocation-no-auth", "");
  try {
    assert.throws(() => transitionAllocation(invalid.orm, "allocation-no-auth", "active"), /requires authorization_ref/);
  } finally {
    invalid.close();
  }

  const env = await fixture("allocation-1");
  try {
    const providerRefs = env.orm.model("provisioning.reference").count();
    assert.equal(transitionAllocation(env.orm, "allocation-1", "active").status, "active");
    assert.equal(transitionAllocation(env.orm, "allocation-1", "suspended").status, "suspended");
    assert.equal(transitionAllocation(env.orm, "allocation-1", "active").status, "active");
    assert.equal(env.orm.model("provisioning.reference").count(), providerRefs);
  } finally {
    env.close();
  }
});

test("revoked allocation is terminal and pending cannot suspend", async () => {
  const env = await fixture("allocation-2");
  try {
    assert.throws(() => transitionAllocation(env.orm, "allocation-2", "suspended"), /pending -> suspended/);
    assert.equal(transitionAllocation(env.orm, "allocation-2", "revoked").status, "revoked");
    assert.throws(() => transitionAllocation(env.orm, "allocation-2", "active"), /revoked -> active/);
  } finally {
    env.close();
  }
});
