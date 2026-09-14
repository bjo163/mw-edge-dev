import type { DbRow } from "../types.js";
import type { SqliteDatabase } from "./sqlite.js";

const SEQUENCE_KEY = /^[a-z][a-z0-9._-]*$/;

export interface DomainSequenceDefinition {
  readonly key: string;
  readonly prefix?: string;
  readonly padding?: number;
  readonly start?: number;
}

export interface DomainSequenceValue {
  readonly key: string;
  readonly value: number;
  readonly reference: string;
}

interface SequenceRow extends DbRow {
  readonly value: number;
}

function validateDefinition(definition: DomainSequenceDefinition): Required<DomainSequenceDefinition> {
  if (!SEQUENCE_KEY.test(definition.key)) {
    throw new Error(`Invalid sequence key: ${definition.key}`);
  }

  const prefix = definition.prefix ?? "";
  const padding = definition.padding ?? 0;
  const start = definition.start ?? 1;

  if (!Number.isSafeInteger(padding) || padding < 0 || padding > 32) {
    throw new Error("Sequence padding must be a safe integer between 0 and 32");
  }
  if (!Number.isSafeInteger(start) || start < 1) {
    throw new Error("Sequence start must be a positive safe integer");
  }

  return { key: definition.key, prefix, padding, start };
}

export function ensureDomainSequenceSchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mw_sequences (
      sequence_key TEXT PRIMARY KEY,
      value INTEGER NOT NULL CHECK (value >= 1)
    ) STRICT
  `);
}

export function nextDomainSequence(
  db: SqliteDatabase,
  definition: DomainSequenceDefinition,
): DomainSequenceValue {
  const normalized = validateDefinition(definition);
  ensureDomainSequenceSchema(db);

  return db.transaction((tx) => {
    const row = tx.get<SequenceRow>(
      `INSERT INTO mw_sequences (sequence_key, value)
       VALUES (?, ?)
       ON CONFLICT(sequence_key) DO UPDATE SET value = value + 1
       RETURNING value`,
      [normalized.key, normalized.start],
    );

    if (!row || !Number.isSafeInteger(row.value) || row.value < 1) {
      throw new Error(`Failed to allocate sequence value for ${normalized.key}`);
    }

    const value = Number(row.value);
    const reference = `${normalized.prefix}${String(value).padStart(normalized.padding, "0")}`;
    return { key: normalized.key, value, reference };
  });
}
