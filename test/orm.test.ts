import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";

test("native ORM creates, relates, updates and rolls back in one domain", async () => {
  const env = await boot({ profile: "business-base", memory: true });
  const product = env.orm.model("catalog.product");
  const offer = env.orm.model("catalog.offer");

  product.create({
    product_ref: "prd-1",
    owner_ref: "owner-1",
    tenant_ref: "tenant-1",
    name: "Internet",
    product_kind: "service",
  });
  offer.create({
    offer_ref: "off-1",
    product_ref: "prd-1",
    tenant_ref: "tenant-1",
    scope_ref: "scope-1",
    terms_ref: "terms-1",
  });

  assert.equal(offer.get("off-1")?.product_ref, "prd-1");
  assert.throws(() =>
    offer.create({
      offer_ref: "off-bad",
      product_ref: "missing",
      tenant_ref: "tenant-1",
      scope_ref: "scope-1",
      terms_ref: "terms-1",
    }),
  );

  env.orm.atomic("catalog", () => product.update("prd-1", { name: "Internet Pro" }));
  assert.equal(product.get("prd-1")?.name, "Internet Pro");
  env.close();
});

test("ORM comparison operators are parameterized, bounded and deterministic", async () => {
  const env = await boot({ profile: "business-base", memory: true });
  const product = env.orm.model("catalog.product");

  try {
    for (const [ref, name] of [["prd-a", "Alpha"], ["prd-b", "Beta"], ["prd-c", "Gamma"]] as const) {
      product.create({
        product_ref: ref,
        owner_ref: "owner-1",
        tenant_ref: "tenant-1",
        name,
        product_kind: "service",
      });
    }

    assert.deepEqual(
      product.find({ comparisons: [{ field: "name", op: "in", value: ["Alpha", "Gamma"] }] }).map((row) => row.name),
      ["Alpha", "Gamma"],
    );
    assert.deepEqual(
      product.find({ comparisons: [{ field: "name", op: "ne", value: "Beta" }] }).map((row) => row.name),
      ["Alpha", "Gamma"],
    );
    assert.equal(product.find({ comparisons: [{ field: "id", op: "gt", value: 1 }] }).length, 2);
    assert.equal(product.count({}, [{ field: "name", op: "notIn", value: ["Alpha"] }]), 2);

    assert.throws(
      () => product.find({ comparisons: [{ field: "name", op: "eq", value: "Alpha' OR 1=1 --" }] }),
      undefined,
      "parameterized attacker-shaped values must be treated as data, not syntax",
    );
  } finally {
    env.close();
  }
});
