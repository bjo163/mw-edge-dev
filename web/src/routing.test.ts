import assert from "node:assert/strict";
import test from "node:test";
import { readRoute, recordPath, resourcePath } from "./routing";

test("readRoute resolves reload-safe canonical routes", () => {
  assert.deepEqual(readRoute("/"), { kind: "home" });
  assert.deepEqual(readRoute("/resources/customer"), { kind: "resource", resourceId: "customer" });
  assert.deepEqual(readRoute("/resources/customer/42"), {
    kind: "record",
    resourceId: "customer",
    recordId: "42",
  });
});

test("readRoute decodes deep-link segments", () => {
  assert.deepEqual(readRoute("/resources/sales%20order/SO%2F001"), {
    kind: "record",
    resourceId: "sales order",
    recordId: "SO/001",
  });
});

test("readRoute fails closed for unsupported or malformed paths", () => {
  assert.deepEqual(readRoute("/settings"), { kind: "not-found" });
  assert.deepEqual(readRoute("/resources"), { kind: "not-found" });
  assert.deepEqual(readRoute("/resources/customer/42/extra"), { kind: "not-found" });
  assert.deepEqual(readRoute("/resources/%E0%A4%A"), { kind: "not-found" });
});

test("path builders encode canonical resource and record links", () => {
  assert.equal(resourcePath("sales order"), "/resources/sales%20order");
  assert.equal(recordPath("sales order", "SO/001"), "/resources/sales%20order/SO%2F001");
});
