import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type LeadStatus = "new" | "qualified" | "disqualified" | "converted";
export type OpportunityStage = "open" | "proposal" | "negotiation" | "won" | "lost";

const LEAD_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  new: ["qualified", "disqualified"],
  qualified: ["disqualified", "converted"],
  disqualified: [],
  converted: [],
};

const OPPORTUNITY_TRANSITIONS: Readonly<Record<OpportunityStage, readonly OpportunityStage[]>> = {
  open: ["proposal", "lost"],
  proposal: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: [],
};

function transition(
  env: OrmEnvironment,
  modelName: "crm.lead" | "crm.opportunity",
  ref: string,
  field: "status" | "stage",
  next: string,
  allowed: Readonly<Record<string, readonly string[]>>,
): OutputRecord {
  const store = env.model(modelName);
  const current = store.get(ref);
  if (!current) throw new Error(`${modelName} ${ref} not found`);
  const previous = String(current[field]);
  if (!(allowed[previous] ?? []).includes(next)) {
    throw new Error(`Invalid ${modelName} transition ${previous} -> ${next}`);
  }
  const updated = store.update(ref, { [field]: next });
  if (!updated) throw new Error(`Failed to update ${modelName} ${ref}`);
  return updated;
}

export function qualifyLead(env: OrmEnvironment, leadRef: string): OutputRecord {
  return transition(env, "crm.lead", leadRef, "status", "qualified", LEAD_TRANSITIONS);
}

export function disqualifyLead(env: OrmEnvironment, leadRef: string): OutputRecord {
  return transition(env, "crm.lead", leadRef, "status", "disqualified", LEAD_TRANSITIONS);
}

export function convertLead(env: OrmEnvironment, leadRef: string): OutputRecord {
  return transition(env, "crm.lead", leadRef, "status", "converted", LEAD_TRANSITIONS);
}

export function advanceOpportunity(env: OrmEnvironment, opportunityRef: string, next: OpportunityStage): OutputRecord {
  return transition(env, "crm.opportunity", opportunityRef, "stage", next, OPPORTUNITY_TRANSITIONS);
}
