# MW Edge Dev

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
