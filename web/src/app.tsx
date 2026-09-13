import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type AppMetadata, type Principal, type ResourceMetadata } from "./api";
import { Button, EmptyState, InlineError, LoadingState, StatusBadge } from "./ui/primitives";

type Route =
  | { readonly kind: "home" }
  | { readonly kind: "resource"; readonly resourceId: string }
  | { readonly kind: "not-found" };

function readRoute(): Route {
  const segments = location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "home" };
  if (segments.length === 2 && segments[0] === "resources") {
    const resourceSegment = segments[1];
    if (!resourceSegment) return { kind: "not-found" };
    try {
      return { kind: "resource", resourceId: decodeURIComponent(resourceSegment) };
    } catch {
      return { kind: "not-found" };
    }
  }
  return { kind: "not-found" };
}

function resourcePath(resourceId: string) {
  return `/resources/${encodeURIComponent(resourceId)}`;
}

function Login({ onLogin }: { readonly onLogin: () => Promise<void> }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try { await api.login(username, password); await onLogin(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Login failed"); }
  };
  return <main className="center"><form className="panel login" onSubmit={submit}><div className="eyebrow">MOONWITNESS</div><h1>MW Edge</h1><p>Standalone local operator access</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <InlineError>{error}</InlineError>}<Button type="submit">Enter</Button></form></main>;
}

function Rotate({ onDone }: { readonly onDone: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return <main className="center"><form className="panel login" onSubmit={async (event) => {event.preventDefault();try{await api.changePassword(password);await onDone();}catch(failure){setError(failure instanceof Error?failure.message:"Password change failed");}}}><h1>Set a new admin password</h1><p>The bootstrap credential is one-time only.</p><label>New password<input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <InlineError>{error}</InlineError>}<Button type="submit">Rotate Password</Button></form></main>;
}

function Resource({ metadata }: { readonly metadata: ResourceMetadata }) {
  const [data, setData] = useState<{ items: readonly Record<string, unknown>[]; total: number }>();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const refresh = async () => {
    try { setData(await api.list(metadata.resource_id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Load failed"); }
  };
  useEffect(() => { void refresh(); }, [metadata.resource_id]);

  return <section><header className="resource-head"><div><div className="eyebrow">{metadata.domain}</div><h2>{metadata.label}</h2></div><StatusBadge>{metadata.authority}</StatusBadge></header>{error && <InlineError>{error}</InlineError>}
  {metadata.crud.create && <details className="panel"><summary>Create record</summary><form className="grid" onSubmit={async (event) => {event.preventDefault();try{await api.create(metadata.resource_id,draft);setDraft({});await refresh();}catch(failure){setError(failure instanceof Error?failure.message:"Create failed");}}}>{Object.entries(metadata.fields).map(([name, field]) => <label key={name}>{name}{field.type === "Boolean" ? <input type="checkbox" checked={Boolean(draft[name])} onChange={(event) => setDraft({...draft,[name]:event.target.checked})} /> : field.type === "Enum" ? <select value={String(draft[name] ?? "")} onChange={(event) => setDraft({...draft,[name]:event.target.value})} required={field.required}><option value="">Select…</option>{field.enum?.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input value={String(draft[name] ?? "")} onChange={(event) => setDraft({...draft,[name]:field.type === "Integer" || field.type === "Decimal" ? Number(event.target.value) : event.target.value})} required={field.required} />}</label>)}<Button type="submit">Create</Button></form></details>}
  <div className="table-wrap"><table><thead><tr>{metadata.views.list.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{data?.items.map((row, index) => <tr key={String(row.id ?? index)}>{metadata.views.list.columns.map((column) => <td key={column}>{typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div></section>;
}

export function App() {
  const [principal, setPrincipal] = useState<Principal>();
  const [metadata, setMetadata] = useState<AppMetadata>();
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [loading, setLoading] = useState(true);
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
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);

  const resource = useMemo(() => route.kind === "resource" ? metadata?.resources.find((item) => item.resource_id === route.resourceId) : undefined, [metadata, route]);
  if (loading) return <LoadingState />;
  if (!principal) return <Login onLogin={load} />;
  if (principal.must_rotate_password) return <Rotate onDone={load} />;

  const backToResources = <Button onClick={() => navigate("/")}>Back to resources</Button>;
  const content = route.kind === "resource"
    ? resource
      ? <Resource metadata={resource} />
      : <EmptyState title="Resource not found" description="The requested resource is unavailable or not exposed by the current metadata." action={backToResources} />
    : route.kind === "not-found"
      ? <EmptyState title="Page not found" description="This route is not supported by the current MW Edge shell." action={backToResources} />
      : <EmptyState title="Select a resource" description="Choose a resource from the navigation to begin." />;

  return <div className="shell"><aside><div className="brand"><div className="eyebrow">MW EDGE</div><strong>{metadata?.components.length ?? 0} components</strong><small>{metadata?.resources.length ?? 0} resources</small></div>{metadata?.groups.map((group) => <div key={group}><h3>{group}</h3>{metadata.resources.filter((item) => item.navigation.visible && item.navigation.group === group).map((item) => <Button className={route.kind === "resource" && route.resourceId === item.resource_id ? "active" : ""} key={item.resource_id} onClick={() => navigate(resourcePath(item.resource_id))}>{item.label}</Button>)}</div>)}<Button onClick={async () => { await api.logout(); location.reload(); }}>Logout</Button></aside><main>{content}</main></div>;
}
