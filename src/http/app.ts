import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { Hono, type Context, type Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { MwError } from "../kernel/errors.js";
import type { BootEnvironment } from "../kernel/plugins/host.js";
import type { InputRecord, OutputRecord } from "../kernel/orm.js";
import type { FieldDefinition, RecordValue } from "../kernel/types.js";
import { generateSessionToken, hashPassword, tokenHash, verifyPassword } from "../standalone/auth.js";

type AppEnv = {
  Variables: {
    request_id: string;
    auth: { session: OutputRecord; principal: OutputRecord };
  };
};

function publicRecord(env: BootEnvironment, modelName: string, row: OutputRecord | undefined): OutputRecord | undefined {
  if (!row) return row;
  const output = { ...row };
  for (const [name, field] of Object.entries(env.registry.get(modelName).fields)) {
    if (field.sensitive) delete output[name];
  }
  return output;
}

function parseFilterValue(field: FieldDefinition, raw: string): RecordValue {
  switch (field.type) {
    case "Boolean":
      if (raw === "true" || raw === "1") return true;
      if (raw === "false" || raw === "0") return false;
      throw new MwError("INVALID_QUERY", "Boolean filters must be true or false", 400);
    case "Integer": {
      const value = Number(raw);
      if (!Number.isInteger(value)) throw new MwError("INVALID_QUERY", "Integer filter is invalid", 400);
      return value;
    }
    case "Decimal": {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new MwError("INVALID_QUERY", "Decimal filter is invalid", 400);
      return value;
    }
    case "String":
    case "Enum":
    case "DateTime":
    case "Reference":
      return raw;
    default:
      throw new MwError("INVALID_QUERY", `Filtering ${field.type} fields is not supported`, 400);
  }
}

export function createApp(env: BootEnvironment): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const standalone = env.registry.has("standalone.principal") && env.registry.has("standalone.session");

  const issueSession = (principalRef: string): string => {
    const token = generateSessionToken();
    const created = new Date();
    const expires = new Date(created.getTime() + 12 * 60 * 60 * 1000);
    env.orm.model("standalone.session").create({
      session_ref: randomUUID(),
      principal_ref: principalRef,
      token_hash: tokenHash(token),
      created_at: created.toISOString(),
      expires_at: expires.toISOString(),
    });
    return token;
  };

  const authenticate = (token: string | undefined): AppEnv["Variables"]["auth"] | undefined => {
    if (!standalone || !token) return undefined;
    const session = env.orm.model("standalone.session").findOne({ filters: { token_hash: tokenHash(token) } });
    if (!session || session.revoked_at || Date.parse(String(session.expires_at)) <= Date.now()) return undefined;
    const principal = env.orm.model("standalone.principal").get(String(session.principal_ref));
    if (!principal || !principal.active || !principal.login_enabled) return undefined;
    return { session, principal };
  };

  app.use("*", async (context, next) => {
    context.set("request_id", context.req.header("x-request-id") ?? randomUUID());
    const method = context.req.method.toUpperCase();
    const origin = context.req.header("origin");
    if (origin && !["GET", "HEAD", "OPTIONS"].includes(method) && origin !== new URL(context.req.url).origin) {
      throw new MwError("ACCESS_DENIED", "Cross-origin state change denied", 403);
    }
    await next();
    context.header("x-request-id", context.get("request_id"));
  });

  app.onError((error, context) => {
    const failure =
      error instanceof MwError
        ? error
        : new MwError("INTERNAL_ERROR", process.env.NODE_ENV === "production" ? "Internal error" : error.message, 500);
    return context.json(
      { error: { code: failure.code, message: failure.message, request_id: context.get("request_id") } },
      failure.status as 400 | 403 | 404 | 409 | 413 | 500,
    );
  });

  app.get("/health", (context) =>
    context.json({ status: "ok", profile: env.profile, models: env.registry.list().length, components: env.ordered.length }),
  );
  app.get("/api/bootstrap/status", (context) =>
    context.json({
      standalone,
      admin_initialized: standalone ? Boolean(env.orm.model("standalone.principal").get("mw.super-admin")) : false,
    }),
  );

  app.post("/api/auth/login", async (context) => {
    if (!standalone) throw new MwError("NOT_FOUND", "Standalone login is not enabled", 404);
    if (Number(context.req.header("content-length") ?? 0) > 65536) throw new MwError("PAYLOAD_TOO_LARGE", "Request body too large", 413);
    const body = (await context.req.json()) as { username?: unknown; password?: unknown };
    const principal = env.orm.model("standalone.principal").findOne({ filters: { username: String(body.username ?? "") } });
    if (!principal || !principal.login_enabled || !verifyPassword(String(body.password ?? ""), principal.password_hash)) {
      throw new MwError("ACCESS_DENIED", "Invalid credentials", 403);
    }

    const token = issueSession(String(principal.principal_ref));
    setCookie(context, "mw_session", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.MW_COOKIE_SECURE === "1",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return context.json({ principal: publicRecord(env, "standalone.principal", principal) });
  });

  const requireAdmin = async (context: Context<AppEnv>, next: Next): Promise<void> => {
    const state = authenticate(getCookie(context, "mw_session"));
    if (!state || !state.principal.is_superuser) throw new MwError("ACCESS_DENIED", "Standalone superuser required", 403);
    context.set("auth", state);
    await next();
  };

  app.post("/api/auth/logout", requireAdmin, (context) => {
    const { session } = context.get("auth");
    env.orm.model("standalone.session").update(String(session.session_ref), { revoked_at: new Date().toISOString() });
    deleteCookie(context, "mw_session", { path: "/" });
    return context.json({ ok: true });
  });
  app.get("/api/auth/session", requireAdmin, (context) => {
    const { principal } = context.get("auth");
    return context.json({ principal: publicRecord(env, "standalone.principal", principal) });
  });
  app.post("/api/auth/change-password", requireAdmin, async (context) => {
    const { principal, session } = context.get("auth");
    const body = (await context.req.json()) as { password?: unknown };
    let rotatedToken = "";
    env.orm.atomic("standalone", () => {
      env.orm.model("standalone.principal").update(String(principal.principal_ref), {
        password_hash: hashPassword(String(body.password ?? "")),
        must_rotate_password: false,
      });
      env.orm.model("standalone.session").update(String(session.session_ref), { revoked_at: new Date().toISOString() });
      rotatedToken = issueSession(String(principal.principal_ref));
    });
    setCookie(context, "mw_session", rotatedToken, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.MW_COOKIE_SECURE === "1",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    const credentialFile = resolve(process.cwd(), "data/.bootstrap/admin-credentials.json");
    if (existsSync(credentialFile)) {
      try { unlinkSync(credentialFile); } catch { /* best effort */ }
    }
    return context.json({ ok: true });
  });

  app.use("/api/meta/*", requireAdmin);
  app.get("/api/meta/app", (context) => context.json(env.metadata));
  app.get("/api/meta/resources", (context) => context.json(env.metadata.resources));

  app.use("/api/admin/*", requireAdmin);
  app.get("/api/admin/resources/:model", (context) => {
    const modelName = context.req.param("model");
    const metadata = env.metadata.resources.find((resource) => resource.resource_id === modelName);
    if (!metadata?.crud.list) throw new MwError("ACCESS_DENIED", "Resource is not listable", 403);

    const url = new URL(context.req.url);
    const limit = Number(url.searchParams.get("limit") ?? metadata.views.list.default_page_size);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const sortField = url.searchParams.get("sort") ?? metadata.views.list.default_sort?.field ?? null;
    const direction = (url.searchParams.get("direction") ?? metadata.views.list.default_sort?.direction ?? "asc").toLowerCase();
    if (sortField && !metadata.views.list.sortable_fields.includes(sortField)) {
      throw new MwError("INVALID_QUERY", `Field ${sortField} is not sortable`, 400);
    }
    if (direction !== "asc" && direction !== "desc") {
      throw new MwError("INVALID_QUERY", "Sort direction must be asc or desc", 400);
    }

    const filters: Record<string, RecordValue> = {};
    const model = env.registry.get(modelName);
    for (const [key, raw] of url.searchParams.entries()) {
      if (!key.startsWith("filter.")) continue;
      const fieldName = key.slice("filter.".length);
      if (!metadata.views.list.filterable_fields.includes(fieldName)) {
        throw new MwError("INVALID_QUERY", `Field ${fieldName} is not filterable`, 400);
      }
      const field = model.fields[fieldName];
      if (!field) throw new MwError("INVALID_QUERY", `Unknown filter field ${fieldName}`, 400);
      filters[fieldName] = parseFilterValue(field, raw);
    }

    const orderBy = sortField ? `${sortField} ${direction}` : undefined;
    const store = env.orm.model(modelName);
    return context.json({
      items: store.find({ limit, offset, filters, ...(orderBy ? { orderBy } : {}) }).map((row) => publicRecord(env, modelName, row)),
      total: store.count(filters),
      limit: Math.min(Math.max(limit || metadata.views.list.default_page_size, 1), 200),
      offset: Math.max(offset || 0, 0),
      sort: sortField,
      direction,
      filters,
    });
  });

  app.get("/api/admin/resources/:model/:record", (context) => {
    const modelName = context.req.param("model");
    const metadata = env.metadata.resources.find((resource) => resource.resource_id === modelName);
    if (!metadata?.crud.read) throw new MwError("ACCESS_DENIED", "Resource is not readable", 403);
    const rawRecord = context.req.param("record");
    const record = metadata.record_key === "id" && /^\d+$/.test(rawRecord) ? Number(rawRecord) : rawRecord;
    const row = publicRecord(env, modelName, env.orm.model(modelName).get(record));
    if (!row) throw new MwError("NOT_FOUND", "Record not found", 404);
    return context.json({ item: row });
  });

  app.post("/api/admin/resources/:model", async (context) => {
    const modelName = context.req.param("model");
    const metadata = env.metadata.resources.find((resource) => resource.resource_id === modelName);
    if (!metadata?.crud.create) throw new MwError("ACCESS_DENIED", "Resource is not creatable", 403);
    const body = (await context.req.json()) as InputRecord;
    for (const [name, field] of Object.entries(env.registry.get(modelName).fields)) {
      if (field.sensitive && Object.hasOwn(body, name)) throw new MwError("ACCESS_DENIED", "Sensitive fields require an explicit domain command", 403);
    }
    return context.json(publicRecord(env, modelName, env.orm.model(modelName).create(body)), 201);
  });

  return app;
}
