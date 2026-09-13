import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { validateManifest } from "../src/kernel/plugins/manifest.js";
import { validateProfile } from "../src/kernel/plugins/profile.js";

const EXPECTED_STABILITY_VALUES = [
  "stable",
  "beta",
  "experimental",
  "internal",
  "deprecated",
] as const;

function assertRepositoryPath(path: string, label: string): void {
  assert.ok(path.length > 0, `${label} must not be empty`);
  assert.equal(isAbsolute(path), false, `${label} must be repository-relative: ${path}`);
  assert.equal(
    path.split("/").includes(".."),
    false,
    `${label} must not escape the repository: ${path}`,
  );
  assert.equal(existsSync(resolve(process.cwd(), path)), true, `${label} does not exist: ${path}`);
}

function assertUniquePaths(paths: string[], label: string): void {
  assert.equal(new Set(paths).size, paths.length, `${label} contains duplicate evidence paths`);
}

function assertEvidencePathClass(path: string, kind: "test" | "documentation", contractId: string): void {
  if (kind === "test") {
    assert.ok(
      path.startsWith("test/") || path.startsWith(".github/scripts/"),
      `${contractId} test evidence must point to test/ or .github/scripts/: ${path}`,
    );
    return;
  }

  assert.ok(
    path.startsWith("docs/"),
    `${contractId} documentation evidence must point to docs/: ${path}`,
  );
}

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
  assert.deepEqual(catalog.stability_values, EXPECTED_STABILITY_VALUES);
  assert.equal(new Set(catalog.stability_values).size, catalog.stability_values.length);
  assert.ok(catalog.contracts.length > 0);

  const ids = new Set<string>();
  for (const entry of catalog.contracts) {
    assert.match(entry.id, /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, `malformed contract id ${entry.id}`);
    assert.ok(!ids.has(entry.id), `duplicate contract id ${entry.id}`);
    ids.add(entry.id);

    assert.ok(catalog.stability_values.includes(entry.stability), entry.id);
    assert.match(entry.owner, /^area:[a-z0-9]+(?:-[a-z0-9]+)*$/, `${entry.id} has malformed owner`);
    assertRepositoryPath(entry.source, `${entry.id} source`);

    assert.ok(Array.isArray(entry.tests), `${entry.id} tests must be an array`);
    assert.ok(Array.isArray(entry.docs), `${entry.id} docs must be an array`);
    assertUniquePaths(entry.tests, `${entry.id} tests`);
    assertUniquePaths(entry.docs, `${entry.id} docs`);

    if (entry.stability === "stable" || entry.stability === "beta") {
      assert.ok(entry.tests.length > 0, `${entry.id} requires test evidence`);
      assert.ok(entry.docs.length > 0, `${entry.id} requires documentation`);
    }

    for (const path of entry.tests) {
      assertEvidencePathClass(path, "test", entry.id);
      assertRepositoryPath(path, `${entry.id} test evidence`);
    }
    for (const path of entry.docs) {
      assertEvidencePathClass(path, "documentation", entry.id);
      assertRepositoryPath(path, `${entry.id} documentation`);
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
