import test from "node:test";
import assert from "node:assert/strict";
import { boot, ModelRegistry, resourceMetadata } from "../src/index.js";
import { createApp } from "../src/http/app.js";

test("future sensitive fields are automatically excluded from generated metadata", () => {
  const registry = new ModelRegistry();
  registry.register(
    {
      name: "security.redaction_fixture",
      domain: "security",
      component: "security-fixture",
      authority: "LOCAL_ONLY",
      fields: {
        fixture_ref: { type: "String", required: true },
        display_name: { type: "String" },
        future_secret: { type: "String", sensitive: true },
      },
    },
    "security-fixture",
  );

  const metadata = resourceMetadata(registry.get("security.redaction_fixture"));
  assert.equal(Object.hasOwn(metadata.fields, "future_secret"), false);
  assert.equal(metadata.sensitive_fields_hidden.includes("future_secret"), true);
  assert.equal(metadata.views.list.columns.includes("future_secret"), false);
  assert.equal(
    metadata.views.form.sections.some((section) => section.fields.includes("future_secret")),
    false,
  );
});

test("every declared sensitive field is hidden from application metadata", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "redaction-test-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });

  try {
    for (const model of env.registry.list()) {
      const sensitive = Object.entries(model.fields)
        .filter(([, field]) => field.sensitive)
        .map(([name]) => name);
      if (sensitive.length === 0) continue;

      const metadata = env.metadata.resources.find((resource) => resource.resource_id === model.name);
      assert.ok(metadata, `missing metadata for ${model.name}`);

      for (const field of sensitive) {
        assert.equal(Object.hasOwn(metadata.fields, field), false, `${model.name} leaked ${field} in fields`);
        assert.equal(
          metadata.sensitive_fields_hidden.includes(field),
          true,
          `${model.name} did not declare ${field} as hidden`,
        );
        assert.equal(metadata.views.list.columns.includes(field), false, `${model.name} leaked ${field} in list`);
        assert.equal(
          metadata.views.form.sections.some((section) => section.fields.includes(field)),
          false,
          `${model.name} leaked ${field} in form`,
        );
      }
    }
  } finally {
    env.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  }
});

test("standalone API responses redact principal and session secrets", async () => {
  process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "redaction-api-password-123";
  const env = await boot({ profile: "standalone-business", memory: true });

  try {
    const app = createApp(env);
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "redaction-api-password-123" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";

    const session = await app.request("/api/auth/session", { headers: { cookie } });
    assert.equal(session.status, 200);
    const sessionBody = (await session.json()) as { principal: Record<string, unknown> };
    assert.equal(Object.hasOwn(sessionBody.principal, "password_hash"), false);

    const principals = await app.request("/api/admin/resources/standalone.principal", { headers: { cookie } });
    assert.equal(principals.status, 200);
    const principalBody = (await principals.json()) as { items: readonly Record<string, unknown>[] };
    assert.ok(principalBody.items.length > 0);
    assert.equal(principalBody.items.some((item) => Object.hasOwn(item, "password_hash")), false);

    const sessions = await app.request("/api/admin/resources/standalone.session", { headers: { cookie } });
    assert.equal(sessions.status, 200);
    const sessionListBody = (await sessions.json()) as { items: readonly Record<string, unknown>[] };
    assert.ok(sessionListBody.items.length > 0);
    assert.equal(sessionListBody.items.some((item) => Object.hasOwn(item, "token_hash")), false);
  } finally {
    env.close();
    delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  }
});

