# SQLite soak evidence

[scripts/sqlite-soak.ts](../../scripts/sqlite-soak.ts) runs a sustained mixed read/write workload against a file-backed SQLite database using MW Edge's WAL and checkpoint policy.

The default soak window is 120 seconds. Each iteration commits related parent/child writes, performs read-after-write validation, samples WAL size and RSS, and periodically performs a passive checkpoint. At the end it requires:

- `PRAGMA quick_check` to return `ok`;
- zero foreign-key violations;
- a non-busy truncating checkpoint;
- WAL growth to remain within 32 MiB; and
- process RSS growth to remain within 96 MiB.

The limits are regression guards, not capacity claims. The duration and budgets can be changed through `MW_SQLITE_SOAK_SECONDS`, `MW_SQLITE_SOAK_MAX_WAL_BYTES`, and `MW_SQLITE_SOAK_MAX_RSS_GROWTH_BYTES`, but production evidence must record the exact values used.

A short test is not equivalent to the production soak window; retained scheduled/manual evidence should use the default or a longer duration.
