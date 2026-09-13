# MW Edge positioning and terminology

This page is the canonical wording source for README, repository metadata, architecture docs, and future documentation.

## Canonical description

**MW Edge is a local-first, plugin-driven TypeScript business data engine that composes domain-isolated SQLite databases into metadata-driven applications, with a standalone profile and a defined integration boundary to MoonWitness.**

## Tagline

**Local-first business engine with domain-isolated plugins and metadata-driven UI.**

## Repository topics

Use: `typescript`, `local-first`, `sqlite`, `microkernel`, `plugin-architecture`, `metadata-driven-ui`, `business-engine`, `hono`, `react`, and `pnpm`.

## Terminology

| Term | Canonical meaning |
|---|---|
| **MW Edge** | The runtime and repository implemented here. Use this name in product-facing text. |
| **MoonWitness** | The wider platform/integration boundary. Do not imply MoonWitness identity, security, Cockpit, task, Git, Radicle, or provider state is implemented inside MW Edge. |
| **microkernel** | Mechanism layer that discovers, validates, resolves, materializes, seeds, and exposes components; it owns no business-domain models. |
| **plugin** | A domain-owning component with a manifest, models, capabilities, and one logical domain database. Prefer **domain plugin** when the ownership distinction matters. |
| **addon** | A component that extends a target domain plugin and shares that target domain database. |
| **profile** | A declarative JSON composition selecting the components active for a boot. |
| **domain database** | The logical SQLite database associated with an active domain in the current local runtime. |
| **metadata-driven UI** | React/Vite UI behavior derived from model/resource metadata produced by the runtime registry. |
| **Reference** | Cross-domain identifier link that does not require a SQL relation across databases. |
| **Relation** | Same-domain relational field contract; do not use it to imply cross-database joins. |

## Current capability versus roadmap

Available now: strict TypeScript runtime and React/Vite UI; native MW ORM/model registry; plugin/addon/profile composition; domain-isolated SQLite routing; metadata-derived resources; standalone principal/session adapter; migration, seed, reset, health, readiness, CI, CodeQL, workflow static analysis, and nightly lifecycle validation.

Cloud database adapters, remote plugin discovery/marketplace, plugin signatures/provenance, WASM isolation, cloud backup adapters, generated SDK/OpenAPI surfaces, and production-scale performance/DR work remain roadmap items until their own acceptance evidence is complete.

## Homepage policy

The desired homepage target is the versioned documentation site tracked by [issue #121](https://github.com/bjo163/mw-edge-dev/issues/121). Until a canonical site URL exists, leave the GitHub repository homepage unset rather than publishing a placeholder or dead link.
