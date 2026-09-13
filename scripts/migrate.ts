import { boot } from "../src/index.js";

const index = process.argv.indexOf("--profile");
const profile = index >= 0 ? process.argv[index + 1] : process.env.MW_PROFILE ?? "standalone-business";
if (!profile) throw new Error("Missing profile");

const env = await boot({ profile });
console.log(
  JSON.stringify(
    {
      status: "ok",
      profile,
      components: env.ordered.length,
      models: env.registry.list().length,
      domains: env.router.domains(),
    },
    null,
    2,
  ),
);
env.close();
