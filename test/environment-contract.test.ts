import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type PackageContract = {
  packageManager: string;
  engines: { node: string };
  scripts: Record<string, string>;
};

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function requiredMatch(input: string, pattern: RegExp, label: string): string {
  const match = input.match(pattern);
  assert.ok(match?.[1], `missing ${label}`);
  return match[1];
}

test("environment contract stays aligned with package and CI declarations", () => {
  const pkg = JSON.parse(read("package.json")) as PackageContract;
  const ci = read(".github/workflows/ci.yml");
  const docs = read("docs/reference/environment-contract.md");

  const packageManagerVersion = requiredMatch(pkg.packageManager, /^pnpm@(.+)$/, "pnpm packageManager version");
  const ciPnpmVersion = requiredMatch(
    ci,
    /pnpm\/action-setup@[\s\S]*?with:\s*\n\s*version:\s*([^\s#]+)/,
    "CI pnpm version",
  );
  const ciNodeVersion = requiredMatch(
    ci,
    /actions\/setup-node@[\s\S]*?with:\s*\n\s*node-version:\s*([^\s#]+)/,
    "CI Node.js version",
  );

  assert.equal(ciPnpmVersion, packageManagerVersion, "CI pnpm must match packageManager");
  assert.match(pkg.engines.node, /^>=\d+\.\d+\.\d+$/, "Node.js engine floor must stay explicit");
  assert.ok(docs.includes(`\`pnpm@${packageManagerVersion}\``), "docs must state the package-manager contract");
  assert.ok(docs.includes(`Node.js \`${pkg.engines.node}\``), "docs must state the Node.js engine contract");
  assert.ok(docs.includes(`Node.js \`${ciNodeVersion}\``), "docs must state the CI Node.js reference version");
  assert.ok(docs.includes(`pnpm \`${ciPnpmVersion}\``), "docs must state the CI pnpm reference version");

  assert.match(ci, /run:\s*pnpm install --frozen-lockfile\b/, "CI must use the frozen lockfile");
  assert.match(ci, /run:\s*pnpm readiness\b/, "CI must execute the canonical readiness gate");
  assert.ok(pkg.scripts.readiness, "package.json must expose the readiness script");
  assert.ok(docs.includes("`pnpm readiness` is the canonical aggregate gate used by CI"));
});
