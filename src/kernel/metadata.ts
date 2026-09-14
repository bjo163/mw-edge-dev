import { primaryRefFor } from "./schema.js";
import type {
  ActiveComponentMetadata,
  AppMetadata,
  FieldDefinition,
  ResourceFieldMetadata,
  ResourceMetadata,
  UiFormatKey,
  UiWidgetKey,
} from "./types.js";
import type { ModelRegistry, RegisteredModel } from "./model-registry.js";

function titleize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function pluralize(label: string): string {
  return label.endsWith("s") ? label : `${label}s`;
}

function widgetFor(field: FieldDefinition): UiWidgetKey {
  switch (field.type) {
    case "Text": return "textarea";
    case "Integer":
    case "Decimal": return "number";
    case "Boolean": return "checkbox";
    case "Enum": return "select";
    case "DateTime": return "datetime";
    case "Reference": return "reference";
    case "Relation": return "relation";
    case "Json": return "json";
    default: return "text";
  }
}

function isCurrencyReference(field: FieldDefinition | undefined): boolean {
  return field?.type === "Reference" && field.ref_kind?.includes("foundation.currency") === true;
}

function currencyFieldFor(
  name: string,
  field: FieldDefinition,
  fields: Readonly<Record<string, FieldDefinition>>,
): string | null {
  if (field.type !== "Integer" && field.type !== "Decimal") return null;
  const direct = `${name}_currency`;
  if (isCurrencyReference(fields[direct])) return direct;
  const monetaryName = /(^|_)(amount|price|cost|total|subtotal|balance|fee|tax|discount|commission|revenue|expense)(_|$)/.test(name);
  if (monetaryName && isCurrencyReference(fields.currency)) return "currency";
  return null;
}

function formatFor(name: string, field: FieldDefinition, currencyField: string | null): UiFormatKey {
  if (name === "status" || name === "lifecycle") return "status";
  if (currencyField) return "money";
  switch (field.type) {
    case "Integer":
    case "Decimal": return "number";
    case "Boolean": return "boolean";
    case "DateTime": return "datetime";
    case "Reference":
    case "Relation": return "reference";
    case "Json": return "json";
    default: return "text";
  }
}

function uiField(
  name: string,
  field: FieldDefinition,
  allFields: Readonly<Record<string, FieldDefinition>>,
  readonlyResource: boolean,
): ResourceFieldMetadata {
  const generated = name === "id" || name === "created_at" || name === "updated_at";
  const sortable = !["Json", "Relation", "Text"].includes(field.type);
  const filterable = !["Json", "Relation", "Text"].includes(field.type);
  const currencyField = currencyFieldFor(name, field, allFields);
  return {
    ...field,
    label: titleize(name),
    help: null,
    placeholder: null,
    widget: widgetFor(field),
    format: formatFor(name, field, currencyField),
    currency_field: currencyField,
    read_only: readonlyResource || generated || field.type === "Relation" || field.type === "Json",
    generated,
    sortable,
    filterable,
  };
}

export function resourceMetadata(model: RegisteredModel): ResourceMetadata {
  const fields = Object.entries(model.fields);
  const sensitive = fields.filter(([, field]) => field.sensitive).map(([name]) => name);
  const visible = fields
    .filter(([name, field]) => !field.sensitive && name !== "password_hash" && name !== "token_hash")
    .map(([name]) => name);
  const readonlyResource = model.authority === "REFERENCE";
  const hidden = model.name === "standalone.session";
  const recordKey = primaryRefFor(model) ?? "id";
  const singular = titleize(model.name.split(".").at(-1) ?? model.name);

  const publicFields: Record<string, ResourceFieldMetadata> = {};
  for (const [name, field] of fields) {
    if (!sensitive.includes(name)) publicFields[name] = uiField(name, field, model.fields, readonlyResource);
  }

  const primaryField = ["display_name", "name", "title", recordKey, ...visible]
    .find((name, index, all) => visible.includes(name) && all.indexOf(name) === index) ?? null;
  const statusField = ["status", "lifecycle", "active"].find((name) => visible.includes(name)) ?? null;
  const secondaryFields = visible.filter((name) => name !== primaryField && name !== statusField).slice(0, 3);

  const preferred = [recordKey, primaryField, statusField, ...secondaryFields, ...visible]
    .filter((name): name is string => Boolean(name) && (name === "id" || visible.includes(name as string)))
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 6);

  const sortableFields = visible.filter((name) => publicFields[name]?.sortable);
  if (recordKey === "id") sortableFields.unshift("id");
  const filterableFields = visible.filter((name) => publicFields[name]?.filterable);
  const formFields = visible.filter((name) => {
    const field = publicFields[name];
    return field && !field.read_only && !field.generated;
  });

  const defaultSortField = sortableFields.includes(recordKey)
    ? recordKey
    : (sortableFields[0] ?? null);

  return {
    resource_id: model.name,
    metadata_version: "2",
    route_key: model.name,
    record_key: recordKey,
    label: singular,
    labels: {
      singular,
      plural: pluralize(singular),
      description: `${pluralize(singular)} managed by the ${model.domain} domain.`,
    },
    domain: model.domain,
    authority: model.authority,
    owner_component: model.owner,
    navigation: { group: model.domain, visible: !hidden, order: 100 },
    crud: {
      list: true,
      read: true,
      create: !readonlyResource && !hidden,
      update: !readonlyResource && !hidden,
      delete: false,
    },
    display: { primary_field: primaryField, secondary_fields: secondaryFields, status_field: statusField },
    fields: publicFields,
    sensitive_fields_hidden: sensitive,
    views: {
      list: {
        columns: preferred,
        default_page_size: 25,
        sortable_fields: sortableFields,
        filterable_fields: filterableFields,
        default_sort: defaultSortField ? { field: defaultSortField, direction: "asc" } : null,
      },
      detail: { sections: [{ id: "main", label: "Details", fields: visible }] },
      form: { sections: [{ id: "main", label: "General", fields: formFields }] },
    },
    actions: [],
  };
}

export function buildMetadata(registry: ModelRegistry, components: readonly ActiveComponentMetadata[]): AppMetadata {
  const resources = registry.list().map(resourceMetadata);
  const groups = [...new Set(resources.filter((resource) => resource.navigation.visible).map((resource) => resource.navigation.group))].sort();
  return { version: "2", components, groups, resources };
}
