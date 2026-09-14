import type { OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type PppoeAccountStatus = "pending" | "active" | "suspended" | "revoked";
export type PppoeSessionStatus = "starting" | "active" | "stopped" | "failed";

const ACCOUNT_TRANSITIONS: Readonly<Record<PppoeAccountStatus, readonly PppoeAccountStatus[]>> = {
  pending: ["active", "revoked"],
  active: ["suspended", "revoked"],
  suspended: ["active", "revoked"],
  revoked: [],
};

const SESSION_TRANSITIONS: Readonly<Record<PppoeSessionStatus, readonly PppoeSessionStatus[]>> = {
  starting: ["active", "stopped", "failed"],
  active: ["stopped", "failed"],
  stopped: [],
  failed: [],
};

function transition(
  env: OrmEnvironment,
  modelName: "isp.pppoe_account" | "isp.pppoe_session",
  ref: string,
  next: string,
  transitions: Readonly<Record<string, readonly string[]>>,
): OutputRecord {
  const store = env.model(modelName);
  const record = store.get(ref);
  if (!record) throw new Error(`${modelName} ${ref} not found`);
  const previous = String(record.status);
  if (!(transitions[previous] ?? []).includes(next)) {
    throw new Error(`Invalid ${modelName} transition ${previous} -> ${next}`);
  }
  const updated = store.update(ref, { status: next });
  if (!updated) throw new Error(`Failed to update ${modelName} ${ref}`);
  return updated;
}

export function transitionPppoeAccount(env: OrmEnvironment, accountRef: string, next: PppoeAccountStatus): OutputRecord {
  return transition(env, "isp.pppoe_account", accountRef, next, ACCOUNT_TRANSITIONS);
}

export function transitionPppoeSession(env: OrmEnvironment, sessionRef: string, next: PppoeSessionStatus): OutputRecord {
  return transition(env, "isp.pppoe_session", sessionRef, next, SESSION_TRANSITIONS);
}
