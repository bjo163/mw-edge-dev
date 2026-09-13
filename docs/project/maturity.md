# Capability maturity

MW Edge uses these maturity labels:

- **Stable** — relied on by the current release line with completed acceptance evidence.
- **Beta** — implemented and exercised by CI/readiness, but still subject to contract hardening before V1.0.
- **Experimental** — implemented enough to evaluate, but not yet a compatibility commitment.
- **Planned** — tracked work that is not shipped.
- **Blocked** — implementation depends on an unresolved repository, platform, or administrative prerequisite.

| Area | Maturity | Evidence / authority |
|---|---|---|
| Microkernel and component lifecycle | Beta | [architecture overview](../architecture/overview.md), [readiness gate](../../.github/scripts/readiness.sh) |
| Domain plugin/addon composition | Beta | [component registry](../../src/kernel/plugins/registry.ts), [plugin lock](../../plugins.lock.json) |
| Native ORM and domain SQLite routing | Beta | [kernel source](../../src/kernel/), nightly lifecycle validation |
| Metadata-driven UI contracts | Beta | [metadata builder](../../src/kernel/metadata.ts), UI build in readiness |
| Profiles and standalone runtime | Beta | [profiles](../../profiles/), [Quick Start](../operators/quick-start.md) |
| Migration and factory reset | Beta | isolated nightly migration/reset evidence; production hardening remains tracked |
| Standalone authentication | Experimental | local adapter exists; MoonWitness identity remains outside this repository boundary |
| Workflow/release automation | Beta | CI, CodeQL, actionlint/zizmor and regression fixtures; remaining acceptance is tracked in open automation issues |
| Dependency review automation | Blocked | [issue #132](https://github.com/bjo163/mw-edge-dev/issues/132) requires repository Dependency Graph and branch-policy prerequisites |
| Production security review | Planned | [issue #120](https://github.com/bjo163/mw-edge-dev/issues/120) |
| Backup/restore and disaster recovery hardening | Planned | production-readiness work remains tracked in repository issues/milestones |
| Cloud/extensibility adapters | Planned | V0.3 Cloud & Extensibility milestone |

This matrix describes repository state, not a support SLA. The [production readiness checklist](https://github.com/bjo163/mw-edge-dev/issues/123) is the authority for promotion toward V1.0.
