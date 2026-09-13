import type { DbRow } from "../types.js";
import {
  D1_DATABASE_CAPABILITIES,
  type DatabaseAdapter,
  type DatabaseRunResult,
  type DatabaseValue,
} from "./adapter.js";

export interface D1ExecutionResult<T extends DbRow = DbRow> {
  readonly success?: boolean;
  readonly error?: string;
  readonly results?: readonly T[];
  readonly meta?: {
    readonly changes?: number;
    readonly last_row_id?: number;
  };
}

export interface D1PreparedStatementLike {
  bind(...values: DatabaseValue[]): D1PreparedStatementLike;
  all<T extends DbRow = DbRow>(): Promise<D1ExecutionResult<T>>;
  run(): Promise<D1ExecutionResult>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  exec(sql: string): Promise<unknown>;
}

function assertSuccess(result: D1ExecutionResult, operation: string): void {
  if (result.success === false) {
    throw new Error(`D1 ${operation} failed: ${result.error ?? "unknown error"}`);
  }
}

export class D1DatabaseAdapter implements DatabaseAdapter {
  readonly adapter_id = "cloudflare-d1";
  readonly experimental = true;
  readonly capabilities = D1_DATABASE_CAPABILITIES;
  readonly #binding: D1DatabaseLike | undefined;

  constructor(binding?: D1DatabaseLike) {
    this.#binding = binding;
  }

  #database(): D1DatabaseLike {
    if (!this.#binding) {
      throw new Error(
        "Cloudflare D1 adapter is experimental and requires an explicit D1 binding",
      );
    }
    return this.#binding;
  }

  async exec(sql: string): Promise<void> {
    await this.#database().exec(sql);
  }

  async run(
    sql: string,
    params: readonly DatabaseValue[] = [],
  ): Promise<DatabaseRunResult> {
    const result = await this.#database().prepare(sql).bind(...params).run();
    assertSuccess(result, "run");
    return {
      changes: result.meta?.changes ?? 0,
      lastInsertRowid: result.meta?.last_row_id ?? 0,
    };
  }

  async all<T extends DbRow = DbRow>(
    sql: string,
    params: readonly DatabaseValue[] = [],
  ): Promise<T[]> {
    const result = await this.#database().prepare(sql).bind(...params).all<T>();
    assertSuccess(result, "query");
    return [...(result.results ?? [])];
  }

  async get<T extends DbRow = DbRow>(
    sql: string,
    params: readonly DatabaseValue[] = [],
  ): Promise<T | undefined> {
    return (await this.all<T>(sql, params))[0];
  }

  transaction(): never {
    throw new Error(
      "Cloudflare D1 does not support MW Edge synchronous callback transactions; use an explicit D1 batch boundary",
    );
  }

  async close(): Promise<void> {
    // Cloudflare owns the D1 binding lifecycle.
  }
}
