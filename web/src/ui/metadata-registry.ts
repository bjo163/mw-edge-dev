export const UI_WIDGET_KEYS = ["text", "textarea", "number", "checkbox", "select", "datetime", "reference", "relation", "json"] as const;
export const UI_FORMAT_KEYS = ["text", "number", "money", "boolean", "datetime", "status", "reference", "json"] as const;
export const UI_ACTION_KINDS = ["primary", "secondary", "danger"] as const;

export type UiWidgetKey = (typeof UI_WIDGET_KEYS)[number];
export type UiFormatKey = (typeof UI_FORMAT_KEYS)[number];
export type UiActionKind = (typeof UI_ACTION_KINDS)[number];

const WIDGETS = new Set<string>(UI_WIDGET_KEYS);
const FORMATS = new Set<string>(UI_FORMAT_KEYS);
const ACTION_KINDS = new Set<string>(UI_ACTION_KINDS);

export function isUiWidgetKey(value: unknown): value is UiWidgetKey {
  return typeof value === "string" && WIDGETS.has(value);
}

export function isUiFormatKey(value: unknown): value is UiFormatKey {
  return typeof value === "string" && FORMATS.has(value);
}

export function isUiActionKind(value: unknown): value is UiActionKind {
  return typeof value === "string" && ACTION_KINDS.has(value);
}

export function assertSafeUiMetadata(resource: unknown): void {
  if (!resource || typeof resource !== "object") throw new Error("Invalid ResourceMetadata v2 payload");
  const candidate = resource as {
    metadata_version?: unknown;
    resource_id?: unknown;
    fields?: unknown;
    actions?: unknown;
  };
  if (candidate.metadata_version !== "2") throw new Error("Unsupported ResourceMetadata version");
  const resourceId = typeof candidate.resource_id === "string" ? candidate.resource_id : "unknown";
  if (!candidate.fields || typeof candidate.fields !== "object" || Array.isArray(candidate.fields)) {
    throw new Error(`Invalid fields metadata for ${resourceId}`);
  }
  for (const [name, raw] of Object.entries(candidate.fields as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") throw new Error(`Invalid field metadata ${resourceId}.${name}`);
    const field = raw as { widget?: unknown; format?: unknown };
    if (!isUiWidgetKey(field.widget)) throw new Error(`Unsupported widget key for ${resourceId}.${name}`);
    if (!isUiFormatKey(field.format)) throw new Error(`Unsupported format key for ${resourceId}.${name}`);
  }
  if (!Array.isArray(candidate.actions)) throw new Error(`Invalid action metadata for ${resourceId}`);
  for (const raw of candidate.actions) {
    if (!raw || typeof raw !== "object") throw new Error(`Invalid action metadata for ${resourceId}`);
    const action = raw as { id?: unknown; command?: unknown; kind?: unknown };
    if (typeof action.id !== "string" || typeof action.command !== "string" || !isUiActionKind(action.kind)) {
      throw new Error(`Unsupported action descriptor for ${resourceId}`);
    }
  }
}
