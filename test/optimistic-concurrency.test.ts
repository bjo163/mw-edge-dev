import test from "node:test";
import assert from "node:assert/strict";
import { DomainDatabaseRouter } from "../src/kernel/database/router.js";
import { MwError } from "../src/kernel/errors.js";
import { ModelRegistry } from "../src/kernel/model-registry.js";
import { OrmEnvironment } from "../src/kernel/orm.js";
import { materializeComponent } from "../src/kernel/schema.js";
import type { ModelDefinition, PluginManifest } from "../src/kernel/types.js";

test("optimistic models use record_version compare-and-swap updates", () => {
  const model: ModelDefinition = {
    name: "test.document",
    domain: "test",
    component: "mw.test",
    authority: "CANONICAL",
    optimistic_concurrency: true,
    fields: {
      document_ref: { type: "String", required: true, unique: true },
      title: { type: "String", required: true },
    },
  };
  const manifest: PluginManifest = {
    schema_version: "1.0.0",
    id: "mw.test",
    kind: "domain_plugin",
    version: "1.0.0",
    host_api: "1.0.0",
    domain: "test",
    entrypoint: "./index.js",
    models: ["test.document"],
    requires: [],
    database: { ownership: "exclusive_domain_owner", logical_name: "test" },
    capabilities: { provides: [], requires: [] },
  };

  const registry = new ModelRegistry();
  registry.register(model, "mw.test");
  registry.finalize();
  const router = new DomainDatabaseRouter({ dataDir: ".", memory: true });

  try {
    materializeComponent({
      db: router.get("test"),
      manifest,
      models: [registry.get("test.document")],
      registry,
    });
    const orm = new OrmEnvironment({ registry, router });
    const documents = orm.model("test.document");

    const created = documents.create({ document_ref: "doc-1", title: "Original" });
    assert.equal(created.record_version, 1);

    const first = documents.update("doc-1", { title: "First" }, { expectedVersion: 1 });
    assert.equal(first?.title, "First");
    assert.equal(first?.record_version, 2);

    assert.throws(
      () => documents.update("doc-1", { title: "Stale" }, { expectedVersion: 1 }),
      (error: unknown) =>
        error instanceof MwError &&
        error.code === "CONCURRENCY_CONFLICT" &&
        error.status === 409 &&
        (error.details as { current_version?: unknown }).current_version === 2,
    );
    assert.equal(documents.get("doc-1")?.title, "First");

    const second = documents.update("doc-1", { title: "Second" }, { expectedVersion: 2 });
    assert.equal(second?.record_version, 3);

    assert.throws(
      () => documents.update("doc-1", { title: "Missing version" }),
      (error: unknown) => error instanceof MwError && error.code === "CONCURRENCY_VERSION_REQUIRED",
    );
  } finally {
    router.close();
  }
});

test("optimistic concurrency reserves record_version for kernel ownership", () => {
  const registry = new ModelRegistry();
  registry.register({
    name: "test.invalid",
    domain: "test",
    component: "mw.test",
    authority: "CANONICAL",
    optimistic_concurrency: true,
    fields: {
      invalid_ref: { type: "String", required: true, unique: true },
      record_version: { type: "Integer", required: true },
    },
  }, "mw.test");
  registry.finalize();
  const router = new DomainDatabaseRouter({ dataDir: ".", memory: true });

  try {
    const manifest: PluginManifest = {
      schema_version: "1.0.0",
      id: "mw.test",
      kind: "domain_plugin",
      version: "1.0.0",
      host_api: "1.0.0",
      domain: "test",
      entrypoint: "./index.js",
      models: ["test.invalid"],
      requires: [],
      database: { ownership: "exclusive_domain_owner", logical_name: "test" },
      capabilities: { provides: [], requires: [] },
    };
    assert.throws(
      () => materializeComponent({
        db: router.get("test"),
        manifest,
        models: [registry.get("test.invalid")],
        registry,
      }),
      /reserved field record_version/,
    );
  } finally {
    router.close();
  }
});
