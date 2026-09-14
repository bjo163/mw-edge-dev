# Production load baseline

Issue #118 uses a repeatable regression baseline rather than a throughput marketing number.

## Workloads

`scripts/performance-baseline.ts` exercises four repository-owned paths on the pinned Node/pnpm toolchain:

- full-profile boot plus metadata materialization and serialization;
- 200 ORM create/read operations plus a bounded sorted page query;
- 500 command and 500 query registrations followed by deterministic lookup/list operations;
- 5,000 typed UI presentation-format operations using the production presentation layer.

UI bundling remains separately enforced by the canonical `pnpm ui:build` readiness gate.

## Regression envelopes

| Workload | Ceiling |
|---|---:|
| full boot + metadata | 5,000 ms |
| ORM mixed workload | 3,000 ms |
| command/query registry workload | 1,000 ms |
| UI presentation workload | 2,000 ms |

These are GitHub-runner portability ceilings, not capacity or throughput claims. Lower is better. Loosening a threshold requires reviewed evidence rather than changing a number only to make CI green.

## Reproduce and evidence

```bash
pnpm exec tsx scripts/performance-baseline.ts
```

Canonical readiness runs the same command and retains its structured JSON in the exact-SHA Actions log.

## Residual risks

This local baseline does not model deployment-specific disk, network, reverse proxy, browser paint, or multi-user contention. It detects large regressions in repository-owned boot, metadata, ORM, registry, and UI formatting paths; it is not a capacity-planning substitute.
