/* Kesit SQL — "Kendi veritabanında çalış" paketleri.
   node araclar/paket/paket.js            → kökte veri/kesit-sql-<set>.zip (7 paket)
   Önce: cd araclar/denetim && npm install && node make_base.js  (base.sqlite)

   Her paket: SQL Server, PostgreSQL, MySQL ve Oracle için kurulum betiği, hazır SQLite dosyası, BENIOKU.md, DOGRULAMA.md.
   Sütun türleri uygulamanın Veri setleri sayfasındakiyle aynıdır (SQLP_COLMETA + SQLP_TYPE). Yabancı anahtarlar veriye
   uyuyorsa en sonda ALTER TABLE ile eklenir; uymayanlar (bilerek bırakılmış kirli veri) BENIOKU'da listelenir.
   Zip içeriği belirlenimcidir: veri değişmedikçe aynı dosya çıkar. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const DEN = path.join(__dirname, '..', 'denetim');
const c = require(path.join(DEN, 'load.js'));
const initSqlJs = require(path.join(DEN, 'node_modules/sql.js/dist/sql-asm.js'));
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'veri');
const M = c.SQLP_COLMETA, TYPE = c.SQLP_TYPE;

const SETLER = [
  { id: 'anadolu-market', ad: 'Anadolu Market (e-ticaret)', tablo: t => !t.includes('_') || ['order_items', 'price_updates', 'raw_signups', 'web_events', 'ab_test'].includes(t) },
  { id: 'ilgaz-bank', ad: 'Ilgaz Bank', tablo: t => t.startsWith('bank_') },
  { id: 'kanat-havayollari', ad: 'Kanat Havayolları', tablo: t => t.startsWith('hv_') },
  { id: 'lezzet-kurye', ad: 'Lezzet Kurye (yemek teslimatı)', tablo: t => t.startsWith('lk_') },
  { id: 'pusula-ik', ad: 'Pusula A.Ş. (insan kaynakları)', tablo: t => t.startsWith('ik_') },
  { id: 'pedal-izmir', ad: 'Pedal İzmir (bisiklet paylaşımı)', tablo: t => t.startsWith('bk_') },
  { id: 'operasyon', ad: 'Operasyon, sistem görünümleri ve ETL', tablo: t => /^(ops|sys|msdb|etl)_/.test(t) },
];
// Gerçek veritabanında elle doğrulanan paketler (DOGRULAMA.md'ye yazılır). Yeni doğrulama yapıldıkça buraya ekle.
const DOGRULANDI = {
  'anadolu-market': 'Windows\'ta doğrulandı (28 Kasım 2026, SQL Server, SSMS 18): `sqlserver.sql` hatasız kuruldu; aşağıdaki satır sayıları ve kontrol toplamlarının hepsi tuttu.',
};
const DL = [
  { id: 'tsql', dosya: 'sqlserver.sql', ad: 'SQL Server' },
  { id: 'pg', dosya: 'postgresql.sql', ad: 'PostgreSQL' },
  { id: 'mysql', dosya: 'mysql.sql', ad: 'MySQL' },
  { id: 'oracle', dosya: 'oracle.sql', ad: 'Oracle' },
];
const ORA_AYRILMIS = new Set('ACCESS ADD ALL ALTER AND ANY AS ASC AUDIT BETWEEN BY CHAR CHECK CLUSTER COLUMN COMMENT COMPRESS CONNECT CREATE CURRENT DATE DECIMAL DEFAULT DELETE DESC DISTINCT DROP ELSE EXCLUSIVE EXISTS FILE FLOAT FOR FROM GRANT GROUP HAVING IDENTIFIED IMMEDIATE IN INCREMENT INDEX INITIAL INSERT INTEGER INTERSECT INTO IS LEVEL LIKE LOCK LONG MAXEXTENTS MINUS MLSLABEL MODE MODIFY NOAUDIT NOCOMPRESS NOT NOWAIT NULL NUMBER OF OFFLINE ON ONLINE OPTION OR ORDER PCTFREE PRIOR PUBLIC RAW RENAME RESOURCE REVOKE ROW ROWID ROWNUM ROWS SELECT SESSION SET SHARE SIZE SMALLINT START SUCCESSFUL SYNONYM SYSDATE TABLE THEN TO TRIGGER UID UNION UNIQUE UPDATE USER VALIDATE VALUES VARCHAR VARCHAR2 VIEW WHENEVER WHERE WITH'.split(' '));
const q = (n, d) => d === 'tsql' ? '[' + n + ']' : d === 'mysql' ? '`' + n + '`' : d === 'oracle' ? '"' + n.toUpperCase() + '"' : '"' + n + '"';
const tn = (t, d) => (d === 'tsql' ? 'dbo.' : '') + q(t, d);
const sayi = v => { if (Number.isInteger(v)) return String(v); let s = String(+v.toPrecision(15)); if (/e/i.test(s)) s = v.toFixed(10).replace(/0+$/, '').replace(/\.$/, ''); return s; };
function lit(v, tip, d) {
  if (v === null || v === undefined) return 'NULL';
  if (tip === 'bit') return d === 'pg' ? (+v ? 'TRUE' : 'FALSE') : String(+v ? 1 : 0);
  if (typeof v === 'number') return sayi(v);
  let s = String(v).replace(/'/g, "''");
  if (d === 'mysql') s = s.replace(/\\/g, '\\\\');
  if (d === 'oracle' && tip === 'date') return "DATE '" + s.slice(0, 10) + "'";
  if (d === 'oracle' && tip === 'datetime') return "TIMESTAMP '" + s.replace('T', ' ') + "'";
  return (d === 'tsql' ? "N'" : "'") + s + "'";
}

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(DEN, 'base.sqlite')));
  const all = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0].values.map(r => r[0]);
  const idx = (db.exec("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")[0] || { values: [] }).values;
  const atanmamis = all.filter(t => !SETLER.some(s => s.tablo(t)));
  if (atanmamis.length) throw new Error('Pakete atanmamış tablo: ' + atanmamis.join(', '));
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sqlpaket-'));
  fs.mkdirSync(OUT, { recursive: true });
  const ozet = [];
  for (const S of SETLER) {
    const tablolar = all.filter(S.tablo);
    const kok = path.join(tmp, 'kesit-sql-' + S.id); fs.mkdirSync(kok, { recursive: true });
    // yabancı anahtarlar: hedef pakette mi, veri uyuyor mu?
    const fk = [], fkUymayan = [];
    for (const t of tablolar) for (const col of M[t]) {
      if (!col[3] || !col[3].startsWith('fk:')) continue;
      const [ht, hc] = col[3].slice(3).split('.');
      if (!tablolar.includes(ht)) { fkUymayan.push({ t, c: col[0], ht, hc, neden: 'hedef tablo başka pakette' }); continue; }
      const yetim = db.exec(`SELECT COUNT(*) FROM "${t}" a WHERE a."${col[0]}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "${ht}" b WHERE b."${hc}" = a."${col[0]}")`)[0].values[0][0];
      (yetim ? fkUymayan : fk).push({ t, c: col[0], ht, hc, yetim, neden: yetim ? yetim + ' satırın karşılığı yok (bilerek bırakılmış veri)' : '' });
    }
    const satir = {}; tablolar.forEach(t => { satir[t] = db.exec(`SELECT COUNT(*) FROM "${t}"`)[0].values[0][0]; });
    for (const D of DL) {
      const d = D.id, out = [];
      const yaz = s => out.push(s);
      yaz(`-- Kesit SQL · ${S.ad} · ${D.ad} kurulum betiği\n-- Boş bir veritabanında çalıştır. Tablolar: ${tablolar.join(', ')}\n-- Kaynak: https://ysfdurak.github.io/kesit-sql/ · Veri ve içerik CC BY-NC 4.0 (bkz. LICENSE-ICERIK.md)\n`);
      if (d === 'tsql') yaz('SET NOCOUNT ON;\nGO');
      if (d === 'mysql') yaz('SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;');
      if (d === 'oracle') yaz('SET DEFINE OFF\nALTER SESSION SET NLS_LENGTH_SEMANTICS = CHAR;');
      if (d === 'pg') yaz('BEGIN;');
      for (const t of tablolar) {
        const meta = M[t]; const pk = meta.filter(x => x[3] === 'pk').map(x => x[0]);
        const cols = meta.map(([n, ty]) => '    ' + q(n, d) + ' ' + TYPE(ty, d));
        if (pk.length) cols.push('    PRIMARY KEY (' + pk.map(x => q(x, d)).join(', ') + ')');
        yaz('\nCREATE TABLE ' + tn(t, d) + ' (\n' + cols.join(',\n') + '\n)' + (d === 'mysql' ? ' DEFAULT CHARSET = utf8mb4' : '') + ';' + (d === 'tsql' ? '\nGO' : ''));
      }
      for (const t of tablolar) {
        const meta = M[t], names = meta.map(x => x[0]), tips = meta.map(x => x[1]);
        const res = db.exec(`SELECT ${names.map(n => '"' + n + '"').join(', ')} FROM "${t}" ORDER BY rowid`)[0];
        if (!res) continue;
        const B = d === 'oracle' ? 200 : d === 'tsql' ? 1000 : 1000;
        const head = 'INSERT INTO ' + tn(t, d) + ' (' + names.map(n => q(n, d)).join(', ') + ') VALUES';
        yaz('\n-- ' + t + ': ' + res.values.length + ' satır');
        for (let i = 0; i < res.values.length; i += B) {
          const parca = res.values.slice(i, i + B).map(r => '(' + r.map((v, j) => lit(v, tips[j], d)).join(', ') + ')');
          if (d === 'oracle') yaz('INSERT ALL\n' + parca.map(p => '  INTO ' + tn(t, d) + ' (' + names.map(n => q(n, d)).join(', ') + ') VALUES ' + p).join('\n') + '\nSELECT 1 FROM DUAL;');
          else yaz(head + '\n' + parca.join(',\n') + ';' + (d === 'tsql' ? '\nGO' : ''));
        }
      }
      if (d === 'oracle') yaz('COMMIT;');
      const ix = idx.filter(r => tablolar.includes(r[1]));
      if (ix.length) {
        yaz('\n-- İndeksler');
        for (const [ad, t, sql] of ix) { const m = sql.match(/\(([^)]*)\)\s*$/); if (!m) continue; const kolon = m[1].split(',').map(s => s.trim().replace(/"/g, '').split(/\s+/)[0]); yaz('CREATE ' + (/UNIQUE/i.test(sql) ? 'UNIQUE ' : '') + 'INDEX ' + q(ad.slice(0, 30), d) + ' ON ' + tn(t, d) + ' (' + kolon.map(k => q(k, d)).join(', ') + ');' + (d === 'tsql' ? '\nGO' : '')); }
      }
      if (fk.length) {
        yaz('\n-- Yabancı anahtarlar (veriye uyanlar)');
        fk.forEach((f, i) => yaz('ALTER TABLE ' + tn(f.t, d) + ' ADD CONSTRAINT ' + q(('fk_' + f.t + '_' + f.c).slice(0, 30), d) + ' FOREIGN KEY (' + q(f.c, d) + ') REFERENCES ' + tn(f.ht, d) + ' (' + q(f.hc, d) + ');' + (d === 'tsql' ? '\nGO' : '')));
      }
      if (d === 'mysql') yaz('\nSET FOREIGN_KEY_CHECKS = 1;');
      if (d === 'pg') yaz('\nCOMMIT;');
      yaz('\n-- Kontrol: DOGRULAMA.md içindeki satır sayılarıyla karşılaştır.\n' + tablolar.map(t => 'SELECT ' + (d === 'oracle' ? "'" + t + "' AS tablo" : "'" + t + "' AS tablo") + ', COUNT(*) AS satir FROM ' + tn(t, d)).join('\nUNION ALL\n') + (d === 'oracle' ? ';' : ';'));
      fs.writeFileSync(path.join(kok, D.dosya), out.join('\n') + '\n');
    }
    // hazır SQLite dosyası: yalnız bu paketin tabloları
    const sq = new SQL.Database();
    for (const t of tablolar) {
      sq.run(db.exec(`SELECT sql FROM sqlite_master WHERE name='${t}'`)[0].values[0][0]);
      const r = db.exec(`SELECT * FROM "${t}"`)[0]; if (!r) continue;
      const st = sq.prepare(`INSERT INTO "${t}" VALUES (${r.columns.map(() => '?').join(',')})`); sq.run('BEGIN'); r.values.forEach(v => st.run(v)); sq.run('COMMIT'); st.free();
    }
    idx.filter(r => tablolar.includes(r[1])).forEach(r => { try { sq.run(r[2]); } catch (e) {} });
    fs.writeFileSync(path.join(kok, 'kesit-sql-' + S.id + '.sqlite'), Buffer.from(sq.export())); sq.close();
    const ilk = t => { const m = M[t].find(x => ['money', 'int', 'real', 'dec', 'bigint'].includes(x[1]) && x[3] !== 'pk' && !(x[3] || '').startsWith('fk:')); if (!m) return null; const v = db.exec(`SELECT ROUND(SUM("${m[0]}"), 2) FROM "${t}"`)[0].values[0][0]; return { c: m[0], v }; };
    fs.writeFileSync(path.join(kok, 'DOGRULAMA.md'), `# ${S.ad}: kontrol değerleri\n\n${DOGRULANDI[S.id] ? '**Doğrulama durumu:** ' + DOGRULANDI[S.id] + '\n\n' : ''}Kurulumdan sonra her betiğin sonundaki satır sayısı sorgusunu çalıştır ve bu tabloyla karşılaştır. Toplam sütunu ondalık türlerin doğru yüklendiğini gösterir.\n\n| Tablo | Satır | Kontrol toplamı |\n|---|---:|---|\n` + tablolar.map(t => { const k = ilk(t); return '| ' + t + ' | ' + satir[t] + ' | ' + (k ? '`SUM(' + k.c + ')` = ' + k.v : '') + ' |'; }).join('\n') + '\n');
    const oraAyr = []; tablolar.forEach(t => M[t].forEach(x => { if (ORA_AYRILMIS.has(x[0].toUpperCase())) oraAyr.push(t + '.' + x[0]); }));
    const fkMetin = fkUymayan.length ? fkUymayan.map(f => '- `' + f.t + '.' + f.c + '` → `' + f.ht + '.' + f.hc + '`: ' + f.neden).join('\n') : '- Yok: bütün ilişkiler yabancı anahtar olarak kuruldu.';
    fs.writeFileSync(path.join(kok, 'BENIOKU.md'), `# ${S.ad} · Kesit SQL veri paketi

Kesit SQL'deki derslerin ve alıştırmaların bu bölümünü **kendi veritabanında** çalışmak için. Tablolar ve sütun türleri uygulamanın Veri setleri sayfasındakiyle aynıdır.

## İçindekiler

| Dosya | Ne için |
|---|---|
| \`sqlserver.sql\` | SQL Server (SSMS, Azure Data Studio, sqlcmd) |
| \`postgresql.sql\` | PostgreSQL (psql, pgAdmin, DBeaver) |
| \`mysql.sql\` | MySQL 8 (MySQL Workbench, mysql istemcisi) |
| \`oracle.sql\` | Oracle 19c ve üstü (SQL Developer, SQL*Plus) |
| \`kesit-sql-${S.id}.sqlite\` | Kurulumsuz: DB Browser for SQLite, DBeaver ya da Python \`sqlite3\` ile doğrudan aç |
| \`DOGRULAMA.md\` | Kurulumdan sonra karşılaştıracağın satır sayıları ve kontrol toplamları |

${tablolar.length} tablo, ${Object.values(satir).reduce((a, b) => a + b, 0).toLocaleString('tr-TR')} satır.

## Kurulum

1. **Boş bir veritabanı** oluştur (ör. \`CREATE DATABASE kesit;\`). Betikler tabloları siler değil, yeniden oluşturur; aynı veritabanında ikinci kez çalıştırırsan "tablo zaten var" hatası alırsın.
2. Betiği çalıştır:
   - SQL Server: \`sqlcmd -S localhost -d kesit -i sqlserver.sql\` (büyük dosyayı SSMS'te açmak yerine sqlcmd daha hızlıdır). Türkçe sıralama için veritabanını \`Turkish_CI_AS\` harmanlamasıyla oluştur.
   - PostgreSQL: \`psql -d kesit -f postgresql.sql\`
   - MySQL: \`mysql kesit < mysql.sql\`. Türkçe karşılaştırma için \`CREATE DATABASE kesit CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_ai_ci;\`
   - Oracle: SQL*Plus ya da SQL Developer'da \`@oracle.sql\`. Tablo ve sütun adları büyük harfle tanımlıdır; sorgularda tırnaksız yazabilirsin. Ayrılmış sözcük olan sütun adlarını (varsa) çift tırnakla ve büyük harfle yaz.
3. Betiğin sonundaki satır sayısı sorgusunu çalıştır, [DOGRULAMA.md](DOGRULAMA.md) ile karşılaştır.

## Derslerle birlikte

Uygulamada her dersin konu sayfasında **Kendi veritabanında çalış** bölümü var: o dersin görev kâğıdını (.md) seçtiğin SQL türünde indirirsin. Her görevin sorusu ve beklenen sonuç tablosu yazılıdır, çözümler en sondadır.

## Bilinen farklar

- Uygulama SQLite üzerinde çalışan bir taklit motordur. Sıralaması belirtilmemiş sorgularda satır sırası ve ondalık gösterim veritabanına göre değişebilir; tutarlar aynı olmalıdır.
- Oracle'da boş metin ('') NULL sayılır; boş metin içeren satırlar Oracle'da NULL olarak yüklenir.
${oraAyr.length ? '- Oracle\'da ayrılmış sözcük olan sütunlar (sorguda "BÜYÜK" harf ve çift tırnakla yaz): ' + oraAyr.map(x => '`' + x + '`').join(', ') + '\n' : ''}- Yabancı anahtar olarak kurulmayan ilişkiler:
${fkMetin}

Kaynak: [Kesit SQL](https://ysfdurak.github.io/kesit-sql/) · Yusuf Durak. Veri ve içerik CC BY-NC 4.0, kod PolyForm Shield 1.0.0.
`);
    for (const f of ['LICENSE-ICERIK.md']) { const p = path.join(ROOT, f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(kok, f)); }
    const zip = path.join(OUT, 'kesit-sql-' + S.id + '.zip');
    cp.execFileSync('python3', ['-c', `
import zipfile, os, sys
kok, zp = sys.argv[1], sys.argv[2]
ad = os.path.basename(kok)
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(os.listdir(kok)):
        zi = zipfile.ZipInfo(ad + '/' + f, date_time=(2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
        z.writestr(zi, open(os.path.join(kok, f), 'rb').read(), compresslevel=9)
`, kok, zip]);
    ozet.push({ id: S.id, ad: S.ad, tablo: tablolar.length, satir: Object.values(satir).reduce((a, b) => a + b, 0), boyut: fs.statSync(zip).size, fkKurulmayan: fkUymayan.length });
    console.log(S.id, tablolar.length, 'tablo', (fs.statSync(zip).size / 1e6).toFixed(2) + ' MB', 'FK', fk.length, 'kurulmayan', fkUymayan.length);
  }
  fs.writeFileSync(path.join(OUT, 'paketler.json'), JSON.stringify(ozet, null, 2) + '\n');
  fs.rmSync(tmp, { recursive: true, force: true });
})();
