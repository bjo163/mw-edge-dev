export function resolveComponents(manifests, selected) {
  const wanted=new Set(selected);
  let changed=true;
  while(changed){
    changed=false;
    for(const id of [...wanted]){
      const m=manifests.get(id); if(!m) throw new Error(`Selected component missing: ${id}`);
      for(const dep of [...(m.requires||[]),...(m.extends?[m.extends]:[])]) if(!wanted.has(dep)){wanted.add(dep);changed=true;}
    }
  }
  const temp=new Set(),done=new Set(),ordered=[];
  const visit=id=>{
    if(done.has(id))return;
    if(temp.has(id))throw new Error(`Component dependency cycle at ${id}`);
    temp.add(id); const m=manifests.get(id); if(!m)throw new Error(`Missing component ${id}`);
    for(const dep of [...(m.requires||[]),...(m.extends?[m.extends]:[])]) visit(dep);
    temp.delete(id); done.add(id); ordered.push(id);
  };
  [...wanted].sort().forEach(visit);
  for(const id of ordered){
    const m=manifests.get(id);
    if(m.kind==="addon"){
      const target=manifests.get(m.extends);
      if(!target||target.kind!=="domain_plugin")throw new Error(`Invalid addon target ${m.id} -> ${m.extends}`);
      if(target.domain!==m.domain)throw new Error(`Addon domain mismatch ${m.id}`);
    }
  }
  return ordered;
}
