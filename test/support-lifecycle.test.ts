import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { transitionTicket } from "../plugins/support/lifecycle.js";

async function fixture(ref: string) {
  const env = await boot({ profile: "full", memory: true });
  env.orm.model("support.ticket").create({
    ticket_ref: ref,
    requester_ref: "requester-1",
    tenant_ref: "tenant-1",
    subject: "Connectivity issue",
    incident_ref: "incident-external-1",
    radicle_issue_ref: "radicle-external-1",
  });
  return env;
}

test("ticket lifecycle stays isolated from incident and Radicle issue references", async () => {
  const env = await fixture("ticket-1");
  try {
    assert.equal(transitionTicket(env.orm, "ticket-1", "triaged").status, "triaged");
    assert.equal(transitionTicket(env.orm, "ticket-1", "open").status, "open");
    assert.equal(transitionTicket(env.orm, "ticket-1", "waiting").status, "waiting");
    assert.equal(transitionTicket(env.orm, "ticket-1", "open").status, "open");
    assert.equal(transitionTicket(env.orm, "ticket-1", "resolved").status, "resolved");
    const closed = transitionTicket(env.orm, "ticket-1", "closed");
    assert.equal(closed.status, "closed");
    assert.equal(closed.incident_ref, "incident-external-1");
    assert.equal(closed.radicle_issue_ref, "radicle-external-1");
  } finally {
    env.close();
  }
});

test("ticket lifecycle rejects skipped and terminal transitions", async () => {
  const env = await fixture("ticket-2");
  try {
    assert.throws(() => transitionTicket(env.orm, "ticket-2", "open"), /new -> open/);
    transitionTicket(env.orm, "ticket-2", "triaged");
    transitionTicket(env.orm, "ticket-2", "open");
    transitionTicket(env.orm, "ticket-2", "resolved");
    transitionTicket(env.orm, "ticket-2", "closed");
    assert.throws(() => transitionTicket(env.orm, "ticket-2", "open"), /closed -> open/);
  } finally {
    env.close();
  }
});
