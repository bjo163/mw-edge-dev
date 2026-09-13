import type {
  ActiveComponentMetadata,
  AppMetadata,
  FieldDefinition,
  ResourceMetadata,
} from "./types.js";
import type { ModelRegistry, RegisteredModel } from "./model-registry.js";

function titleize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resourceMetadata(model: RegisteredModel): ResourceMetadata {
  const fields = Object.entries(model.fields);
  const sensitive = fields.filter(([, field]) => field.sensitive).map(([name]) => name);
  const visible = fields.filter(([name, field]) => !field.sensitive && name !== "password_hash" && name !== "token_hash").map(([name]) => name);

  const preferred = [
    ...fields.filter(([name]) => name.endsWith("_ref")).map(([name]) => name),
    "name",
    "display_name",
    "title",
    "status",
    "lifecycle",
    "active",
  ]
    .filter((name, index, all) => visible.includes(name) && all.indexOf(name) === index)
    .slice(0, 6);

  for (const name of visible) {
    if (preferred.length >= 6) break;
    if (!preferred.includes(name)) preferred.push(name);
  }

  const publicFields: Record<string, FieldDefinition> = {};
  for (const [name, field] of fields) if (!sensitive.includes(name)) publicFields[name] = field;

  const readonly = model.authority === "REFERENCE";
  const hidden = model.name === "standalone.session";

  return {
    resource_id: model.name,
    metadata_version: "1",
    label: titleize(model.name.split(".").at(-1) ?? model.name),
    domain: model.domain,
    authority: model.authority,
    owner_component: model.owner,
    navigation: { group: model.domain, visible: !hidden, order: 100 },
    crud: { list: true, read: true, create: !readonly && !hidden, update: !readonly && !hidden, delete: false },
    fields: publicFields,
    sensitive_fields_hidden: sensitive,
    views: {
      list: { columns: preferred, default_page_size: 25 },
      form: { sections: [{ id: "main", label: "General", fields: visible }] },
    },
  };
}

export function buildMetadata(registry: ModelRegistry, components: readonly ActiveComponentMetadata[]): AppMetadata {
  const resources = registry.list().map(resourceMetadata);
  const groups = [...new Set(resources.filter((resource) => resource.navigation.visible).map((resource) => resource.navigation.group))].sort();
  return { version: "1", components, groups, resources };
}
