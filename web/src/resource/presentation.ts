import type { ResourceFieldMetadata } from "../api.js";
import { formatDateTime, formatMoney, formatNumber, formatReference } from "../i18n/format.js";
import type { Locale } from "../i18n/messages.js";

export type ResourcePresentation =
  | { readonly kind: "empty"; readonly text: "—" }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "datetime"; readonly text: string; readonly dateTime: string }
  | { readonly kind: "status"; readonly text: string }
  | { readonly kind: "reference"; readonly text: string; readonly title: string }
  | { readonly kind: "json"; readonly text: string };

export function presentResourceValue(input: {
  readonly field: ResourceFieldMetadata | undefined;
  readonly value: unknown;
  readonly locale: Locale;
  readonly record?: Readonly<Record<string, unknown>>;
}): ResourcePresentation {
  const { field, value, locale, record } = input;
  if (value === null || value === undefined || value === "") return { kind: "empty", text: "—" };
  if (!field) {
    return { kind: "text", text: typeof value === "object" ? JSON.stringify(value) : String(value) };
  }

  try {
    switch (field.format) {
      case "number":
        return { kind: "text", text: formatNumber(Number(value), locale) };
      case "money": {
        const currency = field.currency_field && record ? record[field.currency_field] : undefined;
        return {
          kind: "text",
          text: typeof currency === "string" && currency.length > 0
            ? formatMoney(Number(value), currency, locale)
            : formatNumber(Number(value), locale),
        };
      }
      case "boolean":
        return { kind: "text", text: Boolean(value) ? (locale === "id" ? "Ya" : "Yes") : (locale === "id" ? "Tidak" : "No") };
      case "datetime":
        return { kind: "datetime", text: formatDateTime(String(value), locale), dateTime: String(value) };
      case "status":
        return { kind: "status", text: String(value) };
      case "reference":
        return { kind: "reference", text: formatReference(String(value)), title: String(value) };
      case "json":
        return { kind: "json", text: JSON.stringify(value) };
      default:
        return { kind: "text", text: String(value) };
    }
  } catch {
    return { kind: "text", text: String(value) };
  }
}
