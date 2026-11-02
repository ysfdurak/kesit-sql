// Önceden kurulmuş veritabanını üret: <depo kökü>/base-<özet>.b64.txt ve denetim için base.sqlite
const c=require('./load.js'); const fs=require('fs'); const zlib=require('zlib'); const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{ const t=Date.now(); const db=new SQL.Database(); c.SQLP_EXEC_SEED(db); db.exec('VACUUM'); const B=db.export(); db.close();
  const h=c.SQLP_SEED_HASH(); const D=require('./yol.js').ROOT+'';
  for(const f of fs.readdirSync(D)) if(/^base-.*\.(sqlite\.gz|b64\.txt)$/.test(f)) fs.unlinkSync(D+f);
  const gz=zlib.gzipSync(Buffer.from(B),{level:9}); fs.writeFileSync(D+'base-'+h+'.b64.txt', gz.toString('base64'));
  { const sw=fs.readFileSync(D+'sw.js','utf8'); const yeni=sw.replace(/const BASE = '[^']+'/,"const BASE = 'base-"+h+".b64.txt'"); if(yeni!==sw) fs.writeFileSync(D+'sw.js',yeni); }
  fs.writeFileSync(__dirname+'/base.sqlite', Buffer.from(B)); fs.writeFileSync(__dirname+'/base.hash', h);
  console.log('ok', h, (B.length/1e6).toFixed(1)+'MB', (gz.length/1e6).toFixed(1)+'MB gz', (Date.now()-t)+'ms');
});
