import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type PaymentObservationStatus = "pending" | "succeeded" | "failed" | "refunded";

const TRANSITIONS: Readonly<Record<PaymentObservationStatus, readonly PaymentObservationStatus[]>> = {
  pending: ["succeeded", "failed"],
  succeeded: ["refunded"],
  failed: [],
  refunded: [],
};

export function transitionPaymentObservation(
  env: OrmEnvironment,
  paymentRef: string,
  next: PaymentObservationStatus,
): OutputRecord {
  const store = env.model("billing.payment");
  const record = store.get(paymentRef);
  if (!record) throw new Error(`billing.payment ${paymentRef} not found`);
  const previous = String(record.status) as PaymentObservationStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid billing.payment observation transition ${previous} -> ${next}`);
  }
  const updated = store.update(paymentRef, { status: next });
  if (!updated) throw new Error(`Failed to update billing.payment ${paymentRef}`);
  return updated;
}
