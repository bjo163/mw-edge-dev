import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateManifest } from "../src/kernel/plugins/manifest.js";
import { validateProfile } from "../src/kernel/plugins/profile.js";

test("public contract catalog is machine-auditable and points at evidence", () => {
  const catalog = JSON.parse(
    readFileSync(resolve(process.cwd(), "schemas/public-contracts.json"), "utf8"),
  ) as {
    schema_version: string;
    stability_values: string[];
    contracts: Array<{
      id: string;
      stability: string;
      owner: string;
      source: string;
      tests: string[];
      docs: string[];
    }>;
  };

  assert.equal(catalog.schema_version, "1");
  assert.ok(catalog.contracts.length > 0);
  const ids = new Set<string>();
  for (const entry of catalog.contracts) {
    assert.ok(!ids.has(entry.id), `duplicate contract id ${entry.id}`);
    ids.add(entry.id);
    assert.ok(catalog.stability_values.includes(entry.stability), entry.id);
    assert.match(entry.owner, /^area:/);
    assert.equal(existsSync(resolve(process.cwd(), entry.source)), true, entry.source);
    if (entry.stability === "stable" || entry.stability === "beta") {
      assert.ok(entry.tests.length > 0, `${entry.id} requires test evidence`);
      assert.ok(entry.docs.length > 0, `${entry.id} requires documentation`);
    }
    for (const path of [...entry.tests, ...entry.docs]) {
      assert.equal(existsSync(resolve(process.cwd(), path)), true, `${entry.id}: ${path}`);
    }
  }
});

test("manifest validator rejects schema drift and malformed contract fields", () => {
  const base = {
    schema_version: "1.0.0",
    id: "mw.contract",
    kind: "domain_plugin",
    version: "1.0.0",
    host_api: "^1.0.0",
    domain: "contract",
    entrypoint: "./index.js",
    models: [],
    requires: [],
    database: { ownership: "exclusive_domain_owner", logical_name: "contract" },
    extension_points: [],
    capabilities: { provides: [], requires: [] },
  } as const;

  assert.equal(validateManifest(base).id, "mw.contract");
  assert.throws(() => validateManifest({ ...base, extra: true }), /Unknown manifest field extra/);
  assert.throws(() => validateManifest({ ...base, models: [1] }), /models must be a string array/);
  assert.throws(() => validateManifest({ ...base, requires: ["mw.a", "mw.a"] }), /unique values/);
  assert.throws(() => validateManifest({ ...base, schema_version: "2.0.0" }), /Unsupported manifest schema_version/);
});

test("profile validator rejects unknown fields, duplicates, and malformed ids", () => {
  const base = {
    schema_version: "1.0.0",
    id: "contract-profile",
    description: "Contract fixture",
    components: ["mw.contract"],
  };

  assert.equal(validateProfile(base).id, "contract-profile");
  assert.throws(() => validateProfile({ ...base, other: 1 }), /Unknown profile field other/);
  assert.throws(() => validateProfile({ ...base, components: ["mw.contract", "mw.contract"] }), /unique/);
  assert.throws(() => validateProfile({ ...base, id: "Bad Profile" }), /Invalid profile id/);
  assert.throws(() => validateProfile(base, "different"), /Profile id mismatch/);
});
