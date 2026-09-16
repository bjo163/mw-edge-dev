import {
  useId,
  type ButtonHTMLAttributes,
  type DetailsHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ type = "button", ...props }: ButtonProps) {
  return <button type={type} {...props} />;
}

export function IconButton({ type = "button", className, ...props }: Omit<ButtonProps, "aria-label"> & { readonly "aria-label": string }) {
  return <button type={type} className={`icon-button ${className ?? ""}`.trim()} {...props} />;
}

export function Field({
  label,
  help,
  error,
  required,
  children,
}: {
  readonly label: string;
  readonly help?: string | null;
  readonly error?: string | null;
  readonly required?: boolean;
  readonly children: (input: { readonly id: string; readonly describedBy: string | undefined; readonly required: boolean }) => ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  return <div className="field"><label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{children({ id, describedBy, required: Boolean(required) })}{help && <small id={helpId} className="field-help">{help}</small>}{error && <small id={errorId} className="field-error" role="alert">{error}</small>}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function StatusBadge({ children, label = "Status" }: { readonly children: ReactNode; readonly label?: string }) {
  return <span className="badge"><span className="sr-only">{label}: </span>{children}</span>;
}

export function Panel({ title, children }: { readonly title?: string; readonly children: ReactNode }) {
  const id = useId();
  return <section className="panel" aria-labelledby={title ? id : undefined}>{title && <h2 id={id}>{title}</h2>}{children}</section>;
}

export function Drawer({ summary, children, className, ...props }: DetailsHTMLAttributes<HTMLDetailsElement> & { readonly summary: ReactNode }) {
  return <details className={`drawer panel ${className ?? ""}`.trim()} {...props}><summary>{summary}</summary><div className="drawer-body">{children}</div></details>;
}

export function DataTable({ caption, children, ...props }: TableHTMLAttributes<HTMLTableElement> & { readonly caption: string }) {
  return <div className="table-wrap"><table {...props}><caption className="sr-only">{caption}</caption>{children}</table></div>;
}

export function InlineError({ children }: { readonly children: ReactNode }) {
  return <div className="error" role="alert">{children}</div>;
}

export function ErrorSummary({ title = "Please review the errors", errors }: { readonly title?: string; readonly errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return <section className="error error-summary" role="alert"><strong>{title}</strong><ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul></section>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  const id = useId();
  return <section className="panel empty-state" aria-labelledby={id}><h2 id={id}>{title}</h2><p>{description}</p>{action}</section>;
}

export function LoadingState({ label = "Loading…" }: { readonly label?: string }) {
  return <div className="center loading-state" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">{label}</div>;
}
