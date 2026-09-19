export type Route =
  | { readonly kind: "home" }
  | { readonly kind: "resource"; readonly resourceId: string }
  | { readonly kind: "record"; readonly resourceId: string; readonly recordId: string }
  | { readonly kind: "not-found" };

function decodeSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function readRoute(pathname: string): Route {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "home" };
  if (segments[0] !== "resources") return { kind: "not-found" };

  const resourceId = decodeSegment(segments[1]);
  if (!resourceId) return { kind: "not-found" };
  if (segments.length === 2) return { kind: "resource", resourceId };

  const recordId = decodeSegment(segments[2]);
  if (segments.length === 3 && recordId) return { kind: "record", resourceId, recordId };
  return { kind: "not-found" };
}

export function resourcePath(resourceId: string): string {
  return `/resources/${encodeURIComponent(resourceId)}`;
}

export function recordPath(resourceId: string, recordId: string | number): string {
  return `${resourcePath(resourceId)}/${encodeURIComponent(String(recordId))}`;
}

export function preserveRouteContext(path: string, search: string): string {
  if (!search || search === "?") return path;

  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const target = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = target.indexOf("?");
  const pathname = queryIndex >= 0 ? target.slice(0, queryIndex) : target;
  const targetSearch = queryIndex >= 0 ? target.slice(queryIndex + 1) : "";
  const context = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const targetParams = new URLSearchParams(targetSearch);

  for (const [key, value] of targetParams) context.set(key, value);
  const merged = context.toString();
  return `${pathname}${merged ? `?${merged}` : ""}${hash}`;
}
