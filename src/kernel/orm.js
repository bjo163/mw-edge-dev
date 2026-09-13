import { q, nowIso } from "./util.js";
import { tableFor, primaryRefFor } from "./schema.js";
function encode(field, value) {
  if (value == null) return null;
  if (field.type === "Boolean") return value ? 1 : 0;
  if (field.type === "Json") return JSON.stringify(value);
  return value;
}
function decode(field, value) {
  if (value == null) return value;
  if (field.type === "Boolean") return Boolean(value);
  if (field.type === "Json") { try { return JSON.parse(value); } catch { return value; } }
  return value;
}
function cleanRow(model, row) {
  if (!row) return row;
  const out = {...row};
  for (const [name, field] of Object.entries(model.fields)) if (name in out) out[name] = decode(field,out[name]);
  return out;
}
export class ModelStore {
  constructor(env, model) { this.env = env; this.model = model; this.db = env.router.get(model.domain); this.table = tableFor(model); this.primaryRef = primaryRefFor(model); }
  validate(input, {partial=false}={}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Record payload must be an object");
    const values = {};
    for (const key of Object.keys(input)) if (!this.model.fields[key]) throw new Error(`Unknown field ${this.model.name}.${key}`);
    for (const [name, field] of Object.entries(this.model.fields)) {
      let value = input[name];
      if (value === undefined && !partial && field.default !== undefined) value = field.default;
      if (value === undefined) {
        if (!partial && field.required) throw new Error(`Required field ${this.model.name}.${name}`);
        continue;
      }
      if (field.type === "Enum" && value != null && !field.enum.includes(value)) throw new Error(`Invalid enum value for ${this.model.name}.${name}`);
      if ((field.type === "Integer" || field.type === "Decimal") && value != null && typeof value !== "number") throw new Error(`Numeric value required for ${this.model.name}.${name}`);
      if (field.type === "Relation" && value != null) {
        const parts = field.target.split("."); const targetField = parts.pop(); const targetName = parts.join(".");
        const target = this.env.model(targetName);
        if (!target.findOne({filters:{[targetField]:value}})) throw new Error(`Missing relation target ${field.target}=${value}`);
      }
      values[name] = encode(field,value);
    }
    return values;
  }
  create(input) {
    const values = this.validate(input);
    const names = Object.keys(values);
    const sql = `INSERT INTO ${q(this.table)} (${names.map(q).join(",")}) VALUES (${names.map(()=>"?").join(",")})`;
    this.db.run(sql,names.map(n=>values[n]));
    return this.get(values[this.primaryRef] ?? this.db.get("SELECT last_insert_rowid() AS id").id);
  }
  createMany(rows) { return this.db.transaction(() => rows.map(row => this.create(row))); }
  get(ref) {
    if (this.primaryRef && typeof ref !== "number") return cleanRow(this.model,this.db.get(`SELECT * FROM ${q(this.table)} WHERE ${q(this.primaryRef)}=?`,[ref]));
    return cleanRow(this.model,this.db.get(`SELECT * FROM ${q(this.table)} WHERE id=?`,[ref]));
  }
  find({filters={},limit=50,offset=0,orderBy}={}) {
    const clauses=[]; const params=[];
    for (const [name,value] of Object.entries(filters)) {
      if (!this.model.fields[name] && name !== "id") throw new Error(`Unknown filter ${this.model.name}.${name}`);
      clauses.push(`${q(name)}=?`); params.push(this.model.fields[name] ? encode(this.model.fields[name],value) : value);
    }
    let order = "id ASC";
    if (orderBy) {
      const [field,directionRaw="asc"] = String(orderBy).trim().split(/\s+/);
      const direction = directionRaw.toUpperCase();
      if ((!this.model.fields[field] && field !== "id") || !["ASC","DESC"].includes(direction)) throw new Error("Invalid orderBy");
      order = `${q(field)} ${direction}`;
    }
    const boundedLimit=Math.min(Math.max(Number(limit)||50,1),200); const boundedOffset=Math.max(Number(offset)||0,0);
    const where=clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db.all(`SELECT * FROM ${q(this.table)}${where} ORDER BY ${order} LIMIT ? OFFSET ?`,[...params,boundedLimit,boundedOffset]).map(r=>cleanRow(this.model,r));
  }
  findOne(opts={}) { return this.find({...opts,limit:1})[0]; }
  count(filters={}) {
    const clauses=[]; const params=[];
    for (const [name,value] of Object.entries(filters)) {
      if (!this.model.fields[name] && name !== "id") throw new Error(`Unknown filter ${this.model.name}.${name}`);
      clauses.push(`${q(name)}=?`); params.push(this.model.fields[name] ? encode(this.model.fields[name],value) : value);
    }
    const where=clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return Number(this.db.get(`SELECT COUNT(*) AS count FROM ${q(this.table)}${where}`,params).count);
  }
  update(ref, patch) {
    const values=this.validate(patch,{partial:true}); const names=Object.keys(values);
    if (!names.length) return this.get(ref);
    const selector=this.primaryRef && typeof ref !== "number" ? this.primaryRef : "id";
    this.db.run(`UPDATE ${q(this.table)} SET ${names.map(n=>`${q(n)}=?`).join(",")}, updated_at=? WHERE ${q(selector)}=?`,
      [...names.map(n=>values[n]),nowIso(),ref]);
    return this.get(ref);
  }
  delete(ref) {
    const selector=this.primaryRef && typeof ref !== "number" ? this.primaryRef : "id";
    return this.db.run(`DELETE FROM ${q(this.table)} WHERE ${q(selector)}=?`,[ref]).changes > 0;
  }
  upsertByRef(input) {
    if (!this.primaryRef) throw new Error(`No primary reference for ${this.model.name}`);
    const ref=input[this.primaryRef]; const found=this.get(ref);
    return found ? this.update(ref,input) : this.create(input);
  }
}
export class OrmEnvironment {
  #stores=new Map();
  constructor({registry,router}) { this.registry=registry; this.router=router; }
  model(name) { if (!this.#stores.has(name)) this.#stores.set(name,new ModelStore(this,this.registry.get(name))); return this.#stores.get(name); }
  atomic(domain, fn) { return this.router.get(domain).transaction(()=>fn(this)); }
}
