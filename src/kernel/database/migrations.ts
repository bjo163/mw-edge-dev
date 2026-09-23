import { ensureMetaTables } from "../schema.js";
import type { SqliteDatabase } from "./sqlite.js";

const MIGRATION_ID = /^(\d{4})-([a-z0-9][a-z0-9-]*)$/;

export interface NumberedMigration {
  readonly id: string;
  readonly checksum: string;
  readonly up: (db: SqliteDatabase) => void;
}

export interface DiscoveredMigration extends NumberedMigration {
  readonly sequence: number;
}

export interface ApplyNumberedMigrationsInput {
  readonly db: SqliteDatabase;
  readonly componentId: string;
  readonly componentVersion: string;
  readonly migrations: readonly NumberedMigration[];
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export function discoverNumberedMigrations(
  migrations: readonly NumberedMigration[],
): readonly DiscoveredMigration[] {
  const ids = new Set<string>();
  const sequences = new Map<number, string>();

  const discovered = migrations.map((migration) => {
    const match = MIGRATION_ID.exec(migration.id);
    if (!match) {
      throw new Error(
        `Invalid migration id ${migration.id}; expected NNNN-lowercase-kebab-name`,
      );
    }

    const sequence = Number(match[1]);
    if (sequence < 1) throw new Error(`Migration sequence must be >= 0001: ${migration.id}`);
    if (ids.has(migration.id)) throw new Error(`Duplicate migration id ${migration.id}`);

    const duplicateSequence = sequences.get(sequence);
    if (duplicateSequence) {
      throw new Error(
        `Duplicate migration sequence ${String(sequence).padStart(4, "0")}: ${duplicateSequence}, ${migration.id}`,
      );
    }

    requireNonEmpty(migration.checksum, `Migration checksum for ${migration.id}`);
    ids.add(migration.id);
    sequences.set(sequence, migration.id);
    return { ...migration, sequence };
  });

  return discovered.sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}

export function applyNumberedMigrations(
  input: ApplyNumberedMigrationsInput,
): { readonly applied: readonly string[]; readonly pending: number } {
  const componentId = requireNonEmpty(input.componentId, "componentId");
  const componentVersion = requireNonEmpty(input.componentVersion, "componentVersion");
  const migrations = discoverNumberedMigrations(input.migrations);
  const applied: string[] = [];

  ensureMetaTables(input.db);

  for (const migration of migrations) {
    const existing = input.db.get<{ checksum: string }>(
      "SELECT checksum FROM mw_migrations WHERE component_id=? AND migration_id=?",
      [componentId, migration.id],
    );

    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new Error(`Historical migration checksum mismatch for ${componentId}:${migration.id}`);
      }
      continue;
    }

    input.db.transaction(() => {
      migration.up(input.db);
      input.db.run(
        "INSERT INTO mw_migrations(component_id,component_version,migration_id,checksum) VALUES(?,?,?,?)",
        [componentId, componentVersion, migration.id, migration.checksum],
      );
    });
    applied.push(migration.id);
  }

  const pending = migrations.filter((migration) =>
    !input.db.get(
      "SELECT 1 FROM mw_migrations WHERE component_id=? AND migration_id=?",
      [componentId, migration.id],
    ),
  ).length;

  return { applied, pending };
}
