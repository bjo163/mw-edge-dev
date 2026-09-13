# Extension and metadata schema reference

## Plugin and addon manifests

The canonical machine-readable source is [plugin-manifest.schema.json](../../schemas/plugin-manifest.schema.json); [validateManifest](../../src/kernel/plugins/manifest.ts) enforces the same shape at runtime.

Required common fields are `schema_version`, `id`, `kind`, `version`, `host_api`, `domain`, `entrypoint`, `models`, `requires`, `database`, and `capabilities`. Unknown top-level and nested database/capability fields fail validation. Component/model/dependency/extension arrays contain unique strings.

Domain plugins must declare `extension_points` and own an `exclusive_domain_owner` database in current built-ins. Addons must declare `extends` and `uses_extension_points`, and their database ownership must be `shared_target_domain`. The runtime additionally validates addon domain matching, declared extension points, dependency resolution, and required capabilities.

Identifiers use the `mw.*` component format; component versions use three-part semver; domains use lower-case letters/numbers/underscores. Current host API declarations are explicit strings such as `^1.0.0`.

## Profiles

The canonical source is [profile.schema.json](../../schemas/profile.schema.json) and [validateProfile](../../src/kernel/plugins/profile.ts). Profiles have exactly `schema_version`, `id`, `description`, and unique `components`. Unknown fields, malformed IDs, unsupported schema versions, duplicate components, or wrong types fail closed.

Dependency expansion is deterministic: selecting an addon also selects its declared host/dependencies. Resolution is topological and dependency cycles fail.

## Model, field, and resource metadata

The canonical type source is [kernel types](../../src/kernel/types.ts). Model fields declare a supported field type plus optional required/unique/sensitive/default/enum/target/reference-kind semantics. Resource metadata is generated from the finalized model registry; sensitive fields are deliberately removed from list/form exposure and recorded as hidden.

There is no separate hand-maintained JSON Schema for generated metadata because the TypeScript types plus metadata generator and regression tests are the canonical source. Introducing one later requires a drift generator/check rather than duplicate manual maintenance.

## Migration and seed contracts

Migrations are currently code/materialization driven, not declarative JSON, so their contract authority is [schema.ts](../../src/kernel/schema.ts): historical baseline checksums may not be rewritten. Seeds are imperative through [applySeed](../../src/kernel/seeds/runner.ts); component/seed/version/checksum identity makes repeated application deterministic and checksum drift fails.

## Valid reference artifacts

The [minimal plugin](../../examples/minimal-plugin/README.md), [minimal addon](../../examples/minimal-addon/README.md), and [example profile](../../profiles/example.json) are CI-executed fixtures using these exact contracts.
