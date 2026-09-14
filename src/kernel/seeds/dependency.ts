import type { SeedInput } from "./runner.js";

export interface SeedPlan extends SeedInput {
  readonly dependsOn?: readonly string[];
}

export function seedKey(seed: Pick<SeedInput, "componentId" | "seedId" | "version">): string {
  return `${seed.componentId}/${seed.seedId}@${seed.version ?? "1"}`;
}

export function resolveSeedOrder<T extends SeedPlan>(seeds: readonly T[]): readonly T[] {
  const byKey = new Map<string, T>();
  for (const seed of seeds) {
    const key = seedKey(seed);
    if (byKey.has(key)) throw new Error(`Duplicate seed ${key}`);
    byKey.set(key, seed);
  }

  for (const seed of seeds) {
    for (const dependency of seed.dependsOn ?? []) {
      if (!byKey.has(dependency)) {
        throw new Error(`Missing seed dependency ${dependency} required by ${seedKey(seed)}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: T[] = [];

  const visit = (key: string, path: readonly string[]): void => {
    if (visited.has(key)) return;
    if (visiting.has(key)) {
      const start = path.indexOf(key);
      const cycle = [...path.slice(start), key].join(" -> ");
      throw new Error(`Seed dependency cycle: ${cycle}`);
    }

    visiting.add(key);
    const seed = byKey.get(key);
    if (!seed) throw new Error(`Missing seed ${key}`);
    for (const dependency of [...(seed.dependsOn ?? [])].sort()) visit(dependency, [...path, key]);
    visiting.delete(key);
    visited.add(key);
    ordered.push(seed);
  };

  for (const key of [...byKey.keys()].sort()) visit(key, []);
  return ordered;
}
