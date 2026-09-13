import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { applySeed } from "../../src/kernel/seeds/runner.js";
import type { SeedContext } from "../../src/kernel/plugins/host.js";
import { generateBootstrapPassword, hashPassword } from "../../src/standalone/auth.js";

export async function seed(context: SeedContext): Promise<void> {
  const adminPassword = process.env.MW_BOOTSTRAP_ADMIN_PASSWORD ?? generateBootstrapPassword();
  const payload = {
    principals: [
      { principal_ref: "mw.super-admin", username: "admin", type: "human" },
      { principal_ref: "mw.bot", username: "mw.bot", type: "system" },
    ],
  };

  const result = applySeed({
    db: context.router.get("standalone"),
    componentId: "mw.standalone",
    seedId: "standalone.bootstrap-principals",
    version: "1",
    mode: "required",
    payload,
    apply: () => {
      const principals = context.orm.model("standalone.principal");
      principals.upsertByRef({
        principal_ref: "mw.super-admin",
        username: "admin",
        display_name: "MW Super Admin",
        principal_type: "human",
        password_hash: hashPassword(adminPassword),
        is_superuser: true,
        login_enabled: true,
        must_rotate_password: true,
        active: true,
      });
      principals.upsertByRef({
        principal_ref: "mw.bot",
        username: "mw.bot",
        display_name: "MW Bot",
        principal_type: "system",
        password_hash: null,
        is_superuser: false,
        login_enabled: false,
        must_rotate_password: false,
        active: true,
      });
    },
  });

  if (result.applied && !process.env.MW_BOOTSTRAP_ADMIN_PASSWORD && !context.memory) {
    const directory = resolve(context.projectRoot, "data/.bootstrap");
    mkdirSync(directory, { recursive: true });
    const file = resolve(directory, "admin-credentials.json");
    writeFileSync(file, JSON.stringify({ username: "admin", password: adminPassword, must_rotate_password: true }, null, 2) + "\n", { mode: 0o600 });
    try {
      chmodSync(file, 0o600);
    } catch {
      // Windows and some filesystems do not implement POSIX mode bits.
    }
    if (!existsSync(file)) throw new Error("Failed to persist one-time bootstrap credential");
  }
}
