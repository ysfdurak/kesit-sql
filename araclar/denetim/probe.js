const c=require('./load.js'); const DX=c.SQLP_DIALECT;
require('./one.js').then(q=>{
 const tests=process.argv.slice(2);
 for(const sql of tests){ console.log('\n### '+sql);
  for(const d of ['sqlite','tsql','pg','mysql','oracle','bq']){ const t=d==='sqlite'?sql:DX.forward(sql,d); const r=q(t,d); console.log(d.padEnd(6), t.replace(/\s+/g,' ').slice(0,150), '=>', r.error?('ERR '+r.error.slice(0,110)):JSON.stringify(r&&r.values.slice(0,2)).slice(0,120)); }
 }
});
