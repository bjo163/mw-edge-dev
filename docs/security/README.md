# Security documentation

Start with the repository [Security Policy](../../SECURITY.md).

- [Production threat model](threat-model.md) — assets, trust boundaries, high-risk findings, mitigations, and explicitly accepted residual risks.

Implementation references: [HTTP app](../../src/http/app.ts), [standalone auth](../../src/standalone/auth.ts), and [plugin host](../../src/kernel/plugins/host.ts).

The production threat model is a release-gate evidence document. Material changes to privileged APIs, authentication boundaries, plugin trust, database adapters, or remote supply-chain behavior require a new review.
