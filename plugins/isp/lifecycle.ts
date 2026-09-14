import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type SubscriberStatus = "pending" | "active" | "suspended" | "terminated";

const SUBSCRIBER_TRANSITIONS: Readonly<Record<SubscriberStatus, readonly SubscriberStatus[]>> = {
  pending: ["active", "terminated"],
  active: ["suspended", "terminated"],
  suspended: ["active", "terminated"],
  terminated: [],
};

export function transitionSubscriber(env: OrmEnvironment, subscriberRef: string, next: SubscriberStatus): OutputRecord {
  const store = env.model("isp.subscriber");
  const record = store.get(subscriberRef);
  if (!record) throw new Error(`isp.subscriber ${subscriberRef} not found`);
  const previous = String(record.status) as SubscriberStatus;
  if (!(SUBSCRIBER_TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid isp.subscriber transition ${previous} -> ${next}`);
  }
  const updated = store.update(subscriberRef, { status: next });
  if (!updated) throw new Error(`Failed to update isp.subscriber ${subscriberRef}`);
  return updated;
}
