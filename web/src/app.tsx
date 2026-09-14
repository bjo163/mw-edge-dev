import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, type AppMetadata, type Principal, type ResourceMetadata } from "./api";
import { message, resolveLocale, type Locale } from "./i18n/messages";
import { ResourceDetail } from "./resource/detail";
import { ResourceCreateForm } from "./resource/form";
import { ResourceGrid } from "./resource/grid";
import { Button, EmptyState, InlineError, LoadingState, StatusBadge } from "./ui/primitives";

type Route =
  | { readonly kind: "home" }
  | { readonly kind: "resource"; readonly resourceId: string }
  | { readonly kind: "record"; readonly resourceId: string; readonly recordId: string }
  | { readonly kind: "not-found" };

function decodeSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return undefined; }
}

function readRoute(): Route {
  const segments = location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "home" };
  if (segments[0] !== "resources") return { kind: "not-found" };
  const resourceId = decodeSegment(segments[1]);
  if (!resourceId) return { kind: "not-found" };
  if (segments.length === 2) return { kind: "resource", resourceId };
  const recordId = decodeSegment(segments[2]);
  if (segments.length === 3 && recordId) return { kind: "record", resourceId, recordId };
  return { kind: "not-found" };
}

function resourcePath(resourceId: string) {
  return `/resources/${encodeURIComponent(resourceId)}`;
}

function recordPath(resourceId: string, recordId: string | number) {
  return `${resourcePath(resourceId)}/${encodeURIComponent(String(recordId))}`;
}

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

export function App() {
  const [principal, setPrincipal] = useState<Principal>();
  const [metadata, setMetadata] = useState<AppMetadata>();
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLElement>(null);
  const locale = resolveLocale(undefined);
  const navigate = (path: string) => {
    if (`${location.pathname}${location.search}` !== path) history.pushState(null, "", path);
    setRoute(readRoute());
  };
  const load = async () => {
    setLoading(true);
    try {
      const session = await api.session();
      setPrincipal(session.principal);
      if (!session.principal.must_rotate_password) setMetadata(await api.metadata());
    } catch {
      setPrincipal(undefined);
      setMetadata(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (loading || !principal || principal.must_rotate_password) return;
    contentRef.current?.focus({ preventScroll: true });
  }, [loading, principal, route]);

  const resourceId = route.kind === "resource" || route.kind === "record" ? route.resourceId : undefined;
  const resource = useMemo(() => resourceId ? metadata?.resources.find((item) => item.resource_id === resourceId || item.route_key === resourceId) : undefined, [metadata, resourceId]);
  if (loading) return <LoadingState />;
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

  return <div className="shell"><aside><div className="brand"><div className="eyebrow">MW EDGE</div><strong>{metadata?.components.length ?? 0} components</strong><small>{metadata?.resources.length ?? 0} resources</small></div>{metadata?.groups.map((group) => <div key={group}><h3>{group}</h3>{metadata.resources.filter((item) => item.navigation.visible && item.navigation.group === group).sort((a, b) => a.navigation.order - b.navigation.order || a.label.localeCompare(b.label)).map((item) => <Button className={resource?.resource_id === item.resource_id ? "active" : ""} key={item.resource_id} onClick={() => navigate(`${resourcePath(item.route_key)}${location.search}`)}>{item.label}</Button>)}</div>)}<Button onClick={async () => { await api.logout(); location.reload(); }}>{message(locale, "nav.logout")}</Button></aside><main ref={contentRef} tabIndex={-1}>{content}</main></div>;
}
