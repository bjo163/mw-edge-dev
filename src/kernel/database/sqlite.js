import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export class SqliteDatabase {
  constructor(path) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.path = path;
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA foreign_keys = ON");
    if (path !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL");
      this.db.exec("PRAGMA synchronous = NORMAL");
    }
  }
  exec(sql) { this.db.exec(sql); }
  run(sql, params = []) { return this.db.prepare(sql).run(...params); }
  all(sql, params = []) { return this.db.prepare(sql).all(...params); }
  get(sql, params = []) { return this.db.prepare(sql).get(...params); }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn(this);
      if (result && typeof result.then === "function") throw new Error("SQLite transaction callback must be synchronous in v0.1");
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }
  close() { this.db.close(); }
}
