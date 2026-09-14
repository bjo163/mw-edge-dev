import { sha256, stableStringify } from "../util.js";
import { applySeed, type SeedInput } from "./runner.js";

const VERSION = /^\d+(?:\.\d+){0,2}$/;

export interface ReferenceSeedUpgradeInput extends Omit<SeedInput, "mode" | "version"> {
  readonly version: string;
}

export interface ReferenceSeedUpgradeResult {
  readonly applied: boolean;
  readonly checksum: string;
  readonly previousVersion: string | null;
}

function parseVersion(version: string): readonly number[] {
  if (!VERSION.test(version)) throw new Error(`Invalid reference seed version ${version}`);
  return version.split(".").map((part) => Number(part));
}

function compareVersion(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const width = Math.max(a.length, b.length);
  for (let index = 0; index < width; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return Math.sign(delta);
  }
  return 0;
}

export function applyReferenceSeedUpgrade(input: ReferenceSeedUpgradeInput): ReferenceSeedUpgradeResult {
  parseVersion(input.version);
  const history = input.db.all<{ seed_version: string; mode: string; checksum: string }>(
    "SELECT seed_version, mode, checksum FROM mw_seed_history WHERE component_id=? AND seed_id=?",
    [input.componentId, input.seedId],
  );

  for (const row of history) {
    if (row.mode !== "reference") {
      throw new Error(`Seed ${input.componentId}/${input.seedId} was previously applied as ${row.mode}, not reference`);
    }
    parseVersion(row.seed_version);
  }

  const checksum = sha256(stableStringify(input.payload));
  const exact = history.find((row) => row.seed_version === input.version);
  if (exact) {
    if (exact.checksum !== checksum) {
      throw new Error(`Seed checksum drift for ${input.componentId}/${input.seedId}@${input.version}`);
    }
    const previousVersion = history
      .map((row) => row.seed_version)
      .filter((version) => version !== input.version)
      .sort(compareVersion)
      .at(-1) ?? null;
    return { applied: false, checksum, previousVersion };
  }

  const latest = history.map((row) => row.seed_version).sort(compareVersion).at(-1) ?? null;
  if (latest && compareVersion(input.version, latest) <= 0) {
    throw new Error(
      `Reference seed upgrades are forward-only: ${input.componentId}/${input.seedId} latest=${latest}, requested=${input.version}`,
    );
  }

  const result = applySeed({ ...input, version: input.version, mode: "reference" });
  return { ...result, previousVersion: latest };
}
