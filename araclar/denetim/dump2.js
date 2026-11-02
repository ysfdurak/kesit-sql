const c=require('./load.js');const FL=new RegExp(process.env.FILTER);
require('./one.js').then(q=>{
const items=[];c.SQLP_LESSONS.filter(l=>FL.test(l.id)).forEach(l=>(l.ex||[]).forEach((e,i)=>e.t!=='mc'&&items.push([l.id+'#'+i,e])));
c.SQLP_PRACTICE.filter(p=>FL.test(p.id)).forEach(p=>items.push([p.id,p]));
for(const [id,e] of items){const r=q(e.sol,e.base||'sqlite',e.check);console.log(id, r&&r.error?'ERR '+r.error:r?r.values.length+' | '+r.columns.join(',')+' | '+r.values.slice(0,3).map(v=>v.join('/')).join(' ; ').slice(0,150):'-');}});
