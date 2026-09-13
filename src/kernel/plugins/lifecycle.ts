export type ComponentState =
  | "discovered"
  | "validated"
  | "resolved"
  | "staged"
  | "migrated"
  | "active"
  | "disabled"
  | "failed";

const ORDER: readonly ComponentState[] = ["discovered", "validated", "resolved", "staged", "migrated", "active"];

export class LifecycleRegistry {
  readonly #states = new Map<string, ComponentState>();

  discover(id: string): void {
    if (this.#states.has(id)) throw new Error(`Duplicate lifecycle component ${id}`);
    this.#states.set(id, "discovered");
  }

  transition(id: string, next: ComponentState): void {
    const current = this.#states.get(id);
    if (!current) throw new Error(`Unknown lifecycle component ${id}`);
    if (next === "failed" || next === "disabled") {
      this.#states.set(id, next);
      return;
    }
    const currentIndex = ORDER.indexOf(current);
    const nextIndex = ORDER.indexOf(next);
    if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
      throw new Error(`Invalid lifecycle transition ${id}: ${current} -> ${next}`);
    }
    this.#states.set(id, next);
  }

  get(id: string): ComponentState | undefined {
    return this.#states.get(id);
  }

  snapshot(): Readonly<Record<string, ComponentState>> {
    return Object.fromEntries([...this.#states.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}
