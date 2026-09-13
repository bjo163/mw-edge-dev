# MW Edge Dev

[![CI](https://github.com/bjo163/mw-edge-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/bjo163/mw-edge-dev/actions/workflows/ci.yml)
[![CodeQL](https://github.com/bjo163/mw-edge-dev/actions/workflows/codeql.yml/badge.svg)](https://github.com/bjo163/mw-edge-dev/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/bjo163/mw-edge-dev/badge)](https://securityscorecards.dev/viewer/?uri=github.com/bjo163/mw-edge-dev)
[![Release](https://img.shields.io/github/v/release/bjo163/mw-edge-dev?include_prereleases&sort=semver)](https://github.com/bjo163/mw-edge-dev/releases)
[![Open Issues](https://img.shields.io/github/issues/bjo163/mw-edge-dev)](https://github.com/bjo163/mw-edge-dev/issues)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A522.13-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.17-F69220?logo=pnpm&logoColor=white)


Standalone TypeScript development repository for the MoonWitness business data engine.

## Core architecture

- strict TypeScript end-to-end; backend `.ts`, React UI `.tsx`
- MW-native thin ORM; **no Drizzle / Prisma / TypeORM / Sequelize**
- microkernel owns mechanisms and **zero business models**
- **17 domain plugins = 17 logical SQLite databases**
- 9 addons; each extends exactly one plugin and shares its target domain DB
- 43 models including business, foundation reference data, and standalone support
- cross-domain links use `Reference`; SQL `Relation` is same-domain only
- metadata-driven UI rendered by React/Vite
- standalone local super-admin and non-login `mw.bot`
- pinned offline base data: CLDR 48.2.1 + IANA tzdb 2026c
- deterministic factory reset scoped to MW Edge-owned data

## Clone and run

```bash
git clone https://github.com/bjo163/mw-edge-dev.git
cd mw-edge-dev
corepack enable
pnpm install

# Optional. If omitted MW Edge generates a one-time random credential
# in data/.bootstrap/admin-credentials.json.
export MW_BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-strong-password'

pnpm dev:standalone
```

Open `http://127.0.0.1:5173`.

The standalone username is `admin`. There is deliberately **no universal default password**.

## Validate

```bash
pnpm typecheck
pnpm test
pnpm ui:build
pnpm build
```

## Factory reset

```bash
MW_ALLOW_FACTORY_RESET=1 pnpm factory:reset -- --profile standalone-business --yes
```

Reset rebuilds only databases owned by the selected MW Edge profile, then re-applies migrations and required/reference seeds. It does not touch MoonWitness Cockpit, task/Git/Radicle, identity/security, provenance, or provider state.

## Integration boundary

`standalone.principal` is a local adapter for standalone use. It is not canonical `mw-identity` state and should be disabled when MW Edge is integrated behind the accepted MoonWitness identity/security boundary.
