import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

type PackageJson = { scripts?: Record<string, string> };

const root = process.cwd();
const errors: string[] = [];
const markdownFiles: string[] = [];
const builtins = new Set(["install", "exec", "dlx", "add", "remove", "update", "list", "why"]);

async function walk(path: string): Promise<void> {
  for (const name of await readdir(path)) {
    const child = resolve(path, name);
    const info = await stat(child);
    if (info.isDirectory()) {
      await walk(child);
    } else if (extname(name).toLowerCase() === ".md") {
      markdownFiles.push(child);
    }
  }
}

for (const name of ["README.md", "SECURITY.md", "CONTRIBUTING.md"]) {
  const path = resolve(root, name);
  if (existsSync(path)) markdownFiles.push(path);
}
if (existsSync(resolve(root, "docs"))) await walk(resolve(root, "docs"));

const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as PackageJson;
const scripts = new Set(Object.keys(pkg.scripts ?? {}));

function anchorSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function anchorsFor(path: string): Promise<Set<string>> {
  const text = await readFile(path, "utf8");
  const anchors = new Set<string>();
  const counts = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    const heading = match?.[2];
    if (!heading) continue;
    const base = anchorSlug(heading.replace(/\s+#+\s*$/, ""));
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : base + "-" + count);
  }
  return anchors;
}

for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");

  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const capturedTarget = match[1];
    if (!capturedTarget) continue;

    let target = capturedTarget.trim();
    if (!target || /^(https?:|mailto:)/i.test(target)) continue;
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    target = target.split(/\s+["'][^"']*["']$/)[0] ?? target;

    const parts = target.split("#", 2);
    const rawPath = parts[0] ?? "";
    const fragment = parts[1] ?? "";
    const decodedPath = decodeURIComponent(rawPath);
    const targetPath = decodedPath ? resolve(dirname(file), decodedPath) : file;

    if (!existsSync(targetPath)) {
      errors.push(file.slice(root.length + 1) + ": broken local link " + target);
      continue;
    }

    if (fragment && extname(targetPath).toLowerCase() === ".md") {
      const anchors = await anchorsFor(targetPath);
      const normalized = decodeURIComponent(fragment).toLowerCase();
      if (!anchors.has(normalized)) {
        errors.push(
          file.slice(root.length + 1) +
            ": missing anchor #" +
            fragment +
            " in " +
            (decodedPath || file.slice(root.length + 1)),
        );
      }
    }
  }

  const commandPattern = /\bpnpm(?:\s+run)?\s+([A-Za-z0-9:_-]+)/g;
  for (const match of text.matchAll(commandPattern)) {
    const command = match[1];
    if (!command) continue;
    if (!builtins.has(command) && !scripts.has(command)) {
      errors.push(
        file.slice(root.length + 1) +
          ': documented pnpm script "' +
          command +
          '" does not exist in package.json',
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("docs-check: ok (" + markdownFiles.length + " markdown files)");
