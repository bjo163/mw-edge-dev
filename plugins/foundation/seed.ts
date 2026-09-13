import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applySeed } from "../../src/kernel/seeds/runner.js";
import type { SeedContext } from "../../src/kernel/plugins/host.js";
import type { InputRecord } from "../../src/kernel/orm.js";

async function readRows(context: SeedContext, name: string): Promise<readonly InputRecord[]> {
  const path = resolve(context.projectRoot, "plugins/foundation/data/reference", name);
  return JSON.parse(await readFile(path, "utf8")) as readonly InputRecord[];
}

export async function seed(context: SeedContext): Promise<void> {
  const payload = {
    countries: await readRows(context, "countries.json"),
    currencies: await readRows(context, "currencies.json"),
    languages: await readRows(context, "languages.json"),
    timezones: await readRows(context, "timezones.json"),
    locales: await readRows(context, "locales.json"),
  };

  applySeed({
    db: context.router.get("foundation"),
    componentId: "mw.foundation",
    seedId: "foundation.reference.core",
    version: "1",
    mode: "reference",
    payload,
    apply: () => {
      const entries: readonly [string, readonly InputRecord[]][] = [
        ["foundation.country", payload.countries],
        ["foundation.currency", payload.currencies],
        ["foundation.language", payload.languages],
        ["foundation.timezone", payload.timezones],
        ["foundation.locale", payload.locales],
      ];
      for (const [model, rows] of entries) {
        const store = context.orm.model(model);
        for (const row of rows) store.upsertByRef(row);
      }
    },
  });
}
