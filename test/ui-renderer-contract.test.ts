import test from "node:test";
import assert from "node:assert/strict";
import { presentResourceValue } from "../web/src/resource/presentation.js";
import { formatDateTime, formatMoney } from "../web/src/i18n/format.js";
import type { ResourceFieldMetadata } from "../web/src/api.js";

function field(overrides: Partial<ResourceFieldMetadata>): ResourceFieldMetadata {
  return {
    type: "String",
    label: "Field",
    help: null,
    placeholder: null,
    widget: "text",
    format: "text",
    currency_field: null,
    read_only: false,
    generated: false,
    sortable: true,
    filterable: true,
    ...overrides,
  };
}

test("typed UI presentation covers enum text, datetime, money, and status deterministically", () => {
  assert.deepEqual(
    presentResourceValue({ field: field({ type: "Enum", widget: "select", enum: ["draft", "active"] }), value: "active", locale: "en" }),
    { kind: "text", text: "active" },
  );

  const timestamp = "2026-09-14T05:00:00.000Z";
  assert.deepEqual(
    presentResourceValue({ field: field({ type: "DateTime", widget: "datetime", format: "datetime" }), value: timestamp, locale: "en" }),
    { kind: "datetime", text: formatDateTime(timestamp, "en"), dateTime: timestamp },
  );

  assert.deepEqual(
    presentResourceValue({
      field: field({ type: "Decimal", widget: "number", format: "money", currency_field: "currency" }),
      value: 12500,
      locale: "id",
      record: { currency: "IDR" },
    }),
    { kind: "text", text: formatMoney(12500, "IDR", "id") },
  );

  assert.deepEqual(
    presentResourceValue({ field: field({ type: "Enum", widget: "select", format: "status" }), value: "approved", locale: "en" }),
    { kind: "status", text: "approved" },
  );
});

test("typed UI presentation fails safely for empty and malformed formatted values", () => {
  assert.deepEqual(
    presentResourceValue({ field: field({ format: "datetime", type: "DateTime" }), value: "not-a-date", locale: "en" }),
    { kind: "text", text: "not-a-date" },
  );
  assert.deepEqual(
    presentResourceValue({ field: field({ format: "money", type: "Decimal", currency_field: "currency" }), value: 12, locale: "en", record: {} }),
    { kind: "text", text: "12" },
  );
  assert.deepEqual(
    presentResourceValue({ field: field({ format: "status" }), value: "", locale: "en" }),
    { kind: "empty", text: "—" },
  );
});
