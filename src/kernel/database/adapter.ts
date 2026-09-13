import type { DbRow } from "../types.js";

export type DatabaseValue = string | number | bigint | Uint8Array | null;
export type DatabaseAdapterResult<T> = T | Promise<T>;

export interface DatabaseAdapterCapabilities {
  readonly execution: "synchronous" | "asynchronous";
  readonly callback_transactions: boolean;
  readonly atomic_batch: boolean;
  readonly wal_checkpoint: boolean;
  readonly local_filesystem: boolean;
}

export interface DatabaseRunResult {
  readonly changes: number | bigint;
  readonly lastInsertRowid: number | bigint;
}

export interface DatabaseAdapter {
  readonly adapter_id: string;
  readonly experimental: boolean;
  readonly capabilities: DatabaseAdapterCapabilities;
  exec(sql: string): DatabaseAdapterResult<void>;
  run(sql: string, params?: readonly DatabaseValue[]): DatabaseAdapterResult<DatabaseRunResult>;
  all<T extends DbRow = DbRow>(
    sql: string,
    params?: readonly DatabaseValue[],
  ): DatabaseAdapterResult<T[]>;
  get<T extends DbRow = DbRow>(
    sql: string,
    params?: readonly DatabaseValue[],
  ): DatabaseAdapterResult<T | undefined>;
  close(): DatabaseAdapterResult<void>;
}

export type BooleanDatabaseCapability = Exclude<
  keyof DatabaseAdapterCapabilities,
  "execution"
>;

export const SQLITE_DATABASE_CAPABILITIES: DatabaseAdapterCapabilities = {
  execution: "synchronous",
  callback_transactions: true,
  atomic_batch: true,
  wal_checkpoint: true,
  local_filesystem: true,
};

export const D1_DATABASE_CAPABILITIES: DatabaseAdapterCapabilities = {
  execution: "asynchronous",
  callback_transactions: false,
  atomic_batch: true,
  wal_checkpoint: false,
  local_filesystem: false,
};

export function requireDatabaseCapability(
  adapter: Pick<DatabaseAdapter, "adapter_id" | "capabilities">,
  capability: BooleanDatabaseCapability,
): void {
  if (!adapter.capabilities[capability]) {
    throw new Error(
      `Database adapter ${adapter.adapter_id} does not support capability ${capability}`,
    );
  }
}
