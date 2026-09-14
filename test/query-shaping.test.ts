import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";

test("ORM query shaping selects explicit fields and applies typed bounded sorting", async () => {
  const env = await boot({ profile: "example", memory: true });
  try {
    const items = env.orm.model("example.item");
    for (let index = 1; index <= 5; index += 1) {
      items.create({ item_ref: `item-${index}`, name: `Item ${index}`, rank: index });
    }

    const rows = items.find({
      select: ["item_ref", "rank"],
      sort: [{ field: "rank", direction: "desc" }],
      limit: 2,
    });
    assert.deepEqual(rows.map((row) => Object.keys(row).sort()), [
      ["item_ref", "rank"],
      ["item_ref", "rank"],
    ]);
    assert.deepEqual(rows.map((row) => row.rank), [5, 4]);
    assert.throws(() => items.find({ select: ["missing"] }), /Unknown select field missing/);
    assert.throws(() => items.find({ sort: [{ field: "missing" }] }), /Unknown sort field missing/);
    assert.throws(
      () => items.find({ sort: [{ field: "rank" }, { field: "name" }, { field: "item_ref" }, { field: "id" }] }),
      /at most 3 fields/,
    );
  } finally {
    env.close();
  }
});

test("page pagination is deterministic and fails closed when unbounded", async () => {
  const env = await boot({ profile: "example", memory: true });
  try {
    const items = env.orm.model("example.item");
    for (let index = 1; index <= 5; index += 1) {
      items.create({ item_ref: `page-${index}`, name: `Page ${index}`, rank: index });
    }

    const secondPage = items.find({
      select: ["item_ref"],
      sort: [{ field: "rank", direction: "asc" }],
      pagination: { mode: "page", page: 2, pageSize: 2 },
    });
    assert.deepEqual(secondPage.map((row) => row.item_ref), ["page-3", "page-4"]);
    assert.throws(
      () => items.find({ pagination: { mode: "page", page: 1, pageSize: 201 } }),
      /pageSize must be an integer between 1 and 200/,
    );
    assert.throws(
      () => items.find({ pagination: { mode: "page", page: 0, pageSize: 2 } }),
      /page must be a positive integer/,
    );
  } finally {
    env.close();
  }
});

test("cursor pagination advances by stable internal id and rejects custom sort", async () => {
  const env = await boot({ profile: "example", memory: true });
  try {
    const items = env.orm.model("example.item");
    for (let index = 1; index <= 5; index += 1) {
      items.create({ item_ref: `cursor-${index}`, name: `Cursor ${index}`, rank: index });
    }

    const first = items.find({ pagination: { mode: "cursor", afterId: 0, pageSize: 2 } });
    assert.equal(first.length, 2);
    const lastId = Number(first[1]?.id);
    const second = items.find({ pagination: { mode: "cursor", afterId: lastId, pageSize: 2 } });
    assert.deepEqual(second.map((row) => row.item_ref), ["cursor-3", "cursor-4"]);
    assert.throws(
      () => items.find({
        sort: [{ field: "rank", direction: "desc" }],
        pagination: { mode: "cursor", afterId: 0, pageSize: 2 },
      }),
      /cannot be custom-sorted/,
    );
  } finally {
    env.close();
  }
});
