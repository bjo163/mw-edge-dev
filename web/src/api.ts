export interface Principal {
  readonly principal_ref: string;
  readonly username: string;
  readonly display_name: string;
  readonly is_superuser: boolean;
  readonly must_rotate_password: boolean;
}

export type UiWidgetKey = "text" | "textarea" | "number" | "checkbox" | "select" | "datetime" | "reference" | "relation" | "json";
export type UiFormatKey = "text" | "number" | "boolean" | "datetime" | "status" | "reference" | "json";

export interface ResourceFieldMetadata {
  readonly type: string;
  readonly required?: boolean;
  readonly unique?: boolean;
  readonly enum?: readonly string[];
  readonly target?: string;
  readonly ref_kind?: string;
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

export interface ResourceMetadata {
  readonly resource_id: string;
  readonly metadata_version: "2";
  readonly route_key: string;
  readonly record_key: string;
  readonly label: string;
  readonly labels: { readonly singular: string; readonly plural: string; readonly description: string };
  readonly domain: string;
  readonly authority: string;
  readonly owner_component: string;
  readonly navigation: { readonly visible: boolean; readonly group: string; readonly order: number };
  readonly crud: { readonly list: boolean; readonly read: boolean; readonly create: boolean; readonly update: boolean; readonly delete: boolean };
  readonly display: { readonly primary_field: string | null; readonly secondary_fields: readonly string[]; readonly status_field: string | null };
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
    readonly detail: { readonly sections: readonly ResourceSectionMetadata[] };
    readonly form: { readonly sections: readonly ResourceSectionMetadata[] };
  };
  readonly actions: readonly { readonly id: string; readonly label: string; readonly command: string; readonly kind: string }[];
}

export interface AppMetadata {
  readonly version: "2";
  readonly components: readonly { readonly id: string }[];
  readonly groups: readonly string[];
  readonly resources: readonly ResourceMetadata[];
}

type LegacyField = { readonly type: string; readonly required?: boolean; readonly enum?: readonly string[]; readonly target?: string; readonly ref_kind?: string };
type LegacyResource = {
  readonly resource_id: string;
  readonly label: string;
  readonly domain: string;
  readonly authority: string;
  readonly owner_component?: string;
  readonly navigation: { readonly visible: boolean; readonly group: string; readonly order?: number };
  readonly crud: ResourceMetadata["crud"];
  readonly fields: Readonly<Record<string, LegacyField>>;
  readonly views: {
    readonly list: { readonly columns: readonly string[]; readonly default_page_size?: number };
    readonly form?: { readonly sections?: readonly ResourceSectionMetadata[] };
  };
};
type WireAppMetadata = {
  readonly version?: string;
  readonly components: readonly { readonly id: string }[];
  readonly groups: readonly string[];
  readonly resources: readonly (ResourceMetadata | LegacyResource)[];
};

export interface ResourceListResult {
  readonly items: readonly Record<string, unknown>[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly sort: string | null;
  readonly direction: "asc" | "desc";
  readonly filters: Readonly<Record<string, unknown>>;
}

export interface ResourceQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly sort?: string;
  readonly direction?: "asc" | "desc";
  readonly filters?: Readonly<Record<string, string | number | boolean>>;
}

interface ErrorEnvelope {
  readonly error?: {
    readonly message?: string;
    readonly request_id?: string;
    readonly requestId?: string;
    readonly correlation_id?: string;
    readonly correlationId?: string;
  };
  readonly request_id?: string;
  readonly requestId?: string;
  readonly correlation_id?: string;
  readonly correlationId?: string;
}

