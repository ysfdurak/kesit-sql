/* Depo vakası (vaka/depo/): sayfadaki çözüm, gömülü ham veride beklenen özeti veriyor mu? (sql.js, sitedeki motor) */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=root+'/vaka/depo',html=fs.readFileSync(dir+'/index.html','utf8');
const ham=JSON.parse(html.match(/const HAM=(\{.*?\});const BEK=/s)[1]),cozum=JSON.parse(html.match(/;const COZUM=("(?:[^"\\]|\\.)*")/)[1]);
const bek=JSON.parse(fs.readFileSync(dir+'/beklenen.json','utf8')).sql;
require(root+'/vendor/sql-asm.js')().then(SQL=>{const db=new SQL.Database();
 db.run('CREATE TABLE toplama_ham (satir_id INTEGER, tarih TEXT, vardiya TEXT, bolge TEXT, duzen TEXT, toplayici TEXT, sure_sn REAL)');
 const st=db.prepare('INSERT INTO toplama_ham VALUES (?,?,?,?,?,?,?)');for(const r of ham.rows)st.run(r);st.free();
 assert.equal(ham.rows.length,bek.eleme.ham);const rs=db.exec(cozum),son=rs[rs.length-1];
 assert.deepEqual(son.values,bek.ozet_sonuc,'özet');
 assert.equal(db.exec('SELECT COUNT(*) FROM toplama_temiz')[0].values[0][0],bek.eleme.temiz,'temiz satır');
 console.log(JSON.stringify({vaka:'depo',ham:ham.rows.length,temiz:bek.eleme.temiz,ozet:son.values}));});
