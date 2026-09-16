# `mw-edge doctor` contract

Issue: #438

`mw-edge doctor` is the canonical read-only local diagnostic command. This reference documents only behavior currently implemented by `scripts/doctor.ts`; roadmap checks that are not implemented are intentionally omitted.

## Invocation

Human-readable output is the default:

```sh
pnpm exec tsx scripts/doctor.ts
```

Machine-readable output uses `--json`:

```sh
pnpm exec tsx scripts/doctor.ts --json
```

The command accepts `--profile <name>` and `--data-dir <path>`. If omitted, profile resolution uses `MW_PROFILE` and then `standalone-business`; data-directory resolution uses `MW_DATA_DIR` and then `data`.

## Exit status

Exit status is deterministic for the set of check failures produced in a run. When multiple failure categories are present, precedence is `runtime_failure` over `invalid_configuration` over `missing_prerequisite`.

| Exit | Meaning |
| ---: | --- |
| `0` | all implemented checks passed |
| `2` | at least one `missing_prerequisite`, with no higher-precedence failure |
| `3` | at least one `invalid_configuration`, with no `runtime_failure` |
| `4` | at least one `runtime_failure` |

## Machine-readable report

JSON output has `schemaVersion: 1` and the following top-level shape:

```json
{
  "schemaVersion": 1,
  "ok": false,
  "exitCode": 3,
  "profile": "standalone-business",
  "dataDir": "/absolute/path/to/data",
  "runtime": "vXX.YY.ZZ",
  "checks": []
}
```

Each check contains `id`, `category`, `ok`, and `detail`. Failed checks also contain a stable failure category and actionable `recovery` text. Current failure categories are:

- `missing_prerequisite`
- `invalid_configuration`
- `runtime_failure`

Consumers must key automation on `schemaVersion`, `exitCode`, check `id`, `ok`, and `failure`; human-oriented `detail` and `recovery` text should not be parsed as protocol fields.

## Implemented checks

| Check ID | Category | Current behavior |
| --- | --- | --- |
| `runtime.node` | `runtime` | reports the active Node.js runtime version |
| `configuration.profile` | `configuration` | resolves the selected profile through the authoritative plugin host; resolution failure is `invalid_configuration` |
| `configuration.plugin_lock` | `configuration` | verifies the repository plugin lock; drift/missing lock is `invalid_configuration` |
| `storage.data_dir` | `storage` | verifies read access to the selected data directory; failure is `missing_prerequisite` |
| `storage.sqlite_integrity` | `storage` | for a valid profile, runs authoritative profile SQLite integrity checks; failed/corrupt/uninitialized storage is `runtime_failure` |

`storage.sqlite_integrity` is not run when `configuration.profile` fails. This prevents an invalid profile from being treated as a valid database-integrity target.

## Read-only and secrecy guarantees

The doctor path is diagnostic only: it does not create or repair the selected data directory, write migrations, reseed databases, rewrite configuration, or update the plugin lock. Recovery steps are instructions for an operator to execute separately.

Diagnostic output must not print configured secret values or sensitive business payloads. Tests exercise this requirement with configured secret environment values and verify both standard output and standard error remain free of those values.

## Recovery guidance

Current actionable failures expose bounded recovery guidance:

- invalid profile: select a valid profile and repair plugin/component registration;
- plugin-lock failure: regenerate the plugin lock with `pnpm plugins:lock:write` and review the diff before startup;
- unreadable/missing data directory: create or mount it and grant runtime read access;
- SQLite integrity failure: inspect reported domain databases and restore/repair corrupted state;
- integrity-check exception: verify database readability and migration completeness before rerunning doctor.

This document does not claim checks for environment completeness, external dependencies, API reachability, capability registry validation, or authentication prerequisites until those checks exist in executable doctor behavior and regression coverage.
