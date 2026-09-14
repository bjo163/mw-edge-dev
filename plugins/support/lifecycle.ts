import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type TicketStatus = "new" | "triaged" | "open" | "waiting" | "resolved" | "closed";

const TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  new: ["triaged"],
  triaged: ["open"],
  open: ["waiting", "resolved"],
  waiting: ["open", "resolved"],
  resolved: ["closed"],
  closed: [],
};

export function transitionTicket(env: OrmEnvironment, ref: string, next: TicketStatus): OutputRecord {
  const store = env.model("support.ticket");
  const record = store.get(ref);
  if (!record) throw new Error(`support.ticket ${ref} not found`);
  const previous = String(record.status) as TicketStatus;
  if (!(TRANSITIONS[previous] ?? []).includes(next)) {
    throw new Error(`Invalid support.ticket transition ${previous} -> ${next}`);
  }
  const updated = store.update(ref, { status: next });
  if (!updated) throw new Error(`Failed to update support.ticket ${ref}`);
  return updated;
}
