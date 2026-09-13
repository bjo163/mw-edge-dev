import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DbRow } from "../types.js";

export class SqliteDatabase {
  readonly path: string;
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.path = path;
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA foreign_keys = ON");
    if (path !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL");
      this.db.exec("PRAGMA synchronous = NORMAL");
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: readonly SQLInputValue[] = []): { changes: number | bigint; lastInsertRowid: number | bigint } {
    return this.db.prepare(sql).run(...params);
  }

  all<T extends DbRow = DbRow>(sql: string, params: readonly SQLInputValue[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  get<T extends DbRow = DbRow>(sql: string, params: readonly SQLInputValue[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  transaction<T>(fn: (db: SqliteDatabase) => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn(this);
      if (result instanceof Promise) throw new Error("SQLite transaction callback must be synchronous in v0.1");
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Preserve the original transaction error.
      }
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
