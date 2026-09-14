import type { SQLInputValue } from "node:sqlite";
import type { FieldDefinition, RecordValue } from "./types.js";
import { q } from "./util.js";

export type ComparisonOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn" | "isNull" | "notNull";

export interface ComparisonFilter {
  readonly field: string;
  readonly op: ComparisonOperator;
  readonly value?: RecordValue;
}

export type BooleanOperator = "and" | "or" | "not";

export interface BooleanFilterGroup {
  readonly boolean: BooleanOperator;
  readonly filters: readonly QueryFilterNode[];
}

export type QueryFilterNode = ComparisonFilter | BooleanFilterGroup;

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

function compileComparison(
  fields: Readonly<Record<string, FieldDefinition>>,
  comparison: ComparisonFilter,
): { readonly clause: string; readonly params: readonly SQLInputValue[] } {
  const field = comparison.field;
  const definition = fields[field];
  if (!definition && field !== "id") throw new Error(`Unknown comparison field ${field}`);

  if (comparison.op === "isNull" || comparison.op === "notNull") {
    if (comparison.value !== undefined) throw new Error(`${comparison.op} does not accept a value`);
    return { clause: `${q(field)} IS ${comparison.op === "notNull" ? "NOT " : ""}NULL`, params: [] };
  }

  if (comparison.op === "in" || comparison.op === "notIn") {
    if (!Array.isArray(comparison.value)) throw new Error(`${comparison.op} requires an array value`);
    if (comparison.value.length === 0) throw new Error(`${comparison.op} requires at least one value`);
    if (comparison.value.length > 100) throw new Error(`${comparison.op} supports at most 100 values`);
    return {
      clause: `${q(field)} ${comparison.op === "notIn" ? "NOT " : ""}IN (${comparison.value.map(() => "?").join(",")})`,
      params: comparison.value.map((value) => encode(definition, value as RecordValue)),
    };
  }

  if (!(comparison.op in SQL_OPERATOR)) throw new Error(`Unsupported comparison operator ${String(comparison.op)}`);
  if (comparison.value === undefined || Array.isArray(comparison.value) || (typeof comparison.value === "object" && comparison.value !== null)) {
    throw new Error(`${comparison.op} requires a scalar value`);
  }
  if (comparison.value === null) {
    if (comparison.op === "eq" || comparison.op === "ne") {
      return { clause: `${q(field)} IS ${comparison.op === "ne" ? "NOT " : ""}NULL`, params: [] };
    }
    throw new Error(`${comparison.op} does not accept null`);
  }

  return {
    clause: `${q(field)} ${SQL_OPERATOR[comparison.op as keyof typeof SQL_OPERATOR]} ?`,
    params: [encode(definition, comparison.value)],
  };
}

export function compileComparisonFilters(
  fields: Readonly<Record<string, FieldDefinition>>,
  comparisons: readonly ComparisonFilter[],
): { readonly clauses: readonly string[]; readonly params: readonly SQLInputValue[] } {
  if (comparisons.length > 50) throw new Error("Too many comparison filters; maximum is 50");
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];
  for (const comparison of comparisons) {
    const compiled = compileComparison(fields, comparison);
    clauses.push(compiled.clause);
    params.push(...compiled.params);
  }
  return { clauses, params };
}

export function compileBooleanFilterGroup(
  fields: Readonly<Record<string, FieldDefinition>>,
  group: BooleanFilterGroup,
  options: { readonly maxDepth?: number; readonly maxNodes?: number } = {},
): { readonly clause: string; readonly params: readonly SQLInputValue[] } {
  const maxDepth = options.maxDepth ?? 5;
  const maxNodes = options.maxNodes ?? 100;
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 20) throw new Error("maxDepth must be between 1 and 20");
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 1000) throw new Error("maxNodes must be between 1 and 1000");

  let nodes = 0;
  const visit = (node: QueryFilterNode, depth: number): { clause: string; params: SQLInputValue[] } => {
    nodes += 1;
    if (nodes > maxNodes) throw new Error(`Boolean filter tree exceeds maximum of ${maxNodes} nodes`);

    if (!("boolean" in node)) {
      const compiled = compileComparison(fields, node);
      return { clause: compiled.clause, params: [...compiled.params] };
    }

    if (depth > maxDepth) throw new Error(`Boolean filter tree exceeds maximum depth ${maxDepth}`);
    if (!["and", "or", "not"].includes(node.boolean)) throw new Error(`Unsupported boolean operator ${String(node.boolean)}`);
    if (node.filters.length === 0) throw new Error(`${node.boolean} group requires at least one child`);
    if (node.boolean === "not" && node.filters.length !== 1) throw new Error("not group requires exactly one child");

    const children = node.filters.map((child) => visit(child, depth + 1));
    const params = children.flatMap((child) => child.params);
    if (node.boolean === "not") return { clause: `NOT (${children[0]?.clause})`, params };
    const joiner = node.boolean === "and" ? " AND " : " OR ";
    return { clause: `(${children.map((child) => child.clause).join(joiner)})`, params };
  };

  return visit(group, 1);
}
