import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { SQLITE_DATABASE_CAPABILITIES } from "./adapter.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DbRow } from "../types.js";

export interface SqliteDatabaseOptions {
  readonly busyTimeoutMs?: number;
  readonly walAutoCheckpointPages?: number;
}

export type WalCheckpointMode = "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE";

export interface WalCheckpointResult {
  readonly busy: number;
  readonly log: number;
  readonly checkpointed: number;
}

function nonNegativeInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return resolved;
}

export class SqliteDatabase {
  readonly adapter_id = "sqlite";
  readonly experimental = false;
  readonly capabilities = SQLITE_DATABASE_CAPABILITIES;
  readonly path: string;
  readonly db: DatabaseSync;
  readonly busyTimeoutMs: number;
  readonly walAutoCheckpointPages: number;
  #transactionActive = false;

  constructor(path: string, options: SqliteDatabaseOptions = {}) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.path = path;
    this.busyTimeoutMs = nonNegativeInteger(options.busyTimeoutMs, 5000, "busyTimeoutMs");
    this.walAutoCheckpointPages = nonNegativeInteger(
      options.walAutoCheckpointPages,
      1000,
      "walAutoCheckpointPages",
    );
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`PRAGMA busy_timeout = ${this.busyTimeoutMs}`);
    if (path !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL");
      this.db.exec("PRAGMA synchronous = NORMAL");
      this.db.exec(`PRAGMA wal_autocheckpoint = ${this.walAutoCheckpointPages}`);
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

  checkpoint(mode: WalCheckpointMode = "PASSIVE"): WalCheckpointResult {
    if (this.path === ":memory:") return { busy: 0, log: 0, checkpointed: 0 };
    const row = this.get<{ busy: number; log: number; checkpointed: number }>(
      `PRAGMA wal_checkpoint(${mode})`,
    );
    return {
      busy: Number(row?.busy ?? 0),
      log: Number(row?.log ?? 0),
      checkpointed: Number(row?.checkpointed ?? 0),
    };
  }

  transaction<T>(fn: (db: SqliteDatabase) => T): T {
    if (this.#transactionActive) {
      throw new Error("Nested SQLite transactions are not supported; compose work inside the existing transaction boundary");
    }

    this.#transactionActive = true;
    try {
      this.db.exec("BEGIN IMMEDIATE");
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
    } finally {
      this.#transactionActive = false;
    }
  }

  close(): void {
    this.db.close();
  }
}
