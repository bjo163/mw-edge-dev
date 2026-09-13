import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outRoot = resolve(root, outIndex >= 0 ? (args[outIndex + 1] ?? "dist/docs-site") : "dist/docs-site");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as { version: string };
const version = "v" + pkg.version;
const docsRoot = resolve(root, "docs");
const pages: string[] = [];

async function walk(path: string): Promise<void> {
  for (const name of (await readdir(path)).sort()) {
    const child = resolve(path, name);
    const info = await stat(child);
    if (info.isDirectory()) await walk(child);
    else if (extname(name).toLowerCase() === ".md") pages.push(child);
  }
}

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function inline(value: string): string {
  const escaped = escapeHtml(value);
  return escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, target: string) => {
    const href = target.startsWith("http") || target.startsWith("mailto:")
      ? target
      : target.replace(/\.md(?=($|#))/i, ".html");
    return '<a href="' + escapeHtml(href) + '">' + label + "</a>";
  });
}

function renderMarkdown(source: string): string {
  const output: string[] = [];
  let inCode = false;
  let listOpen = false;
  const closeList = (): void => {
    if (listOpen) {
      output.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of source.split(/\r?\n/)) {
    if (raw.startsWith(String.fromCharCode(96, 96, 96))) {
      closeList();
      output.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      output.push(escapeHtml(raw) + "\n");
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(raw);
    if (heading) {
      closeList();
      const level = heading[1]?.length ?? 1;
      output.push("<h" + level + ">" + inline(heading[2] ?? "") + "</h" + level + ">");
      continue;
    }
    const list = /^[-*]\s+(.+)$/.exec(raw);
    if (list) {
      if (!listOpen) {
        output.push("<ul>");
        listOpen = true;
      }
      output.push("<li>" + inline(list[1] ?? "") + "</li>");
      continue;
    }
    closeList();
    if (raw.trim()) output.push("<p>" + inline(raw) + "</p>");
  }
  closeList();
  if (inCode) output.push("</code></pre>");
  return output.join("\n");
}

await walk(docsRoot);
await rm(outRoot, { recursive: true, force: true });
const versionRoot = resolve(outRoot, version);

const nav = pages.map((path) => {
  const rel = relative(docsRoot, path).replaceAll("\\", "/");
  const href = rel.replace(/\.md$/i, ".html");
  return '<li><a href="./' + href + '">' + escapeHtml(rel) + "</a></li>";
}).join("\n");

const shell = (title: string, body: string): string => [
  "<!doctype html>",
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  "<title>" + escapeHtml(title) + " · MW Edge " + version + "</title>",
  "<style>body{font:16px/1.6 system-ui,sans-serif;max-width:1100px;margin:auto;padding:2rem;color:#1f2328}header{border-bottom:1px solid #d0d7de;margin-bottom:2rem}code,pre{font-family:ui-monospace,monospace}pre{overflow:auto;padding:1rem;background:#f6f8fa}a{color:#0969da}main{min-width:0}</style>",
  "</head><body><header><strong>MW Edge " + version + '</strong> · <a href="./index.html">Documentation</a></header><main>',
  body,
  "</main></body></html>",
  "",
].join("\n");

for (const path of pages) {
  const rel = relative(docsRoot, path).replaceAll("\\", "/");
  const target = resolve(versionRoot, rel.replace(/\.md$/i, ".html"));
  const source = await readFile(path, "utf8");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, shell(rel, renderMarkdown(source)), "utf8");
}

await mkdir(versionRoot, { recursive: true });
await writeFile(
  resolve(versionRoot, "index.html"),
  shell("Documentation", "<h1>MW Edge documentation</h1><p>Version " + version + "</p><ul>" + nav + "</ul>"),
  "utf8",
);
await writeFile(
  resolve(outRoot, "index.html"),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./' + version + '/index.html"><a href="./' + version + '/index.html">MW Edge ' + version + " documentation</a>\n",
  "utf8",
);
console.log(JSON.stringify({ status: "ok", version, pages: pages.length, output: outRoot }));
