import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError, api, type AppMetadata, type Principal, type ResourceMetadata } from "./api";
import { message, resolveLocale, type Locale } from "./i18n/messages";
import { ResourceDetail } from "./resource/detail";
import { ResourceCreateForm } from "./resource/form";
import { ResourceGrid } from "./resource/grid";
import { readRoute, recordPath, resourcePath, type Route } from "./routing";
import { Button, EmptyState, InlineError, LoadingState, StatusBadge } from "./ui/primitives";

function Login({ locale, onLogin }: { readonly locale: Locale; readonly onLogin: () => Promise<void> }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.login(username, password);
      await onLogin();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Login failed");
    }
  };

  return <main className="center"><form className="panel login" onSubmit={submit}><div className="eyebrow">MOONWITNESS</div><h1>MW Edge</h1><p>Standalone local operator access</p><label>{message(locale, "auth.username")}<input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>{message(locale, "auth.password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <InlineError>{error}</InlineError>}<Button type="submit">{message(locale, "auth.enter")}</Button></form></main>;
}

function Rotate({ locale, onDone }: { readonly locale: Locale; readonly onDone: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return <main className="center"><form className="panel login" onSubmit={async (event) => { event.preventDefault(); try { await api.changePassword(password); await onDone(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Password change failed"); } }}><h1>{message(locale, "auth.rotate.title")}</h1><p>{message(locale, "auth.rotate.description")}</p><label>{message(locale, "auth.password")}<input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <InlineError>{error}</InlineError>}<Button type="submit">{message(locale, "auth.rotate.action")}</Button></form></main>;
}

function ResourceWorkbench({ locale, metadata, onOpenRecord }: {
  readonly locale: Locale;
  readonly metadata: ResourceMetadata;
  readonly onOpenRecord: (record: string | number) => void;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  return <section className="resource-workbench"><header className="resource-head"><div><div className="eyebrow">{metadata.domain}</div><h1>{metadata.labels.plural}</h1><p>{metadata.labels.description}</p></div><StatusBadge label="Authority">{metadata.authority}</StatusBadge></header><ResourceCreateForm metadata={metadata} locale={locale} onCreated={() => setRefreshToken((value) => value + 1)} /><ResourceGrid metadata={metadata} locale={locale} onOpenRecord={onOpenRecord} refreshToken={refreshToken} /></section>;
}

type ShellReadError = {
  readonly message: string;
  readonly requestId: string | undefined;
  readonly retryable: boolean;
};

export function App() {
  const [principal, setPrincipal] = useState<Principal>();
  const [metadata, setMetadata] = useState<AppMetadata>();
  const [route, setRoute] = useState<Route>(() => readRoute(location.pathname));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ShellReadError>();
  const contentRef = useRef<HTMLElement>(null);
  const locale = resolveLocale(undefined);
  const navigate = (path: string) => {
    if (`${location.pathname}${location.search}` !== path) history.pushState(null, "", path);
    setRoute(readRoute(location.pathname));
  };
  const load = async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const session = await api.session();
      setPrincipal(session.principal);
      if (session.principal.must_rotate_password) {
        setMetadata(undefined);
        return;
      }
      setMetadata(await api.metadata());
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        setPrincipal(undefined);
        setMetadata(undefined);
      } else {
        setLoadError({
          message: failure instanceof Error ? failure.message : "Load failed",
          requestId: failure instanceof ApiError ? failure.requestId : undefined,
          retryable: failure instanceof ApiError ? failure.retryable : true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const onPopState = () => setRoute(readRoute(location.pathname));
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (loading || loadError || !principal || principal.must_rotate_password) return;
    contentRef.current?.focus({ preventScroll: true });
  }, [loading, loadError, principal, route]);

  const resourceId = route.kind === "resource" || route.kind === "record" ? route.resourceId : undefined;
  const resource = useMemo(() => resourceId ? metadata?.resources.find((item) => item.resource_id === resourceId || item.route_key === resourceId) : undefined, [metadata, resourceId]);
  if (loading) return <LoadingState />;
  if (loadError) return <main className="center"><section className="panel login"><InlineError><p>{loadError.message}</p>{loadError.retryable && <Button onClick={() => void load()}>{message(locale, "action.retry")}</Button>}{loadError.requestId && <details><summary>{message(locale, "state.technicalDetails")}</summary><p>{message(locale, "state.requestId")}: <code>{loadError.requestId}</code></p></details>}</InlineError></section></main>;
  if (!principal) return <Login locale={locale} onLogin={load} />;
  if (principal.must_rotate_password) return <Rotate locale={locale} onDone={load} />;

  const backToResources = <Button onClick={() => navigate("/")}>{message(locale, "action.back")}</Button>;
  let content;
  if (route.kind === "resource") {
    content = resource
      ? <ResourceWorkbench locale={locale} metadata={resource} onOpenRecord={(record) => navigate(`${recordPath(resource.route_key, record)}${location.search}`)} />
      : <EmptyState title={message(locale, "resource.notFound.title")} description={message(locale, "resource.notFound.description")} action={backToResources} />;
  } else if (route.kind === "record") {
    content = resource
      ? <ResourceDetail locale={locale} metadata={resource} record={route.recordId} onBack={() => navigate(`${resourcePath(resource.route_key)}${location.search}`)} />
      : <EmptyState title={message(locale, "resource.notFound.title")} description={message(locale, "resource.notFound.description")} action={backToResources} />;
  } else if (route.kind === "not-found") {
    content = <EmptyState title={message(locale, "route.notFound.title")} description={message(locale, "route.notFound.description")} action={backToResources} />;
  } else {
    content = <EmptyState title={message(locale, "resource.select")} description="Choose a resource from the navigation to begin." />;
  }

  return <div className="shell"><aside><div className="brand"><div className="eyebrow">MW EDGE</div><strong>{metadata?.components.length ?? 0} components</strong><small>{metadata?.resources.length ?? 0} resources</small></div>{metadata?.groups.map((group) => <div key={group}><h3>{group}</h3>{metadata.resources.filter((item) => item.navigation.visible && item.navigation.group === group).sort((a, b) => a.navigation.order - b.navigation.order || a.label.localeCompare(b.label)).map((item) => {
    const path = `${resourcePath(item.route_key)}${location.search}`;
    const active = resource?.resource_id === item.resource_id;
    return <a
      key={item.resource_id}
      href={path}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(path);
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "var(--mw-space-2) var(--mw-space-3)",
        border: "1px solid transparent",
        borderRadius: "var(--mw-radius-sm)",
        background: active ? "var(--mw-color-action)" : "transparent",
        color: "var(--mw-color-text-strong)",
        textDecoration: "none",
      }}
    >{item.label}</a>;
  })}</div>)}<Button onClick={async () => { await api.logout(); location.reload(); }}>{message(locale, "nav.logout")}</Button></aside><main ref={contentRef} tabIndex={-1}>{content}</main></div>;
}
