# Environment Contract

This document defines the reproducible runtime contract for MW Edge local development, tests, CI, and release verification. It is a reference contract, not a secret store and not a second configuration registry.

## Toolchain baseline

The repository declares `pnpm@11.17.0` and Node.js `>=22.13.0` in `package.json`. Canonical CI verifies on Ubuntu using Node.js `22.19.0` and pnpm `11.17.0`. Local environments must therefore use Node.js 22.13.0 or newer; Node.js 22.19.0 is the reference version when reproducing CI behavior exactly.

Dependency installation for verification is:

```sh
pnpm install --frozen-lockfile
```

Changing the package manager version, lowering Node.js below the declared engine floor, or installing from a non-lockfile dependency graph is environment drift and is outside the supported verification contract.

## Canonical verification commands

Use repository scripts rather than equivalent ad-hoc commands so local and CI behavior stays aligned.

```sh
pnpm readiness
pnpm test
pnpm typecheck
pnpm ui:typecheck
pnpm build
pnpm ui:build
pnpm docs:check
```

`pnpm readiness` is the canonical aggregate gate used by CI. Individual commands are useful for focused diagnosis but do not replace a successful readiness run when release evidence is required.

Database and lifecycle commands are:

```sh
pnpm db:migrate
pnpm factory:reset
pnpm db:reset
pnpm profiles
pnpm plugins:lock:check
```

A reset or migration command must use an explicit profile/data directory when isolation matters. Tests and verification must not rely on mutable developer data left from a previous run.

## Runtime inputs

The following variables are runtime inputs discovered in the current codebase. Values shown here are behavior classes, not secrets.

| Variable | Class | Current behavior |
| --- | --- | --- |
| `MW_PROFILE` | optional | Selects runtime profile. Server/migration paths default to `standalone-business`; some maintenance commands define their own documented default. |
| `MW_DATA_DIR` | optional | Overrides the persistent data directory. Use a dedicated temporary/test directory for isolated verification. |
| `MW_BOOTSTRAP_ADMIN_PASSWORD` | sensitive optional input | Supplies the standalone bootstrap administrator password. Never commit a real value. When deterministic login behavior is under test, tests must set an explicit test-only value. |
| `MW_COOKIE_SECURE` | optional security input | Set to `1` to mark the session cookie `Secure`; otherwise the current HTTP layer leaves that flag disabled. Deployment configuration must set it explicitly when HTTPS-only cookie transport is required. |
| `MW_EDGE_HOST` | optional network input | Overrides the API bind hostname; the server defaults to `127.0.0.1`. Set this explicitly when the process must listen beyond loopback. |
| `MW_EDGE_PORT` | optional network input | Overrides the API listen port; the server defaults to `8788`. |
| `MW_EDGE_UI_PORT` | optional | Overrides the Vite UI port; default is `5173`. |
| `NODE_ENV` | optional platform input | Controls production-safe error exposure in the HTTP layer. |
| `MW_SQLITE_SOAK_SECONDS` | verification tuning | Controls SQLite soak duration; default is `120` seconds. |
| `MW_PERF_STARTUP_MAX_MS` and related `MW_PERF_*` variables | verification tuning | Override performance thresholds used by the performance baseline script. |
| `MW_DR_PASSWORD`, `MW_DR_ROOT` | disaster-recovery test inputs | Scope DR drill credentials/root. Use only isolated test/drill values. |

Additional variables introduced by production code or verification scripts must be classified as required, optional, sensitive, or verification-only before documentation claims depend on them.

## Profiles, persistence, and fixture isolation

`standalone-business` is the default application profile used by the server and the main migration/factory-reset flows. Verification that mutates persistence must use either an in-memory adapter where the test explicitly supports it or a dedicated temporary data directory.

A test must not depend on the contents of the repository's normal `data/` directory, developer-local databases, previous test output, or the execution order of another test. Seed/reference-data assertions must start from a known profile plus a clean/reset data directory.

Factory-reset verification is expected to reproduce the canonical seeded baseline while allowing intentionally non-stable values such as generated identifiers, timestamps, or password hashes to differ when the corresponding contract does not promise byte-for-byte identity.

## Network and external services

The supported local verification path must not require an unrelated cloud service merely to boot the standalone profile, run unit/regression tests, inspect schemas, or execute documentation checks. Network-dependent operations must fail explicitly or be isolated from the local-only verification path; they must not silently change the meaning of a passing test.

Dependency installation and GitHub-specific release/governance verification can require network access. Those operations are infrastructure concerns and do not redefine standalone runtime behavior.

## CI equivalence

Canonical CI runs on `ubuntu-latest`, installs pnpm `11.17.0`, installs Node.js `22.19.0`, executes `pnpm install --frozen-lockfile`, and then executes `pnpm readiness` before governance/release work. A local reproduction intended to match CI should use the same Node.js and package-manager versions and command sequence.

Release evidence is valid only for the exact source revision that passed its required verification. Re-running commands against a different checkout, dependency graph, profile, or persistent data directory is new evidence and must not be represented as verification of the earlier revision.

## Drift conditions

Treat the following as contract drift requiring review:

- `package.json` changes `engines.node`, `packageManager`, or canonical script names;
- CI selects Node.js or package-manager versions incompatible with the declared package contract;
- a documented `pnpm` command disappears or changes meaning;
- a new required environment variable is introduced without an explicit failure mode and documentation classification;
- verification starts depending on pre-existing mutable data, undisclosed external services, or network access that was previously optional;
- local verification and CI use materially different setup or readiness commands.

The repository's existing documentation checker validates documented `pnpm` script names against `package.json`; broader environment-drift automation may be added separately without moving configuration ownership into this document.

## Source of truth boundaries

This contract summarizes executable repository declarations. `package.json`, workflow configuration, profile definitions, runtime code, and verification scripts remain the authoritative implementation sources. If this document and executable configuration disagree, verification must fail or the documentation must be corrected; documentation alone cannot make unsupported behavior part of the runtime contract.
