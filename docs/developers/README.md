# Developer guide

This section is for contributors working on MW Edge itself and for future plugin/addon authors.

## Start here

1. Read the [architecture overview](../architecture/overview.md).
2. Follow the repository workflow in [CONTRIBUTING.md](../../CONTRIBUTING.md).
3. Use the [Quick Start](../operators/quick-start.md) to run a local instance.
4. Run the canonical validation gate before pushing:

```bash
pnpm readiness
```

## Source map

- [`src/kernel/`](../../src/kernel/) — microkernel mechanisms, registry, ORM, schema, metadata, lifecycle, and database routing.
- [`plugins/`](../../plugins/) — domain plugins and their models/seeds.
- [`addons/`](../../addons/) — target-domain extensions.
- [`profiles/`](../../profiles/) — declarative component compositions.
- [`web/`](../../web/) — metadata-driven React/Vite UI.
- [`test/`](../../test/) — runtime and contract regression tests.
- [`.github/tests/`](../../.github/tests/) — automation regression fixtures.

## Plugin and addon authoring

The canonical authoring guide is tracked by [issue #50](https://github.com/bjo163/mw-edge-dev/issues/50). It belongs in this developer section when implemented. Until then, the executable contracts are the component registry, plugin manifests, lock verification, and host resolver in the source tree.

## Debugging and tests

Use focused scripts while iterating and finish with `pnpm readiness`.

```bash
pnpm typecheck
pnpm test
pnpm test:http
pnpm plugins:lock:check
pnpm ui:build
pnpm build
```

Do not weaken the readiness gate to make a local change pass; fix the failing contract or update the contract deliberately with evidence.
