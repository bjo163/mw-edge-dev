# MW Edge Dev

MoonWitness-native, plugin-first business data engine.

## Current foundation

- custom thin MW ORM; no Drizzle/Prisma/TypeORM/Sequelize
- one bounded domain = one logical SQLite database
- 17 domain plugins, 9 addons, 43 models
- addons extend exactly one domain and share its database
- cross-domain links are opaque `Reference`; SQL `Relation` is same-domain only
- deterministic profiles; discovered components are not automatically active
- metadata is generated from the active model registry
- kernel owns mechanisms and contains zero business models

## Quick start

```bash
corepack enable
pnpm install
pnpm test
pnpm db:migrate -- --profile business-base
```

The standalone Vite UI, foundation reference seeds, local super-admin/MW Bot bootstrap,
factory reset and HTTP adapter are implemented in the next integration layer in this repository.

## Profiles

Run:

```bash
pnpm profiles
```

The default target profile is `standalone-business`.

## Important boundaries

MW Edge does not replace MoonWitness task/Git/Radicle storage, identity, authorization,
provenance, Cockpit, provider adapters, or webhook ingress.
