import { readFile } from "node:fs/promises";
const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
if(!pkg.type||pkg.type!=="module")throw new Error("package.json must use ESM"); console.log("format-check: structural check ok");
