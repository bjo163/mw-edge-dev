import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("shared stylesheet consumes design foundations without raw colors", async () => {
  const css = await text("web/src/styles.css");
  assert.match(css, /@import "\.\/design\/tokens\.css"/);
  assert.match(css, /@import "\.\/design\/typography\.css"/);
  assert.match(css, /@import "\.\/design\/density\.css"/);
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(css), false, "shared styles must use semantic tokens instead of raw hex colors");
});

test("token foundation exposes semantic appearance and state aliases", async () => {
  const tokens = await text("web/src/design/tokens.css");
  for (const token of [
    "--mw-color-canvas",
    "--mw-color-surface",
    "--mw-color-text",
    "--mw-color-border",
    "--mw-color-focus",
    "--mw-color-success-bg",
    "--mw-color-warning-bg",
    "--mw-color-danger-bg",
    "--mw-color-evidence-verified",
    "--mw-control-height",
    "--mw-row-height",
  ]) assert.ok(tokens.includes(token), `missing ${token}`);
  assert.match(tokens, /:root\[data-theme="light"\]/);
  assert.match(tokens, /prefers-color-scheme: light/);
  assert.match(tokens, /:root\[data-density="compact"\]/);
  assert.match(tokens, /:root\[data-density="touch"\]/);
});

test("appearance preferences are applied before React renders", async () => {
  const main = await text("web/src/main.tsx");
  const applyIndex = main.indexOf("applyAppearancePreferences();");
  const renderIndex = main.indexOf("createRoot(root).render");
  assert.ok(applyIndex >= 0, "appearance preferences must be applied");
  assert.ok(renderIndex > applyIndex, "appearance preferences must be applied before render");
});

test("localization foundation includes both English and Indonesian catalogs", async () => {
  const messages = await text("web/src/i18n/messages.ts");
  assert.match(messages, /export type Locale = "en" \| "id"/);
  assert.match(messages, /const en =/);
  assert.match(messages, /const id:/);
  assert.match(messages, /resolveLocale/);
});
