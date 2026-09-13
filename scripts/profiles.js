import { readdir, readFile } from "node:fs/promises";
for(const file of (await readdir(new URL("../profiles/",import.meta.url))).filter(x=>x.endsWith(".json")).sort()){
  const p=JSON.parse(await readFile(new URL(`../profiles/${file}`,import.meta.url),"utf8"));
  console.log(`${p.id.padEnd(26)} ${String(p.components.length).padStart(2)} components  ${p.description}`);
}
