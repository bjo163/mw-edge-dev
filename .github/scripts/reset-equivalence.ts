import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boot } from "../../src/index.js";

const profile = process.env.MW_PROFILE ?? "standalone-business";
const dataDir = mkdtempSync(join(tmpdir(), "mw-edge-readiness-"));
const previousPassword = process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = "readiness-reset-password-123456";

const snapshot = async (): Promise<Record<string, unknown>> => {
  const env = await boot({ profile, dataDir });
  try {
    const referenceCounts: Record<string, number> = {};
    for (const model of [
      "foundation.country",
      "foundation.currency",
      "foundation.language",
      "foundation.timezone",
      "foundation.locale",
    ]) {
      if (env.registry.has(model)) referenceCounts[model] = env.orm.model(model).count();
    }
    return {
      profile: env.profile,
      models: env.registry.list().length,
      components: env.ordered.length,
      domains: [...env.router.domains()].sort(),
      referenceCounts,
    };
  } finally {
    env.close();
  }
};

try {
  const before = await snapshot();
  rmSync(dataDir, { recursive: true, force: true });
  const after = await snapshot();
  assert.deepEqual(after, before);
  console.log(JSON.stringify({ gate: "reset-equivalence", ...after }));
} finally {
  rmSync(dataDir, { recursive: true, force: true });
  if (previousPassword === undefined) delete process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  else process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = previousPassword;
}
