// Sorgu Optimizasyonu derslerindeki PostgreSQL plan çıktılarını gerçek motorla (PGlite) üretir ve kökteki plan-ciktilari.js dosyasına yazar.
// Elle yazılmış plan çıktısı olmasın diye vardır. Sorgular: opt_sorgular.json. Ayarlar: enable_seqscan açık (PGlite varsayılanı kapalıdır, gerçek PostgreSQL'de açıktır).
// node opt_cikti.mjs            dosyayı yeniden yazar
// node opt_cikti.mjs --denetle  dosyayı yazmaz, işlem türleri ve gerçek satır sayıları aynı mı diye bakar. Beklenen: FARK 0
// Tahmini satır ve maliyet örneklemeyle değişebildiği için denetimde karşılaştırılmaz.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url'; import {createRequire} from 'module';
const here=path.dirname(fileURLToPath(import.meta.url)); process.chdir(here); const require=createRequire(import.meta.url);
const ROOT=path.join(here,'../../'); const {PGlite}=await import('@electric-sql/pglite');
const SPEC=JSON.parse(fs.readFileSync('opt_sorgular.json','utf8')); const denetle=process.argv.includes('--denetle');
const tar=fs.readFileSync('pg_taban.tgz');
const BOLUM=`CREATE TABLE tx_bolum (LIKE bank_txns) PARTITION BY RANGE (txn_time);
CREATE TABLE tx_2024q1 PARTITION OF tx_bolum FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE tx_2024q2 PARTITION OF tx_bolum FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE tx_2024q3 PARTITION OF tx_bolum FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE tx_2024q4 PARTITION OF tx_bolum FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
INSERT INTO tx_bolum SELECT * FROM bank_txns; VACUUM ANALYZE tx_bolum;`;
const pg=await PGlite.create({loadDataDir:new Blob([tar])});
await pg.exec('SET enable_seqscan = on'); await pg.exec('VACUUM ANALYZE');
const surum=(await pg.query('SELECT version()')).rows[0].version.replace(/ on .*/,'');
const out={};
for(const [key,s] of Object.entries(SPEC)){
  await pg.exec('BEGIN');
  if(s.bolum) await pg.exec(BOLUM.replace(/VACUUM ANALYZE tx_bolum;/,'ANALYZE tx_bolum;'));
  if(s.bayat){ await pg.exec("CREATE TABLE tx_kopya AS SELECT * FROM bank_txns; CREATE INDEX ix_kopya_hesap ON tx_kopya (account_id); ANALYZE tx_kopya; UPDATE tx_kopya SET account_id = 100019 WHERE txn_type = 'kart_harcama';"); if(s.analyze) await pg.exec('ANALYZE '+s.analyze); }
  if(s.kur){ await pg.exec(s.kur); const m=s.kur.match(/ON (\w+)/); if(m) await pg.exec('ANALYZE '+m[1]); }
  const E='EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF) '+s.q;
  await pg.query(E); /* ilk çalıştırma önbelleği ısıtır; ikincisi yazılır */
  const r=await pg.query(E); let L=r.rows.map(x=>x['QUERY PLAN']); const pi=L.findIndex(x=>/^Planning:/.test(x)); if(pi>=0) L=L.slice(0,pi);
  out[key]={q:s.q, kur:s.kur||'', cikti:L.join('\n')};
  await pg.exec('ROLLBACK');
}
const yap=t=>t.split('\n').map(l=>{ const m=l.match(/^\s*(?:->\s*)?([A-Z][A-Za-z ]+?)(?:\s+(?:on|using)\s[^(]*)?\s*\(cost.*?\(actual rows=(\d+) loops=(\d+)\)/); return m?m[1]+'#'+m[2]+'x'+m[3]:null; }).filter(Boolean).join(' > ');
const F=ROOT+'plan-ciktilari.js';
if(denetle){ const c={}; new Function('window',fs.readFileSync(F,'utf8'))(c); let fark=0; for(const k of Object.keys(SPEC)){ const a=c.SQLP_PLAN.q[k]; const y1=a?yap(a.cikti):'yok', y2=yap(out[k].cikti); if(y1!==y2){ fark++; console.log('FARK',k,'\n  dosya :',y1,'\n  motor :',y2); } } for(const k of Object.keys(c.SQLP_PLAN.q)) if(!SPEC[k]){ fark++; console.log('FAZLA',k); } console.log('sorgu',Object.keys(SPEC).length,'FARK',fark); process.exit(fark?1:0); }
const js='/* Üretilen dosya: araclar/denetim/opt_cikti.mjs. Elle düzenleme. Çıktılar gerçek motordan geldi. */\nwindow.SQLP_PLAN='+JSON.stringify({surum,q:out},null,0)+';\n';
fs.writeFileSync(F,js); for(const k in out){ console.log('\n>> '+k+'\n'+out[k].cikti); } console.log('\nyazildi',F,surum);
process.exit(0);
