import type { SQLInputValue } from "node:sqlite";
import { q, nowIso } from "./util.js";
import { tableFor, primaryRefFor } from "./schema.js";
import type { DbRow, FieldDefinition, RecordValue } from "./types.js";
import type { RegisteredModel, ModelRegistry } from "./model-registry.js";
import type { DomainDatabaseRouter } from "./database/router.js";
import type { SqliteDatabase } from "./database/sqlite.js";
import { compileComparisonFilters, type ComparisonFilter } from "./query-filter.js";

export type InputRecord = Record<string, RecordValue | undefined>;
export type OutputRecord = Record<string, unknown>;

function encode(field: FieldDefinition, value: RecordValue | undefined): SQLInputValue {
  if (value == null) return null;
  if (field.type === "Boolean") return value ? 1 : 0;
  if (field.type === "Json") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  throw new Error(`Unsupported scalar value for ${field.type}`);
}

function decode(field: FieldDefinition, value: unknown): unknown {
  if (value == null) return value;
  if (field.type === "Boolean") return Boolean(value);
  if (field.type === "Json" && typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function cleanRow(model: RegisteredModel, row: DbRow | undefined): OutputRecord | undefined {
  if (!row) return row;
  const output: OutputRecord = { ...row };
  for (const [name, field] of Object.entries(model.fields)) {
    if (name in output) output[name] = decode(field, output[name]);
  }
  return output;
}

export class ModelStore {
  readonly env: OrmEnvironment;
  readonly model: RegisteredModel;
  readonly db: SqliteDatabase;
  readonly table: string;
  readonly primaryRef: string | undefined;

  constructor(env: OrmEnvironment, model: RegisteredModel) {
    this.env = env;
    this.model = model;
    this.db = env.router.get(model.domain);
    this.table = tableFor(model);
    this.primaryRef = primaryRefFor(model);
  }

  validate(input: InputRecord, { partial = false }: { readonly partial?: boolean } = {}): Record<string, SQLInputValue> {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Record payload must be an object");
    const values: Record<string, SQLInputValue> = {};

    for (const key of Object.keys(input)) {
      if (!this.model.fields[key]) throw new Error(`Unknown field ${this.model.name}.${key}`);
    }

    for (const [name, field] of Object.entries(this.model.fields)) {
      let value = input[name];
      if (value === undefined && !partial && field.default !== undefined) value = field.default;
      if (value === undefined) {
        if (!partial && field.required) throw new Error(`Required field ${this.model.name}.${name}`);
        continue;
      }
      if (field.type === "Enum" && value != null && (!field.enum || typeof value !== "string" || !field.enum.includes(value))) {
        throw new Error(`Invalid enum value for ${this.model.name}.${name}`);
      }
      if ((field.type === "Integer" || field.type === "Decimal") && value != null && typeof value !== "number") {
        throw new Error(`Numeric value required for ${this.model.name}.${name}`);
      }
      if (field.type === "Relation" && value != null && field.target) {
        const parts = field.target.split(".");
        const targetField = parts.pop();
        if (!targetField) throw new Error(`Invalid relation target ${field.target}`);
        const target = this.env.model(parts.join("."));
        if (!target.findOne({ filters: { [targetField]: value } })) {
          throw new Error(`Missing relation target ${field.target}=${String(value)}`);
        }
      }
      values[name] = encode(field, value);
    }
    return values;
  }

  create(input: InputRecord): OutputRecord {
    const values = this.validate(input);
    const names = Object.keys(values);
    if (names.length === 0) throw new Error("Cannot create an empty record");
    const sql = `INSERT INTO ${q(this.table)} (${names.map(q).join(",")}) VALUES (${names.map(() => "?").join(",")})`;
    const result = this.db.run(sql, names.map((name) => values[name] ?? null));
    const lookup = this.primaryRef ? values[this.primaryRef] : result.lastInsertRowid;
    const record = this.get(lookup as string | number | bigint);
    if (!record) throw new Error(`Failed to reload created ${this.model.name}`);
    return record;
  }

  createMany(rows: readonly InputRecord[]): readonly OutputRecord[] {
    return this.db.transaction(() => rows.map((row) => this.create(row)));
  }

  get(ref: string | number | bigint): OutputRecord | undefined {
    if (this.primaryRef && typeof ref === "string") {
      return cleanRow(
        this.model,
        this.db.get<DbRow>(
          `SELECT * FROM ${q(this.table)} WHERE ${q(this.primaryRef)}=?`,
          [ref],
        ),
      );
    }
    return cleanRow(this.model, this.db.get<DbRow>(`SELECT * FROM ${q(this.table)} WHERE id=?`, [ref]));
  }

  find(options: {
    readonly filters?: Readonly<Record<string, RecordValue>>;
    readonly comparisons?: readonly ComparisonFilter[];
    readonly limit?: number;
    readonly offset?: number;
    readonly orderBy?: string;
  } = {}): readonly OutputRecord[] {
    const { filters = {}, comparisons = [], limit = 50, offset = 0, orderBy } = options;
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];

    for (const [name, value] of Object.entries(filters)) {
      if (!this.model.fields[name] && name !== "id") throw new Error(`Unknown filter ${this.model.name}.${name}`);
      clauses.push(`${q(name)}=?`);
      const field = this.model.fields[name];
      params.push(field ? encode(field, value) : (value as SQLInputValue));
    }

    const compiled = compileComparisonFilters(this.model.fields, comparisons);
    clauses.push(...compiled.clauses);
    params.push(...compiled.params);

    let order = "id ASC";
    if (orderBy) {
      const [field, directionRaw = "asc"] = orderBy.trim().split(/\s+/);
      if (!field) throw new Error("Invalid orderBy");
      const direction = directionRaw.toUpperCase();
      if ((!this.model.fields[field] && field !== "id") || !["ASC", "DESC"].includes(direction)) {
        throw new Error("Invalid orderBy");
      }
      order = `${q(field)} ${direction}`;
    }

    const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const boundedOffset = Math.max(Number(offset) || 0, 0);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all<DbRow>(
        `SELECT * FROM ${q(this.table)}${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
        [...params, boundedLimit, boundedOffset],
      )
      .map((row) => cleanRow(this.model, row) ?? row);
  }

  findOne(options: Parameters<ModelStore["find"]>[0] = {}): OutputRecord | undefined {
    return this.find({ ...options, limit: 1 })[0];
  }

  count(filters: Readonly<Record<string, RecordValue>> = {}, comparisons: readonly ComparisonFilter[] = []): number {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    for (const [name, value] of Object.entries(filters)) {
      if (!this.model.fields[name] && name !== "id") throw new Error(`Unknown filter ${this.model.name}.${name}`);
      clauses.push(`${q(name)}=?`);
      const field = this.model.fields[name];
      params.push(field ? encode(field, value) : (value as SQLInputValue));
    }
    const compiled = compileComparisonFilters(this.model.fields, comparisons);
    clauses.push(...compiled.clauses);
    params.push(...compiled.params);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const row = this.db.get<{ count: number | bigint }>(`SELECT COUNT(*) AS count FROM ${q(this.table)}${where}`, params);
    return Number(row?.count ?? 0);
  }

  update(ref: string | number | bigint, patch: InputRecord): OutputRecord | undefined {
    const values = this.validate(patch, { partial: true });
    const names = Object.keys(values);
    if (names.length === 0) return this.get(ref);
    const selector = this.primaryRef && typeof ref === "string" ? this.primaryRef : "id";
    this.db.run(
      `UPDATE ${q(this.table)} SET ${names.map((name) => `${q(name)}=?`).join(",")}, updated_at=? WHERE ${q(selector)}=?`,
      [...names.map((name) => values[name] ?? null), nowIso(), ref],
    );
    return this.get(ref);
  }

  delete(ref: string | number | bigint): boolean {
    const selector = this.primaryRef && typeof ref === "string" ? this.primaryRef : "id";
    return Number(this.db.run(`DELETE FROM ${q(this.table)} WHERE ${q(selector)}=?`, [ref]).changes) > 0;
  }

  upsertByRef(input: InputRecord): OutputRecord {
    if (!this.primaryRef) throw new Error(`No primary reference for ${this.model.name}`);
    const ref = input[this.primaryRef];
    if (typeof ref !== "string") throw new Error(`${this.model.name} requires string ${this.primaryRef}`);
    return this.get(ref) ? (this.update(ref, input) as OutputRecord) : this.create(input);
  }
}

export class OrmEnvironment {
  readonly #stores = new Map<string, ModelStore>();
  readonly registry: ModelRegistry;
  readonly router: DomainDatabaseRouter;

  constructor(input: { readonly registry: ModelRegistry; readonly router: DomainDatabaseRouter }) {
    this.registry = input.registry;
    this.router = input.router;
  }

  model(name: string): ModelStore {
    let store = this.#stores.get(name);
    if (!store) {
      store = new ModelStore(this, this.registry.get(name));
      this.#stores.set(name, store);
    }
    return store;
  }

  atomic<T>(domain: string, fn: (env: OrmEnvironment) => T): T {
    return this.router.get(domain).transaction(() => fn(this));
  }
}
