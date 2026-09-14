# SQLite sustained soak

Issue #119 verifies that the supported local SQLite path remains healthy under sustained mixed reads and writes.

## Method

`scripts/sqlite-soak.ts` uses a file-backed WAL database and repeatedly updates a fixed 256-row parent/child working set inside transactions. Every iteration performs read-after-write verification and periodic passive checkpoints.

The final gate requires:

- `PRAGMA quick_check` = `ok`;
- zero `PRAGMA foreign_key_check` violations;
- a non-busy final TRUNCATE checkpoint;
- maximum WAL <= 32 MiB and <= 1 MiB after TRUNCATE;
- database file <= 16 MiB for the fixed working set;
- RSS growth <= 128 MiB.

The fixed working set separates journal/database leakage from legitimate application data growth.

## Reproduce and evidence

The default release/operator window is two minutes:

```bash
pnpm exec tsx scripts/sqlite-soak.ts
```

Longer evidence can be requested with `MW_SQLITE_SOAK_SECONDS=600`. Canonical readiness executes the exact same checks with a five-second regression window:

```bash
MW_SQLITE_SOAK_SECONDS=5 pnpm exec tsx scripts/sqlite-soak.ts
```

Nightly lifecycle uses the default long window and retains the JSON report as an artifact.

## Residual risks

The soak cannot simulate sudden power loss, failing storage hardware, or every filesystem cache policy. Backup/restore disaster-recovery evidence remains the recovery control for those failures.
