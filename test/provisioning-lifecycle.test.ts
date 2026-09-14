import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { transitionProvisioningReference } from "../plugins/provisioning/lifecycle.js";

async function fixture(ref: string) {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("provisioning.reference").create({
    provisioning_ref: ref,
    allocation_ref: "allocation-external",
    tenant_ref: "tenant-1",
    operation_ref: "operation-opaque-1",
  });
  return env;
}

test("provisioning reference guards requested to terminal flow without executing provider operation", async () => {
  const env = await fixture("prov-1");
  try {
    const operationRef = env.orm.model("provisioning.reference").get("prov-1")?.operation_ref;
    assert.equal(transitionProvisioningReference(env.orm, "prov-1", "submitted").status, "submitted");
    assert.equal(transitionProvisioningReference(env.orm, "prov-1", "executing").status, "executing");
    assert.throws(() => transitionProvisioningReference(env.orm, "prov-1", "succeeded"), /requires result_ref/);
    const succeeded = transitionProvisioningReference(env.orm, "prov-1", "succeeded", "result-opaque-1");
    assert.equal(succeeded.status, "succeeded");
    assert.equal(succeeded.result_ref, "result-opaque-1");
    assert.equal(succeeded.operation_ref, operationRef);
    assert.equal(transitionProvisioningReference(env.orm, "prov-1", "rolled_back").status, "rolled_back");
    assert.throws(() => transitionProvisioningReference(env.orm, "prov-1", "submitted"), /rolled_back -> submitted/);
  } finally {
    env.close();
  }
});

test("provisioning reference rejects skipped transitions and terminal failed state", async () => {
  const env = await fixture("prov-2");
  try {
    assert.throws(() => transitionProvisioningReference(env.orm, "prov-2", "executing"), /requested -> executing/);
    transitionProvisioningReference(env.orm, "prov-2", "submitted");
    transitionProvisioningReference(env.orm, "prov-2", "executing");
    assert.equal(transitionProvisioningReference(env.orm, "prov-2", "failed", "result-failed").status, "failed");
    assert.throws(() => transitionProvisioningReference(env.orm, "prov-2", "rolled_back"), /failed -> rolled_back/);
  } finally {
    env.close();
  }
});
