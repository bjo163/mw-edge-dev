# Production threat model

This review covers the V1 production boundary of the current local-first MW Edge runtime. It is a security decision record, not a claim that deployment infrastructure outside this repository is trusted automatically.

## Assets and trust boundaries

High-value assets are domain SQLite databases, standalone password/session hashes, plugin/profile configuration, backup artifacts, migration history, and release automation credentials.

The primary trust boundaries are:

1. HTTP client to the standalone Hono application.
2. Operator shell/filesystem to MW Edge data directories.
3. Plugin/addon manifests and runtime modules to the kernel host.
4. Historical database state to migration/materialization code.
5. Repository changes to CI/release automation.
6. Local backup artifacts to external storage operated outside this repository.

## High-risk findings

| Surface | Threat | Risk | Mitigation/evidence | Residual decision |
|---|---|---:|---|---|
| Standalone authentication | Password database theft or offline cracking | High | Passwords use versioned scrypt with random salts in [auth.ts](../../src/standalone/auth.ts); raw hashes are marked sensitive and regression-tested in [sensitive-redaction.test.ts](../../test/sensitive-redaction.test.ts). | Host filesystem compromise can still expose hashes. Production operators must protect the data directory and backups. |
| Session authentication | Session token disclosure/replay | High | Session tokens are random, only SHA-256 hashes are stored, cookies are HttpOnly/SameSite=Strict, and expiry/revocation are checked on every protected request in [app.ts](../../src/http/app.ts). | Local malware/browser compromise remains outside the process boundary. TLS termination is a deployment responsibility when traffic leaves loopback. |
| State-changing HTTP APIs | Cross-site request forgery or unauthorized mutation | High | Cross-origin state-changing requests are rejected; admin API paths require an authenticated superuser; sensitive fields cannot be written through generic CRUD in [app.ts](../../src/http/app.ts). | There is no fine-grained multi-role authorization yet; production exposure should remain limited to the supported standalone trust model. |
| Plugin/addon loading | Malicious or confused-deputy extension gains unintended ownership | High | Components are registry-controlled, manifests are validated, dependency/capability ownership is checked, addon database ownership is constrained, extension bindings are frozen, and the plugin lock is verified before profile planning in [host.ts](../../src/kernel/plugins/host.ts). | Runtime modules are not sandboxed. Only trusted repository-shipped extensions are in the V1 trust boundary; remote/untrusted plugin execution is not accepted. |
| Supply chain | Dependency or workflow compromise | High | Dependency review, pinned action SHAs, CodeQL, workflow-security checks and lockfile validation exist in repository automation. | Repository Dependency Graph/ruleset administration is still required by issues #53 and #132; V1 remains gated while either is open. |
| Migration history | Silent historical schema rewrite corrupts production state | High | Applied migration baselines store checksums and reject drift in [schema.ts](../../src/kernel/schema.ts). Released-version compatibility is exercised by the migration compatibility harness. | Future schema evolution must add explicit forward migrations; mutating an applied baseline is prohibited. |
| Factory reset | Accidental or automated destructive data loss | High | Reset requires `--yes`; non-interactive reset additionally requires `MW_ALLOW_FACTORY_RESET=1`; default behavior creates a backup before deleting MW Edge-owned database files in [factory-reset.ts](../../scripts/factory-reset.ts). | An operator with filesystem and explicit reset authority can still destroy data. That is an accepted administrative capability. |
| Backup/restore | Corrupted, incomplete, or tampered backup is accepted | High | Profile backup uses consistent SQLite images, SHA-256 manifests, domain-set validation and pre/post integrity checks; restore refuses non-clean targets. The DR drill verifies restored standalone login. | Encryption, off-host storage, retention and key escrow are deployment responsibilities; backup artifacts must be treated as sensitive. |
| Database contention/integrity | Writer starvation, runaway WAL or silent corruption | High | SQLite config sets bounded busy timeout and WAL auto-checkpoint; regression tests cover writer contention; soak evidence verifies checkpoints, quick-check, FK integrity and bounded WAL growth. | Filesystem/disk failure cannot be prevented in-process; operators need external monitoring and tested backups. |
| Release pipeline | Untested revision is tagged/released | High | Main release runs only after canonical readiness on the exact push SHA; V1 candidates additionally require mandatory production evidence issues to be closed. | Branch rulesets are an external repository control and remain a V1 blocker until #53 is verified. |

## Explicit non-goals / accepted risks

- MW Edge V1 does not sandbox arbitrary third-party JavaScript plugins. Untrusted remote plugin supply is outside the current support boundary.
- The standalone HTTP runtime is not an internet-facing identity provider. Network perimeter/TLS/reverse-proxy policy belongs to the deployment.
- Host root/administrator compromise is not contained by application-level controls.
- Backup confidentiality outside the MW Edge process is an operator/storage responsibility.
- Denial-of-service protection beyond request-size checks and SQLite contention bounds is deployment-specific; rate limiting should be enforced at the ingress when exposed beyond a trusted local network.

## Review closure criteria

This threat model is acceptable for V1 only while the implementation evidence linked above remains green and the production-readiness gate keeps #53 and #132 open until their repository-level controls are verified. A new remote plugin channel, externally exposed identity boundary, new database adapter, or new privileged API requires this model to be reviewed again before release.
