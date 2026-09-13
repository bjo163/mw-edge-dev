import { q, sha256 } from "./util.js";
import type { FieldDefinition, ModelDefinition, ModelIndexDefinition } from "./types.js";
import type { RegisteredModel, ModelRegistry } from "./model-registry.js";
import type { SqliteDatabase } from "./database/sqlite.js";
import type { PluginManifest } from "./types.js";

const SQL_TYPE: Readonly<Record<FieldDefinition["type"], string>> = {
  String: "TEXT",
  Text: "TEXT",
  Integer: "INTEGER",
  Decimal: "REAL",
  Boolean: "INTEGER",
  DateTime: "TEXT",
  Enum: "TEXT",
  Reference: "TEXT",
  Relation: "TEXT",
  Json: "TEXT",
};

export const tableFor = (model: Pick<ModelDefinition, "name">): string => model.name.replaceAll(".", "_");

export function primaryRefFor(model: ModelDefinition): string | undefined {
  return (
    Object.entries(model.fields).find(([name, field]) => name.endsWith("_ref") && field.unique)?.[0] ??
    Object.keys(model.fields).find((name) => name.endsWith("_ref"))
  );
}

function defaultSql(value: FieldDefinition["default"]): string {
  if (value === undefined) return "";
  if (typeof value === "boolean") return ` DEFAULT ${value ? 1 : 0}`;
  if (typeof value === "number") return ` DEFAULT ${value}`;
  if (typeof value === "string") return ` DEFAULT '${value.replaceAll("'", "''")}'`;
  return "";
}

export function createTableSql(model: RegisteredModel, registry: ModelRegistry): string {
  const columns = ['"id" INTEGER PRIMARY KEY AUTOINCREMENT'];
  const constraints: string[] = [];

  for (const [name, field] of Object.entries(model.fields)) {
    let column = `${q(name)} ${SQL_TYPE[field.type]}`;
    if (field.required) column += " NOT NULL";
    if (field.unique) column += " UNIQUE";
    column += defaultSql(field.default);
    if (field.type === "Enum" && field.enum) {
      column += ` CHECK (${q(name)} IN (${field.enum.map((item) => `'${item.replaceAll("'", "''")}'`).join(",")}))`;
    }
    columns.push(column);

    if (field.type === "Relation" && field.target) {
      const parts = field.target.split(".");
      const targetField = parts.pop();
      if (!targetField) throw new Error(`Invalid relation target ${field.target}`);
      const target = registry.get(parts.join("."));
      constraints.push(
        `FOREIGN KEY (${q(name)}) REFERENCES ${q(tableFor(target))}(${q(targetField)})`,
      );
    }
  }

  if (!model.fields.created_at) columns.push('"created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
  if (!model.fields.updated_at) columns.push('"updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');

  return `CREATE TABLE IF NOT EXISTS ${q(tableFor(model))} (\n  ${[...columns, ...constraints].join(",\n  ")}\n)`;
}

function ownedIndexName(model: RegisteredModel, index: ModelIndexDefinition): string {
  return `${model.owner}__${tableFor(model)}__${index.id}`.replaceAll(".", "_");
}

export function createIndexSql(model: RegisteredModel, index: ModelIndexDefinition): string {
  if (!/^[a-z][a-z0-9_]*$/.test(index.id)) {
    throw new Error(`Invalid index id ${model.name}.${index.id}`);
  }
  if (index.fields.length === 0) {
    throw new Error(`Index fields required for ${model.name}.${index.id}`);
  }

  const fields = index.fields.map((field) => {
    if (!model.fields[field]) throw new Error(`Unknown index field ${model.name}.${field}`);
    return q(field);
  });

  return `CREATE INDEX IF NOT EXISTS ${q(ownedIndexName(model, index))} ON ${q(tableFor(model))} (${fields.join(",")})`;
}

export function ensureMetaTables(db: SqliteDatabase): void {
  db.exec(`CREATE TABLE IF NOT EXISTS mw_migrations (
    component_id TEXT NOT NULL,
    component_version TEXT NOT NULL,
    migration_id TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(component_id,migration_id)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS mw_seed_history (
    component_id TEXT NOT NULL,
    seed_id TEXT NOT NULL,
    seed_version TEXT NOT NULL,
    mode TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(component_id,seed_id,seed_version)
  )`);
}

export function materializeComponent(input: {
  readonly db: SqliteDatabase;
  readonly manifest: PluginManifest;
  readonly models: readonly RegisteredModel[];
  readonly registry: ModelRegistry;
}): { readonly changed: boolean; readonly checksum: string } {
  const { db, manifest, models, registry } = input;
  ensureMetaTables(db);
  const checksum = sha256({ manifest: { id: manifest.id, version: manifest.version }, models });
  const existing = db.get<{ checksum: string }>(
    "SELECT checksum FROM mw_migrations WHERE component_id=? AND migration_id=?",
    [manifest.id, "0001-declarative-baseline"],
  );

  if (existing && existing.checksum !== checksum) {
    throw new Error(`Historical schema checksum mismatch for ${manifest.id}`);
  }
  if (existing) return { changed: false, checksum };

  db.transaction(() => {
    for (const model of models) {
      db.exec(createTableSql(model, registry));
      for (const index of [...(model.indexes ?? [])].sort((left, right) => left.id.localeCompare(right.id))) {
        db.exec(createIndexSql(model, index));
      }
    }
    db.run(
      "INSERT INTO mw_migrations(component_id,component_version,migration_id,checksum) VALUES(?,?,?,?)",
      [manifest.id, manifest.version, "0001-declarative-baseline", checksum],
    );
  });
  return { changed: true, checksum };
}
