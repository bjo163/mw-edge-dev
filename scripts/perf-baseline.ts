import { performance } from "node:perf_hooks";
import { boot } from "../src/index.js";

const profile = process.env.MW_PROFILE ?? "standalone-business";
const thresholds = {
  startup_ms: Number(process.env.MW_PERF_STARTUP_MAX_MS ?? 5000),
  metadata_scan_ms: Number(process.env.MW_PERF_METADATA_MAX_MS ?? 500),
  orm_write_read_ms: Number(process.env.MW_PERF_ORM_MAX_MS ?? 3000),
} as const;

const started = performance.now();
const env = await boot({ profile, memory: true });
const startupMs = performance.now() - started;

try {
  const metadataStarted = performance.now();
  let metadataCells = 0;
  for (let pass = 0; pass < 1000; pass += 1) {
    for (const resource of env.metadata.resources) {
      metadataCells += Object.keys(resource.fields).length;
    }
  }
  const metadataScanMs = performance.now() - metadataStarted;

  const store = env.registry.has("standalone.principal")
    ? env.orm.model("standalone.principal")
    : env.orm.model(env.registry.list()[0]?.name ?? "");
  const ormStarted = performance.now();
  const refs: string[] = [];
  if (env.registry.has("standalone.principal")) {
    for (let index = 0; index < 100; index += 1) {
      const ref = `perf.principal.${index}`;
      refs.push(ref);
      store.create({
        principal_ref: ref,
        username: `perf-user-${index}`,
        display_name: `Performance User ${index}`,
        principal_type: "human",
        login_enabled: false,
        is_superuser: false,
        must_rotate_password: false,
        active: true,
      });
    }
    for (const ref of refs) {
      if (!store.get(ref)) throw new Error(`Performance fixture disappeared: ${ref}`);
    }
  } else {
    for (let index = 0; index < 1000; index += 1) store.count();
  }
  const ormWriteReadMs = performance.now() - ormStarted;

  const metrics = {
    startup_ms: Math.round(startupMs * 100) / 100,
    metadata_scan_ms: Math.round(metadataScanMs * 100) / 100,
    orm_write_read_ms: Math.round(ormWriteReadMs * 100) / 100,
  };
  const checks = {
    startup: metrics.startup_ms <= thresholds.startup_ms,
    metadata_scan: metrics.metadata_scan_ms <= thresholds.metadata_scan_ms,
    orm_write_read: metrics.orm_write_read_ms <= thresholds.orm_write_read_ms,
  };
  const ok = Object.values(checks).every(Boolean);

  console.log(JSON.stringify({
    status: ok ? "ok" : "regression",
    profile,
    methodology: {
      startup: "cold in-memory profile boot",
      metadata_scan: "1000 full metadata field scans",
      orm_write_read: env.registry.has("standalone.principal")
        ? "100 principal inserts followed by 100 primary-ref reads"
        : "1000 model count queries",
      metadata_cells_visited: metadataCells,
    },
    thresholds,
    metrics,
    checks,
  }, null, 2));

  if (!ok) process.exitCode = 1;
} finally {
  env.close();
}
