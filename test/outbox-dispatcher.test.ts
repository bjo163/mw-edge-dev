import test from "node:test";
import assert from "node:assert/strict";
import { SqliteDatabase } from "../src/kernel/database/sqlite.js";
import { transactionWithDomainOutbox } from "../src/kernel/database/outbox.js";
import {
  DOMAIN_OUTBOX_DELIVERY_TABLE,
  dispatchDomainOutbox,
} from "../src/kernel/database/outbox-dispatcher.js";

test("outbox delivery failure never rolls back committed domain state and retries with the same idempotency key", async () => {
  const db = new SqliteDatabase(":memory:");
  db.exec("CREATE TABLE domain_state (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
  transactionWithDomainOutbox(db, ({ db: tx, enqueue }) => {
    tx.run("INSERT INTO domain_state(id,value) VALUES(?,?)", ["state-1", "committed"]);
    enqueue({
      id: "evt-1",
      topic: "catalog.product.updated",
      payload: JSON.stringify({ ref: "prd-1" }),
      created_at: "2026-09-14T00:00:00.000Z",
    });
  });

  const keys: string[] = [];
  const first = await dispatchDomainOutbox(db, async (_entry, context) => {
    keys.push(context.idempotencyKey);
    throw new Error("transport unavailable");
  }, {
    now: new Date("2026-09-14T00:00:10.000Z"),
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
  });

  assert.deepEqual(first, { attempted: 1, delivered: 0, failed: 1 });
  assert.equal(db.get<{ value: string }>("SELECT value FROM domain_state WHERE id=?", ["state-1"])?.value, "committed");
  const failedState = db.get<{ attempts: number; delivered_at: string | null; last_error: string }>(
    `SELECT attempts, delivered_at, last_error FROM ${DOMAIN_OUTBOX_DELIVERY_TABLE} WHERE outbox_id=?`,
    ["evt-1"],
  );
  assert.equal(Number(failedState?.attempts), 1);
  assert.equal(failedState?.delivered_at, null);
  assert.match(String(failedState?.last_error), /transport unavailable/);

  const tooEarly = await dispatchDomainOutbox(db, async () => {
    throw new Error("must not execute before retry time");
  }, {
    now: new Date("2026-09-14T00:00:10.500Z"),
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
  });
  assert.deepEqual(tooEarly, { attempted: 0, delivered: 0, failed: 0 });

  const second = await dispatchDomainOutbox(db, async (_entry, context) => {
    keys.push(context.idempotencyKey);
    assert.equal(context.attempt, 2);
  }, {
    now: new Date("2026-09-14T00:00:11.000Z"),
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
  });
  assert.deepEqual(second, { attempted: 1, delivered: 1, failed: 0 });
  assert.deepEqual(keys, ["evt-1", "evt-1"]);

  const alreadyDelivered = await dispatchDomainOutbox(db, async () => {
    throw new Error("delivered rows must not dispatch twice");
  }, { now: new Date("2026-09-14T00:01:00.000Z") });
  assert.deepEqual(alreadyDelivered, { attempted: 0, delivered: 0, failed: 0 });
  db.close();
});

test("outbox dispatcher bounds batches, retry attempts, and configuration", async () => {
  const db = new SqliteDatabase(":memory:");
  try {
    for (let index = 0; index < 3; index += 1) {
      transactionWithDomainOutbox(db, ({ enqueue }) => enqueue({
        id: `evt-${index}`,
        topic: "test.event",
        payload: "{}",
        created_at: `2026-09-14T00:00:0${index}.000Z`,
      }));
    }

    const result = await dispatchDomainOutbox(db, async () => undefined, {
      limit: 2,
      now: new Date("2026-09-14T00:01:00.000Z"),
    });
    assert.deepEqual(result, { attempted: 2, delivered: 2, failed: 0 });

    await assert.rejects(
      dispatchDomainOutbox(db, async () => undefined, { limit: 201 }),
      /limit must be an integer/,
    );
  } finally {
    db.close();
  }
});
