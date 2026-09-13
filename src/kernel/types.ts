export type FieldType =
  | "String"
  | "Text"
  | "Integer"
  | "Decimal"
  | "Boolean"
  | "DateTime"
  | "Enum"
  | "Reference"
  | "Relation"
  | "Json";

export type Scalar = string | number | boolean | null;
export type RecordValue = Scalar | Record<string, unknown> | readonly unknown[];

export interface FieldDefinition {
  readonly type: FieldType;
  readonly required?: boolean;
  readonly unique?: boolean;
  readonly sensitive?: boolean;
  readonly default?: RecordValue;
  readonly enum?: readonly string[];
  readonly target?: string;
  readonly ref_kind?: string;
}

export interface ModelDefinition {
  readonly name: string;
  readonly domain: string;
  readonly component: string;
  readonly authority: "CANONICAL" | "OBSERVATION" | "REFERENCE" | "LOCAL_ONLY";
  readonly fields: Readonly<Record<string, FieldDefinition>>;
}

export interface ComponentCapabilities {
  readonly provides: readonly string[];
  readonly requires: readonly string[];
}

export interface ComponentDatabase {
  readonly ownership: "exclusive_domain_owner" | "shared_target_domain";
  readonly logical_name: string;
}

export interface PluginManifest {
  readonly schema_version: string;
  readonly id: string;
  readonly kind: "domain_plugin" | "addon";
  readonly version: string;
  readonly host_api: string;
  readonly domain: string;
  readonly entrypoint: string;
  readonly models: readonly string[];
  readonly requires: readonly string[];
  readonly database: ComponentDatabase;
  readonly extension_points?: readonly string[];
  readonly uses_extension_points?: readonly string[];
  readonly extends?: string;
  readonly capabilities: ComponentCapabilities;
}

export interface ProfileDocument {
  readonly schema_version: string;
  readonly id: string;
  readonly description: string;
  readonly components: readonly string[];
}

export interface ActiveComponentMetadata {
  readonly id: string;
  readonly kind: PluginManifest["kind"];
  readonly domain: string;
  readonly version: string;
}

export interface ResourceMetadata {
  readonly resource_id: string;
  readonly metadata_version: "1";
  readonly label: string;
  readonly domain: string;
  readonly authority: ModelDefinition["authority"];
  readonly owner_component: string;
  readonly navigation: {
    readonly group: string;
    readonly visible: boolean;
    readonly order: number;
  };
  readonly crud: {
    readonly list: boolean;
    readonly read: boolean;
    readonly create: boolean;
    readonly update: boolean;
    readonly delete: boolean;
  };
  readonly fields: Readonly<Record<string, FieldDefinition>>;
  readonly sensitive_fields_hidden: readonly string[];
  readonly views: {
    readonly list: {
      readonly columns: readonly string[];
      readonly default_page_size: number;
    };
    readonly form: {
      readonly sections: readonly {
        readonly id: string;
        readonly label: string;
        readonly fields: readonly string[];
      }[];
    };
  };
}

export interface AppMetadata {
  readonly version: "1";
  readonly components: readonly ActiveComponentMetadata[];
  readonly groups: readonly string[];
  readonly resources: readonly ResourceMetadata[];
}

export type DbPrimitive = string | number | bigint | null | Uint8Array;
export type DbRow = Record<string, unknown>;
