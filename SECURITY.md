# Security Policy

## Supported branches

- `main` is the stable and release line.
- `dev` receives fixes and validation before promotion to `main`.
- Older tags or commits are not automatically supported unless a release note says otherwise.

## Reporting

Use GitHub private vulnerability reporting from the repository Security area when it is available.

Do not include credentials, private keys, customer data, bootstrap passwords, session tokens, or other sensitive details in public issues. If private reporting is unavailable, open a public issue only to request a private contact channel and keep technical security details out of that issue.

This repository does not promise a specific response-time or remediation-time SLA.

## Scope

Reports may cover the MW Edge runtime, standalone authentication and sessions, HTTP/API behavior, ORM and data isolation, plugin/addon loading, manifest and lock verification, migration/reset safety, and repository automation.

MoonWitness platform services that are not implemented in this repository are outside the MW Edge code scope.

## Fix flow

Security fixes are prepared on `dev`, pass the mandatory validation and security gates, and are promoted through `dev -> main`.

See the [security documentation index](docs/security/README.md) for implementation references.
