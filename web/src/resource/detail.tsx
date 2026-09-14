import { useEffect, useState } from "react";
import { ApiError, api, type ResourceMetadata } from "../api";
import type { Locale } from "../i18n/messages";
import { Button, EmptyState, InlineError, LoadingState, StatusBadge } from "../ui/primitives";
import { ResourceValue } from "./value";

export function ResourceDetail({ metadata, record, locale, onBack }: {
  readonly metadata: ResourceMetadata;
  readonly record: string;
  readonly locale: Locale;
  readonly onBack: () => void;
}) {
  const [item, setItem] = useState<Record<string, unknown>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ readonly message: string; readonly status: number | undefined; readonly retryable: boolean }>({ message: "", status: undefined, retryable: false });

  const load = async () => {
    setLoading(true);
    setError({ message: "", status: undefined, retryable: false });
    try {
      const result = await api.read(metadata.resource_id, record);
      setItem(result.item);
    } catch (failure) {
      setError({
        message: failure instanceof Error ? failure.message : "Load failed",
        status: failure instanceof ApiError ? failure.status : undefined,
        retryable: failure instanceof ApiError && failure.retryable,
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [metadata.resource_id, record]);

  if (loading) return <LoadingState />;
  if (error.status === 404) return <EmptyState title="Record not found" description="The requested record does not exist or is no longer available." action={<Button onClick={onBack}>Back to {metadata.labels.plural}</Button>} />;
  if (error.message) return <InlineError><p>{error.message}</p>{error.retryable && <Button onClick={() => void load()}>Retry</Button>}<Button onClick={onBack}>Back</Button></InlineError>;
  if (!item) return <EmptyState title="Record unavailable" description="No readable record was returned." action={<Button onClick={onBack}>Back</Button>} />;

  const identity = item[metadata.record_key] ?? item.id ?? record;
  const primaryValue = metadata.display.primary_field ? item[metadata.display.primary_field] : identity;
  const statusValue = metadata.display.status_field ? item[metadata.display.status_field] : undefined;

  return <article className="record-detail">
    <header className="record-header"><div><Button className="back-link" onClick={onBack}>← {metadata.labels.plural}</Button><div className="eyebrow">{metadata.labels.singular}</div><h1>{String(primaryValue ?? identity)}</h1><p className="record-identity">{metadata.record_key}: <code>{String(identity)}</code></p></div>{statusValue !== undefined && <StatusBadge>{String(statusValue)}</StatusBadge>}</header>

    <nav className="record-tabs" aria-label="Record sections"><a href="#details">Details</a><a href="#expert">Expert</a></nav>
    <div id="details" className="record-sections">{metadata.views.detail.sections.map((section) => <section key={section.id} className="panel record-section"><h2>{section.label}</h2><dl>{section.fields.map((name) => {
      const field = metadata.fields[name];
      if (!field) return null;
      return <div key={name} className="fact-row"><dt>{field.label}</dt><dd><ResourceValue field={field} value={item[name]} locale={locale} /></dd></div>;
    })}</dl></section>)}</div>

    <details id="expert" className="panel expert"><summary>Expert context</summary><dl><div><dt>Resource</dt><dd><code>{metadata.resource_id}</code></dd></div><div><dt>Domain</dt><dd>{metadata.domain}</dd></div><div><dt>Authority</dt><dd>{metadata.authority}</dd></div><div><dt>Owner component</dt><dd><code>{metadata.owner_component}</code></dd></div><div><dt>Metadata</dt><dd>v{metadata.metadata_version}</dd></div></dl></details>
  </article>;
}
