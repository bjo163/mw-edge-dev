import test from "node:test";
import assert from "node:assert/strict";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import {
  DOMAIN_OUTBOX_TABLE,
  transactionWithDomainOutbox,
} from "../src/kernel/database/outbox.js";

test("domain state and outbox entry commit atomically in one database transaction", () => {
  const db = new SqliteDatabase(":memory:");
  db.exec("CREATE TABLE domain_state (id TEXT PRIMARY KEY, value TEXT NOT NULL)");

  try {
    transactionWithDomainOutbox(db, ({ db: tx, enqueue }) => {
      tx.run("INSERT INTO domain_state(id,value) VALUES(?,?)", ["state-1", "committed"]);
      enqueue({
        id: "evt-1",
        topic: "catalog.product.updated",
        payload: JSON.stringify({ ref: "prd-1" }),
        created_at: "2026-09-14T00:00:00.000Z",
      });
    });

    assert.equal(Number(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM domain_state")?.count ?? 0), 1);
    assert.equal(Number(db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${DOMAIN_OUTBOX_TABLE}`)?.count ?? 0), 1);

    assert.throws(
      () => transactionWithDomainOutbox(db, ({ db: tx, enqueue }) => {
        tx.run("INSERT INTO domain_state(id,value) VALUES(?,?)", ["state-2", "rolled-back"]);
        enqueue({
          id: "evt-2",
          topic: "catalog.product.updated",
          payload: JSON.stringify({ ref: "prd-2" }),
          created_at: "2026-09-14T00:00:01.000Z",
        });
        throw new Error("force rollback");
      }),
      /force rollback/,
    );

    assert.equal(Number(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM domain_state")?.count ?? 0), 1);
    assert.equal(Number(db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${DOMAIN_OUTBOX_TABLE}`)?.count ?? 0), 1);
  } finally {
    db.close();
  }
});

test("outbox rows remain domain-local and do not imply cross-domain atomicity", () => {
  const catalog = new SqliteDatabase(":memory:");
  const billing = new SqliteDatabase(":memory:");

  try {
    transactionWithDomainOutbox(catalog, ({ enqueue }) => enqueue({
      id: "catalog-1",
      topic: "catalog.changed",
      payload: "{}",
      created_at: "2026-09-14T00:00:00.000Z",
    }));
    transactionWithDomainOutbox(billing, ({ enqueue }) => enqueue({
      id: "billing-1",
      topic: "billing.changed",
      payload: "{}",
      created_at: "2026-09-14T00:00:00.000Z",
    }));

    assert.equal(catalog.get<{ id: string }>(`SELECT id FROM ${DOMAIN_OUTBOX_TABLE}`)?.id, "catalog-1");
    assert.equal(billing.get<{ id: string }>(`SELECT id FROM ${DOMAIN_OUTBOX_TABLE}`)?.id, "billing-1");
  } finally {
    catalog.close();
    billing.close();
  }
});
