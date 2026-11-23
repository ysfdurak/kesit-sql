// Gerçek PostgreSQL / MySQL / Oracle karşılaştırması için paket üretir: node db_gen.js <çıktı klasörü> <pg|mysql|oracle>
// - ddl_<d>.json: tablo tanımları (SQLP_TYPE ile), sütun türleri, birincil anahtar
// - beklenen_<d>.json: ders, pratik ve Arena çözümlerinin o türdeki metni (ifadelere bölünmüş) ile taklit motorun sonucu
// PC'de db_karsilastir.py veriyi sunucuya yükler, her çözümü çalıştırır, değişiklikleri geri alır ve karşılaştırır.
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'db_out'; const D = process.argv[3] || 'pg'; const TR = process.argv[4] === 'tr'; fs.mkdirSync(OUT, { recursive: true });
// 3. argüman 'tr': PostgreSQL Turkish_Türkiye.1254 / MySQL utf8mb4_tr_0900_ai_ci; yoksa C / utf8mb4_0900_ai_ci
if (!['pg', 'mysql', 'oracle'].includes(D)) { console.error('tür: pg, mysql ya da oracle'); process.exit(1); }
const c = require('./load.js'); const initSqlJs = require('sql.js/dist/sql-asm.js'); const DX = c.SQLP_DIALECT;
const KOLL = D === 'pg' ? (TR ? 'Turkish_Türkiye.1254' : 'C') : D === 'mysql' ? (TR ? 'utf8mb4_tr_0900_ai_ci' : 'utf8mb4_0900_ai_ci') : 'BINARY'; if (D !== 'oracle') DX.setCollation(KOLL, D);
{ const dc = [], tc = [], all = [], dt = [], nc = []; for (const t of Object.keys(c.SQLP_COLMETA)) for (const [col, ty] of c.SQLP_COLMETA[t]) { all.push(col); if (/date/.test(ty)) dc.push(col); if (ty === 'datetime') dt.push(col); if (/^text/.test(ty)) tc.push(col); if (/^(money|dec|rate|coord|real)$|^decimal/.test(ty)) nc.push(col + ({ money: ':2', dec: ':2', rate: ':4', coord: ':6' }[ty] || (/,\s*(\d+)\)/.test(ty) ? ':' + ty.match(/,\s*(\d+)\)/)[1] : ''))); else if (/^(int|bigint|bit)$/.test(ty)) nc.push('!' + col); } DX.setSchemaHints(dc, tc, all, dt, nc); }
require('vm').runInContext(fs.readFileSync(require('./yol.js').ROOT + 'arena-data.js', 'utf8'), c);
// Oracle: tırnaklı BÜYÜK harf ad, tırnaksız yazılan addaki gibi davranır (ayrılmış sözcük sütunları da kurulabilir)
const q = n => D === 'pg' ? '"' + n + '"' : D === 'oracle' ? '"' + n.toUpperCase() + '"' : '`' + n + '`';
function nv(v) { if (v === null || v === undefined) return null; if (typeof v === 'number') return Math.round(v * 1e6) / 1e6; return String(v); }
const ENV = D === 'oracle' ? /\b(SYSDATE|SYSTIMESTAMP|CURRENT_DATE|CURRENT_TIMESTAMP|LOCALTIMESTAMP|DBMS_RANDOM|SYS_GUID|USER\b|SYS_CONTEXT|V\$\w+|(ALL|USER|DBA)_(TABLES|TAB_COLUMNS|OBJECTS|INDEXES|CONSTRAINTS|VIEWS|SOURCE|USERS|IND_COLUMNS|CONS_COLUMNS|SEQUENCES|TRIGGERS|PROCEDURES)|EXPLAIN|DBMS_XPLAN|FLASHBACK|AS\s+OF\s+(TIMESTAMP|SCN)|ORA_ROWSCN)\b/i
  : D === 'pg' ? /\b(now\s*\(|current_date|current_timestamp|localtimestamp|random\s*\(|gen_random_uuid|pg_catalog|pg_stat|information_schema|current_user|session_user|version\s*\(|clock_timestamp|statement_timestamp|pg_size|pg_relation|EXPLAIN)\b/i
  : /\b(NOW\s*\(|CURDATE|CURRENT_DATE|CURRENT_TIMESTAMP|SYSDATE|RAND\s*\(|UUID|information_schema|performance_schema|DATABASE\s*\(|USER\s*\(|VERSION\s*\(|CONNECTION_ID|EXPLAIN|SHOW\s)/i;
/* Oracle ifadeleri: PL/SQL bloğu (DECLARE/BEGIN/CREATE PROCEDURE...) kendi END;'ine kadar tek parçadır ve sonundaki ; kalır;
   düz SQL'de sonundaki ; atılır (sürücü kabul etmez). Dize ve yorumlar atlanır; BEGIN ve CASE derinliği artırır, END IF/LOOP/CASE
   dışındaki END azaltır. */
function splitOracle(sql) {
  const out = []; let i = 0, st = 0, depth = 0, block = null; const n = sql.length;
  const head = t => /^\s*(DECLARE|BEGIN|CREATE\s+(OR\s+REPLACE\s+)?(EDITIONABLE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE\s+BODY))\b/i.test(t.replace(/^(\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, ''));
  const push = (a, b, keep) => { let t = sql.slice(a, b).replace(/^\s*\/\s*$/gm, '').trim(); if (!keep) t = t.replace(/;\s*$/, '').trim(); if (t && /[A-Za-z]/.test(t.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ''))) out.push(t); };
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") { i++; while (i < n && !(sql[i] === "'" && sql[i + 1] !== "'")) i += sql[i] === "'" ? 2 : 1; i++; continue; }
    if (ch === '"') { const e = sql.indexOf('"', i + 1); i = e < 0 ? n : e + 1; continue; }
    if (ch === '-' && sql[i + 1] === '-') { i = sql.indexOf('\n', i); if (i < 0) i = n; continue; }
    if (ch === '/' && sql[i + 1] === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (block === null) block = head(sql.slice(st));
    if (/[A-Za-z_]/.test(ch) && !/[A-Za-z0-9_$#]/.test(sql[i - 1] || '')) {
      const w = sql.slice(i).match(/^[A-Za-z_][A-Za-z0-9_$#]*/)[0].toUpperCase();
      if (block) { if (w === 'BEGIN' || w === 'CASE') depth++; else if (w === 'END') { const nx = sql.slice(i + 3).match(/^\s*([A-Za-z_]+)/); if (!nx || !['IF', 'LOOP', 'CASE'].includes(nx[1].toUpperCase())) depth--; } }
      i += w.length; continue;
    }
    if (ch === ';' && (!block || depth <= 0)) { push(st, i + 1, block); st = i + 1; block = null; depth = 0; }
    i++;
  }
  push(st, n, block);
  return out;
}
/* PostgreSQL: çözümün kendi işlem komutları dış işlemi bozmasın diye kayıt noktasına çevrilir */
const txPg = s => { const st = s.trim().replace(/;$/, '').trim(); if (/^(BEGIN(\s+TRANSACTION)?|START\s+TRANSACTION)$/i.test(st)) return 'SAVEPOINT kx_tx'; if (/^(COMMIT|END)(\s+TRANSACTION)?$/i.test(st)) return 'RELEASE SAVEPOINT kx_tx'; if (/^ROLLBACK(\s+TRANSACTION)?$/i.test(st)) return 'ROLLBACK TO SAVEPOINT kx_tx'; return s; };
initSqlJs().then(SQL => {
  let BASE = require('./base.js')(SQL, c);
  /* Oracle taklidi her yeni veritabanında boş metinleri NULL'a çevirir (Oracle '' = NULL); bunu bir kez yapıp tabanı saklamak
     her maddede ~1 sn kazandırır. Gerçek Oracle'a yüklenen veri de aynı biçime döner. */
  if (D === 'oracle') { const d0 = new SQL.Database(BASE); c.SQLP_REGISTER(d0); DX.register(d0); DX.runDialect(d0, 'SELECT 1 FROM dual', 'oracle', { env: { procs: {}, funcs: {}, tvfs: {}, tran: 0, nocount: false } }); BASE = d0.export(); d0.close(); }
  const fresh = () => { const db = new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); if (D === 'oracle') db.__oraBlank = true; return db; };
  const db0 = new SQL.Database(BASE);
  const tabs = db0.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values.map(r => r[0]);
  const ddl = {};
  for (const t of tabs) {
    const meta = c.SQLP_COLMETA[t] || []; const M = Object.fromEntries(meta.map(x => [x[0], x[1]]));
    const cols = db0.exec(`SELECT name, type FROM pragma_table_info('${t}')`)[0].values;
    const pk = meta.filter(x => x[3] === 'pk').map(x => x[0]);
    const types = cols.map(([n, st]) => M[n] ? c.SQLP_TYPE(M[n], D) : D === 'oracle' ? (/INT/i.test(st) ? 'NUMBER(19)' : /REAL/i.test(st) ? 'BINARY_DOUBLE' : 'VARCHAR2(4000)') : (/INT/i.test(st) ? 'BIGINT' : /REAL/i.test(st) ? (D === 'pg' ? 'DOUBLE PRECISION' : 'DOUBLE') : (D === 'pg' ? 'TEXT' : 'TEXT')));
    const def = cols.map(([n], i) => { let ty = types[i]; if (D === 'mysql' && /^TEXT$/i.test(ty) && pk.includes(n)) ty = 'VARCHAR(200)'; const id = t === 'etl_dim_sube' && i === 0; let s = q(n) + ' ' + ty + (id && D !== 'mysql' ? ' GENERATED BY DEFAULT AS IDENTITY' : '') + (pk.includes(n) ? ' NOT NULL' : '') + (id && D === 'mysql' ? ' AUTO_INCREMENT' : ''); return s; });
    ddl[t] = { ddl: `CREATE TABLE ${q(t)} (${def.join(', ')}${pk.length ? ', PRIMARY KEY (' + pk.map(q).join(', ') + ')' : ''})`, cols: cols.map(x => x[0]), types, pk, identity: t === 'etl_dim_sube' || undefined };
  }
  db0.close();
  fs.writeFileSync(path.join(OUT, 'ddl_' + D + '.json'), JSON.stringify(ddl));
  const exBase = e => e.base || 'sqlite', DIDS = DX.DIALECTS.map(x => x.id), exAllowed = e => e.dl || (exBase(e) === 'sqlite' ? DIDS : [exBase(e)]);
  const items = [];
  c.SQLP_LESSONS.forEach(l => (l.ex || []).forEach((e, i) => { if (e.t !== 'mc' && e.sol) items.push({ id: l.id + '#' + i, e }); }));
  c.SQLP_PRACTICE.forEach(p => { if (p.sol) items.push({ id: 'P:' + p.id, e: p }); });
  (c.SQLP_ARENA || { ch: [] }).ch.forEach(x => { if (x.sol) items.push({ id: 'A:' + x.id, e: { sol: x.sol, ord: x.ord } }); });
  const FL = process.env.FILTER ? new RegExp(process.env.FILTER) : null;
  const env = () => ({ procs: {}, funcs: {}, tvfs: {}, tran: 0, nocount: false });
  const out = []; let n = 0;
  for (const { id, e } of items) {
    if (FL && !FL.test(id)) continue;
    if (!exAllowed(e).includes(D) && !(e.solv && e.solv[D])) continue;
    const b = exBase(e); let text; try { text = (e.solv && e.solv[D]) || (b === D ? e.sol : b === 'sqlite' ? DX.forward(e.sol, D) : null); } catch (er) { text = null; }
    if (!text) continue;
    if (process.env.IZ) process.stderr.write(id + "\n"); const t0 = Date.now(); const db = fresh(); let r; try { r = DX.runDialect(db, text, D, { env: env() }); } catch (er) { r = { error: 'THROW ' + er.message }; }
    let set = r && r.sets && r.sets.length ? r.sets[r.sets.length - 1] : null; let check = null;
    if (!r.error && e.check) { if (/pragma_|sqlite_master|sqlite_schema/i.test(e.check)) { set = null; check = '__yapi__'; } else { try { set = db.exec(e.check).pop() || null; check = DX.forward(e.check, D); } catch (er) { r.error = 'CHECK ' + er.message; } } }
    db.close(); if (process.env.IZ) process.stderr.write("  " + (Date.now() - t0) + "ms\n");
    let parts = D === 'oracle' ? splitOracle(text) : DX.splitSemis(text); if (D === 'pg') parts = parts.map(txPg);
    const rec = { id, sql: text, parts, ord: !!e.ord || undefined, check: check || undefined, env: ENV.test(text) || undefined };
    if (r.error) rec.error = String(r.error).slice(0, 300); else if (set) { rec.cols = set.columns; rec.rows = set.values.map(x => x.map(nv)); }
    out.push(rec); n++;
  }
  fs.writeFileSync(path.join(OUT, 'beklenen_' + D + (TR ? '_tr' : '') + '.json'), JSON.stringify(out));
  console.log(JSON.stringify({ tur: D, harmanlama: KOLL, tablolar: tabs.length, madde: n, motorHata: out.filter(x => x.error).length, ortam: out.filter(x => x.env).length, check: out.filter(x => x.check).length }));
});
