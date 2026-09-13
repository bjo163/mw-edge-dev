import { q, sha256 } from "./util.js";
const SQL_TYPE = {String:"TEXT",Text:"TEXT",Integer:"INTEGER",Decimal:"REAL",Boolean:"INTEGER",DateTime:"TEXT",Enum:"TEXT",Reference:"TEXT",Relation:"TEXT",Json:"TEXT"};
export const tableFor = model => model.name.replaceAll(".","_");
export const primaryRefFor = model => Object.entries(model.fields).find(([name,f]) => name.endsWith("_ref") && f.unique)?.[0] || Object.keys(model.fields).find(n => n.endsWith("_ref"));
function defaultSql(value) {
  if (value === undefined) return "";
  if (typeof value === "boolean") return ` DEFAULT ${value ? 1 : 0}`;
  if (typeof value === "number") return ` DEFAULT ${value}`;
  return ` DEFAULT '${String(value).replaceAll("'","''")}'`;
}
export function createTableSql(model, registry) {
  const columns = ['"id" INTEGER PRIMARY KEY AUTOINCREMENT'];
  const constraints = [];
  for (const [name, f] of Object.entries(model.fields)) {
    let col = `${q(name)} ${SQL_TYPE[f.type] || "TEXT"}`;
    if (f.required) col += " NOT NULL";
    if (f.unique) col += " UNIQUE";
    col += defaultSql(f.default);
    if (f.type === "Enum") col += ` CHECK (${q(name)} IN (${f.enum.map(x => `'${String(x).replaceAll("'","''")}'`).join(",")}))`;
    columns.push(col);
    if (f.type === "Relation") {
      const parts = f.target.split(".");
      const targetField = parts.pop();
      const targetName = parts.join(".");
      const target = registry.get(targetName);
      constraints.push(`FOREIGN KEY (${q(name)}) REFERENCES ${q(tableFor(target))}(${q(targetField)})`);
    }
  }
  if (!model.fields.created_at) columns.push('"created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
  if (!model.fields.updated_at) columns.push('"updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
  return `CREATE TABLE IF NOT EXISTS ${q(tableFor(model))} (\n  ${[...columns,...constraints].join(",\n  ")}\n)`;
}
export function ensureMetaTables(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS mw_migrations (
    component_id TEXT NOT NULL, component_version TEXT NOT NULL, migration_id TEXT NOT NULL,
    checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(component_id,migration_id)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS mw_seed_history (
    component_id TEXT NOT NULL, seed_id TEXT NOT NULL, seed_version TEXT NOT NULL,
    mode TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(component_id,seed_id,seed_version)
  )`);
}
export function materializeComponent({ db, manifest, models, registry }) {
  ensureMetaTables(db);
  const checksum = sha256({manifest:{id:manifest.id,version:manifest.version},models});
  const existing = db.get("SELECT checksum FROM mw_migrations WHERE component_id=? AND migration_id=?", [manifest.id,"0001-declarative-baseline"]);
  if (existing && existing.checksum !== checksum) throw new Error(`Historical schema checksum mismatch for ${manifest.id}`);
  if (existing) return { changed:false, checksum };
  db.transaction(() => {
    for (const model of models) db.exec(createTableSql(model, registry));
    db.run("INSERT INTO mw_migrations(component_id,component_version,migration_id,checksum) VALUES(?,?,?,?)",
      [manifest.id,manifest.version,"0001-declarative-baseline",checksum]);
  });
  return { changed:true, checksum };
}
