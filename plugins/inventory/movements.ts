import type { InputRecord, OrmEnvironment, OutputRecord } from "../../src/kernel/orm.js";

export type StockMovementKind = "receipt" | "transfer" | "issue" | "adjustment" | "return";

export interface StockMovementInput extends InputRecord {
  readonly movement_ref: string;
  readonly tenant_ref: string;
  readonly item_ref: string;
  readonly source_location_ref?: string;
  readonly destination_location_ref?: string;
  readonly quantity: number;
  readonly movement_kind: StockMovementKind;
  readonly occurred_at: string;
}

function requireLocation(value: string | undefined, name: string, kind: StockMovementKind): void {
  if (!value?.trim()) throw new Error(`${kind} movement requires ${name}`);
}

function forbidLocation(value: string | undefined, name: string, kind: StockMovementKind): void {
  if (value !== undefined && value !== null && String(value).trim() !== "") {
    throw new Error(`${kind} movement forbids ${name}`);
  }
}

export function validateStockMovement(input: StockMovementInput): void {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Stock movement quantity must be positive");
  }

  const source = input.source_location_ref;
  const destination = input.destination_location_ref;
  if (source && destination && source === destination) {
    throw new Error("Stock movement source and destination must differ");
  }

  switch (input.movement_kind) {
    case "receipt":
      forbidLocation(source, "source_location_ref", "receipt");
      requireLocation(destination, "destination_location_ref", "receipt");
      break;
    case "issue":
      requireLocation(source, "source_location_ref", "issue");
      forbidLocation(destination, "destination_location_ref", "issue");
      break;
    case "transfer":
    case "return":
      requireLocation(source, "source_location_ref", input.movement_kind);
      requireLocation(destination, "destination_location_ref", input.movement_kind);
      break;
    case "adjustment": {
      const locations = Number(Boolean(source)) + Number(Boolean(destination));
      if (locations !== 1) throw new Error("adjustment movement requires exactly one location");
      break;
    }
    default: {
      const exhaustive: never = input.movement_kind;
      throw new Error(`Unsupported stock movement kind ${String(exhaustive)}`);
    }
  }
}

export function createStockMovement(env: OrmEnvironment, input: StockMovementInput): OutputRecord {
  validateStockMovement(input);
  return env.model("inventory.stock_movement").create(input);
}
