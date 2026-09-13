import { resolve } from "node:path";
import { boot } from "../src/index.js";

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const profile = value("--profile") ?? process.env.MW_PROFILE ?? "standalone-business";
const dataDirInput = value("--data-dir") ?? process.env.MW_DATA_DIR;
const dataDir = dataDirInput ? resolve(dataDirInput) : undefined;

const env = await boot({ profile, ...(dataDir ? { dataDir } : {}) });
console.log(
  JSON.stringify(
    {
      status: "ok",
      profile,
      data_dir: dataDir ?? "default",
      components: env.ordered.length,
      models: env.registry.list().length,
      domains: env.router.domains(),
    },
    null,
    2,
  ),
);
env.close();
