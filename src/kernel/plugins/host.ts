import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COMPONENTS } from "./registry.js";
import { validateManifest } from "./manifest.js";
import { validateProfile } from "./profile.js";
import { resolveComponents } from "./resolver.js";
import { validateComponentContracts } from "./contracts.js";
import { ExtensionRegistry } from "./extensions.js";
import { LifecycleRegistry, type ComponentState } from "./lifecycle.js";
import { verifyPluginLock } from "./lock.js";
import { ModelRegistry } from "../model-registry.js";
import { DomainDatabaseRouter } from "../database/router.js";
import { materializeComponent } from "../schema.js";
import { OrmEnvironment } from "../orm.js";
import { buildMetadata } from "../metadata.js";
import type { ModelDefinition, PluginManifest, ProfileDocument } from "../types.js";

export const projectRoot = process.cwd();

export interface SeedContext {
  readonly orm: OrmEnvironment;
  readonly router: DomainDatabaseRouter;
  readonly registry: ModelRegistry;
  readonly profile: string;
  readonly projectRoot: string;
  readonly memory: boolean;
}
interface RuntimeModule {
  readonly models?: readonly ModelDefinition[];
  readonly seed?: (context: SeedContext) => void | Promise<void>;
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
  return validateProfile(value, profileId);
}
export async function planProfile(profileId: string): Promise<{
  readonly profileDocument: ProfileDocument;
  readonly manifests: ReadonlyMap<string, PluginManifest>;
  readonly ordered: readonly string[];
  readonly lifecycle: LifecycleRegistry;
  readonly extensions: ExtensionRegistry;
}> {
  await verifyPluginLock(projectRoot);
  const profileDocument = await loadProfile(profileId);
  const manifests = new Map<string, PluginManifest>();
  const lifecycle = new LifecycleRegistry();
  for (const component of Object.values(COMPONENTS)) {
    lifecycle.discover(component.id);
    const manifest = validateManifest(await readJson(resolve(projectRoot, component.path, "plugin.json")));
    if (manifests.has(manifest.id)) throw new Error(`Duplicate component id ${manifest.id}`);
    manifests.set(manifest.id, manifest);
    lifecycle.transition(manifest.id, "validated");
  }
  const ordered = resolveComponents(manifests, profileDocument.components);
  validateComponentContracts(manifests, ordered);
  for (const id of ordered) lifecycle.transition(id, "resolved");
  const extensions = new ExtensionRegistry();
  for (const id of ordered) {
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing manifest ${id}`);
    extensions.declare(manifest);
  }
  for (const id of ordered) {
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Missing manifest ${id}`);
    extensions.bind(manifest);
  }
  extensions.freeze();
  return { profileDocument, manifests, ordered, lifecycle, extensions };
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
  readonly lifecycle: Readonly<Record<string, ComponentState>>;
  readonly extensions: ReturnType<ExtensionRegistry["snapshot"]>;
  readonly close: () => void;
}
export async function boot(options: BootOptions = {}): Promise<BootEnvironment> {
  const profile = options.profile ?? process.env.MW_PROFILE ?? "standalone-business";
  const dataDir = options.dataDir ?? resolve(projectRoot, "data");
  const memory = options.memory ?? false;
  const { manifests, ordered, lifecycle, extensions } = await planProfile(profile);
  const registry = new ModelRegistry();
  const runtimes = new Map<string, RuntimeComponent>();
  const currentFile = fileURLToPath(import.meta.url);
  const sourceExtension = extname(currentFile) === ".ts" ? ".ts" : ".js";
  const runtimeRoot = sourceExtension === ".ts" ? projectRoot : resolve(projectRoot, "dist");
  let router: DomainDatabaseRouter | undefined;
  try {
    for (const id of ordered) {
      const component = COMPONENTS[id as keyof typeof COMPONENTS];
      if (!component) throw new Error(`Unknown component ${id}`);
      const manifest = manifests.get(id);
      if (!manifest) throw new Error(`Missing manifest ${id}`);
      const module = (await import(pathToFileURL(resolve(runtimeRoot, component.path, `index${sourceExtension}`)).href)) as RuntimeModule;
      const componentModels = module.models ?? [];
      if (componentModels.map((model) => model.name).sort().join("|") !== [...manifest.models].sort().join("|")) throw new Error(`Manifest/model drift in ${id}`);
      for (const model of componentModels) registry.register(model, id);
      runtimes.set(id, { manifest, module, models: componentModels });
      lifecycle.transition(id, "staged");
    }
    registry.finalize();
    router = new DomainDatabaseRouter({ dataDir, memory });
    for (const id of ordered) {
      const runtime = runtimes.get(id);
      if (!runtime) throw new Error(`Missing runtime ${id}`);
      materializeComponent({
        db: router.get(runtime.manifest.domain),
        manifest: runtime.manifest,
        models: runtime.models.map((model) => registry.get(model.name)),
        registry,
      });
      lifecycle.transition(id, "migrated");
    }
    const orm = new OrmEnvironment({ registry, router });
    const seedContext: SeedContext = { orm, router, registry, profile, projectRoot, memory };
    for (const id of ordered) {
      const runtime = runtimes.get(id);
      if (!runtime) throw new Error(`Missing runtime ${id}`);
      if (runtime.module.seed) await runtime.module.seed(seedContext);
    }
    const metadata = buildMetadata(registry, ordered.map((id) => {
      const manifest = manifests.get(id);
      if (!manifest) throw new Error(`Missing manifest ${id}`);
      return { id, kind: manifest.kind, domain: manifest.domain, version: manifest.version };
    }));
    for (const id of ordered) lifecycle.transition(id, "active");
    return {
      profile, ordered, manifests, registry, router, orm, metadata,
      lifecycle: lifecycle.snapshot(), extensions: extensions.snapshot(),
      close: () => router?.close(),
    };
  } catch (error) {
    for (const id of ordered) {
      const state = lifecycle.get(id);
      if (state && state !== "active" && state !== "failed" && state !== "disabled") lifecycle.transition(id, "failed");
    }
    router?.close();
    throw error;
  }
}
