import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPluginLock, readPluginLock } from "../src/kernel/plugins/lock.js";
import { stableStringify } from "../src/kernel/util.js";

const root = process.cwd();
const lockPath = resolve(root, "plugins.lock.json");
const expected = await buildPluginLock(root);

if (process.argv.includes("--write")) {
  await writeFile(lockPath, JSON.stringify(expected, null, 2) + "\n");
  console.log(`wrote ${lockPath}`);
} else {
  let actual: unknown;
  try { actual = await readPluginLock(root); } catch { actual = undefined; }
  if (stableStringify(actual) !== stableStringify(expected)) {
    console.error("plugin lock mismatch; run pnpm plugins:lock:write and review the diff");
    process.exit(1);
  }
  console.log(`plugin lock: ok (${expected.components.length} components)`);
}
