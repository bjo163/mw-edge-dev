import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";
import { COMPONENTS } from "../src/kernel/plugins/registry.js";
test("component inventory is 17 domain plugins + 9 addons",()=> {
  const values=Object.values(COMPONENTS);
  assert.equal(values.filter(x=>x.kind==="domain_plugin").length,17);
  assert.equal(values.filter(x=>x.kind==="addon").length,9);
});
test("full profile registers exactly 43 models and 17 domains",async()=> {
  const env=await boot({profile:"full",memory:true});
  assert.equal(env.registry.list().length,43);
  assert.equal(new Set(env.registry.list().map(m=>m.domain)).size,17);
  assert.equal(env.ordered.length,26);
  env.close();
});
test("cross-domain relationships are References, never Relations",async()=> {
  const env=await boot({profile:"full",memory:true});
  for(const m of env.registry.list()) for(const f of Object.values(m.fields)) if(f.type==="Relation"){
    const p=f.target.split(".");p.pop();const target=env.registry.get(p.join("."));
    assert.equal(target.domain,m.domain,`${m.name} has cross-domain Relation`);
  }
  env.close();
});
test("foundation metadata is read-only and sensitive standalone fields are hidden",async()=> {
  const env=await boot({profile:"full",memory:true});
  const country=env.metadata.resources.find(r=>r.resource_id==="foundation.country");
  assert.equal(country.crud.create,false); assert.equal(country.crud.update,false);
  const principal=env.metadata.resources.find(r=>r.resource_id==="standalone.principal");
  assert.ok(!Object.hasOwn(principal.fields,"password_hash"));
  env.close();
});
