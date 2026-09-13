import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
  readonly type?: string;
};
if (packageJson.type !== "module") throw new Error("package.json must use ESM");
console.log("format-check: structural check ok");
