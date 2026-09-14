declare const provenanceBrand: unique symbol;

type SemanticRef<Kind extends string> = string & { readonly [provenanceBrand]: Kind };

export type ActionRef = SemanticRef<"action">;
export type EventRef = SemanticRef<"event">;
export type EvidenceRef = SemanticRef<"evidence">;
export type ResultRef = SemanticRef<"result">;
export type ProvenanceRef = SemanticRef<"provenance">;

export interface ProvenanceContext {
  readonly action_ref?: ActionRef;
  readonly event_ref?: EventRef;
  readonly evidence_ref?: EvidenceRef;
  readonly result_ref?: ResultRef;
  readonly provenance_ref?: ProvenanceRef;
}

export interface ProvenanceContextInput {
  readonly action_ref?: string;
  readonly event_ref?: string;
  readonly evidence_ref?: string;
  readonly result_ref?: string;
  readonly provenance_ref?: string;
}

function semanticRef<Kind extends string>(kind: Kind, value: string): SemanticRef<Kind> {
  if (typeof value !== "string" || value.length === 0 || value.length > 200 || value.trim() !== value) {
    throw new Error(`Invalid ${kind}_ref`);
  }
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) throw new Error(`Invalid ${kind}_ref`);
  }
  return value as SemanticRef<Kind>;
}

export const actionRef = (value: string): ActionRef => semanticRef("action", value);
export const eventRef = (value: string): EventRef => semanticRef("event", value);
export const evidenceRef = (value: string): EvidenceRef => semanticRef("evidence", value);
export const resultRef = (value: string): ResultRef => semanticRef("result", value);
export const provenanceRef = (value: string): ProvenanceRef => semanticRef("provenance", value);

export function createProvenanceContext(input: ProvenanceContextInput): Readonly<ProvenanceContext> {
  return Object.freeze({
    ...(input.action_ref !== undefined ? { action_ref: actionRef(input.action_ref) } : {}),
    ...(input.event_ref !== undefined ? { event_ref: eventRef(input.event_ref) } : {}),
    ...(input.evidence_ref !== undefined ? { evidence_ref: evidenceRef(input.evidence_ref) } : {}),
    ...(input.result_ref !== undefined ? { result_ref: resultRef(input.result_ref) } : {}),
    ...(input.provenance_ref !== undefined ? { provenance_ref: provenanceRef(input.provenance_ref) } : {}),
  });
}
