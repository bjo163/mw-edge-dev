export { boot } from "./kernel/plugins/host.js";
export { ModelRegistry } from "./kernel/model-registry.js";
export { OrmEnvironment } from "./kernel/orm.js";
export { resourceMetadata, buildMetadata } from "./kernel/metadata.js";
export { CommandRegistry } from "./kernel/commands.js";
export { QueryRegistry } from "./kernel/queries.js";
export type {
  CommandInput,
  CommandOutput,
  DomainCommand,
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
