import test from "node:test";
import assert from "node:assert/strict";
import {
  CommandRegistry,
  QueryRegistry,
  executeIdempotently,
  type DomainCommand,
  type DomainQuery,
  type IdempotencyScope,
  type IdempotencyStore,
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
  assert.throws(
    () =>
      new CommandRegistry().register({
        id: "business.invalid-policy",
        version: "1.0.0",
        domain: "business",
        idempotency: "sometimes" as never,
      }),
    /Invalid idempotency policy/,
  );
  assert.throws(() => registry.get("business.unknown"), /Unknown command business\.unknown/);
});

test("idempotency contract prevents duplicate committed execution for the same key", () => {
  class MemoryIdempotencyStore implements IdempotencyStore {
    readonly #results = new Map<string, unknown>();

    execute<Output>(scope: IdempotencyScope, operation: () => Output): Output {
      const id = `${scope.command_id}\u0000${scope.key}`;
      if (this.#results.has(id)) return this.#results.get(id) as Output;
      const result = operation();
      this.#results.set(id, result);
      return result;
    }
  }

  const submit: DomainCommand<{ readonly order_ref: string }, { readonly receipt: string }> = {
    id: "commerce.order.submit",
    version: "1.0.0",
    domain: "commerce",
    idempotency: "required",
  };
  const store = new MemoryIdempotencyStore();
  let executions = 0;

  const first = executeIdempotently(
    submit,
    () => ({ receipt: `receipt-${++executions}` }),
    { key: "retry-42", store },
  );
  const second = executeIdempotently(
    submit,
    () => ({ receipt: `receipt-${++executions}` }),
    { key: "retry-42", store },
  );

  assert.deepEqual(first, { receipt: "receipt-1" });
  assert.deepEqual(second, first);
  assert.equal(executions, 1);

  assert.throws(
    () => executeIdempotently(submit, () => ({ receipt: "never" })),
    /Idempotency key required for commerce\.order\.submit/,
  );
  assert.throws(
    () => executeIdempotently(submit, () => ({ receipt: "never" }), { key: "retry-43" }),
    /Idempotency store required/,
  );

  const optional: DomainCommand<void, number> = {
    id: "commerce.order.preview",
    version: "1.0.0",
    domain: "commerce",
    idempotency: "optional",
  };
  assert.equal(executeIdempotently(optional, () => 7), 7);

  const undeclared: DomainCommand<void, number> = {
    id: "commerce.order.inspect",
    version: "1.0.0",
    domain: "commerce",
  };
  assert.throws(
    () => executeIdempotently(undeclared, () => 8, { key: "unexpected", store }),
    /does not declare idempotency semantics/,
  );
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
