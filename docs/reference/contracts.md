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
| Typed command registry + idempotency | beta | Kernel | [commands.ts](../../src/kernel/commands.ts) |
| Typed query registry | beta | Kernel | [queries.ts](../../src/kernel/queries.ts) |
| Plugin/addon manifest | beta | Plugin | [JSON Schema](../../schemas/plugin-manifest.schema.json) + runtime validator |
| Profile document | beta | Plugin | [JSON Schema](../../schemas/profile.schema.json) + runtime validator |
| Resource/field/view metadata | beta | UI/Kernel | [kernel types](../../src/kernel/types.ts) + metadata generator |
| Extension-point registry | beta | Plugin | [extensions.ts](../../src/kernel/plugins/extensions.ts) |
| Migration baseline/checksum semantics | beta | Migration | [schema.ts](../../src/kernel/schema.ts) |
| Seed runner | beta | Plugin | [runner.ts](../../src/kernel/seeds/runner.ts) |
| SQLite adapter capability surface | beta | DB | [adapter.ts](../../src/kernel/database/adapter.ts) |
| Cloudflare D1 adapter | experimental | DB | [d1.ts](../../src/kernel/database/d1.ts) |
| Documented operator commands/environment | beta | Ops | [package.json](../../package.json) and operator docs |

The detailed catalog records test and documentation evidence for each row. CI fails if a public catalog entry points at missing source, test, or documentation files.

## Evidence coverage and gaps

`schemas/public-contracts.json` is the reviewable evidence ledger for every catalog entry. Each entry records its owner, canonical source, test evidence, documentation evidence, and stability classification. `test/contracts.test.ts` validates that these paths are repository-relative, unique, and still exist.

For `stable` and `beta` contracts, both test evidence and documentation evidence are mandatory. A missing evidence array is therefore a contract-inventory failure rather than an informal documentation TODO. `experimental` entries remain visible in the catalog so their source and ownership can be reviewed, but they are not part of the V1 compatibility promise unless separately promoted.

At the current inventory revision there are no `stable` or `beta` entries intentionally accepted without test or documentation evidence. Any future gap must be explicit: either add the missing evidence in the same change, or downgrade/reclassify the surface with a documented reason instead of silently leaving a supported contract unverified.

## Contract change review

A pull request that adds, removes, renames, or changes an externally supported surface should review the catalog in the same diff:

1. Add or update the corresponding `schemas/public-contracts.json` entry.
2. Confirm the owner and canonical source path still identify the authority for the contract.
3. Select the stability class deliberately; an export is not automatically a supported contract.
4. Add or update focused test evidence and user/developer documentation for every `stable` or `beta` entry.
5. Treat promotion to `stable`, deprecation, removal, or a breaking shape change as compatibility-policy work, not a documentation-only edit.
6. Run the contract regression tests so stale/missing evidence paths fail before merge.

This makes contract additions and removals visible as ordinary code review changes and gives #122 a bounded, auditable input for the V1 freeze instead of requiring a fresh repository-wide rediscovery.

## Deliberately internal surfaces

Plugin host implementation objects, lifecycle mutation internals, registry map storage, SQLite native handles, HTTP middleware context internals, and generated build paths remain internal unless a future catalog change deliberately promotes them.

## V1 freeze status

The V1 freeze is **not complete** at this inventory revision. No entry in `schemas/public-contracts.json` is classified `stable`; current supported surfaces remain `beta`, and the D1 adapter remains `experimental`.

The original #122 blocker around missing command/query contracts has been reduced: the typed `DomainCommand`, command registry, and query registry work tracked by #3, #4, and #5 is now complete and represented by `commands.v1` and `queries.v1` in the catalog. Their current status is still `beta`, so their presence is evidence for freeze review, not evidence that the V1 promise has already been made.

The unresolved database-adapter risk remains #95. The catalog deliberately keeps `d1-adapter.experimental` outside the V1 compatibility promise while SQLite remains the beta adapter surface. Closing or changing #95 must not silently promote D1: promotion requires an explicit catalog stability change, corresponding tests/documentation, and compatibility review.

A release may claim the V1 extension-contract freeze only when all contracts intended for the V1 promise have been reviewed and explicitly promoted to `stable`, the exact catalog revision is recorded as release evidence, and unresolved experimental/internal surfaces are clearly excluded. After that point, the [compatibility policy](compatibility.md) requires breaking changes to stable contracts to use a major release (subject only to the documented security exception).

## Gaps before V1 freeze

All beta surfaces must be reviewed under the [compatibility policy](compatibility.md). D1 stays experimental and therefore is not part of the V1 compatibility promise unless separately promoted. New public surfaces must add catalog evidence in the same PR.
