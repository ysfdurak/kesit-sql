// usage: node try_c32.js dialect "code" ["check"]
const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');const DX=c.SQLP_DIALECT;
(function hints(){ const dc=[], tc=[], all=[], dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); })();
initSqlJs().then(SQL=>{const db=new SQL.Database(require("./base.js")(SQL,c));c.SQLP_REGISTER(db);DX.register(db);
const [d,code,chk]=process.argv.slice(2);let r;try{r=DX.runDialect(db,code,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});}catch(e){r={error:'THROW '+e.message}}
if(r.error) console.log('ERR',r.error); (r.sets||[]).forEach(s=>console.log(s.columns.join('|')+'\n'+s.values.slice(0,15).map(v=>v.join('|')).join('\n')+'\n--'));
if(chk){const x=db.exec(chk);console.log('CHECK',JSON.stringify(x.length?x[0].values.slice(0,15):[]));}});
