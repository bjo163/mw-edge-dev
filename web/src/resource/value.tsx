import type { ResourceFieldMetadata } from "../api";
import { formatDateTime, formatNumber, formatReference } from "../i18n/format";
import type { Locale } from "../i18n/messages";
import { StatusBadge } from "../ui/primitives";

export function ResourceValue({ field, value, locale }: { readonly field: ResourceFieldMetadata | undefined; readonly value: unknown; readonly locale: Locale }) {
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (!field) return <>{typeof value === "object" ? JSON.stringify(value) : String(value)}</>;

  try {
    switch (field.format) {
      case "number":
        return <>{formatNumber(Number(value), locale)}</>;
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
