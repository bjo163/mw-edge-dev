export interface Principal {
  readonly principal_ref: string;
  readonly username: string;
  readonly display_name: string;
  readonly is_superuser: boolean;
  readonly must_rotate_password: boolean;
}

export interface ResourceMetadata {
  readonly resource_id: string;
  readonly label: string;
  readonly domain: string;
  readonly authority: string;
  readonly navigation: { readonly visible: boolean; readonly group: string };
  readonly crud: { readonly list: boolean; readonly read: boolean; readonly create: boolean; readonly update: boolean; readonly delete: boolean };
  readonly fields: Readonly<Record<string, { readonly type: string; readonly required?: boolean; readonly enum?: readonly string[] }>>;
  readonly views: { readonly list: { readonly columns: readonly string[] } };
}

export interface AppMetadata {
  readonly components: readonly { readonly id: string }[];
  readonly groups: readonly string[];
  readonly resources: readonly ResourceMetadata[];
}

interface ErrorEnvelope {
  readonly error?: {
    readonly message?: string;
    readonly request_id?: string;
    readonly requestId?: string;
    readonly correlation_id?: string;
    readonly correlationId?: string;
  };
  readonly request_id?: string;
  readonly requestId?: string;
  readonly correlation_id?: string;
  readonly correlationId?: string;
}

function firstString(...values: readonly unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;
  readonly retryable: boolean;

  constructor(message: string, status: number, requestId: string | undefined, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...options.headers },
    ...options,
  });
  const data = (await response.json().catch(() => ({}))) as ErrorEnvelope;
  if (!response.ok) {
    const method = (options.method ?? "GET").toUpperCase();
    const requestId = firstString(
      data.error?.request_id,
      data.error?.requestId,
      data.error?.correlation_id,
      data.error?.correlationId,
      data.request_id,
      data.requestId,
      data.correlation_id,
      data.correlationId,
      response.headers.get("x-request-id"),
      response.headers.get("x-correlation-id"),
    );
    const retryableStatus = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    throw new ApiError(
      data.error?.message ?? `HTTP ${response.status}`,
      response.status,
      requestId,
      method === "GET" && retryableStatus,
    );
  }
  return data as T;
}

export const api = {
  session: () => request<{ principal: Principal }>("/api/auth/session"),
  login: (username: string, password: string) =>
    request<{ principal: Principal }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  changePassword: (password: string) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ password }) }),
  metadata: () => request<AppMetadata>("/api/meta/app"),
  list: (model: string) =>
    request<{ items: readonly Record<string, unknown>[]; total: number }>(`/api/admin/resources/${encodeURIComponent(model)}`),
  create: (model: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/resources/${encodeURIComponent(model)}`, { method: "POST", body: JSON.stringify(body) }),
};
