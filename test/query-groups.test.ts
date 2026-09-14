import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { compileBooleanFilterGroup } from "../src/kernel/query-filter.js";

test("boolean query groups compile deterministic AND OR NOT expressions", () => {
  const fields = {
    name: { type: "String" as const },
    active: { type: "Boolean" as const },
  };
  const compiled = compileBooleanFilterGroup(fields, {
    boolean: "and",
    filters: [
      {
        boolean: "or",
        filters: [
          { field: "name", op: "eq", value: "Alpha" },
          { field: "name", op: "eq", value: "Beta" },
        ],
      },
      { boolean: "not", filters: [{ field: "active", op: "eq", value: false }] },
    ],
  });

  assert.equal(compiled.clause, '(("name" = ? OR "name" = ?) AND NOT ("active" = ?))');
  assert.deepEqual(compiled.params, ["Alpha", "Beta", 0]);
});

test("boolean query groups are bounded by depth and node count", () => {
  const fields = { name: { type: "String" as const } };
  assert.throws(
    () => compileBooleanFilterGroup(fields, {
      boolean: "not",
      filters: [{
        boolean: "not",
        filters: [{
          boolean: "not",
          filters: [{ field: "name", op: "eq", value: "x" }],
        }],
      }],
    }, { maxDepth: 2 }),
    /maximum depth/i,
  );

  assert.throws(
    () => compileBooleanFilterGroup(fields, {
      boolean: "or",
      filters: [
        { field: "name", op: "eq", value: "a" },
        { field: "name", op: "eq", value: "b" },
      ],
    }, { maxNodes: 2 }),
    /maximum of 2 nodes/i,
  );
});

test("ORM find applies nested boolean groups without unbounded SQL", async () => {
  const env = await boot({ profile: "business-base", memory: true });
  const products = env.orm.model("catalog.product");

  try {
    for (const [ref, name] of [["prd-a", "Alpha"], ["prd-b", "Beta"], ["prd-c", "Gamma"]] as const) {
      products.create({
        product_ref: ref,
        owner_ref: "owner-1",
        tenant_ref: "tenant-1",
        name,
        product_kind: "service",
      });
    }

    const result = products.find({
      filterGroup: {
        boolean: "and",
        filters: [
          {
            boolean: "or",
            filters: [
              { field: "name", op: "eq", value: "Alpha" },
              { field: "name", op: "eq", value: "Beta" },
            ],
          },
          { boolean: "not", filters: [{ field: "name", op: "eq", value: "Gamma" }] },
        ],
      },
      orderBy: "name asc",
    });
    assert.deepEqual(result.map((row) => row.name), ["Alpha", "Beta"]);
  } finally {
    env.close();
  }
});
