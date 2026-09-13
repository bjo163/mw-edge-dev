# MW Edge

**Local-first business engine with domain-isolated plugins and metadata-driven UI.**

MW Edge is a local-first, plugin-driven TypeScript business data engine that composes domain-isolated SQLite databases into metadata-driven applications, with a standalone profile and a defined integration boundary to MoonWitness.

[![CI](https://github.com/bjo163/mw-edge-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/bjo163/mw-edge-dev/actions/workflows/ci.yml)
[![CodeQL](https://github.com/bjo163/mw-edge-dev/actions/workflows/codeql.yml/badge.svg)](https://github.com/bjo163/mw-edge-dev/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/bjo163/mw-edge-dev?include_prereleases&sort=semver)](https://github.com/bjo163/mw-edge-dev/releases)
![Node](https://img.shields.io/badge/Node-%E2%89%A522.13-339933?logo=nodedotjs&logoColor=white)

**[Quick Start](docs/operators/quick-start.md)** · **[Architecture](docs/architecture/overview.md)** · **[Developers](docs/developers/README.md)** · **[Operators](docs/operators/README.md)** · **[Maturity](docs/project/maturity.md)** · **[Roadmap](docs/project/roadmap.md)** · **[Security](SECURITY.md)** · **[Contributing](CONTRIBUTING.md)**

## Why MW Edge

MW Edge keeps business domains explicit instead of collapsing them into one application schema:

- the microkernel owns composition, lifecycle, schema/materialization, metadata, and runtime mechanisms—not business models;
- each domain plugin owns one logical SQLite database;
- addons extend a target domain and share that domain database;
- cross-domain links use `Reference`; `Relation` stays inside one domain;
- profiles compose the component set for a boot;
- resource metadata drives the React/Vite administration UI;
- standalone authentication is a local adapter, not canonical MoonWitness identity state.

See the [architecture overview](docs/architecture/overview.md) for the ownership boundaries.

## Verified capability

Reproduce the current repository inventory with:

```bash
pnpm capabilities
```

| Current catalog | Count |
|---|---:|
| Domain plugins | 17 |
| Addons | 9 |
| Components | 26 |
| Unique models | 43 |
| Logical domain databases | 17 |
| Profiles | 10 |

The inventory is derived from the component registry, manifests, and `profiles/`; readiness verifies the command. See the [maturity matrix](docs/project/maturity.md) for status by area.

## Quick Start

Requires Node.js **22.13.0+** and Corepack.

```bash
git clone https://github.com/bjo163/mw-edge-dev.git
cd mw-edge-dev
corepack enable
pnpm install --frozen-lockfile
pnpm dev:standalone
```

Open the UI at `http://127.0.0.1:5173`. The API defaults to port `8788`:

```bash
curl --fail http://127.0.0.1:8788/health
```

For first-boot credential behavior and troubleshooting, use the [five-minute Quick Start](docs/operators/quick-start.md).

## Validate

The canonical repository gate is:

```bash
pnpm readiness
```

It covers formatting, documentation validation, capability inventory, lint/typecheck, plugin-lock validation, automation regression fixtures, tests, UI/backend builds, HTTP health smoke, and reset equivalence.

## Documentation paths

- [Architecture](docs/architecture/README.md) — system and ownership boundaries.
- [Developer guide](docs/developers/README.md) — source map, testing, and extension-authoring destination.
- [Operator guide](docs/operators/README.md) — install/run/migrate/reset and operational destinations.
- [Security docs](docs/security/README.md) — reporting policy and security implementation references.
- [Project docs](docs/project/README.md) — positioning, maturity, and roadmap.

## Maturity and roadmap

MW Edge is pre-V1.0. Implemented core areas are tracked as Beta or Experimental where appropriate; cloud/extensibility and production hardening remain explicit roadmap work. See the [capability maturity matrix](docs/project/maturity.md) and [near-term roadmap](docs/project/roadmap.md).

No roadmap date is implied by this README.

## Support and contributing

Use [GitHub Issues](https://github.com/bjo163/mw-edge-dev/issues) for normal bug and feature work. Use the repository [Security Policy](SECURITY.md) for security reporting guidance.

Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md) before editing. The repository intentionally uses `dev` as its only human development/integration branch and promotes through `dev -> main`.
