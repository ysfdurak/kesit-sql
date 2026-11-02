// node fw_c31.js "sqlite sql" [check]  -> runs in 6 dialects via forward
const c=require('./load.js'); const DX=c.SQLP_DIALECT; const DIDS=DX.DIALECTS.map(d=>d.id);
require('./one.js').then(q=>{ const src=process.argv[2], chk=process.argv[3];
 for(const d of DIDS){ const t=d==='sqlite'?src:DX.forward(src,d); const a=Date.now(); let r; try{ r=q(t,d,chk);}catch(e){r={error:'THROW '+e.message}}
  const ms=Date.now()-a;
  if(r&&r.error) console.log(d,ms+'ms','ERR',String(r.error).slice(0,200),'\n   ',t.slice(0,400));
  else console.log(d,ms+'ms',r?JSON.stringify([r.columns,...r.values.slice(0,6)]):'(no set)', r?r.values.length+' rows':''); }
});
