import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type InvoiceStatus = "draft" | "issued" | "paid" | "void" | "overdue";

const TRANSITIONS: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  draft: ["issued"],
  issued: ["paid", "void", "overdue"],
  overdue: ["paid", "void"],
  paid: [],
  void: [],
};

function transition(env: OrmEnvironment, ref: string, next: InvoiceStatus, patch: Record<string, string> = {}): OutputRecord {
  const store = env.model("billing.invoice");
  const record = store.get(ref);
  if (!record) throw new Error(`billing.invoice ${ref} not found`);
  const previous = String(record.status) as InvoiceStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid billing.invoice transition ${previous} -> ${next}`);
  }
  const updated = store.update(ref, { status: next, ...patch });
  if (!updated) throw new Error(`Failed to update billing.invoice ${ref}`);
  return updated;
}

export function issueInvoice(env: OrmEnvironment, ref: string, issuedAt: string): OutputRecord {
  if (!issuedAt.trim()) throw new Error("Invoice issue requires issued_at");
  return transition(env, ref, "issued", { issued_at: issuedAt });
}

export const markInvoicePaid = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "paid");
export const voidInvoice = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "void");
export const markInvoiceOverdue = (env: OrmEnvironment, ref: string): OutputRecord => transition(env, ref, "overdue");
