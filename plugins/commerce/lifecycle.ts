import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type OrderStatus = "draft" | "submitted" | "accepted" | "rejected" | "cancelled";

const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  draft: ["submitted", "cancelled"],
  submitted: ["accepted", "rejected", "cancelled"],
  accepted: [],
  rejected: [],
  cancelled: [],
};

function transition(env: OrmEnvironment, orderRef: string, next: OrderStatus): OutputRecord {
  const store = env.model("commerce.order");
  const record = store.get(orderRef);
  if (!record) throw new Error(`commerce.order ${orderRef} not found`);
  const previous = String(record.status) as OrderStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid commerce.order transition ${previous} -> ${next}`);
  }
  const updated = store.update(orderRef, { status: next });
  if (!updated) throw new Error(`Failed to update commerce.order ${orderRef}`);
  return updated;
}

export const submitOrder = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "submitted");
export const acceptOrder = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "accepted");
export const rejectOrder = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "rejected");
export const cancelOrder = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "cancelled");
