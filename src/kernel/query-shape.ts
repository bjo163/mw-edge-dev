import { q } from "./util.js";
import type { FieldDefinition } from "./types.js";

export interface QuerySortTerm {
  readonly field: string;
  readonly direction?: "asc" | "desc";
}

export type QueryPagination =
  | { readonly mode: "page"; readonly page: number; readonly pageSize: number }
  | { readonly mode: "cursor"; readonly afterId: number; readonly pageSize: number };

export interface CompiledQueryShape {
  readonly selectSql: string;
  readonly orderSql: string;
  readonly limit: number;
  readonly offset: number;
  readonly afterId?: number;
}

function assertQueryField(fields: Readonly<Record<string, FieldDefinition>>, field: string, purpose: string): void {
  if (field !== "id" && !fields[field]) throw new Error(`Unknown ${purpose} field ${field}`);
}

function validatePageSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 200) {
    throw new Error("pageSize must be an integer between 1 and 200");
  }
  return value;
}

export function compileQueryShape(
  fields: Readonly<Record<string, FieldDefinition>>,
  input: {
    readonly select?: readonly string[];
    readonly sort?: readonly QuerySortTerm[];
    readonly pagination?: QueryPagination;
    readonly limit?: number;
    readonly offset?: number;
    readonly orderBy?: string;
  },
): CompiledQueryShape {
  let selectSql = "*";
  if (input.select) {
    if (input.select.length < 1 || input.select.length > 32) {
      throw new Error("select must contain between 1 and 32 fields");
    }
    const seen = new Set<string>();
    for (const field of input.select) {
      assertQueryField(fields, field, "select");
      if (seen.has(field)) throw new Error(`Duplicate select field ${field}`);
      seen.add(field);
    }
    selectSql = input.select.map(q).join(",");
  }

  if (input.sort && input.orderBy) throw new Error("sort and orderBy cannot be combined");
  if (input.sort && input.sort.length > 3) throw new Error("sort supports at most 3 fields");

  let orderSql = "id ASC";
  if (input.sort?.length) {
    const seen = new Set<string>();
    orderSql = input.sort.map((term) => {
      assertQueryField(fields, term.field, "sort");
      if (seen.has(term.field)) throw new Error(`Duplicate sort field ${term.field}`);
      seen.add(term.field);
      const direction = (term.direction ?? "asc").toUpperCase();
      if (direction !== "ASC" && direction !== "DESC") throw new Error("Invalid sort direction");
      return `${q(term.field)} ${direction}`;
    }).join(", ");
  } else if (input.orderBy) {
    const [field, directionRaw = "asc"] = input.orderBy.trim().split(/\s+/);
    if (!field) throw new Error("Invalid orderBy");
    assertQueryField(fields, field, "sort");
    const direction = directionRaw.toUpperCase();
    if (direction !== "ASC" && direction !== "DESC") throw new Error("Invalid orderBy");
    orderSql = `${q(field)} ${direction}`;
  }

  if (input.pagination) {
    if (input.limit !== undefined || input.offset !== undefined) {
      throw new Error("pagination cannot be combined with limit/offset");
    }
    const pageSize = validatePageSize(input.pagination.pageSize);
    if (input.pagination.mode === "page") {
      if (!Number.isSafeInteger(input.pagination.page) || input.pagination.page < 1) {
        throw new Error("page must be a positive integer");
      }
      const offset = (input.pagination.page - 1) * pageSize;
      if (!Number.isSafeInteger(offset)) throw new Error("page offset exceeds safe integer range");
      return { selectSql, orderSql, limit: pageSize, offset };
    }

    if (!Number.isSafeInteger(input.pagination.afterId) || input.pagination.afterId < 0) {
      throw new Error("cursor afterId must be a non-negative integer");
    }
    if (input.sort?.length || input.orderBy) {
      throw new Error("cursor pagination uses deterministic id ASC order and cannot be custom-sorted");
    }
    return { selectSql, orderSql: "id ASC", limit: pageSize, offset: 0, afterId: input.pagination.afterId };
  }

  const limit = Math.min(Math.max(Number(input.limit ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(input.offset ?? 0) || 0, 0);
  return { selectSql, orderSql, limit, offset };
}
