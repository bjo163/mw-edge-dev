import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { createApp } from "../src/http/app.js";
import { resourceMetadata } from "../src/kernel/metadata.js";
import { ModelRegistry } from "../src/kernel/model-registry.js";
import type { ModelAuthority } from "../src/kernel/types.js";
import { serializeResourceForm } from "../web/src/resource/form-serialization.js";
import type { ResourceMetadata as WebResourceMetadata } from "../web/src/api.js";

const widgetAllowlist = new Set(["text", "textarea", "number", "checkbox", "select", "datetime", "reference", "relation", "json"]);

function fixture(authority: ModelAuthority, suffix: string) {
  const registry = new ModelRegistry();
  registry.register({
    name: `fixture.${suffix}`,
    domain: "fixture",
    component: "mw.fixture",
    authority,
    fields: {
      item_ref: { type: "String", required: true, unique: true },
      name: { type: "String", required: true },
      status: { type: "Enum", enum: ["draft", "active"] },
      amount: { type: "Decimal" },
      observed_at: { type: "DateTime" },
      secret: { type: "String", sensitive: true },
      payload: { type: "Json" },
    },
  }, "mw.fixture");
  return resourceMetadata(registry.get(`fixture.${suffix}`));
}

test("ResourceMetadata v2 is descriptive, allowlisted, and authority-safe", () => {
  for (const [authority, suffix] of [
    ["CANONICAL", "canonical"],
    ["REFERENCE", "reference"],
    ["OBSERVATION", "observation"],
    ["LOCAL_ONLY", "local"],
  ] as const) {
    const metadata = fixture(authority, suffix);
    assert.equal(metadata.metadata_version, "2");
    assert.equal(metadata.record_key, "item_ref");
    assert.equal(metadata.display.primary_field, "name");
    assert.equal(metadata.display.status_field, "status");
    assert.ok(metadata.views.detail.sections[0]?.fields.includes("name"));
    assert.ok(metadata.views.form.sections[0]);
    assert.ok(!Object.hasOwn(metadata.fields, "secret"));
    assert.ok(metadata.sensitive_fields_hidden.includes("secret"));
    assert.deepEqual(metadata.actions, []);
    for (const field of Object.values(metadata.fields)) assert.ok(widgetAllowlist.has(field.widget), `unexpected widget ${field.widget}`);
    if (authority === "REFERENCE") assert.equal(metadata.crud.create, false);
  }
});

test("generic form serialization is typed and fails closed for unsupported editors", () => {
  const metadata = fixture("CANONICAL", "form") as unknown as WebResourceMetadata;
  const valid = serializeResourceForm(metadata, {
    item_ref: "fx-1",
    name: "Example",
    status: "active",
    amount: "12.5",
    observed_at: "2026-09-14T08:00",
  });
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.body.item_ref, "fx-1");
  assert.equal(valid.body.amount, 12.5);
  assert.equal(valid.body.status, "active");
  assert.match(String(valid.body.observed_at), /^2026-09-14T/);
  assert.ok(!Object.hasOwn(valid.body, "payload"), "read-only JSON field must not leak into generic create payload");

  const invalid = serializeResourceForm(metadata, { item_ref: "", name: "", amount: "not-a-number" });
  assert.ok(invalid.errors.item_ref);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.amount);
});

test("resource HTTP contract supports bounded filter, sort, and single-record reads", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "workbench-http-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });
  const app = createApp(env);
  try {
    let response = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "workbench-http-password-123" }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie") ?? "";

    response = await app.request("/api/meta/app", { headers: { cookie } });
    assert.equal(response.status, 200);
    const appMetadata = (await response.json()) as { version: string; resources: readonly { resource_id: string; metadata_version: string }[] };
    assert.equal(appMetadata.version, "2");
    assert.equal(appMetadata.resources.find((resource) => resource.resource_id === "standalone.principal")?.metadata_version, "2");

    response = await app.request("/api/admin/resources/standalone.principal?limit=1&offset=0&sort=username&direction=asc&filter.username=admin", { headers: { cookie } });
    assert.equal(response.status, 200);
    const list = (await response.json()) as { items: readonly Record<string, unknown>[]; total: number; limit: number; sort: string; filters: Record<string, unknown> };
    assert.equal(list.total, 1);
    assert.equal(list.limit, 1);
    assert.equal(list.sort, "username");
    assert.equal(list.filters.username, "admin");
    assert.equal(list.items[0]?.username, "admin");
    assert.ok(!Object.hasOwn(list.items[0] ?? {}, "password_hash"));

    response = await app.request("/api/admin/resources/standalone.principal/mw.super-admin", { headers: { cookie } });
    assert.equal(response.status, 200);
    const detail = (await response.json()) as { item: Record<string, unknown> };
    assert.equal(detail.item.principal_ref, "mw.super-admin");
    assert.ok(!Object.hasOwn(detail.item, "password_hash"));

    response = await app.request("/api/admin/resources/standalone.principal?filter.password_hash=nope", { headers: { cookie } });
    assert.equal(response.status, 400, "unknown/sensitive filters must fail closed");

    response = await app.request("/api/admin/resources/standalone.principal/not-a-principal", { headers: { cookie } });
    assert.equal(response.status, 404);
  } finally {
    env.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  }
});
