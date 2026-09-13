import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  checkDomainIntegrity,
  profileDatabaseDomains,
} from "../src/kernel/database/integrity.js";

test("profile integrity domain discovery is deterministic", async () => {
  const domains = await profileDatabaseDomains("standalone-business");
  assert.ok(domains.length > 0);
  assert.deepEqual(domains, [...domains].sort());
  assert.equal(new Set(domains).size, domains.length);
});

test("read-only integrity probe accepts a healthy SQLite database", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-integrity-"));
  const path = join(dir, "healthy.db");
  try {
    const database = new DatabaseSync(path);
    database.exec("CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id)); INSERT INTO parent(id) VALUES (1); INSERT INTO child(id, parent_id) VALUES (1, 1);");
    database.close();

    const result = checkDomainIntegrity("healthy", path);
    assert.equal(result.ok, true);
    assert.deepEqual(result.quickCheck, ["ok"]);
    assert.equal(result.foreignKeyViolations, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read-only integrity probe reports foreign-key violations", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-integrity-"));
  const path = join(dir, "invalid.db");
  try {
    const database = new DatabaseSync(path);
    database.exec("PRAGMA foreign_keys = OFF; CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id)); INSERT INTO child(id, parent_id) VALUES (1, 999);");
    database.close();

    const result = checkDomainIntegrity("invalid", path);
    assert.equal(result.ok, false);
    assert.deepEqual(result.quickCheck, ["ok"]);
    assert.equal(result.foreignKeyViolations, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read-only integrity probe fails clearly for a missing database", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-edge-integrity-"));
  try {
    const result = checkDomainIntegrity("missing", join(dir, "missing.db"));
    assert.equal(result.ok, false);
    assert.equal(result.error, "database file not found");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
