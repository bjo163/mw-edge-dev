import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COMPONENTS } from "./registry.js";
import { validateManifest } from "./manifest.js";
import { resolveComponents } from "./resolver.js";
import { ModelRegistry } from "../model-registry.js";
import { DomainDatabaseRouter } from "../database/router.js";
import { materializeComponent } from "../schema.js";
import { OrmEnvironment } from "../orm.js";
import { buildMetadata } from "../metadata.js";
const here=dirname(fileURLToPath(import.meta.url));
export const projectRoot=resolve(here,"../../..");
async function readJson(path){ return JSON.parse(await readFile(path,"utf8")); }
export async function loadProfile(profileId) {
  return readJson(resolve(projectRoot,"profiles",`${profileId}.json`));
}
export async function boot({profile=process.env.MW_PROFILE||"standalone-business",dataDir=resolve(projectRoot,"data"),memory=false}={}) {
  const profileDoc=await loadProfile(profile);
  const manifests=new Map();
  for(const c of Object.values(COMPONENTS)){
    const m=validateManifest(await readJson(resolve(projectRoot,c.path,"plugin.json")));
    if(manifests.has(m.id))throw new Error(`Duplicate component id ${m.id}`);
    manifests.set(m.id,m);
  }
  const ordered=resolveComponents(manifests,profileDoc.components);
  const registry=new ModelRegistry();
  const runtimes=new Map();
  for(const id of ordered){
    const c=COMPONENTS[id]; const manifest=manifests.get(id);
    const module=await import(pathToFileURL(resolve(projectRoot,c.path,"index.js")).href);
    const componentModels=module.models||[];
    if(componentModels.map(m=>m.name).sort().join("|")!==[...manifest.models].sort().join("|"))throw new Error(`Manifest/model drift in ${id}`);
    for(const model of componentModels) registry.register(model,id);
    runtimes.set(id,{manifest,module,models:componentModels});
  }
  registry.finalize();
  const router=new DomainDatabaseRouter({dataDir,memory});
  for(const id of ordered){
    const rt=runtimes.get(id); const db=router.get(rt.manifest.domain);
    materializeComponent({db,manifest:rt.manifest,models:rt.models,registry});
  }
  const orm=new OrmEnvironment({registry,router});
  const seedContext={orm,router,registry,profile,projectRoot};
  for(const id of ordered){ const seed=runtimes.get(id).module.seed; if(typeof seed==="function") await seed(seedContext); }
  const metadata=buildMetadata(registry,ordered.map(id=>({id,kind:manifests.get(id).kind,domain:manifests.get(id).domain,version:manifests.get(id).version})));
  return {profile,ordered,manifests,registry,router,orm,metadata,close:()=>router.close()};
}
