import test from "node:test";
import assert from "node:assert/strict";
import {
  CommandRegistry,
  QueryRegistry,
  type DomainCommand,
  type DomainQuery,
} from "../src/index.js";

test("typed command registry resolves deterministically and fails closed", () => {
  type CreateInput = { readonly name: string };
  type CreateOutput = { readonly organization_ref: string };

  const create: DomainCommand<CreateInput, CreateOutput> = {
    id: "business.organization.create",
    version: "1.0.0",
    domain: "business",
  };
  const archive: DomainCommand<{ readonly organization_ref: string }, { readonly archived: boolean }> = {
    id: "business.organization.archive",
    version: "1.0.0",
    domain: "business",
  };

  const registry = new CommandRegistry();
  registry.register(create);
  registry.register(archive);

  assert.equal(registry.get(create.id).id, create.id);
  assert.equal(registry.has(archive.id), true);
  assert.deepEqual(registry.list().map((command) => command.id), [
    "business.organization.archive",
    "business.organization.create",
  ]);

  assert.throws(() => registry.register(create), /Duplicate command business\.organization\.create/);
  assert.throws(
    () => new CommandRegistry().register({ id: "business.bad-version", version: "v1", domain: "business" }),
    /Invalid command version/,
  );
  assert.throws(
    () => new CommandRegistry().register({ id: "crm.organization.create", version: "1.0.0", domain: "business" }),
    /Command domain mismatch/,
  );
  assert.throws(() => registry.get("business.unknown"), /Unknown command business\.unknown/);
});

test("typed query registry remains separate and versioned", () => {
  type LookupInput = { readonly organization_ref: string };
  type LookupOutput = { readonly name: string } | undefined;

  const lookup: DomainQuery<LookupInput, LookupOutput> = {
    id: "business.organization.get",
    version: "1.0.0",
    domain: "business",
  };
  const search: DomainQuery<{ readonly text: string }, readonly { readonly organization_ref: string }[]> = {
    id: "business.organization.search",
    version: "1.0.0",
    domain: "business",
  };

  const queries = new QueryRegistry();
  queries.register(search);
  queries.register(lookup);

  assert.equal(queries.get(lookup.id).version, "1.0.0");
  assert.deepEqual(queries.list().map((query) => query.id), [
    "business.organization.get",
    "business.organization.search",
  ]);
  assert.throws(() => queries.register(lookup), /Duplicate query business\.organization\.get/);
  assert.throws(
    () => new QueryRegistry().register({ id: "business.bad-version", version: "1", domain: "business" }),
    /Invalid query version/,
  );
  assert.throws(
    () => new QueryRegistry().register({ id: "crm.organization.get", version: "1.0.0", domain: "business" }),
    /Query domain mismatch/,
  );
  assert.throws(() => queries.get("business.unknown"), /Unknown query business\.unknown/);

  const commands = new CommandRegistry();
  commands.register({ id: "business.organization.get", version: "1.0.0", domain: "business" });
  assert.equal(commands.has("business.organization.get"), true);
  assert.equal(queries.has("business.organization.get"), true);
});
