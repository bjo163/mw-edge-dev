# Public contract inventory

The machine-auditable authority for this page is [public-contracts.json](../../schemas/public-contracts.json). A surface appearing in the repository is **not** public merely because TypeScript exports it.

## Stability classes

- **stable** — compatible within the current major line; breaking change requires the major-version policy.
- **beta** — supported for evaluation/use, but may change with documented migration before V1 freeze.
- **experimental** — no compatibility guarantee; opt-in and off by default.
- **internal** — implementation detail, not a supported integration point.
- **deprecated** — still present temporarily with replacement/removal guidance.

## Current inventory

| Contract family | Stability | Owner | Canonical source |
|---|---|---|---|
| Health/bootstrap/auth/metadata/admin HTTP routes | beta | API/Security | [HTTP app](../../src/http/app.ts) |
| Typed command registry + idempotency | stable | Kernel | [commands.ts](../../src/kernel/commands.ts) |
| Typed query registry | stable | Kernel | [queries.ts](../../src/kernel/queries.ts) |
| Plugin/addon manifest | stable | Plugin | [JSON Schema](../../schemas/plugin-manifest.schema.json) + runtime validator |
| Profile document | stable | Plugin | [JSON Schema](../../schemas/profile.schema.json) + runtime validator |
| Resource/field/view metadata | stable | UI/Kernel | [kernel types](../../src/kernel/types.ts) + metadata generator |
| Extension-point registry | stable | Plugin | [extensions.ts](../../src/kernel/plugins/extensions.ts) |
| Migration baseline/checksum semantics | beta | Migration | [schema.ts](../../src/kernel/schema.ts) |
| Seed runner | stable | Plugin | [runner.ts](../../src/kernel/seeds/runner.ts) |
| SQLite adapter capability surface | stable | DB | [adapter.ts](../../src/kernel/database/adapter.ts) |
| Cloudflare D1 adapter | experimental | DB | [d1.ts](../../src/kernel/database/d1.ts) |
| Documented operator commands/environment | beta | Ops | [package.json](../../package.json) and operator docs |

The detailed catalog records test and documentation evidence for each row. CI fails if a public catalog entry points at missing source, test, or documentation files.

## Deliberately internal surfaces

Plugin host implementation objects, lifecycle mutation internals, registry map storage, SQLite native handles, HTTP middleware context internals, and generated build paths remain internal unless a future catalog change deliberately promotes them.

## Gaps before V1 freeze

The V1 extension/runtime freeze is recorded in [V1 contract freeze](v1-contract-freeze.md). Remaining beta surfaces must still be reviewed under the [compatibility policy](compatibility.md). D1 stays experimental and is explicitly outside the V1 compatibility promise. New public surfaces must add catalog evidence in the same PR.
