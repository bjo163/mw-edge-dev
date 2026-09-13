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
    } else if (/\.(ts|tsx|json)$/.test(name)) {
      const text = await readFile(child, "utf8");
      if (text.includes("eval(") || text.includes("new Function(")) {
        errors.push(`${child}: executable eval forbidden`);
      }
      if (/\bany\b/.test(text) && !child.includes("node_modules")) {
        errors.push(`${child}: explicit any is forbidden`);
      }
    }
  }
}

for (const root of roots) {
  try {
    await walk(root);
  } catch {
    // Missing optional source roots are ignored.
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("lint: ok");
