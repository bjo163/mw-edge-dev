# Migration compatibility evidence

Production compatibility is demonstrated against released code rather than inferred from a successful fresh install.

## Supported transition policy

Before V1, the supported production transition is from the latest published V0 release line to the current candidate. The compatibility harness defaults to `v0.5.0 -> current` and exercises every profile that exists in both revisions. When a newer V0 release becomes the production baseline, the workflow input/environment may advance `MW_COMPAT_FROM_TAG`; the old baseline must not be removed until its replacement has release evidence.

## Reproducible harness

[.github/scripts/migration-compatibility.sh](../../.github/scripts/migration-compatibility.sh) creates an isolated Git worktree at the released tag, materializes each shared profile with that release, then boots the same data using the current tree and executes the profile integrity checker.

The check therefore fails on:

- historical migration checksum drift;
- a profile/component graph that can no longer resolve;
- a current runtime that cannot open the released database state;
- SQLite quick-check failures; or
- foreign-key integrity violations.

The nightly workflow checks out full Git history so the release tag is available and stores the harness output as retained evidence.

## Known boundary

The current migration engine starts from a declarative baseline and intentionally rejects historical checksum mutation. A future schema change must add an explicit forward migration rather than editing an already-applied baseline. This harness is the release gate that will expose such an incompatible edit.
