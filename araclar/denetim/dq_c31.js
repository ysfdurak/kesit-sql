const c=require('./load.js'); const initSqlJs=require('sql.js/dist/sql-asm.js'); const DX=c.SQLP_DIALECT;
(function(){ const dc=[], tc=[], all=[], dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); })();
initSqlJs().then(SQL=>{ const B=require("./base.js")(SQL,c); const d=process.argv[2];
for(const code of process.argv.slice(3)){ const db=new SQL.Database(B); c.SQLP_REGISTER(db); DX.register(db);
 const r=DX.runDialect(db,code,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});
 if(r.error) console.log('ERR',r.error); if(d!=='sqlite'&&d!==undefined){} 
 (r.sets||[]).forEach(s=>console.log([s.columns.join('|'),...s.values.slice(0,25).map(v=>v.join('|'))].join('\n')+'\n..'));
 if(r.messages) console.log('MSG',r.messages); console.log('--'); db.close(); } });
