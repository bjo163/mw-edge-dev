import { join } from "node:path";
import { SqliteDatabase } from "./sqlite.js";

export interface DomainDatabaseRouterOptions {
  readonly dataDir: string;
  readonly memory?: boolean;
}

export class DomainDatabaseRouter {
  readonly #dbs = new Map<string, SqliteDatabase>();
  readonly dataDir: string;
  readonly memory: boolean;

  constructor({ dataDir, memory = false }: DomainDatabaseRouterOptions) {
    this.dataDir = dataDir;
    this.memory = memory;
  }

  get(domain: string): SqliteDatabase {
    let db = this.#dbs.get(domain);
    if (!db) {
      db = new SqliteDatabase(this.memory ? ":memory:" : join(this.dataDir, `${domain}.db`));
      this.#dbs.set(domain, db);
    }
    return db;
  }

  domains(): readonly string[] {
    return [...this.#dbs.keys()];
  }

  close(): void {
    for (const db of this.#dbs.values()) db.close();
    this.#dbs.clear();
  }
}
