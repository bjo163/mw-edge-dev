# Compatibility and deprecation policy

This policy maps release versions to the stability classes in the [public contract inventory](contracts.md).

## Semantic versioning

Before 1.0, MW Edge may make breaking changes to **beta** contracts in a minor release, but the change must be called out in the changelog/release notes and include migration guidance or evidence. Patch releases must not intentionally break beta contracts.

At 1.0 and later, breaking changes to **stable** contracts require a major release. Additive backwards-compatible stable changes may be minor; bug/security fixes that preserve the contract may be patch.

**Experimental** contracts can break without a major bump, but every public reference must label them experimental. **Internal** changes never determine version classification unless they alter a supported public contract.

## What counts as breaking

Breaking changes include removing/renaming a supported HTTP route or field; changing successful/failed status semantics; removing/renaming a public TypeScript member; making an optional manifest/profile/metadata field required; narrowing accepted values; changing extension-point ownership or version; changing command/query identifiers or payload semantics; changing a documented environment key/CLI command incompatibly; or making an existing production database impossible to migrate forward.

An internal refactor is not breaking when supported observable behavior and serialized contracts stay compatible.

## Deprecation

A public stable contract scheduled for removal must:

1. be marked `deprecated` in the contract catalog;
2. state its replacement and migration path in docs;
3. be called out in CHANGELOG/release notes;
4. remain covered by tests until removal; and
5. not be removed before the next major release unless continued support creates a security vulnerability.

MW Edge does not promise a fixed time-based support window.

## Security exception

A vulnerable contract may be restricted or removed earlier when compatibility would preserve an exploitable condition. The release must document the security reason, affected versions, replacement/mitigation, and why normal deprecation was unsafe. This exception does not permit unrelated breaking changes.

## Examples

- Add an optional metadata field: **minor** after V1 (additive).
- Fix secret redaction without changing valid input: **patch**.
- Rename a stable manifest field: **major** after V1, with deprecation beforehand when safe.
- Change the experimental D1 adapter method shape: no major required while it remains experimental, but release notes must call it out.
- Refactor SQLite internals without changing the adapter contract: no contract-driven major bump.
