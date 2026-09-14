import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type PurchaseOrderStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "fulfilled";

export interface ApprovalContext {
  readonly authorizationRef: string;
  readonly policyVersion: string;
}

const TRANSITIONS: Readonly<Record<PurchaseOrderStatus, readonly PurchaseOrderStatus[]>> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["fulfilled", "cancelled"],
  rejected: [],
  cancelled: [],
  fulfilled: [],
};

function current(env: OrmEnvironment, ref: string): OutputRecord {
  const record = env.model("procurement.purchase_order").get(ref);
  if (!record) throw new Error(`procurement.purchase_order ${ref} not found`);
  return record;
}

function transition(env: OrmEnvironment, ref: string, next: PurchaseOrderStatus, patch: Record<string, string> = {}): OutputRecord {
  const record = current(env, ref);
  const previous = String(record.status) as PurchaseOrderStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid procurement.purchase_order transition ${previous} -> ${next}`);
  }
  const updated = env.model("procurement.purchase_order").update(ref, { status: next, ...patch });
  if (!updated) throw new Error(`Failed to update procurement.purchase_order ${ref}`);
  return updated;
}

export function submitPurchaseOrder(env: OrmEnvironment, ref: string): OutputRecord {
  return transition(env, ref, "submitted");
}

export function approvePurchaseOrder(env: OrmEnvironment, ref: string, context: ApprovalContext): OutputRecord {
  if (!context.authorizationRef.trim()) throw new Error("Purchase order approval requires authorization_ref");
  if (!context.policyVersion.trim()) throw new Error("Purchase order approval requires policy_version");
  return transition(env, ref, "approved", {
    authorization_ref: context.authorizationRef,
    policy_version: context.policyVersion,
  });
}

export function rejectPurchaseOrder(env: OrmEnvironment, ref: string): OutputRecord {
  return transition(env, ref, "rejected");
}

export function cancelPurchaseOrder(env: OrmEnvironment, ref: string): OutputRecord {
  return transition(env, ref, "cancelled");
}

export function fulfillPurchaseOrder(env: OrmEnvironment, ref: string): OutputRecord {
  return transition(env, ref, "fulfilled");
}
