# Five-minute Quick Start

This path starts the current standalone MW Edge API and UI from a clean checkout.

## Prerequisites

- Node.js **22.13.0 or newer**.
- Corepack available with Node.
- Git.

The repository pins pnpm **11.17.0** through `packageManager`.

## Clone and install

```bash
git clone https://github.com/bjo163/mw-edge-dev.git
cd mw-edge-dev
corepack enable
pnpm install --frozen-lockfile
```

## Bootstrap credentials

You may set `MW_BOOTSTRAP_ADMIN_PASSWORD` before first boot if you want to choose the initial local admin password yourself.

If that variable is omitted on the first standalone boot, MW Edge generates a random one-time password and writes it to `data/.bootstrap/admin-credentials.json`. The username is `admin`, and the generated account is marked for password rotation. See the [standalone seed](../../plugins/standalone/seed.ts).

There is no universal default password.

## Run standalone mode

```bash
pnpm dev:standalone
```

The UI is served by Vite at `http://127.0.0.1:5173`.

The API defaults to port `8788`. Verify that the runtime booted:

```bash
curl --fail http://127.0.0.1:8788/health
```

A healthy response contains `"status":"ok"`, the active profile, and nonzero model/component counts.

## Common first-run problems

**Node is too old** — check `node --version`; the package requires Node >=22.13.0.

**Dependency graph differs** — run `corepack enable` and use `pnpm install --frozen-lockfile`. Do not delete the lockfile to bypass a mismatch.

**Standalone login credential is unknown** — if no bootstrap password was supplied, inspect `data/.bootstrap/admin-credentials.json` after the first boot. Never commit that file or paste its contents into an issue.

For architecture and operational details, continue with the [operator index](README.md) and [architecture overview](../architecture/overview.md).
