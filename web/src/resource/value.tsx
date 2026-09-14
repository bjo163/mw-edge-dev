import type { ResourceFieldMetadata } from "../api";
import type { Locale } from "../i18n/messages";
import { StatusBadge } from "../ui/primitives";
import { presentResourceValue } from "./presentation";

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
  const presented = presentResourceValue({ field, value, locale, ...(record ? { record } : {}) });
  switch (presented.kind) {
    case "empty":
      return <span className="muted">{presented.text}</span>;
    case "datetime":
      return <time dateTime={presented.dateTime}>{presented.text}</time>;
    case "status":
      return <StatusBadge>{presented.text}</StatusBadge>;
    case "reference":
      return <code title={presented.title}>{presented.text}</code>;
    case "json":
      return <code className="json-value">{presented.text}</code>;
    default:
      return <>{presented.text}</>;
  }
}
