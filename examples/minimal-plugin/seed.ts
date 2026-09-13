import { applySeed } from "../../src/kernel/seeds/runner.js";
import type { SeedContext } from "../../src/kernel/plugins/host.js";

export function seed(context: SeedContext): void {
  const payload = {
    item_ref: "example.seed-item",
    name: "Seed item",
    rank: 1,
    active: true,
    state: "active",
    metadata: { source: "minimal-plugin" },
  } as const;

  applySeed({
    db: context.router.get("example"),
    componentId: "mw.example",
    seedId: "example.minimal.item",
    version: "1",
    mode: "demo",
    payload,
    apply: () => {
      context.orm.model("example.item").upsertByRef(payload);
    },
  });
}
