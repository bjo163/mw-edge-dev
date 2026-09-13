import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const roots = ["src", "plugins", "addons", "scripts", "test"];
const errors: string[] = [];

async function walk(path: string): Promise<void> {
  for (const name of await readdir(path)) {
    const child = join(path, name);
    const childStat = await stat(child);
    if (childStat.isDirectory()) {
      await walk(child);
      continue;
    }
    if (!/\.(ts|tsx|json)$/.test(name)) continue;
    const text = await readFile(child, "utf8");
    if (text.includes("eval(") || text.includes("new Function(")) errors.push(`${child}: executable evaluation forbidden`);
    if (!child.endsWith("scripts/lint.ts") && /:\s*any\b|<any\b|\bas any\b/.test(text)) {
      errors.push(`${child}: unbounded TypeScript escape hatch forbidden`);
    }
  }
}

for (const root of roots) {
  try { await walk(root); } catch { /* optional root */ }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("lint: ok");