function firstString(...values: readonly unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

function titleize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function widgetFor(type: string): UiWidgetKey {
  if (type === "Text") return "textarea";
  if (type === "Integer" || type === "Decimal") return "number";
  if (type === "Boolean") return "checkbox";
  if (type === "Enum") return "select";
  if (type === "DateTime") return "datetime";
  if (type === "Reference") return "reference";
  if (type === "Relation") return "relation";
  if (type === "Json") return "json";
  return "text";
}

function formatFor(name: string, type: string): UiFormatKey {
  if (name === "status" || name === "lifecycle") return "status";
  if (type === "Integer" || type === "Decimal") return "number";
  if (type === "Boolean") return "boolean";
  if (type === "DateTime") return "datetime";
  if (type === "Reference" || type === "Relation") return "reference";
  if (type === "Json") return "json";
  return "text";
}

function normalizeResource(resource: ResourceMetadata | LegacyResource): ResourceMetadata {
  if ("metadata_version" in resource && resource.metadata_version === "2") return resource;

  const visible = Object.keys(resource.fields);
  const recordKey = visible.find((name) => name.endsWith("_ref")) ?? "id";
  const primaryField = ["display_name", "name", "title", recordKey, ...visible].find((name) => visible.includes(name)) ?? null;
  const statusField = ["status", "lifecycle", "active"].find((name) => visible.includes(name)) ?? null;
  const fields: Record<string, ResourceFieldMetadata> = {};
  for (const [name, field] of Object.entries(resource.fields)) {
    const generated = name === "id" || name === "created_at" || name === "updated_at";
    const sortable = !["Json", "Relation", "Text"].includes(field.type);
    fields[name] = {
      ...field,
      label: titleize(name),
      help: null,
      placeholder: null,
      widget: widgetFor(field.type),
      format: formatFor(name, field.type),
      read_only: resource.authority === "REFERENCE" || generated || field.type === "Relation",
      generated,
      sortable,
      filterable: sortable,
    };
  }
  const sortableFields = visible.filter((name) => fields[name]?.sortable);
  if (recordKey === "id") sortableFields.unshift("id");
  const filterableFields = visible.filter((name) => fields[name]?.filterable);
  const formFields = visible.filter((name) => !fields[name]?.read_only && !fields[name]?.generated);
  const singular = resource.label;

  return {
    resource_id: resource.resource_id,
    metadata_version: "2",
    route_key: resource.resource_id,
    record_key: recordKey,
    label: singular,
    labels: { singular, plural: singular.endsWith("s") ? singular : `${singular}s`, description: `${singular} resource.` },
    domain: resource.domain,
    authority: resource.authority,
    owner_component: resource.owner_component ?? "unknown",
    navigation: { ...resource.navigation, order: resource.navigation.order ?? 100 },
    crud: resource.crud,
    display: {
      primary_field: primaryField,
      secondary_fields: visible.filter((name) => name !== primaryField && name !== statusField).slice(0, 3),
      status_field: statusField,
    },
    fields,
    sensitive_fields_hidden: [],
    views: {
      list: {
        columns: resource.views.list.columns,
        default_page_size: resource.views.list.default_page_size ?? 25,
        sortable_fields: sortableFields,
        filterable_fields: filterableFields,
        default_sort: sortableFields[0] ? { field: sortableFields[0], direction: "asc" } : null,
      },
      detail: { sections: [{ id: "main", label: "Details", fields: visible }] },
      form: { sections: resource.views.form?.sections ?? [{ id: "main", label: "General", fields: formFields }] },
    },
    actions: [],
  };
}

function normalizeMetadata(metadata: WireAppMetadata): AppMetadata {
  return {
    version: "2",
    components: metadata.components,
    groups: metadata.groups,
    resources: metadata.resources.map(normalizeResource),
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;
  readonly retryable: boolean;

  constructor(message: string, status: number, requestId: string | undefined, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...options.headers },
    ...options,
  });
  const data = (await response.json().catch(() => ({}))) as ErrorEnvelope;
  if (!response.ok) {
    const method = (options.method ?? "GET").toUpperCase();
    const requestId = firstString(
      data.error?.request_id,
      data.error?.requestId,
      data.error?.correlation_id,
      data.error?.correlationId,
      data.request_id,
      data.requestId,
      data.correlation_id,
      data.correlationId,
      response.headers.get("x-request-id"),
      response.headers.get("x-correlation-id"),
    );
    const retryableStatus = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    throw new ApiError(
      data.error?.message ?? `HTTP ${response.status}`,
      response.status,
      requestId,
      method === "GET" && retryableStatus,
    );
  }
  return data as T;
}

function listPath(model: string, query: ResourceQuery = {}) {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.sort) params.set("sort", query.sort);
  if (query.direction) params.set("direction", query.direction);
  for (const [name, value] of Object.entries(query.filters ?? {})) params.set(`filter.${name}`, String(value));
  const suffix = params.size ? `?${params.toString()}` : "";
  return `/api/admin/resources/${encodeURIComponent(model)}${suffix}`;
}

export const api = {
  session: () => request<{ principal: Principal }>("/api/auth/session"),
  login: (username: string, password: string) =>
    request<{ principal: Principal }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  changePassword: (password: string) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ password }) }),
  metadata: async () => normalizeMetadata(await request<WireAppMetadata>("/api/meta/app")),
  list: (model: string, query: ResourceQuery = {}) => request<ResourceListResult>(listPath(model, query)),
  read: (model: string, record: string | number) =>
    request<{ item: Record<string, unknown> }>(`/api/admin/resources/${encodeURIComponent(model)}/${encodeURIComponent(String(record))}`),
  create: (model: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/resources/${encodeURIComponent(model)}`, { method: "POST", body: JSON.stringify(body) }),
};
