# Production readiness

MW Edge does not use a date promise for V1.0. A V1 release is gated by the same exact-SHA CI/release pipeline used for current releases plus explicit production evidence.

## Machine command

Run:

```bash
REPO=bjo163/mw-edge-dev GH_TOKEN=... pnpm readiness:production
```

In GitHub Actions the repository and token are supplied by the workflow. The command verifies the release is operating on the expected `main` SHA and requires every mandatory evidence issue below to be closed.

## Mandatory evidence

| Area | Authority |
|---|---|
| Branch/repository policy | [#53 Configure branch rulesets](https://github.com/bjo163/mw-edge-dev/issues/53) |
| Migration compatibility | [#116 Production compatibility matrix](https://github.com/bjo163/mw-edge-dev/issues/116) |
| Backup/restore DR | [#117 Full disaster-recovery drill](https://github.com/bjo163/mw-edge-dev/issues/117) |
| Load baseline | [#118 Production load baseline](https://github.com/bjo163/mw-edge-dev/issues/118) |
| SQLite soak/integrity | [#119 Long-running SQLite soak](https://github.com/bjo163/mw-edge-dev/issues/119) |
| Security/threat model | [#120 Production threat-model review](https://github.com/bjo163/mw-edge-dev/issues/120) |
| Operator/architecture docs | [#121 Documentation site](https://github.com/bjo163/mw-edge-dev/issues/121) |
| Stable extension contracts | [#122 Freeze stable V1 contracts](https://github.com/bjo163/mw-edge-dev/issues/122) |
| Readiness policy itself | [#123 Production readiness checklist](https://github.com/bjo163/mw-edge-dev/issues/123) |
| Dependency supply chain | [#132 Dependency review and guarded Dependabot](https://github.com/bjo163/mw-edge-dev/issues/132) |

A closed issue is the durable manual-evidence boundary: each issue owns its detailed acceptance evidence, unresolved risks, and links to runs/artifacts.

## Release enforcement

The semantic release script computes the next version before mutating package metadata or creating a tag. If the candidate major version is `1` or greater, it runs the production-readiness command first. Any open mandatory issue, wrong branch, or exact-SHA mismatch stops the release before a V1 tag can be created.

This production gate is intentionally separate from normal `pnpm readiness`: development and pre-V1 releases must remain usable while V1 production evidence is still being collected.

## Current release line

V0.x releases continue through the normal exact-SHA CI/readiness gate. The latest release state and this checklist are independent: completing this page does not claim that V1 production readiness has been achieved.
