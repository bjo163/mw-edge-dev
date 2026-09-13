import { join } from "node:path";
import { SqliteDatabase } from "./sqlite.js";
export class DomainDatabaseRouter {
  #dbs = new Map();
  constructor({ dataDir, memory = false }) { this.dataDir = dataDir; this.memory = memory; }
  get(domain) {
    if (!this.#dbs.has(domain)) this.#dbs.set(domain, new SqliteDatabase(this.memory ? ":memory:" : join(this.dataDir, `${domain}.db`)));
    return this.#dbs.get(domain);
  }
  domains() { return [...this.#dbs.keys()]; }
  close() { for (const db of this.#dbs.values()) db.close(); this.#dbs.clear(); }
}
