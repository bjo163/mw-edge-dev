import { sha256, stableStringify } from "../util.js";
import type { SqliteDatabase } from "../database/sqlite.js";

export interface SeedInput {
  readonly db: SqliteDatabase;
  readonly componentId: string;
  readonly seedId: string;
  readonly version?: string;
  readonly mode?: "required" | "reference" | "demo";
  readonly payload: unknown;
  readonly apply: () => void;
}

export function applySeed(input: SeedInput): { readonly applied: boolean; readonly checksum: string } {
  const version = input.version ?? "1";
  const mode = input.mode ?? "required";
  const checksum = sha256(stableStringify(input.payload));
  const existing = input.db.get<{ checksum: string }>(
    "SELECT checksum FROM mw_seed_history WHERE component_id=? AND seed_id=? AND seed_version=?",
    [input.componentId, input.seedId, version],
  );
  if (existing && existing.checksum !== checksum) {
    throw new Error(`Seed checksum drift for ${input.componentId}/${input.seedId}@${version}`);
  }
  if (existing) return { applied: false, checksum };

  input.db.transaction(() => {
    input.apply();
    input.db.run(
      "INSERT INTO mw_seed_history(component_id,seed_id,seed_version,mode,checksum) VALUES(?,?,?,?,?)",
      [input.componentId, input.seedId, version, mode, checksum],
    );
  });
  return { applied: true, checksum };
}
