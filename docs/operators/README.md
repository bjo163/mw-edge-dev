# Operator guide

This section is for people installing, running, resetting, migrating, or troubleshooting MW Edge.

## Start here

- [Five-minute Quick Start](quick-start.md)
- [Security policy](../../SECURITY.md)
- [Architecture overview](../architecture/overview.md)

## Operational topics

The current executable operator commands live in [package.json](../../package.json):

- `pnpm db:migrate` — boot the selected profile and apply schema/materialization.
- `pnpm factory:reset` — rebuild MW Edge-owned data for a selected profile; requires explicit confirmation.
- `pnpm profiles` — inspect available profiles.
- `pnpm readiness` — run the full repository readiness gate.

Detailed installation, profiles, migration/reset, backup/restore, and troubleshooting documentation is tracked by [issue #121](https://github.com/bjo163/mw-edge-dev/issues/121) and should be added beneath this operator section rather than copied into the root README.

## Data safety

For automation and tests, use `MW_DATA_DIR` or `--data-dir` to point migration/reset/server processes at test-owned storage. Production or operator-owned data must never be used for readiness or nightly validation.
