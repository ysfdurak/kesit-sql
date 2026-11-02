const c=require('./load.js'); const DX=c.SQLP_DIALECT;
require('./one.js').then(q=>{
 const tests=process.argv.slice(2);
 for(const sql of tests){ const ref=q(sql,'sqlite'); const rs=JSON.stringify(ref&&ref.values?ref.values.slice(0,3):ref); console.log('\n### '+sql.slice(0,140)+'\n  sqlite => '+rs.slice(0,140));
  for(const d of ['tsql','pg','mysql','oracle','bq']){ let t; try{ t=DX.forward(sql,d);}catch(e){ console.log('  '+d+' FWDERR '+e.message); continue;} const r=q(t,d); const s=r&&r.error?'ERR '+r.error.slice(0,90):JSON.stringify(r&&r.values?r.values.slice(0,3):r); console.log('  '+d.padEnd(6)+(s===rs?'OK ':'XX ')+(s===rs?'':s.slice(0,110)+' | '+t.replace(/\s+/g,' ').slice(0,160))); }
 }
});
