const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');const DX=c.SQLP_DIALECT;
(function hints(){ const dc=[], tc=[], all=[], dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); })();
initSqlJs().then(SQL=>{const db=new SQL.Database(require('./base.js')(SQL,c));c.SQLP_REGISTER(db);DX.register(db);
const run=(q,d)=>{const r=DX.runDialect(db,q,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});const s=r.sets&&r.sets[r.sets.length-1];return r.error?'HATA '+r.error:JSON.stringify(s.values)};
console.log(run("SELECT SUBSTRING_INDEX(email,'@',1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5",'mysql'));
console.log(run("SELECT SUBSTR(email, 1, INSTR(email, '@') - 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5",'sqlite'));});
