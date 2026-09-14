import type { DbRow } from "../types.js";
import type { SqliteDatabase } from "./sqlite.js";
import { DOMAIN_OUTBOX_TABLE, ensureDomainOutbox, type DomainOutboxEntry } from "./outbox.js";

export const DOMAIN_OUTBOX_DELIVERY_TABLE = "mw_outbox_delivery";

export interface OutboxDeliveryContext {
  readonly attempt: number;
  readonly idempotencyKey: string;
}

export type OutboxDeliver = (
  entry: DomainOutboxEntry,
  context: OutboxDeliveryContext,
) => void | Promise<void>;

export interface OutboxDispatcherOptions {
  readonly limit?: number;
  readonly maxAttempts?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly now?: Date;
}

export interface OutboxDispatchResult {
  readonly attempted: number;
  readonly delivered: number;
  readonly failed: number;
}

interface PendingRow extends DbRow {
  readonly id: string;
  readonly topic: string;
  readonly payload: string;
  readonly created_at: string;
  readonly attempts: number;
}

function boundedInteger(name: string, value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 1000);
}

export function ensureDomainOutboxDelivery(db: SqliteDatabase): void {
  ensureDomainOutbox(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${DOMAIN_OUTBOX_DELIVERY_TABLE} (
      outbox_id TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      next_attempt_at TEXT,
      delivered_at TEXT,
      last_error TEXT,
      FOREIGN KEY (outbox_id) REFERENCES ${DOMAIN_OUTBOX_TABLE}(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_${DOMAIN_OUTBOX_DELIVERY_TABLE}_pending
      ON ${DOMAIN_OUTBOX_DELIVERY_TABLE} (delivered_at, next_attempt_at, attempts);
  `);
}

export async function dispatchDomainOutbox(
  db: SqliteDatabase,
  deliver: OutboxDeliver,
  options: OutboxDispatcherOptions = {},
): Promise<OutboxDispatchResult> {
  const limit = boundedInteger("limit", options.limit ?? 50, 1, 200);
  const maxAttempts = boundedInteger("maxAttempts", options.maxAttempts ?? 10, 1, 100);
  const baseBackoffMs = boundedInteger("baseBackoffMs", options.baseBackoffMs ?? 1000, 1, 60 * 60 * 1000);
  const maxBackoffMs = boundedInteger("maxBackoffMs", options.maxBackoffMs ?? 60_000, baseBackoffMs, 24 * 60 * 60 * 1000);
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("now must be a valid Date");

  ensureDomainOutboxDelivery(db);
  const nowIso = now.toISOString();
  const pending = db.all<PendingRow>(
    `SELECT o.id, o.topic, o.payload, o.created_at, COALESCE(d.attempts, 0) AS attempts
       FROM ${DOMAIN_OUTBOX_TABLE} o
       LEFT JOIN ${DOMAIN_OUTBOX_DELIVERY_TABLE} d ON d.outbox_id = o.id
      WHERE d.delivered_at IS NULL
        AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= ?)
        AND COALESCE(d.attempts, 0) < ?
      ORDER BY o.created_at ASC, o.id ASC
      LIMIT ?`,
    [nowIso, maxAttempts, limit],
  );

  let delivered = 0;
  let failed = 0;
  for (const row of pending) {
    const attempt = Number(row.attempts) + 1;
    const entry: DomainOutboxEntry = {
      id: String(row.id),
      topic: String(row.topic),
      payload: String(row.payload),
      created_at: String(row.created_at),
    };

    try {
      await deliver(entry, { attempt, idempotencyKey: entry.id });
      db.run(
        `INSERT INTO ${DOMAIN_OUTBOX_DELIVERY_TABLE}(outbox_id, attempts, next_attempt_at, delivered_at, last_error)
         VALUES(?, ?, NULL, ?, NULL)
         ON CONFLICT(outbox_id) DO UPDATE SET
           attempts=excluded.attempts,
           next_attempt_at=NULL,
           delivered_at=excluded.delivered_at,
           last_error=NULL`,
        [entry.id, attempt, nowIso],
      );
      delivered += 1;
    } catch (error) {
      const backoff = Math.min(maxBackoffMs, baseBackoffMs * (2 ** Math.max(0, attempt - 1)));
      const nextAttemptAt = new Date(now.getTime() + backoff).toISOString();
      db.run(
        `INSERT INTO ${DOMAIN_OUTBOX_DELIVERY_TABLE}(outbox_id, attempts, next_attempt_at, delivered_at, last_error)
         VALUES(?, ?, ?, NULL, ?)
         ON CONFLICT(outbox_id) DO UPDATE SET
           attempts=excluded.attempts,
           next_attempt_at=excluded.next_attempt_at,
           delivered_at=NULL,
           last_error=excluded.last_error`,
        [entry.id, attempt, nextAttemptAt, errorMessage(error)],
      );
      failed += 1;
    }
  }

  return { attempted: pending.length, delivered, failed };
}
