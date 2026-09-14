import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type ProvisioningStatus = "requested" | "submitted" | "executing" | "succeeded" | "failed" | "cancelled" | "rolled_back";

const TRANSITIONS: Readonly<Record<ProvisioningStatus, readonly ProvisioningStatus[]>> = {
  requested: ["submitted", "cancelled"],
  submitted: ["executing", "cancelled"],
  executing: ["succeeded", "failed", "cancelled"],
  succeeded: ["rolled_back"],
  failed: [],
  cancelled: [],
  rolled_back: [],
};

export function transitionProvisioningReference(
  env: OrmEnvironment,
  ref: string,
  next: ProvisioningStatus,
  resultRef?: string,
): OutputRecord {
  const store = env.model("provisioning.reference");
  const record = store.get(ref);
  if (!record) throw new Error(`provisioning.reference ${ref} not found`);
  const previous = String(record.status) as ProvisioningStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid provisioning.reference transition ${previous} -> ${next}`);
  }
  if (next === "succeeded" && !resultRef?.trim()) throw new Error("Succeeded provisioning requires result_ref");
  const patch: Record<string, string> = { status: next };
  if (resultRef !== undefined) patch.result_ref = resultRef;
  const updated = store.update(ref, patch);
  if (!updated) throw new Error(`Failed to update provisioning.reference ${ref}`);
  return updated;
}
