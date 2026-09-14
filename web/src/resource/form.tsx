import { useState } from "react";
import { ApiError, api, type ResourceFieldMetadata, type ResourceMetadata } from "../api";
import { message, type Locale } from "../i18n/messages";
import { Button, ErrorSummary, Field, Input, Select } from "../ui/primitives";
import { serializeResourceForm, type Draft, type FieldErrors } from "./form-serialization";

function FieldControl({ field, value, onChange, id, describedBy, invalid, locale }: {
  readonly field: ResourceFieldMetadata;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly locale: Locale;
}) {
  const common = { id, "aria-describedby": describedBy, "aria-invalid": invalid || undefined, required: field.required };
  switch (field.widget) {
    case "checkbox":
      return <Input {...common} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />;
    case "number":
      return <Input {...common} type="number" step={field.type === "Integer" ? 1 : "any"} value={String(value ?? "")} placeholder={field.placeholder ?? undefined} onChange={(event) => onChange(event.target.value)} />;
    case "datetime":
      return <Input {...common} type="datetime-local" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
    case "select":
      return <Select {...common} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}><option value="">{message(locale, "resource.selectOption")}</option>{field.enum?.map((option) => <option key={option} value={option}>{option}</option>)}</Select>;
    case "textarea":
      return <textarea {...common} value={String(value ?? "")} placeholder={field.placeholder ?? undefined} onChange={(event) => onChange(event.target.value)} />;
    case "reference":
      return <Input {...common} type="text" inputMode="text" value={String(value ?? "")} placeholder={field.placeholder ?? field.ref_kind ?? undefined} onChange={(event) => onChange(event.target.value)} />;
    case "text":
      return <Input {...common} type="text" value={String(value ?? "")} placeholder={field.placeholder ?? undefined} onChange={(event) => onChange(event.target.value)} />;
    default:
      return <div className="unsupported-field" role="note">{message(locale, "resource.editor.required")}</div>;
  }
}

export function ResourceCreateForm({ metadata, locale, onCreated }: {
  readonly metadata: ResourceMetadata;
  readonly locale: Locale;
  readonly onCreated: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Draft>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<{ readonly message: string; readonly requestId: string | undefined }>({ message: "", requestId: undefined });
  const [submitting, setSubmitting] = useState(false);

  if (!metadata.crud.create) return null;

  return <details className="panel create-panel"><summary>{message(locale, "resource.create")}</summary><form className="resource-form" noValidate onSubmit={async (event) => {
    event.preventDefault();
    const serialized = serializeResourceForm(metadata, draft);
    setFieldErrors(serialized.errors);
    setSubmitError({ message: "", requestId: undefined });
    if (Object.keys(serialized.errors).length > 0) return;
    setSubmitting(true);
    try {
      await api.create(metadata.resource_id, serialized.body);
      setDraft({});
      await onCreated();
    } catch (failure) {
      setSubmitError({
        message: failure instanceof Error ? failure.message : message(locale, "resource.createFailed"),
        requestId: failure instanceof ApiError ? failure.requestId : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }}>
    <ErrorSummary errors={[...Object.values(fieldErrors), ...(submitError.message ? [submitError.message] : [])]} />
    {submitError.requestId && <details className="error-details"><summary>{message(locale, "state.technicalDetails")}</summary><dl><div><dt>{message(locale, "state.requestId")}</dt><dd><code>{submitError.requestId}</code></dd></div></dl></details>}
    {metadata.views.form.sections.map((section) => <fieldset key={section.id}><legend>{section.label}</legend><div className="grid">{section.fields.map((name) => {
      const field = metadata.fields[name];
      if (!field || field.read_only || field.generated) return null;
      const fieldError = fieldErrors[name];
      return <Field key={name} label={field.label} help={field.help} {...(fieldError ? { error: fieldError } : {})} {...(field.required === undefined ? {} : { required: field.required })}>{({ id, describedBy }) => <FieldControl field={field} value={draft[name]} id={id} describedBy={describedBy} invalid={Boolean(fieldError)} locale={locale} onChange={(value) => {
        setDraft((current) => ({ ...current, [name]: value }));
        if (fieldErrors[name]) setFieldErrors((current) => { const next = { ...current }; delete next[name]; return next; });
      }} />}</Field>;
    })}</div></fieldset>)}
    <Button type="submit" disabled={submitting}>{submitting ? message(locale, "state.loading") : message(locale, "resource.create")}</Button>
  </form></details>;
}
