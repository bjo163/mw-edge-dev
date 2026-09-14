import type { ResourceFieldMetadata } from "../api";
import { formatDateTime, formatMoney, formatNumber, formatReference } from "../i18n/format";
import type { Locale } from "../i18n/messages";
import { StatusBadge } from "../ui/primitives";

export function ResourceValue({
  field,
  value,
  locale,
  record,
}: {
  readonly field: ResourceFieldMetadata | undefined;
  readonly value: unknown;
  readonly locale: Locale;
  readonly record?: Readonly<Record<string, unknown>>;
}) {
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (!field) return <>{typeof value === "object" ? JSON.stringify(value) : String(value)}</>;

  try {
    switch (field.format) {
      case "number":
        return <>{formatNumber(Number(value), locale)}</>;
      case "money": {
        const currency = field.currency_field && record ? record[field.currency_field] : undefined;
        return <>{typeof currency === "string" && currency.length > 0
          ? formatMoney(Number(value), currency, locale)
          : formatNumber(Number(value), locale)}</>;
      }
      case "boolean":
        return <>{Boolean(value) ? (locale === "id" ? "Ya" : "Yes") : (locale === "id" ? "Tidak" : "No")}</>;
      case "datetime":
        return <time dateTime={String(value)}>{formatDateTime(String(value), locale)}</time>;
      case "status":
        return <StatusBadge>{String(value)}</StatusBadge>;
      case "reference":
        return <code title={String(value)}>{formatReference(String(value))}</code>;
      case "json":
        return <code className="json-value">{JSON.stringify(value)}</code>;
      default:
        return <>{String(value)}</>;
    }
  } catch {
    return <>{String(value)}</>;
  }
}
