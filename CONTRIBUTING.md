# Contributing to MW Edge

MW Edge uses two persistent development branches:

- `main` is the stable and release branch.
- `dev` is the only human development and integration branch.

Do not create feature, fix, or release branches for normal repository work.

## Before editing

Choose an open issue and read its goal, acceptance criteria, dependencies, and boundaries. Then update your local development branch:

```bash
git switch dev
git pull --ff-only origin dev
corepack enable
pnpm install --frozen-lockfile
```

Parallel work is safest when tasks own different files or directories. Changes to shared workflows, registries, or other high-churn files should be serialized against the latest `dev`.

## Validation

Run focused checks while developing. Before pushing completed work, run:

```bash
pnpm readiness
```

Documentation changes should also run:

```bash
pnpm docs:check
```

Do not weaken validation to make a patch pass.

## Commits and integration

Prefer concise Conventional Commit-style subjects such as `fix(scope): ...`, `feat(scope): ...`, `docs(scope): ...`, `test(scope): ...`, `ci(scope): ...`, or `chore(scope): ...`.

The integration direction is `dev -> main`. Keep one integration pull request rather than competing pull requests for the same branch pair.

## Evidence

For completed work, record the implementation commit or pull request and the command or Actions run that proves the issue acceptance criteria. Close an issue only when its acceptance criteria are met. Leave blocked work open and name the blocking dependency or repository setting.

See the [documentation index](docs/README.md) and [architecture overview](docs/architecture/overview.md) for system context.
