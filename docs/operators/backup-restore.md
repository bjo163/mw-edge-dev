# Backup and restore

MW Edge backup evidence is profile-aware: every owned SQLite domain is captured as a consistent database image, checksummed, and verified before restore.

## Production-safe model

The implementation in [backup.ts](../../src/kernel/database/backup.ts) uses SQLite `VACUUM INTO` after a full WAL checkpoint. The backup manifest records each domain file, byte size, and SHA-256 checksum. Restore refuses to overwrite an existing database, validates the profile/domain set, rechecks every checksum, and runs SQLite quick/foreign-key integrity checks after copying the files.

A restore target must therefore be an empty MW Edge data directory. This fail-closed rule prevents an operator from silently mixing backup state with a partially live instance.

## Reproducible disaster-recovery drill

The repository executes [dr-drill.ts](../../scripts/dr-drill.ts) in the nightly workflow. It:

1. boots an isolated `standalone-business` instance with a known drill credential;
2. proves the admin login works before backup;
3. creates a checksummed multi-domain backup;
4. restores into a clean directory;
5. runs profile integrity checks; and
6. proves standalone login still works from restored state.

The JSON output contains file checksums, sizes, integrity results, and measured timings. GitHub Actions retains that output with the nightly lifecycle artifact.

## Operational boundaries

Backups can contain authentication hashes and business data. Treat the backup directory as sensitive production data, encrypt it at rest and in transit, and apply deployment-specific retention/access controls. The repository drill validates local backup correctness; it does not claim to validate an external object store, encryption key escrow, or organization-specific retention policy.
