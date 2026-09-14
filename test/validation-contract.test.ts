import test from "node:test";
import assert from "node:assert/strict";
import { ValidationError, ValidationRegistry } from "../src/kernel/validation.js";

test("declarative validation runs fields then domain in declared deterministic order", () => {
  const registry = new ValidationRegistry();
  const observed: string[] = [];

  registry.registerField("string.non_empty", ({ field, value, options }) => {
    observed.push(`field:${field}:non_empty`);
    assert.equal(options.trim, true);
    if (typeof value !== "string" || value.trim().length === 0) return { message: `${field} is required` };
  });
  registry.registerField("string.max_length", ({ field, value, options }) => {
    observed.push(`field:${field}:max_length`);
    const max = Number(options.max);
    if (typeof value === "string" && value.length > max) return { message: `${field} is too long` };
  });
  registry.registerDomain("order.total_positive", ({ record }) => {
    observed.push("domain:total_positive");
    if (Number(record.total) <= 0) return { message: "total must be positive" };
  });

  registry.validate({
    fields: [{
      field: "name",
      rules: [
        { validator: "string.non_empty", options: { trim: true } },
        { validator: "string.max_length", options: { max: 20 } },
      ],
    }],
    domain: [{ validator: "order.total_positive" }],
  }, {
    domain: "commerce",
    model: "commerce.order",
    record: { name: "Order A", total: 10 },
  });

  assert.deepEqual(observed, [
    "field:name:non_empty",
    "field:name:max_length",
    "domain:total_positive",
  ]);
});

test("validation failure is typed and stops at the first deterministic failing rule", () => {
  const registry = new ValidationRegistry();
  const observed: string[] = [];
  registry.registerField("required", ({ field, value }) => {
    observed.push("required");
    if (!value) return { message: `${field} is required`, details: { reason: "empty" } };
  });
  registry.registerField("never_reached", () => {
    observed.push("never_reached");
  });

  assert.throws(
    () => registry.validate({
      fields: [{
        field: "name",
        rules: [{ validator: "required" }, { validator: "never_reached" }],
      }],
    }, {
      domain: "catalog",
      model: "catalog.product",
      record: { name: "" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.code, "VALIDATION_FAILED");
      assert.equal(error.status, 400);
      assert.deepEqual(error.details, {
        scope: "field",
        validator: "required",
        field: "name",
        details: { reason: "empty" },
      });
      return true;
    },
  );
  assert.deepEqual(observed, ["required"]);
});

test("validator registry fails closed for unknown, duplicate, invalid and unbounded plans", () => {
  const registry = new ValidationRegistry();
  registry.registerField("known", () => undefined);
  assert.throws(() => registry.registerField("known", () => undefined), /Duplicate validator/);
  assert.throws(() => registry.registerDomain("INVALID VALIDATOR", () => undefined), /Invalid validator id/);
  assert.throws(
    () => registry.validate({ fields: [{ field: "name", rules: [{ validator: "missing" }] }] }, {
      domain: "catalog", model: "catalog.product", record: { name: "A" },
    }),
    /Unknown field validator/,
  );
  assert.throws(
    () => registry.validate({
      domain: Array.from({ length: 101 }, () => ({ validator: "missing" })),
    }, {
      domain: "catalog", model: "catalog.product", record: {},
    }),
    /at most 100 rules/,
  );
});
