# MW Edge documentation

This directory is the canonical home for detailed MW Edge documentation. The root [README](../README.md) stays concise and links here for deeper material.

| Section | Audience | Purpose |
|---|---|---|
| [Architecture](architecture/README.md) | Developers and reviewers | System boundaries, component ownership, data isolation, and integration seams |
| [Developers](developers/README.md) | Contributors and extension authors | Development workflow, source layout, testing, and future plugin/addon authoring |
| [Operators](operators/README.md) | Installers and operators | Quick Start, profiles, migrations/reset, backup/restore, and troubleshooting |
| [Security](security/README.md) | Operators and security reviewers | Reporting policy, authentication boundaries, and security hardening references |
| [Project](project/README.md) | Users and maintainers | Product positioning, terminology, maturity, and roadmap material |

## Documentation ownership

Tracked documentation follows the same `dev -> main` flow as code. Keep one canonical page per topic, prefer links over copied procedures, and run `pnpm docs:check` before pushing documentation changes once that command is available.

When implementation and documentation disagree, the implementation is the source of truth until the documentation is corrected.
