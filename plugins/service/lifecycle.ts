import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type SubscriptionLifecycle = "pending" | "active" | "suspended" | "cancelled" | "expired";

const TRANSITIONS: Readonly<Record<SubscriptionLifecycle, readonly SubscriptionLifecycle[]>> = {
  pending: ["active", "cancelled"],
  active: ["suspended", "cancelled", "expired"],
  suspended: ["active", "cancelled", "expired"],
  cancelled: [],
  expired: [],
};

function transition(env: OrmEnvironment, ref: string, next: SubscriptionLifecycle): OutputRecord {
  const store = env.model("service.subscription");
  const record = store.get(ref);
  if (!record) throw new Error(`service.subscription ${ref} not found`);
  const previous = String(record.lifecycle) as SubscriptionLifecycle;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid service.subscription transition ${previous} -> ${next}`);
  }
  const updated = store.update(ref, { lifecycle: next });
  if (!updated) throw new Error(`Failed to update service.subscription ${ref}`);
  return updated;
}

export const activateSubscription = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "active");
export const suspendSubscription = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "suspended");
export const cancelSubscription = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "cancelled");
export const expireSubscription = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "expired");
