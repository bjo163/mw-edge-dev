function titleize(value){ return value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase()); }
export function resourceMetadata(model) {
  const fields=Object.entries(model.fields);
  const sensitive=fields.filter(([,f])=>f.sensitive).map(([n])=>n);
  const visible=fields.filter(([n,f])=>!f.sensitive && n!=="password_hash" && n!=="token_hash").map(([n])=>n);
  const preferred=[...fields.filter(([n])=>n.endsWith("_ref")).map(([n])=>n),...["name","display_name","title","status","lifecycle","active"]]
    .filter((n,i,a)=>visible.includes(n)&&a.indexOf(n)===i).slice(0,6);
  for (const n of visible) if (preferred.length<6 && !preferred.includes(n)) preferred.push(n);
  const readonly=model.authority==="REFERENCE";
  const hidden=model.name==="standalone.session";
  return {
    resource_id:model.name, metadata_version:"1", label:titleize(model.name.split(".").at(-1)),
    domain:model.domain, authority:model.authority, owner_component:model.owner,
    navigation:{group:model.domain,visible:!hidden,order:100},
    crud:{list:true,read:true,create:!readonly&&!hidden,update:!readonly&&!hidden,delete:false},
    fields:Object.fromEntries(fields.filter(([n])=>!sensitive.includes(n))),
    sensitive_fields_hidden:sensitive,
    views:{list:{columns:preferred,default_page_size:25},form:{sections:[{id:"main",label:"General",fields:visible}]}}
  };
}
export function buildMetadata(registry, activeComponents) {
  const resources=registry.list().map(resourceMetadata);
  const groups=[...new Set(resources.filter(r=>r.navigation.visible).map(r=>r.navigation.group))].sort();
  return {version:"1",components:activeComponents,groups,resources};
}
