import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import {
  advanceOpportunity,
  convertLead,
  disqualifyLead,
  qualifyLead,
} from "../addons/crm-pipeline/lifecycle.js";

function leadInput(ref: string) {
  return {
    lead_ref: ref,
    tenant_ref: "tenant-1",
    title: "Lead",
  } as const;
}

function opportunityInput(ref: string, leadRef?: string) {
  return {
    opportunity_ref: ref,
    tenant_ref: "tenant-1",
    title: "Opportunity",
    ...(leadRef ? { lead_ref: leadRef } : {}),
  } as const;
}

test("lead qualification and conversion are explicit and terminal", async () => {
  const env = await boot({ profile: "business-standard", memory: true });
  try {
    const leads = env.orm.model("crm.lead");
    const opportunities = env.orm.model("crm.opportunity");
    leads.create(leadInput("lead-1"));
    opportunities.create(opportunityInput("opp-1", "lead-1"));

    assert.equal(qualifyLead(env.orm, "lead-1").status, "qualified");
    assert.equal(convertLead(env.orm, "lead-1").status, "converted");
    assert.equal(opportunities.get("opp-1")?.stage, "open");
    assert.throws(() => disqualifyLead(env.orm, "lead-1"), /Invalid crm\.lead transition converted -> disqualified/);
  } finally {
    env.close();
  }
});

test("lead cannot convert before qualification", async () => {
  const env = await boot({ profile: "business-standard", memory: true });
  try {
    env.orm.model("crm.lead").create(leadInput("lead-2"));
    assert.throws(() => convertLead(env.orm, "lead-2"), /Invalid crm\.lead transition new -> converted/);
  } finally {
    env.close();
  }
});

test("opportunity follows guarded open proposal negotiation won path", async () => {
  const env = await boot({ profile: "business-standard", memory: true });
  try {
    const opportunities = env.orm.model("crm.opportunity");
    opportunities.create(opportunityInput("opp-2"));
    assert.equal(advanceOpportunity(env.orm, "opp-2", "proposal").stage, "proposal");
    assert.equal(advanceOpportunity(env.orm, "opp-2", "negotiation").stage, "negotiation");
    assert.equal(advanceOpportunity(env.orm, "opp-2", "won").stage, "won");
    assert.throws(() => advanceOpportunity(env.orm, "opp-2", "lost"), /Invalid crm\.opportunity transition won -> lost/);
  } finally {
    env.close();
  }
});

test("opportunity rejects skipped stages but allows explicit loss", async () => {
  const env = await boot({ profile: "business-standard", memory: true });
  try {
    const opportunities = env.orm.model("crm.opportunity");
    opportunities.create(opportunityInput("opp-3"));
    assert.throws(() => advanceOpportunity(env.orm, "opp-3", "won"), /Invalid crm\.opportunity transition open -> won/);
    assert.equal(advanceOpportunity(env.orm, "opp-3", "lost").stage, "lost");
  } finally {
    env.close();
  }
});
