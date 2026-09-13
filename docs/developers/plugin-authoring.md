# Plugin and addon authoring

Use the [minimal plugin](../../examples/minimal-plugin/README.md) and [minimal addon](../../examples/minimal-addon/README.md) as executable references. They are loaded by the real host in CI.

## Domain plugin

A plugin owns one logical domain database. Add a manifest matching the canonical [manifest schema](../../schemas/plugin-manifest.schema.json), model definitions whose `component`/domain match that ownership, and an entrypoint exporting `models` plus an optional deterministic `seed(context)`.

Declare only extension points and capabilities that are intentional public seams. Extension point identifiers are versioned (for example `example.commands@1`); changing their meaning incompatibly is a contract change.

Schema materialization is tracked by component/migration checksum. Never edit a historical applied schema baseline to simulate migration. Future evolution must use an explicit forward migration path and pass released-version compatibility evidence.

Seeds must be deterministic and idempotent through the seed runner. Do not read machine-local secrets into seed payloads.

## Addon

An addon does not own a database. It declares one target in `extends`, shares the target domain, lists its dependencies, uses only extension points declared by that host, and requests only capabilities provided by its dependency graph. The loader rejects domain/extension/capability mismatches.

Addon models are materialized into the target domain database. Seed ordering follows component dependency order, so an addon may reference deterministic host seed data when that relationship is explicit.

## UI contribution

Current UI behavior is metadata-driven from registered models. Authors contribute supported field/model metadata rather than importing React implementation internals. Sensitive fields must be marked `sensitive: true`; generic metadata/admin APIs will hide/refuse them.

## Verification

Add or update a profile that selects the component, then prove it through the production loader with isolated storage. Finish with `pnpm readiness`. The reference profile/test demonstrates migration, seed, read/write, relation, lifecycle and extension binding behavior. Negative tests should prove unsupported dependency/extension combinations fail with actionable errors.

Public contract changes also update the [contract inventory](../reference/contracts.md) and are classified under the [compatibility policy](../reference/compatibility.md).
