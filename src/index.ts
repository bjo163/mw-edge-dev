export { boot } from "./kernel/plugins/host.js";
export { ModelRegistry } from "./kernel/model-registry.js";
export { OrmEnvironment } from "./kernel/orm.js";
export { resourceMetadata, buildMetadata } from "./kernel/metadata.js";
export { CommandRegistry, executeIdempotently } from "./kernel/commands.js";
export { QueryRegistry } from "./kernel/queries.js";
export { applySeeds, resolveSeedOrder, seedKey } from "./kernel/seeds/dependency.js";
export { applyReferenceSeedUpgrade } from "./kernel/seeds/reference-upgrade.js";
export type { ReferenceSeedUpgradeInput, ReferenceSeedUpgradeResult } from "./kernel/seeds/reference-upgrade.js";
export { compileBooleanFilterGroup, compileComparisonFilters } from "./kernel/query-filter.js";
export { ReferenceResolverRegistry } from "./kernel/references.js";
export type { ReferenceResolution, ReferenceResolveRequest, ReferenceResolveContext, ReferenceResolver } from "./kernel/references.js";
export type { SeedPlan } from "./kernel/seeds/dependency.js";
export type { BooleanFilterGroup, BooleanOperator, ComparisonFilter, ComparisonOperator, QueryFilterNode } from "./kernel/query-filter.js";
export type {
  CommandIdempotency,
  CommandInput,
  CommandOutput,
  DomainCommand,
  IdempotencyScope,
  IdempotencyStore,
} from "./kernel/commands.js";
export type {
  DomainQuery,
  QueryInput,
  QueryOutput,
} from "./kernel/queries.js";
export type {
  AppMetadata,
  FieldDefinition,
  ModelDefinition,
  PluginManifest,
  ProfileDocument,
  ResourceMetadata,
} from "./kernel/types.js";

export { ValidationError, ValidationRegistry } from "./kernel/validation.js";
export type { DomainValidator, DomainValidatorContext, FieldValidationPlan, FieldValidator, FieldValidatorContext, ValidationContext, ValidationFailure, ValidationPlan, ValidationRule } from "./kernel/validation.js";

export { dispatchDomainOutbox, ensureDomainOutboxDelivery } from "./kernel/database/outbox-dispatcher.js";
export type { OutboxDeliver, OutboxDeliveryContext, OutboxDispatcherOptions, OutboxDispatchResult } from "./kernel/database/outbox-dispatcher.js";
