import type { SQLInputValue } from "node:sqlite";
import type { FieldDefinition, RecordValue } from "./types.js";
import { q } from "./util.js";

export type ComparisonOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn" | "isNull" | "notNull";

export interface ComparisonFilter {
  readonly field: string;
  readonly op: ComparisonOperator;
  readonly value?: RecordValue;
}

const SQL_OPERATOR: Readonly<Record<Exclude<ComparisonOperator, "in" | "notIn" | "isNull" | "notNull">, string>> = {
  eq: "=",
  ne: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

function encode(field: FieldDefinition | undefined, value: RecordValue): SQLInputValue {
  if (value == null) return null;
  if (field?.type === "Boolean") return value ? 1 : 0;
  if (field?.type === "Json") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  throw new Error(`Unsupported comparison value for ${field?.type ?? "id"}`);
}

export function compileComparisonFilters(
  fields: Readonly<Record<string, FieldDefinition>>,
  comparisons: readonly ComparisonFilter[],
): { readonly clauses: readonly string[]; readonly params: readonly SQLInputValue[] } {
  if (comparisons.length > 50) throw new Error("Too many comparison filters; maximum is 50");

  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  for (const comparison of comparisons) {
    const field = comparison.field;
    const definition = fields[field];
    if (!definition && field !== "id") throw new Error(`Unknown comparison field ${field}`);

    if (comparison.op === "isNull" || comparison.op === "notNull") {
      if (comparison.value !== undefined) throw new Error(`${comparison.op} does not accept a value`);
      clauses.push(`${q(field)} IS ${comparison.op === "notNull" ? "NOT " : ""}NULL`);
      continue;
    }

    if (comparison.op === "in" || comparison.op === "notIn") {
      if (!Array.isArray(comparison.value)) throw new Error(`${comparison.op} requires an array value`);
      if (comparison.value.length === 0) throw new Error(`${comparison.op} requires at least one value`);
      if (comparison.value.length > 100) throw new Error(`${comparison.op} supports at most 100 values`);
      clauses.push(`${q(field)} ${comparison.op === "notIn" ? "NOT " : ""}IN (${comparison.value.map(() => "?").join(",")})`);
      for (const value of comparison.value) params.push(encode(definition, value as RecordValue));
      continue;
    }

    if (!(comparison.op in SQL_OPERATOR)) throw new Error(`Unsupported comparison operator ${String(comparison.op)}`);
    if (comparison.value === undefined || Array.isArray(comparison.value) || (typeof comparison.value === "object" && comparison.value !== null)) {
      throw new Error(`${comparison.op} requires a scalar value`);
    }
    if (comparison.value === null) {
      if (comparison.op === "eq" || comparison.op === "ne") {
        clauses.push(`${q(field)} IS ${comparison.op === "ne" ? "NOT " : ""}NULL`);
        continue;
      }
      throw new Error(`${comparison.op} does not accept null`);
    }

    clauses.push(`${q(field)} ${SQL_OPERATOR[comparison.op as keyof typeof SQL_OPERATOR]} ?`);
    params.push(encode(definition, comparison.value));
  }

  return { clauses, params };
}
