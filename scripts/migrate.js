import { boot } from "../src/index.js";
const profile=process.argv.includes("--profile")?process.argv[process.argv.indexOf("--profile")+1]:process.env.MW_PROFILE||"standalone-business";
const env=await boot({profile});
console.log(JSON.stringify({status:"ok",profile,components:env.ordered.length,models:env.registry.list().length,domains:env.router.domains()},null,2));
env.close();
