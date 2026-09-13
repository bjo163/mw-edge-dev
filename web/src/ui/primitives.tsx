import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ type = "button", ...props }: ButtonProps) {
  return <button type={type} {...props} />;
}

export function StatusBadge({ children }: { readonly children: ReactNode }) {
  return <span className="badge" aria-label={`Status: ${String(children)}`}>{children}</span>;
}

export function InlineError({ children }: { readonly children: ReactNode }) {
  return <div className="error" role="alert">{children}</div>;
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
  return <section className="panel" aria-labelledby="empty-state-title"><h2 id="empty-state-title">{title}</h2><p>{description}</p>{action}</section>;
}

export function LoadingState({ label = "Loading…" }: { readonly label?: string }) {
  return <main className="center" aria-busy="true"><span role="status">{label}</span></main>;
}
