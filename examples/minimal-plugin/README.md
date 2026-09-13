# Minimal plugin reference

This directory is the smallest repository-shipped domain plugin that exercises the supported MW Edge plugin path. It is a contract fixture, not a business feature.

- `plugin.json` declares identity, domain ownership, models, extension points, capabilities, and host API compatibility.
- `models.ts` demonstrates supported field metadata without relying on internal kernel objects.
- `seed.ts` uses the supported seed runner for deterministic, idempotent fixture data.
- `index.ts` exposes the runtime module loaded by the same host used for normal components.

The plugin owns the `example` domain database. It is registered so the production loader can resolve it, but no normal production profile selects it; only the `example` reference profile does.
