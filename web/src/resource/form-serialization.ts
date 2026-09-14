import type { ResourceMetadata } from "../api.js";

export type Draft = Record<string, unknown>;
export type FieldErrors = Record<string, string>;

export function serializeResourceForm(
  metadata: ResourceMetadata,
  draft: Draft,
): { readonly body: Record<string, unknown>; readonly errors: FieldErrors } {
  const body: Record<string, unknown> = {};
  const errors: FieldErrors = {};
  const fields = metadata.views.form.sections.flatMap((section) => section.fields);

  for (const name of fields) {
    const field = metadata.fields[name];
    if (!field || field.read_only || field.generated) continue;
    const raw = draft[name];
    const empty = raw === undefined || raw === null || raw === "";
    if (empty) {
      if (field.required) errors[name] = `${field.label} is required.`;
      continue;
    }

    switch (field.widget) {
      case "checkbox":
        body[name] = Boolean(raw);
        break;
      case "number": {
        const value = Number(raw);
        if (!Number.isFinite(value) || (field.type === "Integer" && !Number.isInteger(value))) {
          errors[name] = `${field.label} must be a valid ${field.type === "Integer" ? "integer" : "number"}.`;
        } else body[name] = value;
        break;
      }
      case "datetime": {
        const date = new Date(String(raw));
        if (Number.isNaN(date.getTime())) errors[name] = `${field.label} must be a valid date and time.`;
        else body[name] = date.toISOString();
        break;
      }
      case "select":
        if (field.enum && !field.enum.includes(String(raw))) errors[name] = `${field.label} has an unsupported value.`;
        else body[name] = String(raw);
        break;
      case "text":
      case "textarea":
      case "reference":
        body[name] = String(raw);
        break;
      case "relation":
      case "json":
      default:
        errors[name] = `${field.label} requires an explicit editor and cannot use the generic form.`;
        break;
    }
  }

  return { body, errors };
}
