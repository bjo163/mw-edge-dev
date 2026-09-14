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

test("documented runtime security inputs stay tied to production behavior", () => {
  const http = read("src/http/app.ts");
  const docs = read("docs/reference/environment-contract.md");

  assert.match(
    http,
    /secure:\s*process\.env\.MW_COOKIE_SECURE\s*===\s*"1"/,
    "HTTP session cookie security must remain explicitly environment-controlled",
  );
  assert.ok(docs.includes("`MW_COOKIE_SECURE`"), "environment contract must classify MW_COOKIE_SECURE");
  assert.ok(docs.includes("Set to `1` to mark the session cookie `Secure`"), "docs must describe MW_COOKIE_SECURE semantics");
});

test("documented bootstrap credential input stays tied to standalone seeding", () => {
  const seed = read("plugins/standalone/seed.ts");
  const docs = read("docs/reference/environment-contract.md");

  assert.match(
    seed,
    /process\.env\.MW_BOOTSTRAP_ADMIN_PASSWORD \?\? generateBootstrapPassword\(\)/,
    "standalone bootstrap must either use the explicit password input or generate a one-time credential",
  );
  assert.match(
    seed,
    /!process\.env\.MW_BOOTSTRAP_ADMIN_PASSWORD && !context\.memory/,
    "generated bootstrap credentials must only be persisted when no explicit password was supplied",
  );
  assert.ok(
    docs.includes("`MW_BOOTSTRAP_ADMIN_PASSWORD` | sensitive optional input"),
    "environment contract must classify MW_BOOTSTRAP_ADMIN_PASSWORD as sensitive optional input",
  );
  assert.ok(
    docs.includes("tests must set an explicit test-only value"),
    "environment contract must require deterministic tests to provide an explicit bootstrap password",
  );
});

test("documented API bind inputs stay tied to server defaults", () => {
  const server = read("src/server.ts");
  const docs = read("docs/reference/environment-contract.md");

  assert.match(
    server,
    /const port = Number\(process\.env\.MW_EDGE_PORT \?\? 8788\)/,
    "server API port must remain explicitly environment-controlled",
  );
  assert.match(
    server,
    /const hostname = process\.env\.MW_EDGE_HOST \?\? "127\.0\.0\.1"/,
    "server API hostname must remain explicitly environment-controlled",
  );
  assert.ok(docs.includes("`MW_EDGE_PORT`"), "environment contract must classify MW_EDGE_PORT");
  assert.ok(docs.includes("server defaults to `8788`"), "docs must describe MW_EDGE_PORT default");
  assert.ok(docs.includes("`MW_EDGE_HOST`"), "environment contract must classify MW_EDGE_HOST");
  assert.ok(docs.includes("server defaults to `127.0.0.1`"), "docs must describe MW_EDGE_HOST default");
});

test("documented runtime selection inputs stay tied to server boot", () => {
  const server = read("src/server.ts");
  const docs = read("docs/reference/environment-contract.md");

  assert.match(
    server,
    /const profile = process\.env\.MW_PROFILE \?\? "standalone-business"/,
    "server profile selection must remain explicitly environment-controlled",
  );
  assert.match(
    server,
    /const dataDir = process\.env\.MW_DATA_DIR \? resolve\(process\.env\.MW_DATA_DIR\) : undefined/,
    "server data directory must remain explicitly environment-controlled",
  );
  assert.match(
    server,
    /await boot\(\{ profile, \.\.\.\(dataDir \? \{ dataDir \} : \{\}\) \}\)/,
    "resolved runtime selection inputs must be passed into boot",
  );
  assert.ok(docs.includes("`MW_PROFILE`"), "environment contract must classify MW_PROFILE");
  assert.ok(docs.includes("default to `standalone-business`"), "docs must describe the server profile default");
  assert.ok(docs.includes("`MW_DATA_DIR`"), "environment contract must classify MW_DATA_DIR");
  assert.ok(docs.includes("Overrides the persistent data directory"), "docs must describe MW_DATA_DIR semantics");
});
