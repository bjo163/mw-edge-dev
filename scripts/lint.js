import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const roots=["src","plugins","addons","scripts","test"];
let errors=[];
async function walk(path){for(const name of await readdir(path)){const p=join(path,name);const s=await stat(p);if(s.isDirectory())await walk(p);else if(/\.(js|json)$/.test(name)){const t=await readFile(p,"utf8");if(t.includes("eval(")||t.includes("new Function("))errors.push(`${p}: executable eval forbidden`);}}}
for(const root of roots){try{await walk(root)}catch{}}
if(errors.length){console.error(errors.join("\n"));process.exit(1)} console.log("lint: ok");
