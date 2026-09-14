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

export interface ModelIndexDefinition {
  readonly id: string;
  readonly fields: readonly string[];
  readonly unique?: boolean;
}

export type ModelAuthority =
  | "CANONICAL"
  | "PROJECTION"
  | "CACHE"
  | "OBSERVATION"
  | "REFERENCE"
  | "LOCAL_ONLY";

export interface ModelDefinition {
  readonly name: string;
  readonly domain: string;
  readonly component: string;
  readonly authority: ModelAuthority;
  readonly fields: Readonly<Record<string, FieldDefinition>>;
  readonly indexes?: readonly ModelIndexDefinition[];
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

export type UiWidgetKey =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "select"
  | "datetime"
  | "reference"
  | "relation"
  | "json";

export type UiFormatKey =
  | "text"
  | "number"
  | "boolean"
  | "datetime"
  | "status"
  | "reference"
  | "json";

export interface ResourceFieldMetadata extends FieldDefinition {
  readonly label: string;
  readonly help: string | null;
  readonly placeholder: string | null;
  readonly widget: UiWidgetKey;
  readonly format: UiFormatKey;
  readonly read_only: boolean;
  readonly generated: boolean;
  readonly sortable: boolean;
  readonly filterable: boolean;
}

export interface ResourceSectionMetadata {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly string[];
}

export interface ResourceActionMetadata {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly kind: "primary" | "secondary" | "danger";
}

export interface ResourceMetadata {
  readonly resource_id: string;
  readonly metadata_version: "2";
  readonly route_key: string;
  readonly record_key: string;
  readonly label: string;
  readonly labels: {
    readonly singular: string;
    readonly plural: string;
    readonly description: string;
  };
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
  readonly display: {
    readonly primary_field: string | null;
    readonly secondary_fields: readonly string[];
    readonly status_field: string | null;
  };
  readonly fields: Readonly<Record<string, ResourceFieldMetadata>>;
  readonly sensitive_fields_hidden: readonly string[];
  readonly views: {
    readonly list: {
      readonly columns: readonly string[];
      readonly default_page_size: number;
      readonly sortable_fields: readonly string[];
      readonly filterable_fields: readonly string[];
      readonly default_sort: { readonly field: string; readonly direction: "asc" | "desc" } | null;
    };
    readonly detail: {
      readonly sections: readonly ResourceSectionMetadata[];
    };
    readonly form: {
      readonly sections: readonly ResourceSectionMetadata[];
    };
  };
  readonly actions: readonly ResourceActionMetadata[];
}

export interface AppMetadata {
  readonly version: "2";
  readonly components: readonly ActiveComponentMetadata[];
  readonly groups: readonly string[];
  readonly resources: readonly ResourceMetadata[];
}

export type DbPrimitive = string | number | bigint | null | Uint8Array;
export type DbRow = Record<string, DbPrimitive>;
