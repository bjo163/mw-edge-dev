import test from "node:test";
import assert from "node:assert/strict";
import {
  actionRef,
  createProvenanceContext,
  evidenceRef,
  eventRef,
  provenanceRef,
  resultRef,
} from "../src/kernel/provenance.js";

test("provenance context preserves separate action event evidence result and provenance semantics", () => {
  const context = createProvenanceContext({
    action_ref: "action:approve-1",
    event_ref: "event:approved-1",
    evidence_ref: "evidence:ticket-1",
    result_ref: "result:order-1",
    provenance_ref: "provenance:trace-1",
  });

  assert.deepEqual(context, {
    action_ref: "action:approve-1",
    event_ref: "event:approved-1",
    evidence_ref: "evidence:ticket-1",
    result_ref: "result:order-1",
    provenance_ref: "provenance:trace-1",
  });
  assert.equal(Object.isFrozen(context), true);
});

test("semantic reference constructors validate opaque refs without conflating their meaning", () => {
  assert.equal(actionRef("opaque:123"), "opaque:123");
  assert.equal(eventRef("opaque:123"), "opaque:123");
  assert.equal(evidenceRef("opaque:123"), "opaque:123");
  assert.equal(resultRef("opaque:123"), "opaque:123");
  assert.equal(provenanceRef("opaque:123"), "opaque:123");

  for (const invalid of ["", " leading", "trailing ", "bad\nref"]) {
    assert.throws(() => createProvenanceContext({ provenance_ref: invalid }), /Invalid provenance_ref/);
  }
});
