import { applySeed } from "../../src/kernel/seeds/runner.js";
import type { SeedContext } from "../../src/kernel/plugins/host.js";

export function seed(context: SeedContext): void {
  const payload = {
    note_ref: "example.seed-note",
    item_ref: "example.seed-item",
    body: "Seed note from the minimal addon",
  } as const;

  applySeed({
    db: context.router.get("example"),
    componentId: "mw.example.note",
    seedId: "example.minimal.note",
    version: "1",
    mode: "demo",
    payload,
    apply: () => {
      context.orm.model("example.note").upsertByRef(payload);
    },
  });
}
