// Gerçek SQL Server karşılaştırması için paket üretir: node mssql_gen.js <çıktı klasörü>
// - ddl.json: tabloların T-SQL tanımı (SQLP_TYPE ile) ve birincil anahtarları
// - beklenen.json: ders alıştırmaları, pratik görevleri ve Arena çözümlerinin T-SQL metni ile taklit motorun (tsql) sonucu
// PC'de mssql_kontrol.py base.sqlite'ı SQL Server'a yükler, her çözümü bir işlem içinde çalıştırıp geri alır ve karşılaştırır.
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'mssql_out'; fs.mkdirSync(OUT, { recursive: true });
const c = require('./load.js'); const initSqlJs = require('sql.js/dist/sql-asm.js'); const DX = c.SQLP_DIALECT;
{ const dc = [], tc = [], all = [], dt = [], nc=[]; for (const t of Object.keys(c.SQLP_COLMETA)) for (const [col, ty] of c.SQLP_COLMETA[t]) { all.push(col); if (/date/.test(ty)) dc.push(col); if (ty === 'datetime') dt.push(col); if (/^text/.test(ty)) tc.push(col); if(/^(money|dec|rate|coord|real)$|^decimal/.test(ty)) nc.push(col); else if(/^(int|bigint|bit)$/.test(ty)) nc.push('!'+col); } DX.setSchemaHints(dc, tc, all, dt, nc); }
require('vm').runInContext(fs.readFileSync(require('./yol.js').ROOT + 'arena-data.js', 'utf8'), c);
const p2 = x => String(x).padStart(2, '0');
function nv(v) { if (v === null || v === undefined) return null; if (typeof v === 'number') return Math.round(v * 1e6) / 1e6; return String(v); }
initSqlJs().then(SQL => {
  const BASE = require('./base.js')(SQL, c);
  const fresh = () => { const db = new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); return db; };
  // tablo tanımları
  const db0 = new SQL.Database(BASE);
  const tabs = db0.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values.map(r => r[0]);
  const ddl = {};
  for (const t of tabs) {
    const meta = c.SQLP_COLMETA[t] || []; const M = Object.fromEntries(meta.map(x => [x[0], x[1]]));
    const cols = db0.exec(`SELECT name, type FROM pragma_table_info('${t}')`)[0].values;
    const pk = meta.filter(x => x[3] === 'pk').map(x => x[0]);
    const def = cols.map(([n, st]) => { let ty = M[n] ? c.SQLP_TYPE(M[n], 'tsql') : (/INT/i.test(st) ? 'BIGINT' : /REAL/i.test(st) ? 'FLOAT' : 'NVARCHAR(400)'); if (/NVARCHAR\(MAX\)|TEXT/i.test(ty) && pk.includes(n)) ty = 'NVARCHAR(200)'; return '[' + n + '] ' + ty + (pk.includes(n) ? ' NOT NULL' : ''); });
    const ident = t === 'etl_dim_sube'; if (ident) def[0] = def[0].replace(/ NOT NULL$/, ' IDENTITY(1,1) NOT NULL');
    ddl[t] = { identity: ident || undefined, ddl: `CREATE TABLE [${t}] (${def.join(', ')}${pk.length ? ', PRIMARY KEY (' + pk.map(x => '[' + x + ']').join(', ') + ')' : ''})`, cols: cols.map(x => x[0]), types: cols.map(([n]) => (M[n] ? c.SQLP_TYPE(M[n], 'tsql') : '')) };
  }
  db0.close();
  fs.writeFileSync(path.join(OUT, 'ddl.json'), JSON.stringify(ddl));
  const exBase = e => e.base || 'sqlite', DIDS = DX.DIALECTS.map(d => d.id), exAllowed = e => e.dl || (exBase(e) === 'sqlite' ? DIDS : [exBase(e)]);
  const items = [];
  c.SQLP_LESSONS.forEach(l => (l.ex || []).forEach((e, i) => { if (e.t !== 'mc' && e.sol) items.push({ id: l.id + '#' + i, e }); }));
  c.SQLP_PRACTICE.forEach(p => { if (p.sol) items.push({ id: 'P:' + p.id, e: p }); });
  (c.SQLP_ARENA || { ch: [] }).ch.forEach(x => { if (x.sol) items.push({ id: 'A:' + x.id, e: { sol: x.sol, ord: x.ord } }); });
  const FL = process.env.FILTER ? new RegExp(process.env.FILTER) : null;
  const env = () => ({ procs: {}, funcs: {}, tvfs: {}, tran: 0, nocount: false });
  const out = []; let n = 0;
  for (const { id, e } of items) {
    if (FL && !FL.test(id)) continue;
    if (!exAllowed(e).includes('tsql') && !(e.solv && e.solv.tsql)) continue;
    const b = exBase(e); let text; try { text = (e.solv && e.solv.tsql) || (b === 'tsql' ? e.sol : b === 'sqlite' ? DX.forward(e.sol, 'tsql') : null); } catch (er) { text = null; }
    if (!text) continue;
    const db = fresh(); let r; try { r = DX.runDialect(db, text, 'tsql', { env: env() }); } catch (er) { r = { error: 'THROW ' + er.message }; }
    let set = r && r.sets && r.sets.length ? r.sets[r.sets.length - 1] : null; let check = null;
    if (!r.error && e.check) { if (/pragma_|sqlite_master|sqlite_schema/i.test(e.check)) { set = null; check = '__yapi__'; } else { try { set = db.exec(e.check).pop() || null; check = DX.forward(e.check, 'tsql'); } catch (er) { r.error = 'CHECK ' + er.message; } } }
    db.close();
    const rec = { id, sql: text, ord: !!e.ord || undefined, check: check || undefined, env: /\b(sys\.|msdb\.|GETDATE|SYSDATETIME|CURRENT_TIMESTAMP|NEWID|RAND\s*\(|@@SPID|@@SERVERNAME|DB_NAME|USER_NAME|SUSER_)/i.test(text) || undefined };
    if (r.error) rec.error = String(r.error).slice(0, 300); else if (set) { rec.cols = set.columns; rec.rows = set.values.map(x => x.map(nv)); }
    out.push(rec); n++;
  }
  fs.writeFileSync(path.join(OUT, 'beklenen.json'), JSON.stringify(out));
  console.log(JSON.stringify({ tablolar: tabs.length, madde: n, motorHata: out.filter(x => x.error).length, ortam: out.filter(x => x.env).length, check: out.filter(x => x.check).length }));
});
