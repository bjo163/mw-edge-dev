import type { SqliteDatabase } from "./sqlite.js";

export const DOMAIN_OUTBOX_TABLE = "mw_outbox";

export interface DomainOutboxEntry {
  readonly id: string;
  readonly topic: string;
  readonly payload: string;
  readonly created_at: string;
}

export interface DomainOutboxTransaction {
  readonly db: SqliteDatabase;
  enqueue(entry: DomainOutboxEntry): void;
}

export function ensureDomainOutbox(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${DOMAIN_OUTBOX_TABLE} (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_${DOMAIN_OUTBOX_TABLE}_created_at
      ON ${DOMAIN_OUTBOX_TABLE} (created_at, id);
  `);
}

export function enqueueDomainOutbox(
  db: SqliteDatabase,
  entry: DomainOutboxEntry,
): void {
  if (!entry.id.trim()) throw new Error("Outbox entry id must not be empty");
  if (!entry.topic.trim()) throw new Error("Outbox entry topic must not be empty");
  if (!entry.created_at.trim()) throw new Error("Outbox entry created_at must not be empty");

  db.run(
    `INSERT INTO ${DOMAIN_OUTBOX_TABLE} (id, topic, payload, created_at)
     VALUES (?, ?, ?, ?)`,
    [entry.id, entry.topic, entry.payload, entry.created_at],
  );
}

export function transactionWithDomainOutbox<T>(
  db: SqliteDatabase,
  fn: (transaction: DomainOutboxTransaction) => T,
): T {
  return db.transaction((transactionDb) => {
    ensureDomainOutbox(transactionDb);
    return fn({
      db: transactionDb,
      enqueue(entry) {
        enqueueDomainOutbox(transactionDb, entry);
      },
    });
  });
}
