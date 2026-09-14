import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type AllocationStatus = "pending" | "active" | "suspended" | "revoked";

const TRANSITIONS: Readonly<Record<AllocationStatus, readonly AllocationStatus[]>> = {
  pending: ["active", "revoked"],
  active: ["suspended", "revoked"],
  suspended: ["active", "revoked"],
  revoked: [],
};

export function transitionAllocation(env: OrmEnvironment, ref: string, next: AllocationStatus): OutputRecord {
  const store = env.model("entitlement.allocation");
  const record = store.get(ref);
  if (!record) throw new Error(`entitlement.allocation ${ref} not found`);
  const previous = String(record.status) as AllocationStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid entitlement.allocation transition ${previous} -> ${next}`);
  }
  if (next === "active") {
    if (!String(record.authorization_ref ?? "").trim()) throw new Error("Allocation activation requires authorization_ref");
    if (!String(record.policy_version ?? "").trim()) throw new Error("Allocation activation requires policy_version");
  }
  const updated = store.update(ref, { status: next });
  if (!updated) throw new Error(`Failed to update entitlement.allocation ${ref}`);
  return updated;
}
