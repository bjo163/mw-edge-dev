import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { COMPONENTS } from "./registry.js";
import { validateManifest } from "./manifest.js";
import { resolveComponents } from "./resolver.js";
import { ModelRegistry } from "../model-registry.js";
import { DomainDatabaseRouter } from "../database/router.js";
import { materializeComponent } from "../schema.js";
import { OrmEnvironment } from "../orm.js";
import { buildMetadata } from "../metadata.js";
import type { ModelDefinition, PluginManifest, ProfileDocument } from "../types.js";

export const projectRoot = process.cwd();

interface RuntimeModule {
  readonly models?: readonly ModelDefinition[];
  readonly seed?: (context: unknown) => void | Promise<void>;
}

interface RuntimeComponent {
  readonly manifest: PluginManifest;
  readonly module: RuntimeModule;
  readonly models: readonly ModelDefinition[];
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function loadProfile(profileId: string): Promise<ProfileDocument> {
  const value = await readJson(resolve(projectRoot, "profiles", `${profileId}.json`));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid profile ${profileId}`);
  const profile = value as Partial<ProfileDocument>;
  if (profile.id !== profileId || !Array.isArray(profile.components) || !profile.schema_version || !profile.description) {
    throw new Error(`Invalid profile ${profileId}`);
  }
  return profile as ProfileDocument;
}

export interface BootOptions {
  readonly profile?: string;
  readonly dataDir?: string;
  readonly memory?: boolean;
}

export interface BootEnvironment {
  readonly profile: string;
  readonly ordered: readonly string[];
  readonly manifests: ReadonlyMap<string, PluginManifest>;
  readonly registry: ModelRegistry;
  readonly router: DomainDatabaseRouter;
  readonly orm: OrmEnvironment;
  readonly metadata: ReturnType<typeof buildMetadata>;
  readonly close: () => void;
}

export async function boot(options: BootOptions = {}): Promise<BootEnvironment> {
  const profile = options.profile ?? process.env.MW_PROFILE ?? "standalone-business";
  const dataDir = options.dataDir ?? resolve(projectRoot, "data");
  const memory = options.memory ?? false;
  const profileDocument = await loadProfile(profile);

  const manifests = new Map<string, PluginManifest>();
  for (const component of Object.values(COMPONENTS)) {
    const manifest = validateManifest(await readJson(resolve(projectRoot, component.path, "plugin.json")));
    if (manifests.has(manifest.id)) throw new Error(`Duplicate component id ${manifest.id}`);
    manifests.set(manifest.id, manifest);
  }

  const ordered = resolveComponents(manifests, profileDocument.components);
  const registry = new ModelRegistry();
  const runtimes = new Map<string, RuntimeComponent>();
  const sourceExtension = extname(import.meta.url) === ".ts" ? ".ts" : ".js";
  const runtimeRoot = sourceExtension === ".ts" ? projectRoot : resolve(projectRoot, "dist");

  for (const id of ordered) {
    const component = COMPONENTS[id as keyof typeof COMPONENTS];
    if (!component) throw new Error(`Unknown component ${id}`);
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing manifest ${id}`);
    const module = (await import(pathToFileURL(resolve(runtimeRoot, component.path, `index${sourceExtension}`)).href)) as RuntimeModule;
    const componentModels = module.models ?? [];
    if (
      componentModels.map((model) => model.name).sort().join("|") !==
      [...manifest.models].sort().join("|")
    ) {
      throw new Error(`Manifest/model drift in ${id}`);
    }
    for (const model of componentModels) registry.register(model, id);
    runtimes.set(id, { manifest, module, models: componentModels });
  }

  registry.finalize();
  const router = new DomainDatabaseRouter({ dataDir, memory });

  for (const id of ordered) {
    const runtime = runtimes.get(id);
    if (!runtime) throw new Error(`Missing runtime ${id}`);
    const registeredModels = runtime.models.map((model) => registry.get(model.name));
    materializeComponent({
      db: router.get(runtime.manifest.domain),
      manifest: runtime.manifest,
      models: registeredModels,
      registry,
    });
  }

  const orm = new OrmEnvironment({ registry, router });
  const metadata = buildMetadata(
    registry,
    ordered.map((id) => {
      const manifest = manifests.get(id);
      if (!manifest) throw new Error(`Missing manifest ${id}`);
      return { id, kind: manifest.kind, domain: manifest.domain, version: manifest.version };
    }),
  );

  return {
    profile,
    ordered,
    manifests,
    registry,
    router,
    orm,
    metadata,
    close: () => router.close(),
  };
}
