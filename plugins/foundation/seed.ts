import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applySeed } from "../../src/kernel/seeds/runner.js";
import type { SeedContext } from "../../src/kernel/plugins/host.js";
import type { InputRecord } from "../../src/kernel/orm.js";

const here = dirname(fileURLToPath(import.meta.url));
async function readRows(name: string): Promise<readonly InputRecord[]> {
  return JSON.parse(await readFile(resolve(here, "data/reference", name), "utf8")) as readonly InputRecord[];
}

export async function seed(context: SeedContext): Promise<void> {
  const payload = {
    countries: await readRows("countries.json"),
    currencies: await readRows("currencies.json"),
    languages: await readRows("languages.json"),
    timezones: await readRows("timezones.json"),
    locales: await readRows("locales.json"),
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
