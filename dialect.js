/* Kesit SQL — lehçe motoru
   - forward(sql, d): kanonik (SQLite) sorguyu hedef programın yazımına çevirir (gösterim için)
   - runDialect(db, sql, d, opt): hedef programda yazılmış sorguyu denetler, SQLite'a çevirir ve
     o programın davranış farklarını taklit ederek çalıştırır (T-SQL için küçük bir yorumlayıcı içerir) */
(function (root) {
'use strict';

const DIALECTS = [
  { id: 'tsql', name: 'SQL Server', lang: 'T-SQL', short: 'SQL Server' },
  { id: 'pg', name: 'PostgreSQL', lang: 'PostgreSQL', short: 'PostgreSQL' },
  { id: 'mysql', name: 'MySQL', lang: 'MySQL', short: 'MySQL' },
  { id: 'oracle', name: 'Oracle', lang: 'PL/SQL', short: 'Oracle' },
  { id: 'bq', name: 'BigQuery', lang: 'GoogleSQL', short: 'BigQuery' },
  { id: 'sqlite', name: 'SQLite', lang: 'SQLite', short: 'SQLite' }
];
const DNAME = {}; DIALECTS.forEach(d => DNAME[d.id] = d.name);

/* Şema bilgisinden gelen ipuçları (tarih ve metin sütunları) */
let DATE_COLS = new Set(['order_date', 'signup_date', 'hire_date', 'event_time', 'updated_at', 'start_date', 'valid_from', 'valid_to', 'created_at', 'ilk_tarih', 'gun', 'tarih']);
let DT_COLS = new Set(['event_time', 'updated_at', 'created_at']);
let TEXT_COLS = new Set(['first_name', 'last_name', 'name', 'city', 'email', 'category', 'status', 'channel', 'segment', 'title', 'gender', 'full_name', 'event_type', 'device', 'variant', 'owner']);

/* ------------------------------------------------------------------ Tokenizer */
function strEnd(s, i) { let j = i + 1; while (j < s.length) { if (s[j] === "'") { if (s[j + 1] === "'") { j += 2; continue; } return j + 1; } j++; } return s.length; }
const WORD0 = /[A-Za-z_À-ɏİı]/, WORDC = /[A-Za-z0-9_$À-ɏİı]/;
function tokenize(s) {
  const T = []; let i = 0; const n = s.length;
  const push = (k, v, x) => { const t = { k, v }; if (k === 'w') t.u = v.toUpperCase(); if (x) Object.assign(t, x); T.push(t); };
  while (i < n) {
    const c = s[i], c2 = s.slice(i, i + 2);
    if (/\s/.test(c)) { let j = i; while (j < n && /\s/.test(s[j])) j++; push('ws', s.slice(i, j)); i = j; continue; }
    if (c2 === '--') { let j = s.indexOf('\n', i); if (j < 0) j = n; push('com', s.slice(i, j)); i = j; continue; }
    if (c2 === '/*') { let j = s.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; push('com', s.slice(i, j)); i = j; continue; }
    if ((c === 'N' || c === 'n') && s[i + 1] === "'" && !(i > 0 && WORDC.test(s[i - 1]))) { const j = strEnd(s, i + 1); push('s', s.slice(i + 1, j), { np: true }); i = j; continue; }
    if (c === "'") { const j = strEnd(s, i); push('s', s.slice(i, j)); i = j; continue; }
    if (c === '"') { let j = i + 1; while (j < n) { if (s[j] === '"') { if (s[j + 1] === '"') { j += 2; continue; } j++; break; } j++; } push('q', s.slice(i, j)); i = j; continue; }
    if (c === '[') { let j = s.indexOf(']', i); j = j < 0 ? n : j + 1; push('q', s.slice(i, j)); i = j; continue; }
    if (c === '`') { let j = s.indexOf('`', i + 1); j = j < 0 ? n : j + 1; push('q', s.slice(i, j)); i = j; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || '') && !(T.length && /[\w)\]"]$/.test(T[T.length - 1].v)))) {
      let j = i; while (j < n && /[0-9.]/.test(s[j])) j++;
      if (/[eE]/.test(s[j] || '') && /[-+0-9]/.test(s[j + 1] || '')) { j++; if (/[-+]/.test(s[j])) j++; while (j < n && /[0-9]/.test(s[j])) j++; }
      push('n', s.slice(i, j)); i = j; continue;
    }
    if (c === '@') { let j = i + 1; if (s[j] === '@') j++; while (j < n && /[\w$#]/.test(s[j])) j++; push('var', s.slice(i, j)); i = j; continue; }
    if (c === '#' && /[A-Za-z_#]/.test(s[i + 1] || '')) { let j = i + 1; while (j < n && /[\w#]/.test(s[j])) j++; push('tmp', s.slice(i, j)); i = j; continue; }
    if (WORD0.test(c)) { let j = i; while (j < n && WORDC.test(s[j])) j++; push('w', s.slice(i, j)); i = j; continue; }
    const ops = ['->>', '::', '||', '<=', '>=', '<>', '!=', '==', '->', '#>>'];
    const op = ops.find(o => s.startsWith(o, i)); if (op) { push('o', op); i += op.length; continue; }
    push(/[(),;.]/.test(c) ? 'p' : 'o', c); i++;
  }
  return T;
}
const tv = t => t.k === 's' ? t.v : t.v;
const txt = T => T.map(tv).join('');
const isW = (t, ...ws) => !!t && t.k === 'w' && ws.includes(t.u);
const isP = (t, v) => !!t && (t.k === 'p' || t.k === 'o') && t.v === v;
const sigk = t => t && t.k !== 'ws' && t.k !== 'com';
function nx(T, i) { i++; while (i < T.length && !sigk(T[i])) i++; return i; }
function pv(T, i) { i--; while (i >= 0 && !sigk(T[i])) i--; return i; }
function closeP(T, i) { let d = 0; for (let j = i; j < T.length; j++) { if (isP(T[j], '(')) d++; else if (isP(T[j], ')')) { d--; if (d === 0) return j; } } return T.length - 1; }
function openP(T, i) { let d = 0; for (let j = i; j >= 0; j--) { if (isP(T[j], ')')) d++; else if (isP(T[j], '(')) { d--; if (d === 0) return j; } } return 0; }
function splitTop(T, sep) { const out = []; let cur = [], d = 0; for (const t of T) { if (isP(t, '(')) d++; if (isP(t, ')')) d--; if (d === 0 && (sep === ',' ? isP(t, ',') : isP(t, sep))) { out.push(cur); cur = []; continue; } cur.push(t); } out.push(cur); return out; }
function argsOf(T, o, c) { const inner = T.slice(o + 1, c); if (!inner.some(sigk)) return []; return splitTop(inner, ','); }
function trimT(A) { let a = 0, b = A.length; while (a < b && !sigk(A[a])) a++; while (b > a && !sigk(A[b - 1])) b--; return A.slice(a, b); }
function depthAt(T) { const D = []; let d = 0; for (let i = 0; i < T.length; i++) { if (isP(T[i], ')')) d--; D.push(d); if (isP(T[i], '(')) d++; } return D; }
const unq = s => s && s.length >= 2 && s[0] === "'" ? s.slice(1, -1).replace(/''/g, "'") : s;
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
const isDateLit = s => /^'\d{4}-\d{2}-\d{2}'$/.test(s);
const isTsLit = s => /^'\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?'$/.test(s);

/* Fonksiyon çağrılarını yeniden yazan genel yürüyücü. fn(NAME, argTexts, argTokens, nameTok) → metin veya null */
const NOTCALL = new Set(['IN', 'AS', 'VALUES', 'OVER', 'FROM', 'JOIN', 'EXISTS', 'AND', 'OR', 'NOT', 'WHERE', 'ON', 'SELECT', 'FILTER', 'USING', 'KEY', 'TABLE', 'INTO', 'VIEW', 'WITH', 'RECURSIVE', 'CHECK', 'REFERENCES', 'UNIQUE', 'BY', 'THEN', 'ELSE', 'WHEN', 'CASE', 'IS', 'LIKE', 'BETWEEN', 'UNION', 'ALL', 'ANY', 'SOME', 'SET', 'INDEX', 'PRIMARY', 'FOREIGN', 'DEFAULT', 'RETURNS', 'RETURN', 'WHILE', 'PIVOT', 'UNPIVOT', 'APPLY', 'GROUP', 'ORDER', 'PARTITION', 'ROWS', 'RANGE', 'LIMIT', 'TOP', 'GROUPING', 'SETS', 'ROLLUP', 'CUBE', 'LATERAL']);
function renderCalls(T, fn) {
  let out = '';
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 'w' && !NOTCALL.has(t.u)) {
      const j = nx(T, i);
      const p = pv(T, i);
      if (isP(T[j], '(') && !isP(T[p], '.')) {
        const c = closeP(T, j);
        const A = argsOf(T, j, c);
        const rendered = A.map(a => renderCalls(a, fn));
        const r = fn(t.u, rendered.map(s => s.trim()), A.map(trimT), t, rendered);
        if (r !== null && r !== undefined) { out += r; i = c; continue; }
        out += t.v + txt(T.slice(i + 1, j)) + '(' + rendered.join(',') + ')'; i = c; continue;
      }
    }
    out += tv(t);
  }
  return out;
}
const rt = s => tokenize(s);

/* İfade "birincil" sınırları (operatör dönüşümleri için) */
function primEndFwd(T, i) { // i: ilk anlamlı token; dönen: son token indeksi
  const t = T[i]; if (!t) return i;
  if (isP(t, '(')) return closeP(T, i);
  if (isW(t, 'CASE')) { let d = 0; for (let j = i; j < T.length; j++) { if (isW(T[j], 'CASE')) d++; if (isW(T[j], 'END')) { d--; if (!d) return j; } } return T.length - 1; }
  if (isP(t, '-') || isP(t, '+')) return primEndFwd(T, nx(T, i));
  let j = i;
  if (t.k === 'w' || t.k === 'q' || t.k === 'var' || t.k === 'tmp') {
    for (;;) {
      const k = nx(T, j);
      if (isP(T[k], '(') && (T[j].k === 'w')) { j = closeP(T, k); const k2 = nx(T, j); if (isW(T[k2], 'OVER')) { const k3 = nx(T, k2); j = isP(T[k3], '(') ? closeP(T, k3) : k3; } continue; }
      if (isP(T[k], '.') ) { j = nx(T, k); continue; }
      break;
    }
    return j;
  }
  return i;
}
function primStartBack(T, i) { // i: son anlamlı token; dönen: başlangıç
  const t = T[i]; if (!t) return i;
  let j = i;
  if (isP(t, ')')) { j = openP(T, i); const p = pv(T, j); if (p >= 0 && T[p].k === 'w' && !NOTCALL.has(T[p].u)) j = p; else return j; }
  else if (isW(t, 'END')) { let d = 0; for (let k = i; k >= 0; k--) { if (isW(T[k], 'END')) d++; if (isW(T[k], 'CASE')) { d--; if (!d) return k; } } return 0; }
  else if (!(t.k === 'w' || t.k === 'q' || t.k === 's' || t.k === 'n' || t.k === 'var' || t.k === 'tmp')) return i;
  if (t.k === 's' || t.k === 'n') return i;
  for (;;) { const p = pv(T, j); if (isP(T[p], '.')) { const p2 = pv(T, p); if (p2 >= 0 && (T[p2].k === 'w' || T[p2].k === 'q')) { j = p2; continue; } } break; }
  return j;
}
/* İkili operatörü fonksiyona çevir: a OP b OP c → wrap([a,b,c]) */
function rewriteChains(sql, opv, wrap) {
  let T = rt(sql), guard = 0;
  for (;;) {
    const i = T.findIndex(t => (t.k === 'o') && t.v === opv);
    if (i < 0 || guard++ > 200) break;
    const ops = []; let ls = primStartBack(T, pv(T, i)); let le = pv(T, i);
    ops.push(txt(T.slice(ls, le + 1)));
    let cur = i, end = le;
    for (;;) { const rs = nx(T, cur); const re = primEndFwd(T, rs); ops.push(txt(T.slice(rs, re + 1))); end = re; const k = nx(T, re); if (T[k] && T[k].k === 'o' && T[k].v === opv) { cur = k; continue; } break; }
    const rep = wrap(ops);
    T = rt(txt(T.slice(0, ls)) + rep + txt(T.slice(end + 1)));
  }
  return txt(T);
}

/* ------------------------------------------------------------------ İleri çeviri (SQLite → hedef) */
const TSQL_FMT = { '%Y': d => `YEAR(${d})`, '%m': d => `FORMAT(${d}, 'MM')`, '%d': d => `FORMAT(${d}, 'dd')`, '%Y-%m': d => `FORMAT(${d}, 'yyyy-MM')`, '%Y-%m-%d': d => `CAST(${d} AS DATE)`, '%w': d => `(DATEPART(weekday, ${d}) - 1)`, '%H': d => `DATEPART(hour, ${d})`, '%W': d => `DATEPART(week, ${d})` };
const PG_FMT = { '%Y': d => `EXTRACT(YEAR FROM ${d})`, '%m': d => `TO_CHAR(${d}, 'MM')`, '%d': d => `TO_CHAR(${d}, 'DD')`, '%Y-%m': d => `TO_CHAR(${d}, 'YYYY-MM')`, '%Y-%m-%d': d => `CAST(${d} AS DATE)`, '%w': d => `EXTRACT(DOW FROM ${d})`, '%H': d => `EXTRACT(HOUR FROM ${d})`, '%W': d => `EXTRACT(WEEK FROM ${d})` };
const MY_FMT = { '%Y': d => `YEAR(${d})`, '%w': d => `(DAYOFWEEK(${d}) - 1)`, '%H': d => `HOUR(${d})` };
const ORA_FMT = { '%Y': d => `EXTRACT(YEAR FROM ${d})`, '%m': d => `TO_CHAR(${d}, 'MM')`, '%d': d => `TO_CHAR(${d}, 'DD')`, '%Y-%m': d => `TO_CHAR(${d}, 'YYYY-MM')`, '%Y-%m-%d': d => `TRUNC(${d})`, '%w': d => `(TO_CHAR(${d}, 'D') - 1)`, '%H': d => `EXTRACT(HOUR FROM CAST(${d} AS TIMESTAMP))`, '%W': d => `TO_CHAR(${d}, 'WW')` };
/* Şema tabanlı yardımcılar: sütun türleri COLMETA'dan gelir (içerik dosyaları dialect.js'ten sonra yüklenir, bu yüzden tembel okunur) */
let SCHEMA_IDX = null;
function schemaIdx() {
  const M = root.SQLP_COLMETA || {}; const n = Object.keys(M).length;
  if (SCHEMA_IDX && SCHEMA_IDX.n === n) return SCHEMA_IDX;
  const bool = new Set(), date = new Set(), dbl = new Set(), pk = {}, cols = {};
  for (const t of Object.keys(M)) { cols[t.toLowerCase()] = new Set(); pk[t.toLowerCase()] = []; for (const c of M[t]) { const nm = c[0].toLowerCase(); cols[t.toLowerCase()].add(nm); if (c[1] === 'bit') bool.add(nm); if (c[1] === 'date' || c[1] === 'datetime') date.add(nm); if (c[1] === 'real') dbl.add(nm); if (c[3] === 'pk') pk[t.toLowerCase()].push(nm); } }
  /* Aynı ad başka tabloda metinse (raw_signups.signup_date gibi kirli veri) tarih sayma */
  for (const t of Object.keys(M)) for (const c of M[t]) if (c[1] !== 'date' && c[1] !== 'datetime') date.delete(c[0].toLowerCase());
  return (SCHEMA_IDX = { n, bool, date, dbl, pk, cols });
}
const colOf = x => { const m = String(x).trim().match(/^(?:"?\w+"?\.)?"?(\w+)"?$/); return m ? m[1].toLowerCase() : null; };
const isDateCol = x => { const c = colOf(x); return !!c && schemaIdx().date.has(c); };
const isBoolCol = x => { const c = colOf(x); return !!c && schemaIdx().bool.has(c); };
function toTextDate(x, d) { return { pg: `CAST(${x} AS TEXT)`, tsql: `CAST(${x} AS VARCHAR(19))`, oracle: `TO_CHAR(${x}, 'YYYY-MM-DD')`, bq: `CAST(${x} AS STRING)` }[d] || x; }
/* Üst düzeyde karşılaştırma içeren ifade mi? (SUM(a = b) gibi; yalnız SQLite ve MySQL kabul eder) */
function hasTopCond(toks) {
  let dd = 0, cs = 0;
  for (const t of toks) { if (!sigk(t)) continue; if (isP(t, '(')) dd++; else if (isP(t, ')')) dd--; else if (dd === 0) { if (isW(t, 'CASE')) cs++; else if (isW(t, 'END')) cs--; else if (cs === 0 && (t.k === 'o' || t.k === 'p') && ['=', '<', '>', '<=', '>=', '<>', '!='].includes(t.v)) return true; else if (cs === 0 && isW(t, 'LIKE', 'IN', 'IS', 'BETWEEN')) return true; } }
  return false;
}
/* PostgreSQL ROUND(x, n) yalnız NUMERIC alır. Kaynağı double precision olan ifadeler için CAST gerekir. */
let FWD_SQL = '';
const DBL_FN = /\b(PERCENT_RANK|CUME_DIST|SQRT|POWER|POW|LN|LOG|LOG10|EXP|SIN|COS|TAN|ASIN|ACOS|ATAN|ATAN2|RADIANS|DEGREES|CORR|COVAR_POP|COVAR_SAMP|REGR_\w+|PERCENTILE_CONT|MEDIAN|EXTRACT|RANDOM|PI)\s*\(/i;
function pgRoundNeedsCast(x) {
  if (DBL_FN.test(x)) return true;
  const dbl = schemaIdx().dbl; const words = x.match(/[A-Za-z_]\w*/g) || [];
  if (words.some(w => dbl.has(w.toLowerCase()))) return true;
  /* takma ad zinciri: AS w tanımında double kaynak geçiyorsa */
  const seen = new Set(); const check = w => { if (seen.has(w)) return false; seen.add(w); const T = rt(FWD_SQL).filter(sigk); for (let i = 0; i < T.length; i++) { if (isW(T[i], 'AS') && T[i + 1] && T[i + 1].k === 'w' && T[i + 1].u === w) { let s = i - 1, dd = 0; const buf = []; for (; s >= 0; s--) { if (isP(T[s], ')')) dd++; else if (isP(T[s], '(')) { if (!dd) break; dd--; } else if (!dd && (isP(T[s], ',') || isW(T[s], 'SELECT'))) break; buf.unshift(T[s].v); } const src = buf.join(' ').replace(/\s*\(\s*/g, '('); if (DBL_FN.test(src)) return true; if ((src.match(/[A-Za-z_]\w*/g) || []).some(n => dbl.has(n.toLowerCase()) || (n.toUpperCase() !== w && check(n.toUpperCase())))) return true; } } return false; };
  return words.some(w => check(w.toUpperCase()));
}
function isDtExpr(x) { const m = String(x).trim().match(/(?:^|\.)"?(\w+)"?$/); return !!m && DT_COLS.has(m[1].toLowerCase()); }
const bqFmtFn = v => isDtExpr(v) || isTsLit(String(v).trim()) ? 'FORMAT_DATETIME' : 'FORMAT_DATE';
function fwdStrftime(a, d) {
  if (a.length !== 2 || !/^'.*'$/.test(a[0])) return null;
  const f = unq(a[0]), v = a[1];
  if (d === 'bq') return `${bqFmtFn(v)}('${f}', ${isTsLit(v.trim()) ? 'DATETIME ' + v : dlit(v, d)})`;
  if (d === 'tsql') return TSQL_FMT[f] ? TSQL_FMT[f](v) : `FORMAT(${v}, '${f.replace('%Y', 'yyyy').replace('%m', 'MM').replace('%d', 'dd').replace('%H', 'HH').replace('%M', 'mm')}')`;
  if (d === 'pg' && f === '%Y-%m-%d %H:00:00') return `DATE_TRUNC('hour', CAST(${v} AS TIMESTAMP))`;
  if (d === 'pg') return PG_FMT[f] ? PG_FMT[f](v) : `TO_CHAR(${v}, '${f.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD').replace('%H', 'HH24').replace('%M', 'MI')}')`;
  if (d === 'mysql') return MY_FMT[f] ? MY_FMT[f](v) : `DATE_FORMAT(${v}, '${f.replace('%M', '%i')}')`;
  if (d === 'oracle') return ORA_FMT[f] ? ORA_FMT[f](v) : `TO_CHAR(${v}, '${f.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD').replace('%H', 'HH24').replace('%M', 'MI')}')`;
  return null;
}
function dlit(v, d) { if (isDateLit(String(v).trim()) && (d === 'pg' || d === 'oracle' || d === 'bq')) return 'DATE ' + String(v).trim(); return v; }
function fwdDate(a, d) {
  const v0 = a[0]; if (v0 === undefined) return null;
  const v = dlit(v0, d);
  if (d === 'bq') {
    if (/^'now'$/i.test(v0)) return 'CURRENT_DATE()';
    if (a.length === 1) return isDateLit(v0.trim()) ? v : `DATE(${v})`;
    if (a.length !== 2) return null;
    const m = unq(a[1]).trim().toLowerCase(); const vv = isDtExpr(v0) ? `DATE(${v})` : v; let mm;
    if ((mm = m.match(/^([+-]?\d+)\s+(day|days|month|months|year|years)$/))) return `DATE_ADD(${vv}, INTERVAL ${parseInt(mm[1], 10)} ${mm[2].replace(/s$/, '').toUpperCase()})`;
    if (m === 'start of month') return `DATE_TRUNC(${vv}, MONTH)`;
    if (m === 'start of year') return `DATE_TRUNC(${vv}, YEAR)`;
    return null;
  }
  if (/^'now'$/i.test(v0)) return { tsql: 'CAST(GETDATE() AS DATE)', pg: 'CURRENT_DATE', mysql: 'CURDATE()', oracle: 'TRUNC(SYSDATE)' }[d];
  if (a.length === 1) return { tsql: `CAST(${v} AS DATE)`, pg: `CAST(${v} AS DATE)`, mysql: `DATE(${v})`, oracle: isDateLit(v0) ? v : `TRUNC(${v})` }[d];
  if (a.length !== 2) return null;
  const m = unq(a[1]).trim().toLowerCase();
  let mm;
  if ((mm = m.match(/^([+-]?\d+)\s+(day|days|month|months|year|years)$/))) {
    const n = parseInt(mm[1], 10), u = mm[2].replace(/s$/, '');
    if (d === 'tsql') return `DATEADD(${u}, ${n}, ${v})`;
    if (d === 'pg') return `CAST(${v} + INTERVAL '${n} ${u}' AS DATE)`;
    if (d === 'mysql') return `DATE_ADD(${v}, INTERVAL ${n} ${u.toUpperCase()})`;
    if (d === 'oracle') return u === 'day' ? `(${v} + INTERVAL '${n}' DAY)` : `ADD_MONTHS(${v}, ${u === 'year' ? n * 12 : n})`;
  }
  if (m === 'start of month') return { tsql: `DATEFROMPARTS(YEAR(${v}), MONTH(${v}), 1)`, pg: `CAST(DATE_TRUNC('month', ${v}) AS DATE)`, mysql: `DATE_FORMAT(${v}, '%Y-%m-01')`, oracle: `TRUNC(${v}, 'MM')` }[d];
  if (m === 'start of year') return { tsql: `DATEFROMPARTS(YEAR(${v}), 1, 1)`, pg: `CAST(DATE_TRUNC('year', ${v}) AS DATE)`, mysql: `DATE_FORMAT(${v}, '%Y-01-01')`, oracle: `TRUNC(${v}, 'YYYY')` }[d];
  return null;
}
function castParts(A) { // tek argüman "x AS tip"
  const toks = A[0] || []; let asI = -1, dd = 0;
  for (let i = 0; i < toks.length; i++) { if (isP(toks[i], '(')) dd++; if (isP(toks[i], ')')) dd--; if (dd === 0 && isW(toks[i], 'AS')) asI = i; }
  if (asI < 0) return null;
  return { x: txt(toks.slice(0, asI)).trim(), xt: trimT(toks.slice(0, asI)), type: txt(toks.slice(asI + 1)).trim() };
}
function fwdType(type, d) {
  const T = type.toUpperCase().replace(/\s+/g, ' ');
  if (d === 'bq') { if (/^(INTEGER|INT|BIGINT)$/.test(T)) return 'INT64'; if (/^(REAL|FLOAT|DOUBLE)$/.test(T)) return 'FLOAT64'; if (/^TEXT$/.test(T)) return 'STRING'; return type; }
  if (/^(INTEGER|INT|BIGINT)$/.test(T)) return { tsql: 'INT', pg: 'INTEGER', mysql: 'SIGNED', oracle: 'NUMBER(10)' }[d];
  if (/^(REAL|FLOAT|DOUBLE)$/.test(T)) return { tsql: 'FLOAT', pg: 'NUMERIC', mysql: 'DOUBLE', oracle: 'BINARY_DOUBLE' }[d];
  if (/^TEXT$/.test(T)) return { tsql: 'NVARCHAR(50)', pg: 'TEXT', mysql: 'CHAR', oracle: 'VARCHAR2(50)' }[d];
  return type;
}
function fwdDdlType(type, d) {
  const T = type.toUpperCase();
  if (d === 'bq') return { INTEGER: 'INT64', TEXT: 'STRING', REAL: 'NUMERIC' }[T] || null;
  if (T === 'INTEGER') return { tsql: 'INT', pg: 'INTEGER', mysql: 'INT', oracle: 'NUMBER(10)' }[d];
  if (T === 'TEXT') return { tsql: 'NVARCHAR(100)', pg: 'VARCHAR(100)', mysql: 'VARCHAR(100)', oracle: 'VARCHAR2(100)' }[d];
  if (T === 'REAL') return { tsql: 'DECIMAL(12,2)', pg: 'NUMERIC(12,2)', mysql: 'DECIMAL(12,2)', oracle: 'NUMBER(12,2)' }[d];
  return null;
}
function jsonPathKeys(p) { const s = unq(p); if (!/^\$(\.[A-Za-z_]\w*)+$/.test(s)) return null; return s.slice(2).split('.'); }

function fwdCallBq(N, a) {
  switch (N) {
    case 'IFNULL': return `IFNULL(${a[0]}, ${a[1]})`;
    case 'INSTR': return `STRPOS(${a[0]}, ${a[1]})`;
    case '__DAYDIFF': return (isDtExpr(a[0]) || isDtExpr(a[1])) ? `DATETIME_DIFF(${a[0]}, ${a[1]}, DAY)` : `DATE_DIFF(${dlit(a[0], 'bq')}, ${dlit(a[1], 'bq')}, DAY)`;
    case '__SECDIFF': return `DATETIME_DIFF(${a[0]}, ${a[1]}, SECOND)`;
    case '__MINDIFF': return `DATETIME_DIFF(${a[0]}, ${a[1]}, MINUTE)`;
    case '__HRDIFF': return `(DATETIME_DIFF(${a[0]}, ${a[1]}, MINUTE) / 60.0)`;
    case 'GROUP_CONCAT': return `STRING_AGG(${a[0]}, ${a[1] || "','"})`;
    case 'IIF': return `IF(${a.join(', ')})`;
    case 'MEDIAN': return `APPROX_QUANTILES(${a[0]}, 2)[OFFSET(1)]`;
    case 'STDDEV': case 'STDDEV_SAMP': return `STDDEV(${a[0]})`;
    case 'VARIANCE': case 'VAR_SAMP': return `VARIANCE(${a[0]})`;
    case 'RANDOM': return 'RAND()';
    case 'CHANGES': return '@@row_count';
    case 'JSON_EXTRACT': return `JSON_VALUE(${a[0]}, ${a[1]})`;
    case 'JSON_ARRAY_LENGTH': return `ARRAY_LENGTH(JSON_QUERY_ARRAY(${a[0]}${a[1] ? ', ' + a[1] : ''}))`;
    case 'JSON_GROUP_ARRAY': return `TO_JSON_STRING(ARRAY_AGG(${a[0]}))`;
    case 'STRING_AGG': return null;
    case 'CONCAT': return null;
    case 'LOG10': return null;
  }
  return undefined;
}
function fwdCall(N, a, A, d) {
  if (/_$/.test(N) || /^UDF_/.test(N)) { const r = d === 'bq' ? fwdInternalBq(N, a) : fwdInternal(N, a, d); if (r !== null && r !== undefined) return r; }
  if (d === 'bq') { const r = fwdCallBq(N, a); if (r !== undefined) return r; }
  switch (N) {
    case 'IFNULL': { const x = isDateCol(a[0]) && /^'/.test(a[1] || '') && !isDateLit(a[1]) ? toTextDate(a[0], d) : a[0]; return { tsql: `ISNULL(${x}, ${a[1]})`, pg: `COALESCE(${x}, ${a[1]})`, mysql: null, oracle: `NVL(${x}, ${a[1]})` }[d]; }
    case 'COALESCE': if (a.length === 2 && isDateCol(a[0]) && /^'/.test(a[1]) && !isDateLit(a[1]) && ['pg', 'tsql', 'oracle'].includes(d)) return `COALESCE(${toTextDate(a[0], d)}, ${a[1]})`; return null;
    case 'SUM': case 'AVG': if (a.length === 1 && d !== 'mysql' && A && A[0] && hasTopCond(A[0])) return `${N}(CASE WHEN ${a[0]} THEN 1 ELSE 0 END)`; return null;
    case 'DATETIME': {
      if (a.length === 1) return { tsql: `CAST(${a[0]} AS DATETIME2)`, pg: `CAST(${a[0]} AS TIMESTAMP)` }[d] || null;
      if (a.length !== 2) return null;
      const m1 = unq(a[1]).trim().toLowerCase().match(/^([+-]?\d+)\s+(hour|minute|second|day)s?$/);
      if (m1 && /^'/.test(a[1])) { const n = parseInt(m1[1], 10), u = m1[2]; return { tsql: `DATEADD(${u}, ${n}, ${a[0]})`, pg: `(CAST(${a[0]} AS TIMESTAMP) + INTERVAL '${n} ${u}')`, mysql: `DATE_ADD(${a[0]}, INTERVAL ${n} ${u.toUpperCase()})`, oracle: `(${a[0]} + INTERVAL '${n}' ${u.toUpperCase()})`, bq: `DATETIME_ADD(${a[0]}, INTERVAL ${n} ${u.toUpperCase()})` }[d] || null; }
      const m2 = a[1].match(/^([\s\S]*?)\s*\|\|\s*' (hour|minute|day)s?'$/);
      if (m2) return { tsql: `DATEADD(${m2[2]}, ${m2[1]}, ${a[0]})`, pg: `(CAST(${a[0]} AS TIMESTAMP) + ${m2[1]} * INTERVAL '1 ${m2[2]}')` }[d] || null;
      return null;
    }
    case 'LENGTH': return d === 'tsql' ? `LEN(${a[0]})` : d === 'mysql' ? `CHAR_LENGTH(${a[0]})` : null;
    case 'SUBSTR': { const x0 = isDateCol(a[0]) ? toTextDate(a[0], d) : a[0]; if (d === 'tsql') return `SUBSTRING(${x0}, ${a[1]}, ${a[2] || 'LEN(' + x0 + ')'})`; if (d === 'mysql' || d === 'pg') return `SUBSTRING(${[x0].concat(a.slice(1)).join(', ')})`; if (x0 !== a[0]) return `SUBSTR(${[x0].concat(a.slice(1)).join(', ')})`; return null; }
    case 'INSTR': if (d === 'tsql') return `CHARINDEX(${a[1]}, ${a[0]})`; if (d === 'pg') return `STRPOS(${a[0]}, ${a[1]})`; return null;
    case 'STRFTIME': return fwdStrftime(a, d);
    case 'DATE': return fwdDate(a, d);
    case '__DAYDIFF': return { tsql: `DATEDIFF(day, ${a[1]}, ${a[0]})`, mysql: `DATEDIFF(${a[0]}, ${a[1]})`, pg: `(CAST(${dlit(a[0], d)} AS DATE) - CAST(${dlit(a[1], d)} AS DATE))`, oracle: `(CAST(${dlit(a[0], d)} AS DATE) - CAST(${dlit(a[1], d)} AS DATE))` }[d];
    case '__MINDIFF': return { tsql: `DATEDIFF(minute, ${a[1]}, ${a[0]})`, mysql: `TIMESTAMPDIFF(MINUTE, ${a[1]}, ${a[0]})`, pg: `(EXTRACT(EPOCH FROM (CAST(${a[0]} AS TIMESTAMP) - CAST(${a[1]} AS TIMESTAMP))) / 60)`, oracle: `((CAST(${a[0]} AS DATE) - CAST(${a[1]} AS DATE)) * 1440)` }[d];
    case '__HRDIFF': return { tsql: `(DATEDIFF(minute, ${a[1]}, ${a[0]}) / 60.0)`, mysql: `(TIMESTAMPDIFF(MINUTE, ${a[1]}, ${a[0]}) / 60.0)`, pg: `(EXTRACT(EPOCH FROM (CAST(${a[0]} AS TIMESTAMP) - CAST(${a[1]} AS TIMESTAMP))) / 3600)`, oracle: `((CAST(${a[0]} AS DATE) - CAST(${a[1]} AS DATE)) * 24)` }[d];
    case '__SECDIFF': return { tsql: `DATEDIFF(second, ${a[1]}, ${a[0]})`, mysql: `TIMESTAMPDIFF(SECOND, ${a[1]}, ${a[0]})`, pg: `EXTRACT(EPOCH FROM (CAST(${a[0]} AS TIMESTAMP) - CAST(${a[1]} AS TIMESTAMP)))`, oracle: `((CAST(${a[0]} AS DATE) - CAST(${a[1]} AS DATE)) * 86400)` }[d];
    case 'GROUP_CONCAT': { const sep = a[1] || "','"; return { tsql: `STRING_AGG(${a[0]}, ${sep})`, pg: `STRING_AGG(${a[0]}, ${sep})`, mysql: `GROUP_CONCAT(${a[0]} SEPARATOR ${sep})`, oracle: `LISTAGG(${a[0]}, ${sep}) WITHIN GROUP (ORDER BY ${a[0]})` }[d]; }
    case 'IIF': return d === 'tsql' ? null : d === 'mysql' ? `IF(${a.join(', ')})` : `CASE WHEN ${a[0]} THEN ${a[1]} ELSE ${a[2]} END`;
    case 'MEDIAN': return d === 'pg' ? `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${a[0]})` : null;
    case 'STDDEV': case 'STDDEV_SAMP': return { tsql: `STDEV(${a[0]})`, mysql: `STDDEV_SAMP(${a[0]})`, pg: `STDDEV(${a[0]})`, oracle: `STDDEV(${a[0]})` }[d];
    case 'VARIANCE': case 'VAR_SAMP': return { tsql: `VAR(${a[0]})`, mysql: `VAR_SAMP(${a[0]})`, pg: `VARIANCE(${a[0]})`, oracle: `VARIANCE(${a[0]})` }[d];
    case 'STDDEV_POP': return d === 'tsql' ? `STDEVP(${a[0]})` : null;
    case 'VAR_POP': return d === 'tsql' ? `VARP(${a[0]})` : null;
    case 'CAST': { const c = castParts(A); if (!c) return null; const x = renderFwdInner(txt(c.xt), d); return `CAST(${x} AS ${fwdType(c.type, d)})`; }
    case 'ROUND': if (d === 'pg' && a.length === 2 && pgRoundNeedsCast(a[0])) return `ROUND(CAST(${a[0]} AS NUMERIC), ${a[1]})`; return d === 'tsql' && a.length === 1 ? `ROUND(${a[0]}, 0)` : null;
    case 'RANDOM': return { tsql: 'NEWID()', pg: 'RANDOM()', mysql: 'RAND()', oracle: 'DBMS_RANDOM.VALUE' }[d];
    case 'LOG10': return d === 'oracle' ? `LOG(10, ${a[0]})` : null;
    case 'CHANGES': return { tsql: '@@ROWCOUNT', mysql: 'ROW_COUNT()', pg: 'NULL /* GET DIAGNOSTICS */', oracle: 'SQL%ROWCOUNT' }[d];
    case 'CONCAT': return d === 'oracle' && a.length > 2 ? '(' + a.join(' || ') + ')' : null;
    case 'JSON_EXTRACT': { if (d === 'tsql' || d === 'oracle') return `JSON_VALUE(${a[0]}, ${a[1]})`; if (d === 'mysql') return `JSON_UNQUOTE(JSON_EXTRACT(${a[0]}, ${a[1]}))`; const k = jsonPathKeys(a[1]); return k ? `JSONB_EXTRACT_PATH_TEXT(CAST(${a[0]} AS JSONB), ${k.map(x => "'" + x + "'").join(', ')})` : null; }
    case 'JSON_ARRAY_LENGTH': { if (a.length === 1) return { tsql: null, pg: `JSONB_ARRAY_LENGTH(CAST(${a[0]} AS JSONB))`, mysql: `JSON_LENGTH(${a[0]})`, oracle: null }[d]; const k = jsonPathKeys(a[1]); return { tsql: null, pg: k ? `JSONB_ARRAY_LENGTH(JSONB_EXTRACT_PATH(CAST(${a[0]} AS JSONB), ${k.map(x => "'" + x + "'").join(', ')}))` : null, mysql: `JSON_LENGTH(${a[0]}, ${a[1]})`, oracle: null }[d]; }
    case 'JSON_OBJECT': { if (d === 'pg') return `JSON_BUILD_OBJECT(${a.join(', ')})`; if (d === 'tsql') { const p = []; for (let i = 0; i < a.length; i += 2) p.push(a[i] + ': ' + a[i + 1]); return `JSON_OBJECT(${p.join(', ')})`; } if (d === 'oracle') { const p = []; for (let i = 0; i < a.length; i += 2) p.push(a[i] + ' VALUE ' + a[i + 1]); return `JSON_OBJECT(${p.join(', ')})`; } return null; }
    case 'STRING_AGG': { const m = (a[1] || "','").match(/^([\s\S]*?)\s+(ORDER\s+BY[\s\S]*)$/i); const sep = m ? m[1] : (a[1] || "','"); const ob = m ? m[2] : null; return { tsql: `STRING_AGG(${a[0]}, ${sep})${ob ? ' WITHIN GROUP (' + ob + ')' : ''}`, pg: null, mysql: `GROUP_CONCAT(${a[0]}${ob ? ' ' + ob : ''} SEPARATOR ${sep})`, oracle: `LISTAGG(${a[0]}, ${sep}) WITHIN GROUP (${ob || 'ORDER BY ' + a[0]})` }[d]; }
    case 'JSON_GROUP_ARRAY': return { tsql: `JSON_ARRAYAGG(${a[0]})`, pg: `JSON_AGG(${a[0]})`, mysql: `JSON_ARRAYAGG(${a[0]})`, oracle: `JSON_ARRAYAGG(${a[0]})` }[d];
  }
  return null;
}
function renderFwdInner(sql, d) { return renderCalls(rt(sql), (N, a, A) => fwdCall(N, a, A, d)); }

function prePassJulian(sql) {
  // ( julianday(A) - julianday(B) ) * 86400  → __secdiff(A,B);  julianday(A) - julianday(B) → __daydiff(A,B)
  let T = rt(sql), guard = 0;
  for (;;) {
    let done = true;
    for (let i = 0; i < T.length; i++) {
      if (!isW(T[i], 'JULIANDAY')) continue;
      const o1 = nx(T, i); if (!isP(T[o1], '(')) continue; const c1 = closeP(T, o1);
      const m = nx(T, c1); if (!isP(T[m], '-')) continue;
      const j2 = nx(T, m); if (!isW(T[j2], 'JULIANDAY')) continue;
      const o2 = nx(T, j2); const c2 = closeP(T, o2);
      const A = txt(T.slice(o1 + 1, c1)).trim(), B = txt(T.slice(o2 + 1, c2)).trim();
      // saniye kalıbı
      const pb = pv(T, i), na = nx(T, c2), ms = nx(T, na), nn = nx(T, ms);
      if (isP(T[pb], '(') && isP(T[na], ')') && isP(T[ms], '*') && T[nn] && T[nn].v === '86400') {
        T = rt(txt(T.slice(0, pb)) + `__secdiff(${A}, ${B})` + txt(T.slice(nn + 1)));
      } else if (isP(T[pb], '(') && isP(T[na], ')') && isP(T[ms], '*') && T[nn] && T[nn].v === '1440') {
        /* dakika farkı */
        T = rt(txt(T.slice(0, pb)) + `__mindiff(${A}, ${B})` + txt(T.slice(nn + 1)));
      } else if (isP(T[pb], '(') && isP(T[na], ')') && isP(T[ms], '*') && T[nn] && T[nn].v === '24') {
        /* saat farkı (ondalıklı) */
        T = rt(txt(T.slice(0, pb)) + `__hrdiff(${A}, ${B})` + txt(T.slice(nn + 1)));
      } else {
        T = rt(txt(T.slice(0, i)) + `__daydiff(${A}, ${B})` + txt(T.slice(c2 + 1)));
      }
      done = false; break;
    }
    if (done || guard++ > 50) break;
  }
  return txt(T);
}
function stmtStart(T, i, D) { // kapsamın başlangıcı
  const d = D[i];
  for (let j = i - 1; j >= 0; j--) { if (D[j] < d || (D[j] === d - 1 && isP(T[j], '('))) return j + 1; if (D[j] === d && isP(T[j], ';')) return j + 1; }
  return 0;
}
function scopeEnd(T, i, D) { const d = D[i]; for (let j = i + 1; j < T.length; j++) { if (D[j] < d) return j; if (D[j] === d && isP(T[j], ';')) return j; } return T.length; }
function fwdLimit(sql, d) {
  if (d !== 'tsql' && d !== 'oracle') return sql;
  let T = rt(sql), guard = 0;
  for (;;) {
    const D = depthAt(T);
    let li = -1; for (let i = T.length - 1; i >= 0; i--) if (isW(T[i], 'LIMIT')) { li = i; break; }
    if (li < 0 || guard++ > 30) break;
    const dep = D[li], s = stmtStart(T, li, D), e = scopeEnd(T, li, D);
    let oi = -1; for (let j = li + 1; j < e; j++) if (D[j] === dep && isW(T[j], 'OFFSET')) oi = j;
    const nTxt = txt(T.slice(li + 1, oi < 0 ? e : oi)).trim(), oTxt = oi < 0 ? null : txt(T.slice(oi + 1, e)).trim();
    let sel = -1; for (let j = s; j < li; j++) if (D[j] === dep && isW(T[j], 'SELECT')) { sel = j; break; }
    let compound = false, hasOrder = false;
    for (let j = sel + 1; j < li; j++) { if (D[j] !== dep) continue; if (isW(T[j], 'UNION', 'INTERSECT', 'EXCEPT')) compound = true; if (isW(T[j], 'ORDER')) hasOrder = true; }
    const tail = txt(T.slice(e)); let head = txt(T.slice(0, li)).replace(/[ \t]+$/, '');
    const trail = (txt(T.slice(li, e)).match(/\s*$/) || [''])[0];
    if (d === 'tsql' && !oTxt && !compound && sel >= 0) {
      let k = nx(T, sel); if (isW(T[k], 'DISTINCT', 'ALL')) k = nx(T, k);
      const n = /^\d+$/.test(nTxt) ? nTxt : '(' + nTxt + ')';
      T = rt(txt(T.slice(0, k)) + 'TOP ' + n + ' ' + txt(T.slice(k, li)).replace(/[ \t]+$/, '').replace(/\n$/, '') + trail + tail);
      continue;
    }
    let rep = (hasOrder ? '' : (d === 'tsql' ? ' ORDER BY (SELECT NULL)' : '')) + ' OFFSET ' + (oTxt || '0') + ' ROWS FETCH ' + (oTxt ? 'NEXT ' : 'FIRST ') + nTxt + ' ROWS ONLY';
    if (d === 'oracle' && !oTxt) rep = ' FETCH FIRST ' + nTxt + ' ROWS ONLY';
    T = rt(head + rep + trail + tail);
  }
  return txt(T);
}
function fwdLikeYear(sql, d) {
  const T = rt(sql); let out = '', i = 0;
  for (; i < T.length; i++) {
    if (isW(T[i], 'LIKE')) {
      const r = nx(T, i); const m = T[r] && T[r].k === 's' && unq(T[r].v).match(/^(\d{4})(?:-(\d{2}))?%$/);
      if (m) {
        const pe = pv(T, i); const ps = primStartBack(T, pe); const col = txt(T.slice(ps, pe + 1));
        out = out.slice(0, out.length - txt(T.slice(ps, i)).length);
        let rep;
        if (!m[2]) rep = { tsql: `YEAR(${col}) = ${m[1]}`, pg: `EXTRACT(YEAR FROM ${col}) = ${m[1]}`, mysql: `YEAR(${col}) = ${m[1]}`, oracle: `EXTRACT(YEAR FROM ${col}) = ${m[1]}`, bq: `EXTRACT(YEAR FROM ${col}) = ${m[1]}` }[d];
        else rep = { tsql: `FORMAT(${col}, 'yyyy-MM') = '${m[1]}-${m[2]}'`, pg: `TO_CHAR(${col}, 'YYYY-MM') = '${m[1]}-${m[2]}'`, mysql: `DATE_FORMAT(${col}, '%Y-%m') = '${m[1]}-${m[2]}'`, oracle: `TO_CHAR(${col}, 'YYYY-MM') = '${m[1]}-${m[2]}'`, bq: `${bqFmtFn(col)}('%Y-%m', ${col}) = '${m[1]}-${m[2]}'` }[d];
        out += rep; i = r; continue;
      }
    }
    out += tv(T[i]);
  }
  return out;
}
function fwdOracleMisc(sql) {
  let T = rt(sql);
  // tarih sabitleri
  let out = '';
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 's' && (isDateLit(t.v) || isTsLit(t.v))) { const p = pv(T, i); if (!isW(T[p], 'DATE', 'TIMESTAMP') && !isP(T[p], '(') && !(T[p] && T[p].k === 'w' && /^(TO_CHAR|TO_DATE)$/.test(T[p].u))) { out += (isTsLit(t.v) ? 'TIMESTAMP ' : 'DATE ') + t.v; continue; } }
    out += tv(t);
  }
  T = rt(out);
  // tablo takma adındaki AS kaldırılır
  out = '';
  for (let i = 0; i < T.length; i++) {
    if (isW(T[i], 'AS')) {
      const p = pv(T, i); let base = p;
      if (isP(T[p], ')')) base = openP(T, p);
      else { while (isP(T[pv(T, base)], '.')) base = pv(T, pv(T, base)); }
      const bp = pv(T, base);
      if (isW(T[bp], 'FROM', 'JOIN') && (isP(T[p], ')') || T[p].k === 'w' || T[p].k === 'q')) { const n = i + 1; i = n < T.length && T[n].k === 'ws' ? n : i; continue; }
    }
    out += tv(T[i]);
  }
  // FROM olmayan SELECT → FROM dual
  T = rt(out);
  for (let guard = 0; guard < 40; guard++) {
    const D = depthAt(T); let changed = false;
    for (let i = 0; i < T.length; i++) {
      if (!isW(T[i], 'SELECT')) continue;
      const dep = D[i]; let end = T.length, hasFrom = false;
      for (let j = i + 1; j < T.length; j++) { if (D[j] < dep || (D[j] === dep && (isP(T[j], ';') || isW(T[j], 'UNION', 'INTERSECT', 'EXCEPT', 'MINUS', 'ORDER', 'FETCH')))) { end = j; break; } if (D[j] === dep && isW(T[j], 'FROM', 'INTO')) { hasFrom = true; break; } }
      if (!hasFrom) { let e2 = end; while (e2 > i && !sigk(T[e2 - 1])) e2--; T = rt(txt(T.slice(0, e2)) + ' FROM dual' + txt(T.slice(e2))); changed = true; break; }
    }
    if (!changed) break;
  }
  out = txt(T).replace(/\bEXCEPT\b/g, 'MINUS');
  return out;
}
function fwdDdl(sql, d) {
  const T = rt(sql); const D = depthAt(T); let out = '';
  let inCreate = -1;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (isW(t, 'CREATE')) { const k = nx(T, i); if (isW(T[k], 'TABLE')) { const nm = nx(T, nx(T, k)); if (isP(T[nm], '(')) inCreate = nm; } }
    if (inCreate >= 0 && i === closeP(T, inCreate)) inCreate = -1;
    if (inCreate >= 0 && t.k === 'w' && D[i] === D[inCreate] + 1) {
      const p = pv(T, i);
      if ((T[p].k === 'w' || T[p].k === 'q') && /^(TEXT|INTEGER|REAL)$/.test(t.u)) {
        const pp = pv(T, p); if (isP(T[pp], ',') || pp === inCreate) { out += fwdDdlType(t.u, d); continue; }
      }
    }
    out += tv(t);
  }
  let s = out;
  if (d === 'tsql') {
    // CREATE TABLE x AS SELECT → SELECT ... INTO x FROM
    for (let guard = 0; guard < 10; guard++) {
    const m = s.match(/CREATE\s+TABLE\s+([\w"]+)\s+AS\s+/i);
    if (!m) break;
    {
      const rest = s.slice(m.index + m[0].length); const T2 = rt(rest); const D2 = depthAt(T2);
      let selI = -1, fromI = -1; let afterCte = 0;
      if (isW(T2[nx(T2, -1)], 'WITH')) { for (let j = 0; j < T2.length; j++) if (D2[j] === 0 && isW(T2[j], 'SELECT')) { selI = j; break; } } else selI = nx(T2, -1);
      for (let j = selI + 1; j < T2.length; j++) if (D2[j] === 0 && isW(T2[j], 'FROM')) { fromI = j; break; }
      if (fromI > 0) s = s.slice(0, m.index) + txt(T2.slice(0, fromI)).replace(/\s+$/, '') + '\nINTO ' + m[1] + '\n' + txt(T2.slice(fromI)); else break;
      void afterCte;
    }
    }
    s = s.replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, 'INT PRIMARY KEY');
    s = s.replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b/gi, 'DEFAULT GETDATE()');
    s = s.replace(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+/gi, 'ALTER TABLE $1 ADD ');
    s = s.replace(/ALTER\s+TABLE\s+(\w+)\s+RENAME\s+COLUMN\s+(\w+)\s+TO\s+(\w+)/gi, "EXEC sp_rename '$1.$2', '$3', 'COLUMN'");
  }
  if (d === 'oracle') s = s.replace(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+([^;]+)/gi, 'ALTER TABLE $1 ADD ($2)');
  if (d === 'bq') {
    s = s.replace(/\bPRIMARY\s+KEY(\s*\([^)]*\))?(?!\s*\(|\s+NOT\s+ENFORCED)/gi, (m, c) => 'PRIMARY KEY' + (c || '') + ' NOT ENFORCED');
    s = s.replace(/\bREFERENCES\s+(\w+)\s*\(([^)]*)\)(?!\s+NOT\s+ENFORCED)/gi, 'REFERENCES $1($2) NOT ENFORCED');
    s = s.replace(/\s+AUTOINCREMENT\b/gi, '').replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b(?!\s*\()/gi, 'DEFAULT CURRENT_TIMESTAMP()');
  }
  return s;
}
function fwdTx(sql, d) {
  let s = sql;
  if (d === 'tsql') s = s.replace(/\bBEGIN(\s+TRANSACTION)?\s*;/gi, 'BEGIN TRANSACTION;').replace(/\bCOMMIT\s*;/gi, 'COMMIT TRANSACTION;').replace(/\bROLLBACK\s*;/gi, 'ROLLBACK TRANSACTION;');
  if (d === 'mysql') s = s.replace(/\bBEGIN(\s+TRANSACTION)?\s*;/gi, 'START TRANSACTION;');
  if (d === 'pg') s = s.replace(/\bBEGIN\s+TRANSACTION\s*;/gi, 'BEGIN;');
  if (d === 'bq') s = s.replace(/\bBEGIN(\s+TRANSACTION)?\s*;/gi, 'BEGIN TRANSACTION;').replace(/\bCOMMIT\s*;/gi, 'COMMIT TRANSACTION;').replace(/\bROLLBACK\s*;/gi, 'ROLLBACK TRANSACTION;');
  if (d === 'oracle') s = s.replace(/\bBEGIN(\s+TRANSACTION)?\s*;\s*/gi, "COMMIT; -- Oracle'da işlem ilk DML ile kendiliğinden başlar; önceki işi onayladık\n");
  return s;
}
function fwdAnchorDates(sql, d) {
  if (d !== 'tsql') return sql;
  const T = rt(sql); let out = '';
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (t.k === 's' && isDateLit(t.v) && isW(T[pv(T, i)], 'SELECT')) { out += `CAST(${t.v} AS DATE)`; continue; } out += tv(t); }
  return out;
}

/* GROUP BY içindeki SELECT takma adları (SQL Server ve Oracle kabul etmez) */
let ALL_COLS = new Set();
function groupAliasScan(T, cb) {
  const D = depthAt(T);
  for (let i = 0; i < T.length; i++) {
    if (!(isW(T[i], 'GROUP') && isW(T[nx(T, i)], 'BY'))) continue;
    const dep = D[i]; let sel = -1;
    for (let j = i - 1; j >= 0; j--) { if (D[j] < dep) break; if (D[j] === dep && isW(T[j], 'SELECT')) { sel = j; break; } }
    if (sel < 0) continue;
    let from = -1; for (let j = sel + 1; j < i; j++) if (D[j] === dep && isW(T[j], 'FROM')) { from = j; break; }
    if (from < 0) continue;
    const aliases = {};
    for (const it of splitTop(T.slice(sel + 1, from), ',')) { const tt = trimT(it); const sg = tt.filter(sigk); if (sg.length >= 3 && isW(sg[sg.length - 2], 'AS') && (sg[sg.length - 1].k === 'w' || sg[sg.length - 1].k === 'q')) { const k = tt.lastIndexOf(sg[sg.length - 2]); aliases[sg[sg.length - 1].v.toLowerCase()] = txt(trimT(tt.slice(0, k))); } }
    let j = nx(T, nx(T, i)); let st = j;
    const items = [];
    for (; j <= T.length; j++) { const t = T[j]; if (j === T.length || D[j] < dep || (D[j] === dep && (isP(t, ',') || isP(t, ';') || isW(t, 'HAVING', 'ORDER', 'LIMIT', 'UNION', 'EXCEPT', 'INTERSECT', 'WINDOW', 'OFFSET', 'FETCH')))) { items.push([st, j]); if (j === T.length || !isP(t, ',')) break; st = j + 1; } }
    for (const [a, b] of items) { const tt = T.slice(a, b).filter(sigk); if (tt.length === 1 && tt[0].k === 'w') { const nm = tt[0].v.toLowerCase(); const ex = aliases[nm]; if (ex !== undefined && ex.toLowerCase() !== nm && !/\.\s*/.test('') ) cb({ idx: T.indexOf(tt[0]), name: tt[0].v, expr: ex }); } }
  }
}
function fwdGroupAlias(sql) {
  let T = rt(sql);
  for (let g = 0; g < 30; g++) { let hit = null; groupAliasScan(T, h => { if (!hit) hit = h; }); if (!hit) break; T = rt(txt(T.slice(0, hit.idx)) + hit.expr + txt(T.slice(hit.idx + 1))); }
  return txt(T);
}


/* Motorun iç yardımcı fonksiyonlarını (dateadd_ vb.) her programın okunur yazımına çevirir */
const NETFMT = f => ({ yyyy: ['%Y', 'YYYY'], MM: ['%m', 'MM'], dd: ['%d', 'DD'], HH: ['%H', 'HH24'], mm: ['%M', 'MI'], ss: ['%S', 'SS'] });
function dotnetTo(f, kind) { // kind: 0 strftime/mysql, 1 oracle/pg
  const map = NETFMT(); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, t => map[t][kind]).replace(/%M/g, kind === 0 ? '%M' : 'MI');
}
function mysqlTo(f, target) { const m = { '%Y': ['yyyy', 'YYYY', '%Y'], '%m': ['MM', 'MM', '%m'], '%d': ['dd', 'DD', '%d'], '%H': ['HH', 'HH24', '%H'], '%i': ['mm', 'MI', '%M'], '%s': ['ss', 'SS', '%S'] }; const k = target === 'tsql' ? 0 : target === 'sqlite' ? 2 : 1; return f.replace(/%[YmdHis]/g, t => m[t][k]); }
const cleanN = n => { const s = String(n).replace(/\s+/g, ''); const m = s.match(/^(-)?\(?(-?\d+)\)?$/); return m ? (m[1] ? -1 : 1) * parseInt(m[2], 10) : null; };
const PARTSQL = { year: ['%Y', 'YEAR'], month: ['%m', 'MONTH'], day: ['%d', 'DAY'], hour: ['%H', 'HOUR'], minute: ['%M', 'MINUTE'], second: ['%S', 'SECOND'] };
function fwdInternal(N, a, d) {
  if (!/_$/.test(N)) return null;
  const P = s => unq(s || "''").toLowerCase();
  switch (N) {
    case 'DATEADD_': { const p = P(a[0]), n = cleanN(a[1]), v = a[2]; const nn = n === null ? a[1] : n;
      if (d === 'tsql') return `DATEADD(${p}, ${nn}, ${v})`;
      if (d === 'mysql') return `DATE_ADD(${v}, INTERVAL ${nn} ${p.toUpperCase()})`;
      if (d === 'pg') return n === null ? `(${v} + (${nn}) * INTERVAL '1 ${p}')` : `CAST(${v} + INTERVAL '${n} ${p}' AS DATE)`;
      if (d === 'oracle') return p === 'month' ? `ADD_MONTHS(${v}, ${nn})` : p === 'year' ? `ADD_MONTHS(${v}, 12 * (${nn}))` : `(${v} + INTERVAL '${nn}' ${p.toUpperCase()})`;
      return n === null ? `date(${v}, (${nn}) || ' ${p}')` : `date(${v}, '${n >= 0 ? '+' : ''}${n} ${p}')`; }
    case 'DATEDIFF_': { const p = P(a[0]), x = a[1], y = a[2];
      if (d === 'tsql') return `DATEDIFF(${p}, ${x}, ${y})`;
      if (d === 'mysql') return p === 'day' ? `DATEDIFF(${y}, ${x})` : `TIMESTAMPDIFF(${p.toUpperCase()}, ${x}, ${y})`;
      if (p === 'day') return d === 'sqlite' ? `(julianday(${y}) - julianday(${x}))` : `(CAST(${y} AS DATE) - CAST(${x} AS DATE))`;
      if (p === 'second') return d === 'sqlite' ? `((julianday(${y}) - julianday(${x})) * 86400)` : d === 'pg' ? `EXTRACT(EPOCH FROM (${y} - ${x}))` : `((${y} - ${x}) * 86400)`;
      if (p === 'month') return d === 'sqlite' ? `((strftime('%Y', ${y}) - strftime('%Y', ${x})) * 12 + strftime('%m', ${y}) - strftime('%m', ${x}))` : d === 'oracle' ? `MONTHS_BETWEEN(${y}, ${x})` : `(EXTRACT(YEAR FROM AGE(${y}, ${x})) * 12 + EXTRACT(MONTH FROM AGE(${y}, ${x})))`;
      if (p === 'year') return d === 'sqlite' ? `(strftime('%Y', ${y}) - strftime('%Y', ${x}))` : `(EXTRACT(YEAR FROM ${y}) - EXTRACT(YEAR FROM ${x}))`;
      return null; }
    case 'DATEPART_': case 'EXTRACT_': { let p = P(a[0]); const v = a[1]; if (p === 'dow') p = 'dow';
      if (d === 'tsql') return ['year', 'month', 'day'].includes(p) ? `${p.toUpperCase()}(${v})` : p === 'dow' ? `(DATEPART(weekday, ${v}) - 1)` : `DATEPART(${p}, ${v})`;
      if (d === 'mysql') return { year: `YEAR(${v})`, month: `MONTH(${v})`, day: `DAY(${v})`, quarter: `QUARTER(${v})`, weekday: `DAYOFWEEK(${v})`, dow: `(DAYOFWEEK(${v}) - 1)`, hour: `HOUR(${v})`, minute: `MINUTE(${v})`, week: `WEEK(${v})`, dayofyear: `DAYOFYEAR(${v})` }[p] || null;
      if (d === 'pg' || d === 'oracle') return p === 'weekday' ? (d === 'pg' ? `(EXTRACT(DOW FROM ${v}) + 1)` : `TO_NUMBER(TO_CHAR(${v}, 'D'))`) : p === 'dow' ? (d === 'pg' ? `EXTRACT(DOW FROM ${v})` : `(TO_NUMBER(TO_CHAR(${v}, 'D')) - 1)`) : p === 'quarter' ? (d === 'pg' ? `EXTRACT(QUARTER FROM ${v})` : `TO_NUMBER(TO_CHAR(${v}, 'Q'))`) : `EXTRACT(${p.toUpperCase()} FROM ${v})`;
      if (PARTSQL[p]) return `strftime('${PARTSQL[p][0]}', ${v})`;
      return p === 'weekday' ? `(strftime('%w', ${v}) + 1)` : p === 'dow' ? `strftime('%w', ${v})` : p === 'quarter' ? `((strftime('%m', ${v}) + 2) / 3)` : null; }
    case 'DATETRUNC_': { const p = P(a[0]), v = a[1];
      return { tsql: p === 'month' ? `DATEFROMPARTS(YEAR(${v}), MONTH(${v}), 1)` : p === 'year' ? `DATEFROMPARTS(YEAR(${v}), 1, 1)` : `DATETRUNC(${p}, ${v})`, pg: `DATE_TRUNC('${p}', ${v})`, mysql: p === 'month' ? `DATE_FORMAT(${v}, '%Y-%m-01')` : p === 'year' ? `DATE_FORMAT(${v}, '%Y-01-01')` : `DATE(${v})`, oracle: `TRUNC(${v}, '${{ month: 'MM', year: 'YYYY', quarter: 'Q', week: 'IW', day: 'DD' }[p] || 'DD'}')`, sqlite: p === 'month' ? `date(${v}, 'start of month')` : p === 'year' ? `date(${v}, 'start of year')` : `date(${v})` }[d]; }
    case 'LEN_': return { tsql: `LEN(${a[0]})`, pg: `LENGTH(${a[0]})`, mysql: `CHAR_LENGTH(${a[0]})`, oracle: `LENGTH(${a[0]})`, sqlite: `length(${a[0]})` }[d];
    case 'LEFT_': return d === 'oracle' || d === 'sqlite' ? `SUBSTR(${a[0]}, 1, ${a[1]})` : `LEFT(${a[0]}, ${a[1]})`;
    case 'RIGHT_': return d === 'oracle' || d === 'sqlite' ? `SUBSTR(${a[0]}, -(${a[1]}))` : `RIGHT(${a[0]}, ${a[1]})`;
    case 'CHARINDEX_': return d === 'tsql' ? `CHARINDEX(${a.join(', ')})` : d === 'pg' ? `STRPOS(${a[1]}, ${a[0]})` : `INSTR(${a[1]}, ${a[0]})`;
    case 'GETDATE_': return { tsql: 'GETDATE()', pg: 'NOW()', mysql: 'NOW()', oracle: 'SYSDATE', sqlite: "datetime('now', 'localtime')" }[d];
    case 'EOMONTH_': return { tsql: `EOMONTH(${a.join(', ')})`, pg: `CAST(DATE_TRUNC('month', ${a[0]}) + INTERVAL '1 month - 1 day' AS DATE)`, mysql: `LAST_DAY(${a[0]})`, oracle: `LAST_DAY(${a[0]})`, sqlite: `date(${a[0]}, 'start of month', '+1 month', '-1 day')` }[d];
    case 'DATEFROMPARTS_': return { tsql: `DATEFROMPARTS(${a.join(', ')})`, pg: `MAKE_DATE(${a.join(', ')})`, mysql: `STR_TO_DATE(CONCAT_WS('-', ${a.join(', ')}), '%Y-%m-%d')`, oracle: `TO_DATE(${a[0]} || '-' || ${a[1]} || '-' || ${a[2]}, 'YYYY-MM-DD')`, sqlite: `printf('%04d-%02d-%02d', ${a.join(', ')})` }[d];
    case 'FORMAT_': { const f = unq(a[1] || "''"); if (d === 'tsql') return `FORMAT(${a.join(', ')})`; if (!/[yMdHms]/.test(f)) return null; if (d === 'pg' || d === 'oracle') return `TO_CHAR(${a[0]}, '${dotnetTo(f, 1)}')`; if (d === 'mysql') return `DATE_FORMAT(${a[0]}, '${dotnetTo(f, 0).replace(/%M/g, '%i')}')`; return `strftime('${dotnetTo(f, 0)}', ${a[0]})`; }
    case 'TO_CHAR_': { const f = unq(a[1] || "''"); if (d === 'pg' || d === 'oracle') return `TO_CHAR(${a.join(', ')})`; const s = f.replace(/YYYY/g, '%Y').replace(/MM/g, '%m').replace(/DD/g, '%d').replace(/HH24/g, '%H').replace(/MI/g, '%M').replace(/SS/g, '%S'); if (d === 'tsql') return `FORMAT(${a[0]}, '${f.replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd').replace(/HH24/g, 'HH').replace(/MI/g, 'mm').replace(/SS/g, 'ss')}')`; if (d === 'mysql') return `DATE_FORMAT(${a[0]}, '${s.replace(/%M/g, '%i')}')`; return `strftime('${s}', ${a[0]})`; }
    case 'DATE_FORMAT_': { const f = unq(a[1] || "''"); if (d === 'mysql') return `DATE_FORMAT(${a.join(', ')})`; if (d === 'tsql') return `FORMAT(${a[0]}, '${mysqlTo(f, 'tsql')}')`; if (d === 'sqlite') return `strftime('${mysqlTo(f, 'sqlite')}', ${a[0]})`; return `TO_CHAR(${a[0]}, '${mysqlTo(f, 'pg')}')`; }
    case 'TSQL_INT_': return d === 'tsql' ? `${a[1] === '1' ? 'TRY_CAST' : 'CAST'}(${a[0]} AS INT)` : `CAST(${a[0]} AS ${fwdType('INTEGER', d) || 'INTEGER'})`;
    case 'TSQL_NUM_': return d === 'tsql' ? `${a[1] === '1' ? 'TRY_CAST' : 'CAST'}(${a[0]} AS FLOAT)` : `CAST(${a[0]} AS ${fwdType('REAL', d) || 'REAL'})`;
    case 'TSQL_DATE_': return d === 'tsql' ? `${a[1] === '1' ? 'TRY_CAST' : 'CAST'}(${a[0]} AS ${a[2] === '1' ? 'DATETIME2' : 'DATE'})` : d === 'sqlite' ? `${a[2] === '1' ? 'datetime' : 'date'}(${a[0]})` : d === 'mysql' ? `DATE(${a[0]})` : `CAST(${a[0]} AS DATE)`;
    case 'CHOOSE_': return d === 'tsql' ? `CHOOSE(${a.join(', ')})` : `CASE ${a[0]} ${a.slice(1).map((x, i) => `WHEN ${i + 1} THEN ${x}`).join(' ')} END`;
    case 'NVL2_': return d === 'oracle' ? `NVL2(${a.join(', ')})` : `CASE WHEN ${a[0]} IS NOT NULL THEN ${a[1]} ELSE ${a[2]} END`;
    case 'DECODE_': { if (d === 'oracle') return `DECODE(${a.join(', ')})`; let s = `CASE ${a[0]}`; for (let i = 1; i + 1 < a.length; i += 2) s += ` WHEN ${a[i]} THEN ${a[i + 1]}`; if (a.length % 2 === 0) s += ` ELSE ${a[a.length - 1]}`; return s + ' END'; }
    case 'MYSQL_CONCAT_': return d === 'tsql' || d === 'mysql' || d === 'pg' ? `CONCAT(${a.join(', ')})` : `(${a.join(' || ')})`;
    case 'REPLICATE_': return { tsql: `REPLICATE(${a.join(', ')})`, pg: `REPEAT(${a.join(', ')})`, mysql: `REPEAT(${a.join(', ')})`, oracle: `RPAD(${a[0]}, ${a[1]} * LENGTH(${a[0]}), ${a[0]})`, sqlite: null }[d];
    case 'REVERSE_': return d === 'sqlite' ? null : `REVERSE(${a[0]})`;
    case 'CONVERT_STYLE_': { const st = { 104: ['DD.MM.YYYY', '%d.%m.%Y'], 103: ['DD/MM/YYYY', '%d/%m/%Y'], 23: ['YYYY-MM-DD', '%Y-%m-%d'], 112: ['YYYYMMDD', '%Y%m%d'], 120: ['YYYY-MM-DD HH24:MI:SS', '%Y-%m-%d %H:%M:%S'], 101: ['MM/DD/YYYY', '%m/%d/%Y'] }[parseInt(a[1], 10)]; if (d === 'tsql') return `CONVERT(VARCHAR(30), ${a[0]}, ${a[1]})`; if (!st) return null; if (d === 'pg' || d === 'oracle') return `TO_CHAR(${a[0]}, '${st[0]}')`; if (d === 'mysql') return `DATE_FORMAT(${a[0]}, '${st[1].replace('%M', '%i')}')`; return `strftime('${st[1]}', ${a[0]})`; }
    case 'DATENAME_': { const p = P(a[0]); return { tsql: `DATENAME(${p}, ${a[1]})`, pg: `TO_CHAR(${a[1]}, '${p === 'month' ? 'FMMonth' : 'FMDay'}')`, oracle: `TO_CHAR(${a[1]}, '${p === 'month' ? 'FMMonth' : 'FMDay'}')`, mysql: p === 'month' ? `MONTHNAME(${a[1]})` : `DAYNAME(${a[1]})`, sqlite: null }[d]; }
    case 'MONTHS_BETWEEN_': return d === 'oracle' ? `MONTHS_BETWEEN(${a.join(', ')})` : null;
    case 'TRUNC_': return d === 'oracle' || d === 'pg' ? `TRUNC(${a.join(', ')})` : d === 'mysql' ? `TRUNCATE(${a[0]}, ${a[1] || 0})` : null;
    case 'QUOTENAME_': return d === 'tsql' ? `QUOTENAME(${a.join(', ')})` : null;
    case 'ISNUMERIC_': return d === 'tsql' ? `ISNUMERIC(${a[0]})` : null;
  }
  if (/^UDF_/.test(N)) return d === 'tsql' ? `dbo.${N.slice(4).toLowerCase()}(${a.join(', ')})` : null;
  return null;
}
function fwdInternalBq(N, a) {
  const P = s => unq(s || "''").toLowerCase(); const PU = s => P(s).toUpperCase();
  switch (N) {
    case 'DATEADD_': { const n = cleanN(a[1]); return `DATE_ADD(${a[2]}, INTERVAL ${n === null ? a[1] : n} ${PU(a[0])})`; }
    case 'DATEDIFF_': return `DATE_DIFF(${a[2]}, ${a[1]}, ${PU(a[0])})`;
    case 'DATEPART_': case 'EXTRACT_': { const p = P(a[0]); if (p === 'dow') return `(EXTRACT(DAYOFWEEK FROM ${a[1]}) - 1)`; if (p === 'weekday') return `EXTRACT(DAYOFWEEK FROM ${a[1]})`; return `EXTRACT(${p.toUpperCase()} FROM ${a[1]})`; }
    case 'DATETRUNC_': return `DATE_TRUNC(${a[1]}, ${PU(a[0])})`;
    case 'LEN_': return `LENGTH(${a[0]})`;
    case 'LEFT_': return `LEFT(${a[0]}, ${a[1]})`;
    case 'RIGHT_': return `RIGHT(${a[0]}, ${a[1]})`;
    case 'CHARINDEX_': return `STRPOS(${a[1]}, ${a[0]})`;
    case 'GETDATE_': return 'CURRENT_DATETIME()';
    case 'EOMONTH_': return `LAST_DAY(${a[0]})`;
    case 'DATEFROMPARTS_': return `DATE(${a.join(', ')})`;
    case 'FORMAT_': { const f = unq(a[1] || "''"); if (!/[yMdHms]/.test(f)) return null; return `${bqFmtFn(a[0])}('${dotnetTo(f, 0)}', ${a[0]})`; }
    case 'TO_CHAR_': { const f = unq(a[1] || "''").replace(/YYYY/g, '%Y').replace(/MM/g, '%m').replace(/DD/g, '%d').replace(/HH24/g, '%H').replace(/MI/g, '%M').replace(/SS/g, '%S'); return `${bqFmtFn(a[0])}('${f}', ${a[0]})`; }
    case 'DATE_FORMAT_': return `${bqFmtFn(a[0])}('${mysqlTo(unq(a[1] || "''"), 'sqlite')}', ${a[0]})`;
    case 'TSQL_INT_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS INT64)`;
    case 'TSQL_NUM_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS FLOAT64)`;
    case 'TSQL_DATE_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS ${a[2] === '1' ? 'DATETIME' : 'DATE'})`;
    case 'BQ_INT_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS INT64)`;
    case 'BQ_NUM_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS FLOAT64)`;
    case 'BQ_DATE_': return `${a[1] === '1' ? 'SAFE_CAST' : 'CAST'}(${a[0]} AS DATE)`;
    case 'BQFMT_': return `${bqFmtFn(a[1])}(${a[0]}, ${a[1]})`;
    case 'PARSE_DATE_': return `${a[2] === '1' ? 'PARSE_DATETIME' : 'PARSE_DATE'}(${a[0]}, ${a[1]})`;
    case 'REGEXP_EXTRACT_': return `REGEXP_EXTRACT(${a.join(', ')})`;
    case 'APPROX_QUANTILES_': return `APPROX_QUANTILES(${a.join(', ')})`;
    case 'ARR_TO_STR_': return `ARRAY_TO_STRING(${a.join(', ')})`;
    case 'CHOOSE_': return `CASE ${a[0]} ${a.slice(1).map((x, i) => `WHEN ${i + 1} THEN ${x}`).join(' ')} END`;
    case 'NVL2_': return `IF(${a[0]} IS NOT NULL, ${a[1]}, ${a[2]})`;
    case 'DECODE_': { let s = `CASE ${a[0]}`; for (let i = 1; i + 1 < a.length; i += 2) s += ` WHEN ${a[i]} THEN ${a[i + 1]}`; if (a.length % 2 === 0) s += ` ELSE ${a[a.length - 1]}`; return s + ' END'; }
    case 'MYSQL_CONCAT_': return `CONCAT(${a.join(', ')})`;
    case 'REPLICATE_': return `REPEAT(${a.join(', ')})`;
    case 'REVERSE_': return `REVERSE(${a[0]})`;
    case 'INITCAP_': return `INITCAP(${a[0]})`;
    case 'LPAD_': return `LPAD(${a.join(', ')})`;
    case 'RPAD_': return `RPAD(${a.join(', ')})`;
    case 'CONVERT_STYLE_': { const st = { 104: '%d.%m.%Y', 103: '%d/%m/%Y', 23: '%Y-%m-%d', 112: '%Y%m%d', 120: '%Y-%m-%d %H:%M:%S', 101: '%m/%d/%Y' }[parseInt(a[1], 10)]; return st ? `${bqFmtFn(a[0])}('${st}', ${a[0]})` : null; }
    case 'DATENAME_': return `${bqFmtFn(a[1])}('${P(a[0]) === 'month' ? '%B' : '%A'}', ${a[1]})`;
    case 'TRUNC_': return `TRUNC(${a.join(', ')})`;
    case 'SPLIT_PART_': return `SPLIT(${a[0]}, ${a[1]})[SAFE_ORDINAL(${a[2]})]`;
    case 'TRANSLATE_': return `TRANSLATE(${a[0]}, ${a[1]}, ${a[2]})`;
    case 'SEQ_NEXT_': case 'SEQ_CURR_': return null;
  }
  return null;
}
function splitSemisKeep(sql) { const T = rt(sql); const D = depthAt(T); const out = []; let cur = ''; for (let i = 0; i < T.length; i++) { cur += tv(T[i]); if (D[i] === 0 && isP(T[i], ';')) { out.push(cur); cur = ''; } } if (cur) out.push(cur); return out; }
function fwdBqSetOps(sql) {
  const T = rt(sql); let out = '';
  for (let i = 0; i < T.length; i++) { const t = T[i]; out += tv(t); if (isW(t, 'UNION', 'INTERSECT', 'EXCEPT') && !isW(T[nx(T, i)], 'ALL', 'DISTINCT')) out += ' DISTINCT'; }
  return out;
}
function fwdBqCteCols(sql) {
  let T = rt(sql);
  for (let g = 0; g < 20; g++) {
    let hit = -1;
    for (let i = 0; i < T.length; i++) {
      if (!(T[i].k === 'w' || T[i].k === 'q')) continue; const p = T[pv(T, i)]; if (!(isW(p, 'WITH', 'RECURSIVE') || isP(p, ','))) continue;
      const o = nx(T, i); if (!isP(T[o], '(')) continue; const c = closeP(T, o); const as = nx(T, c); if (!isW(T[as], 'AS')) continue; const o2 = nx(T, as); if (!isP(T[o2], '(')) continue;
      if (isP(p, ',')) { let ok = false; for (let j = pv(T, i); j >= 0; j--) { if (isW(T[j], 'WITH')) { ok = true; break; } if (isW(T[j], 'SELECT', 'FROM', 'WHERE')) { const D = depthAt(T); if (D[j] === D[i]) break; } } if (!ok) continue; }
      hit = i; break;
    }
    if (hit < 0) break;
    const o = nx(T, hit), c = closeP(T, o); const cols = argsOf(T, o, c).map(x => txt(x).trim());
    const as = nx(T, c), o2 = nx(T, as), c2 = closeP(T, o2);
    let body = T.slice(o2 + 1, c2); let BD = depthAt(body);
    const fv = body.find(sigk);
    if (isW(fv, 'VALUES')) { const rows = []; let j = body.indexOf(fv) + 1; for (; j < body.length; j++) { if (isP(body[j], '(') && BD[j] === 0) { const cc = closeP(body, j); rows.push(argsOf(body, j, cc).map(x => txt(x).trim())); j = cc; } } const sq = rows.map((r, ri) => 'SELECT ' + r.map((v, ci) => ri === 0 && cols[ci] ? v + ' AS ' + cols[ci] : v).join(', ')).join(' UNION ALL '); T = rt(txt(T.slice(0, o)).replace(/\s+$/, '') + ' AS (' + sq + ')' + txt(T.slice(c2 + 1))); continue; }
    const sel = body.findIndex((t, j) => BD[j] === 0 && isW(t, 'SELECT'));
    if (sel < 0) { T = rt(txt(T.slice(0, o)) + txt(T.slice(c + 1))); continue; }
    let st = nx(body, sel); if (isW(body[st], 'DISTINCT', 'ALL')) st = nx(body, st);
    let fe = body.length; for (let j = st; j < body.length; j++) if (BD[j] === 0 && isW(body[j], 'FROM', 'UNION', 'EXCEPT', 'INTERSECT', 'WHERE', 'GROUP', 'ORDER', 'LIMIT')) { fe = j; break; }
    const items = splitTop(body.slice(st, fe), ',').map(trimT);
    const newItems = items.map((it, k) => { const cn = cols[k]; if (!cn) return txt(it); const sg = it.filter(sigk); if (sg.length >= 3 && isW(sg[sg.length - 2], 'AS')) return txt(it.slice(0, it.indexOf(sg[sg.length - 2]))).trim() + ' AS ' + cn; if (sg.length === 1 && sg[0].v === cn) return cn; return txt(it).trim() + ' AS ' + cn; });
    const newBody = txt(body.slice(0, st)) + newItems.join(', ') + ' ' + txt(body.slice(fe)).replace(/^\s+/, '');
    T = rt(txt(T.slice(0, o)).replace(/\s+$/, '') + ' AS (' + newBody + ')' + txt(T.slice(c2 + 1)));
  }
  return txt(T);
}
function forwardCanon(sql, d) {
  // 1) motorun eklediği CAST(… AS INTEGER) sarmalayıcılarını kaldır  2) hedef programa çevir
  let s = d === 'sqlite' ? sql : renderCalls(rt(sql), (N, a, A) => { if (N !== 'CAST') return null; const c = castParts(A); if (!c || !/^INTEGER$/i.test(c.type)) return null; if (/^(datepart_|extract_|datediff_|mysql_datediff_)\s*\(/i.test(txt(c.xt).trim())) return renderCalls(c.xt, () => null); return null; });
  s = s.replace(/\* 1\.0 \//g, '/');
  if (d === 'sqlite') return renderCalls(rt(s), (N, a) => fwdInternal(N, a, 'sqlite') ?? null);
  let out = forward(s, d);
  if (d === 'tsql' || d === 'mysql') out = out.replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, '');
  return out;
}
function isProcedural(code) { const T = tokenize(code).filter(sigk); return T.some((t, i) => t.k === 'var' || t.k === 'tmp' || isW(t, 'DECLARE', 'PRINT', 'WHILE', 'EXEC', 'EXECUTE', 'GO', 'THROW', 'RAISERROR', 'TRY', 'CATCH') || (isW(t, 'IF') && (i === 0 || isP(T[i - 1], ';'))) || (isW(t, 'CREATE', 'ALTER') && isW(T[i + 1], 'PROC', 'PROCEDURE', 'FUNCTION', 'TRIGGER')) || (isW(t, 'CREATE') && isW(T[i + 1], 'OR') && isW(T[i + 3], 'PROC', 'PROCEDURE', 'FUNCTION', 'TRIGGER'))); }
function convert(code, from, to, mkdb) {
  if (from === to) return { text: code };
  if (from === 'tsql' && isProcedural(code)) return { error: 'Bu kod T-SQL\'e özgü yordamsal yapılar (değişken, IF/WHILE, prosedür, geçici tablo…) içeriyor; diğer programlara otomatik çevrilemez.' };
  let canon;
  if (from === 'sqlite') canon = code;
  else { const db = mkdb(); const r = runDialect(db, code, from); try { db.close(); } catch (e) { /* yok */ } if (r.error) return { error: 'Önce sorgunun ' + DNAME[from] + ' sürümü hatasız çalışmalı: ' + r.error }; canon = r.translated.map(x => x.trim().replace(/;\s*$/, '')).join(';\n') + ';'; }
  if (from === 'pg' || from === 'oracle') canon = canon.replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, '');
  try { return { text: forwardCanon(canon, to) }; } catch (e) { return { error: 'Çeviri yapılamadı: ' + e.message }; }
}

/* Boolean sütunlar: PostgreSQL'de = 1 yerine = TRUE, aritmetik ve toplamada CAST; SQL Server BIT toplanamaz */
function fwdBool(sql, d) {
  const T = rt(sql); const bool = schemaIdx().bool; const cast = d === 'tsql' ? 'INT' : 'INTEGER';
  for (let i = 0; i < T.length; i++) {
    const t = T[i]; if (t.k !== 'w' || !bool.has(t.u.toLowerCase())) continue;
    const pp = pv(T, i), n1 = nx(T, i); let st = i; if (isP(T[pp], '.')) st = pv(T, pp);
    if (T[n1] && isP(T[n1], '(')) continue;
    const before = pv(T, st); const n2 = nx(T, n1);
    if (d === 'pg' && T[n1] && ['=', '<>', '!='].includes(T[n1].v) && T[n2] && /^[01]$/.test(T[n2].v)) { T[n2] = Object.assign({}, T[n2], { v: T[n2].v === '1' ? 'TRUE' : 'FALSE', k: 'w', u: T[n2].v === '1' ? 'TRUE' : 'FALSE' }); continue; }
    const arith = x => !!x && ['*', '+', '-', '/', '%'].includes(x.v) && (x.k === 'o' || x.k === 'p');
    const inAgg = isP(T[before], '(') && T[pv(T, before)] && isW(T[pv(T, before)], 'SUM', 'AVG', 'MIN', 'MAX') && isP(T[n1], ')');
    if (d === 'pg' ? (inAgg || arith(T[n1]) || arith(T[before])) : (inAgg && !isW(T[pv(T, before)], 'MIN', 'MAX'))) { T[st] = Object.assign({}, T[st], { v: 'CAST(' + T[st].v }); T[i] = Object.assign({}, T[i], { v: T[i].v + ' AS ' + cast + ')' }); }
  }
  return T.map(t => t.v).join('');
}
function forward(sql, d) {
  if (!sql || d === 'sqlite') return sql;
  FWD_SQL = sql;
  let s = prePassJulian(sql);
  s = fwdAnchorDates(s, d);
  s = renderFwdInner(s, d);
  if (d === 'tsql') s = rewriteChains(s, '||', ops => ops.join(' + '));
  if (d === 'mysql') s = rewriteChains(s, '||', ops => 'CONCAT(' + ops.join(', ') + ')');
  if (d === 'oracle' || d === 'bq') s = rewriteChains(s, '%', ops => ops.reduce((a, b) => `MOD(${a}, ${b})`));
  s = fwdLikeYear(s, d);
  s = fwdLimit(s, d);
  if (d === 'tsql' || d === 'oracle') s = s.replace(/\bWITH\s+RECURSIVE\b/gi, 'WITH');
  s = fwdDdl(s, d);
  s = fwdTx(s, d);
  if (d === 'tsql' || d === 'oracle') s = fwdGroupAlias(s);
  if (d === 'oracle') s = fwdOracleMisc(s);
  if (d === 'pg' || d === 'tsql') s = fwdBool(s, d);
  if (d === 'pg') s = s.replace(/\browid\b/gi, 'ctid');
  if (d === 'pg') s = pgDateLits(s);
  if (d === 'bq') { s = fwdBqSetOps(s); s = fwdBqCteCols(s); s = splitSemisKeep(s).map(st => /^\s*(UPDATE|DELETE)\b/i.test(st.replace(/^(\s|--[^\n]*\n)+/, '')) && !/\bWHERE\b/i.test(st) ? st.replace(/(\s*;?\s*)$/, ' WHERE true$1') : st).join(''); }
  return s;
}
function pgDateLits(sql) { // INTERVAL ile toplanan sabitlere DATE ekle
  const T = rt(sql); let out = '';
  const rec = /\bWITH\s+RECURSIVE\b/i.test(sql);
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (t.k === 's' && isDateLit(t.v)) { const n = nx(T, i), n2 = nx(T, n), pb = T[pv(T, i)]; if (isP(T[n], '+') && isW(T[n2], 'INTERVAL') && !isW(pb, 'DATE')) { out += 'DATE ' + t.v; continue; } /* özyinelemeli CTE'nin başlangıç satırındaki tarih sabiti metin olarak kalmasın */ if (rec && isW(pb, 'SELECT')) { out += 'DATE ' + t.v; continue; } } out += tv(t); }
  return out;
}

/* ------------------------------------------------------------------ Hata mesajları ve denetim (lint) */
class DErr extends Error { constructor(msg, hint, code) { super(msg); this.hint = hint || ''; this.code = code || ''; } }
const VENDOR = {
  tsql: { syntax: w => `Msg 102, Level 15, State 1: Incorrect syntax near '${w}'.`, fn: w => `Msg 195, Level 15, State 10: '${w}' is not a recognized built-in function name.`, table: w => `Msg 208, Level 16, State 1: Invalid object name '${w}'.`, col: w => `Msg 207, Level 16, State 1: Invalid column name '${w}'.` },
  pg: { syntax: w => `ERROR: syntax error at or near "${w}"`, fn: w => `ERROR: function ${w.toLowerCase()}(...) does not exist`, table: w => `ERROR: relation "${w}" does not exist`, col: w => `ERROR: column "${w}" does not exist` },
  mysql: { syntax: w => `ERROR 1064 (42000): You have an error in your SQL syntax; check the manual ... near '${w}'`, fn: w => `ERROR 1305 (42000): FUNCTION anadolu.${w} does not exist`, table: w => `ERROR 1146 (42S02): Table 'anadolu.${w}' doesn't exist`, col: w => `ERROR 1054 (42S22): Unknown column '${w}' in 'field list'` },
  oracle: { syntax: () => `ORA-00933: SQL command not properly ended`, fn: w => `ORA-00904: "${w.toUpperCase()}": invalid identifier`, table: () => `ORA-00942: table or view does not exist`, col: w => `ORA-00904: "${w.toUpperCase()}": invalid identifier` },
  bq: { syntax: w => `Syntax error: Unexpected keyword ${String(w).toUpperCase()} at [1:1]`, fn: w => `Function not found: ${w}`, table: w => `Not found: Table proje:anadolu.${w} was not found in location US`, col: w => `Unrecognized name: ${w}` },
  sqlite: { syntax: w => `near "${w}": syntax error`, fn: w => `no such function: ${w}`, table: w => `no such table: ${w}`, col: w => `no such column: ${w}` }
};
function sigList(T) { return T.filter(sigk); }
function isCursorFetchSig(T, i) { const n1 = T[i + 1], n2 = T[i + 2]; if (isW(n1, 'NEXT', 'PRIOR', 'FIRST', 'LAST')) return isW(n2, 'FROM'); if (isW(n1, 'ABSOLUTE', 'RELATIVE')) return true; return !!n1 && (n1.k === 'w' || n1.k === 'q' || n1.k === 'var') && !isW(n1, 'NEXT', 'FIRST'); }
function lint(sql, d) {
  if (d === 'sqlite') return null;
  const T = sigList(tokenize(sql)); const V = VENDOR[d];
  const call = (i, ...names) => T[i] && T[i].k === 'w' && names.includes(T[i].u) && isP(T[i + 1], '(') && !isP(T[i - 1], '.');
  const err = (w, hint, kind) => new DErr((kind === 'fn' ? V.fn : V.syntax)(w), hint);
  for (let i = 0; i < T.length; i++) {
    const t = T[i], u = t.u;
    const common = {
      STRFTIME: 'strftime SQLite\'a özgüdür.', JULIANDAY: 'julianday SQLite\'a özgüdür.',
      GROUP_CONCAT: null, NVL: null, ISNULL: null, IFNULL: null, LEN: null, DATEADD: null, DATEDIFF: null, DATEPART: null, GETDATE: null, CHARINDEX: null, INSTR: null, IIF: null, DATE_FORMAT: null, DATE_TRUNC: null, TO_CHAR: null, DECODE: null, STRING_AGG: null, LISTAGG: null
    };
    void common;
    if (d === 'tsql') {
      if (isW(t, 'LIMIT')) return err('LIMIT', 'SQL Server\'da LIMIT yoktur. İlk N satır için SELECT TOP (N) ... veya ORDER BY ... OFFSET 0 ROWS FETCH NEXT N ROWS ONLY kullan.');
      if (isP(t, '||')) return err('||', 'SQL Server\'da metin birleştirme + veya CONCAT() ile yapılır.');
      if (call(i, 'IFNULL')) return err('IFNULL', 'SQL Server\'da ISNULL(x, y) veya COALESCE(x, y) kullan.', 'fn');
      if (call(i, 'LENGTH')) return err('LENGTH', 'SQL Server\'da LEN() kullanılır.', 'fn');
      if (call(i, 'SUBSTR')) return err('SUBSTR', 'SQL Server\'da SUBSTRING(metin, başlangıç, uzunluk) kullanılır.', 'fn');
      if (call(i, 'INSTR')) return err('INSTR', 'SQL Server\'da CHARINDEX(aranan, metin) kullanılır.', 'fn');
      if (call(i, 'STRFTIME', 'JULIANDAY', 'DATE_FORMAT', 'DATE_TRUNC', 'TO_CHAR', 'NVL', 'NVL2', 'DECODE', 'NOW', 'CURDATE', 'GROUP_CONCAT', 'LISTAGG', 'EXTRACT', 'TO_DATE', 'ADD_MONTHS', 'DATE_ADD', 'DATE_SUB', 'RANDOM', 'RAND_') ) return err(t.v, { STRFTIME: 'Tarih biçimlemek için FORMAT(tarih, \'yyyy-MM\') veya YEAR(), MONTH(), DATEPART() kullan.', JULIANDAY: 'Gün farkı için DATEDIFF(day, başlangıç, bitiş) kullan.', NVL: 'SQL Server\'da ISNULL veya COALESCE kullan.', GROUP_CONCAT: 'SQL Server\'da STRING_AGG(sütun, \',\') kullan.', EXTRACT: 'SQL Server\'da YEAR(d), MONTH(d) veya DATEPART(year, d) kullan.', NOW: 'SQL Server\'da GETDATE() kullan.', DATE_ADD: 'SQL Server\'da DATEADD(day, n, tarih) kullan.', RANDOM: 'Rastgele sıralama için ORDER BY NEWID() kullan.' }[u] || 'Bu fonksiyon SQL Server\'da yoktur.', 'fn');
      if (call(i, 'DATE')) return err('DATE', 'SQL Server\'da CAST(x AS DATE) veya DATEADD/DATEFROMPARTS kullan.', 'fn');
      if (isW(t, 'ILIKE')) return err('ILIKE', 'SQL Server\'da ILIKE yoktur; LIKE varsayılan harmanlamada büyük/küçük harf duyarsızdır.');
      if (isP(t, '::')) return err('::', 'SQL Server\'da tip dönüşümü CAST(x AS tip) veya CONVERT(tip, x) ile yapılır.');
      if (t.k === 'q' && t.v[0] === '`') return err(t.v, 'SQL Server\'da tanımlayıcılar [köşeli parantez] veya "çift tırnak" ile yazılır.');
      if (isW(t, 'RECURSIVE')) return err('RECURSIVE', 'SQL Server\'da özyinelemeli CTE için sadece WITH yazılır.');
      if (isW(t, 'RETURNING')) return err('RETURNING', 'SQL Server\'da değişen satırlar OUTPUT inserted.* / deleted.* ile döndürülür.');
      if (isW(t, 'CONFLICT')) return err('ON CONFLICT', 'SQL Server\'da upsert için MERGE kullanılır.');
      if (isW(t, 'NULLS') && isW(T[i + 1], 'FIRST', 'LAST')) return err('NULLS', 'SQL Server NULLS FIRST/LAST desteklemez; ORDER BY CASE WHEN x IS NULL THEN 1 ELSE 0 END, x kullan.');
      if (isW(t, 'FETCH') && !T.slice(0, i).some(x => isW(x, 'OFFSET')) && !isCursorFetchSig(T, i)) return err('FETCH', 'SQL Server\'da FETCH, önce OFFSET n ROWS ile kullanılmalıdır.');
      if (isW(t, 'TRUE', 'FALSE') && !isP(T[i - 1], '.')) return err(t.v, 'SQL Server\'da boolean sabit yoktur; 1 / 0 kullan.', 'col');
      if (isW(t, 'MINUS')) return err('MINUS', 'SQL Server\'da EXCEPT kullanılır.');
      if (isW(t, 'DUAL')) return err('dual', 'SQL Server\'da FROM olmadan SELECT yazılabilir.', 'table');
      if (isW(t, 'CREATE') && isW(T[i + 1], 'TABLE')) { let j = i + 3; if (isW(T[j], 'AS')) return err('AS', 'SQL Server\'da sorgudan tablo oluşturmak için SELECT ... INTO yeni_tablo FROM ... kullanılır.'); }
      if (isW(t, 'INTERVAL')) return err('INTERVAL', 'SQL Server\'da DATEADD(day, n, tarih) kullan.');
      if (call(i, 'LEVENSHTEIN', 'REGEXP')) return err(t.v, 'SQL Server\'da yerleşik Levenshtein yoktur; benzerlik için SOUNDEX / DIFFERENCE kullanılabilir.', 'fn');
      if (isW(t, 'REGEXP', 'RLIKE')) return err(t.v, 'SQL Server\'da REGEXP operatörü yoktur; SQL Server 2025 ile gelen REGEXP_LIKE(metin, desen) fonksiyonunu kullan.');
      if (isP(t, '~') && isP(T[i - 1], '!') === false && T[i - 1] && T[i - 1].k !== 'o') return err('~', 'SQL Server\'da ~ bit düzeyinde DEĞİL işlemidir; desen eşlemek için REGEXP_LIKE kullan.');
    }
    if (d === 'pg') {
      if (call(i, 'STRING_SPLIT', 'SOUNDEX', 'DIFFERENCE', 'LEVENSHTEIN') && false) return null;
      if (call(i, 'STRING_SPLIT')) return err(t.v, 'PostgreSQL\'de string_to_table(metin, \',\') veya unnest(string_to_array(...)) kullanılır.', 'fn');
      if (isW(t, 'TOP') && isW(T[i - 1], 'SELECT', 'DISTINCT')) return err('TOP', 'PostgreSQL\'de TOP yoktur; sorgu sonuna LIMIT n ekle.');
      if (call(i, 'ISNULL', 'IFNULL', 'NVL')) return err(t.v, 'PostgreSQL\'de COALESCE(x, y) kullan.', 'fn');
      if (call(i, 'LEN')) return err('LEN', 'PostgreSQL\'de LENGTH() kullanılır.', 'fn');
      if (call(i, 'DATEADD', 'DATEDIFF', 'DATEPART', 'GETDATE', 'STRFTIME', 'JULIANDAY', 'CHARINDEX', 'INSTR', 'IIF', 'GROUP_CONCAT', 'DATE_FORMAT', 'YEAR', 'MONTH', 'DAY', 'DECODE', 'NVL2', 'CURDATE', 'DATE_ADD', 'LISTAGG', 'DATEFROMPARTS', 'EOMONTH', 'FORMAT', 'ADD_MONTHS')) return err(t.v, { DATEADD: 'PostgreSQL\'de tarih + INTERVAL \'7 day\' kullan.', DATEDIFF: 'İki tarihin farkı doğrudan çıkarma ile bulunur: bitis - baslangic.', YEAR: 'PostgreSQL\'de EXTRACT(YEAR FROM tarih) kullan.', MONTH: 'PostgreSQL\'de EXTRACT(MONTH FROM tarih) kullan.', STRFTIME: 'PostgreSQL\'de TO_CHAR(tarih, \'YYYY-MM\') kullan.', GETDATE: 'PostgreSQL\'de NOW() veya CURRENT_DATE kullan.', GROUP_CONCAT: 'PostgreSQL\'de STRING_AGG(x, \',\') kullan.', INSTR: 'PostgreSQL\'de STRPOS(metin, aranan) kullan.', CHARINDEX: 'PostgreSQL\'de STRPOS(metin, aranan) kullan.', IIF: 'PostgreSQL\'de CASE WHEN kullan.' }[u] || 'Bu fonksiyon PostgreSQL\'de yoktur.', 'fn');
      if (t.k === 'q' && (t.v[0] === '[' || t.v[0] === '`')) return err(t.v, 'PostgreSQL\'de tanımlayıcılar "çift tırnak" ile yazılır.');
      if (t.k === 'var' || t.k === 'tmp') return err(t.v, 'Değişkenler ve # geçici tablolar SQL Server sözdizimidir.');
      if (isW(t, 'MINUS')) return err('MINUS', 'PostgreSQL\'de EXCEPT kullanılır.');
      if (call(i, 'DATE') && T.slice(i).findIndex(x => isP(x, ',')) > 0 && T.slice(i + 1, i + 6).some(x => isP(x, ','))) return err('date', 'date() iki argümanla SQLite\'a özgüdür; tarih + INTERVAL \'1 day\' kullan.', 'fn');
    }
    if (d === 'mysql') {
      if (isW(t, 'TOP') && isW(T[i - 1], 'SELECT', 'DISTINCT')) return err('TOP', 'MySQL\'de TOP yoktur; sorgu sonuna LIMIT n ekle.');
      if (isP(t, '||')) return err('||', 'MySQL\'de || mantıksal VEYA (OR) anlamına gelir. Metin birleştirmek için CONCAT(a, b) kullan.');
      if (call(i, 'NVL', 'LEN', 'DATEADD', 'DATEPART', 'GETDATE', 'STRFTIME', 'JULIANDAY', 'CHARINDEX', 'IIF', 'TO_CHAR', 'DATE_TRUNC', 'STRING_AGG', 'DECODE', 'LISTAGG', 'DATEFROMPARTS', 'EOMONTH', 'ADD_MONTHS')) return err(t.v, { NVL: 'MySQL\'de IFNULL veya COALESCE kullan.', LEN: 'MySQL\'de CHAR_LENGTH() kullan.', DATEADD: 'MySQL\'de DATE_ADD(tarih, INTERVAL 7 DAY) kullan.', GETDATE: 'MySQL\'de NOW() veya CURDATE() kullan.', STRFTIME: 'MySQL\'de DATE_FORMAT(tarih, \'%Y-%m\') kullan.', JULIANDAY: 'MySQL\'de DATEDIFF(bitis, baslangic) kullan.', IIF: 'MySQL\'de IF(koşul, a, b) kullan.', STRING_AGG: 'MySQL\'de GROUP_CONCAT(x SEPARATOR \',\') kullan.', TO_CHAR: 'MySQL\'de DATE_FORMAT kullan.', CHARINDEX: 'MySQL\'de INSTR(metin, aranan) kullan.' }[u] || 'Bu fonksiyon MySQL\'de yoktur.', 'fn');
      if (call(i, 'ISNULL')) { const c = closeP(T, i + 1); if (T.slice(i + 2, c).some(x => isP(x, ','))) return err('ISNULL', 'MySQL\'de ISNULL(x) tek argüman alır ve 1/0 döner. Varsayılan değer için IFNULL(x, y) kullan.', 'fn'); }
      if (isP(t, '::')) return err('::', 'MySQL\'de tip dönüşümü CAST(x AS tip) ile yapılır.');
      if (isW(t, 'ILIKE')) return err('ILIKE', 'MySQL\'de LIKE varsayılan olarak büyük/küçük harf duyarsızdır.');
      if (t.k === 'q' && t.v[0] === '[') return err(t.v, 'MySQL\'de tanımlayıcılar `ters tırnak` ile yazılır.');
      if (isW(t, 'FULL') && isW(T[i + 1], 'JOIN', 'OUTER')) return err('FULL', 'MySQL FULL OUTER JOIN desteklemez; LEFT JOIN ile RIGHT JOIN sonuçlarını UNION ile birleştir.');
      if (isW(t, 'RETURNING')) return err('RETURNING', 'MySQL RETURNING desteklemez.');
      if (isW(t, 'CONFLICT')) return err('CONFLICT', 'MySQL\'de INSERT ... ON DUPLICATE KEY UPDATE kullanılır.');
      if (isW(t, 'NULLS') && isW(T[i + 1], 'FIRST', 'LAST')) return err('NULLS', 'MySQL NULLS FIRST/LAST desteklemez.');
      if (isW(t, 'FETCH')) return err('FETCH', 'MySQL\'de LIMIT n [OFFSET m] kullanılır.');
      if (t.k === 'tmp' || (t.k === 'var' && !t.v.startsWith('@@'))) return err(t.v, 'Bu tarayıcı motorunda değişkenler yalnızca SQL Server modunda desteklenir.');
      if (isW(t, 'MINUS')) return err('MINUS', 'MySQL\'de EXCEPT kullanılır (8.0.31+).');
      if (isW(t, 'SEQUENCE') && isW(T[i - 1], 'CREATE')) return err('SEQUENCE', 'MySQL\'de SEQUENCE nesnesi yoktur; otomatik numara için AUTO_INCREMENT kullan (MariaDB 10.3+ SEQUENCE destekler).');
      if (call(i, 'REGEXP_COUNT', 'TRANSLATE', 'GENERATE_SERIES', 'STRING_SPLIT', 'LEVENSHTEIN')) return err(t.v, { REGEXP_COUNT: 'MySQL\'de REGEXP_COUNT yoktur; eşleşmeleri saymak için (CHAR_LENGTH(s) - CHAR_LENGTH(REGEXP_REPLACE(s, desen, \'\'))) gibi bir hile gerekir.', TRANSLATE: 'MySQL\'de TRANSLATE yoktur; iç içe REPLACE kullan.', GENERATE_SERIES: 'MySQL\'de sayı/tarih serisi için WITH RECURSIVE kullan.' }[u] || 'Bu fonksiyon MySQL\'de yoktur.', 'fn');
    }
    if (d === 'bq') {
      if (isW(t, 'TOP') && isW(T[i - 1], 'SELECT', 'DISTINCT')) return err('TOP', 'BigQuery\'de TOP yoktur; sorgu sonuna LIMIT n ekle.');
      if (call(i, 'ISNULL', 'NVL', 'LEN', 'DATEADD', 'DATEDIFF', 'DATEPART', 'DATENAME', 'GETDATE', 'STRFTIME', 'JULIANDAY', 'CHARINDEX', 'IIF', 'GROUP_CONCAT', 'DATE_FORMAT', 'TO_CHAR', 'DECODE', 'NOW', 'CURDATE', 'LISTAGG', 'DATEFROMPARTS', 'EOMONTH', 'STRING_SPLIT', 'YEAR', 'MONTH', 'DAY', 'TO_DATE', 'ADD_MONTHS', 'NVL2', 'STR_TO_DATE', 'REGEXP_LIKE', 'REGEXP_COUNT', 'GENERATE_SERIES', 'DIFFERENCE', 'LEVENSHTEIN', 'TRY_CAST', 'CONVERT', 'SYSDATE', 'DATE_PART', 'NEWID', 'JSON_OBJECT_AGG'))
        return err(t.v, { ISNULL: 'BigQuery\'de IFNULL(x, y) veya COALESCE kullan.', NVL: 'BigQuery\'de IFNULL(x, y) kullan.', LEN: 'BigQuery\'de LENGTH() kullanılır.', DATEADD: 'BigQuery\'de DATE_ADD(tarih, INTERVAL 7 DAY) kullan.', DATEDIFF: 'BigQuery\'de DATE_DIFF(bitis, baslangic, DAY) kullan.', DATEPART: 'BigQuery\'de EXTRACT(YEAR FROM tarih) kullan.', YEAR: 'BigQuery\'de EXTRACT(YEAR FROM tarih) kullan.', MONTH: 'BigQuery\'de EXTRACT(MONTH FROM tarih) kullan.', DAY: 'BigQuery\'de EXTRACT(DAY FROM tarih) kullan.', GETDATE: 'BigQuery\'de CURRENT_DATE() veya CURRENT_DATETIME() kullan.', NOW: 'BigQuery\'de CURRENT_DATETIME() kullan.', STRFTIME: 'BigQuery\'de FORMAT_DATE(\'%Y-%m\', tarih) kullan.', JULIANDAY: 'BigQuery\'de DATE_DIFF(bitis, baslangic, DAY) kullan.', CHARINDEX: 'BigQuery\'de STRPOS(metin, aranan) kullan.', IIF: 'BigQuery\'de IF(koşul, a, b) kullan.', GROUP_CONCAT: 'BigQuery\'de STRING_AGG(x, \',\') kullan.', DATE_FORMAT: 'BigQuery\'de FORMAT_DATE kullan.', TO_CHAR: 'BigQuery\'de FORMAT_DATE kullan.', STRING_SPLIT: 'BigQuery\'de SPLIT(metin, \',\') bir dizi döndürür; satırlara açmak için UNNEST kullan.', REGEXP_LIKE: 'BigQuery\'de REGEXP_CONTAINS(metin, desen) kullan.', REGEXP_COUNT: 'BigQuery\'de ARRAY_LENGTH(REGEXP_EXTRACT_ALL(metin, desen)) kullan.', GENERATE_SERIES: 'BigQuery\'de UNNEST(GENERATE_ARRAY(1, 10)) veya UNNEST(GENERATE_DATE_ARRAY(baslangic, bitis)) kullan.', LEVENSHTEIN: 'BigQuery\'de EDIT_DISTANCE(a, b) kullan.', TRY_CAST: 'BigQuery\'de SAFE_CAST(x AS INT64) kullan.', CONVERT: 'BigQuery\'de CAST(x AS tip) kullan.', NEWID: 'BigQuery\'de GENERATE_UUID() kullan.', DATEFROMPARTS: 'BigQuery\'de DATE(yıl, ay, gün) kullan.', EOMONTH: 'BigQuery\'de LAST_DAY(tarih) kullan.', LISTAGG: 'BigQuery\'de STRING_AGG kullan.' }[u] || 'Bu fonksiyon BigQuery\'de yoktur.', 'fn');
      if (call(i, 'DATE_TRUNC', 'DATETIME_TRUNC') && T[i + 2] && T[i + 2].k === 's') return new DErr('A valid date part name is required but found \'' + unq(T[i + 2].v) + '\'', 'BigQuery\'de sıra farklıdır: DATE_TRUNC(tarih, MONTH). Parça adı tırnaksız yazılır.');
      if (isW(t, 'UNION', 'INTERSECT', 'EXCEPT') && !isW(T[i + 1], 'ALL', 'DISTINCT') && !(isW(t, 'EXCEPT') && isP(T[i - 1], '*'))) return new DErr(`Syntax error: Expected keyword ALL or keyword DISTINCT but got ${T[i + 1] ? (T[i + 1].u || T[i + 1].v) : 'end of script'}`, `BigQuery\'de ${t.u} tek başına yazılmaz: ${t.u} ALL veya ${t.u} DISTINCT kullan.`);
      if (isP(t, '%')) return err('%', 'BigQuery\'de % operatörü yoktur; kalan için MOD(a, b) kullan.');
      if (isP(t, '::')) return err('::', 'BigQuery\'de CAST(x AS INT64) veya SAFE_CAST kullan.');
      if (isW(t, 'ILIKE')) return err('ILIKE', 'BigQuery\'de LOWER(x) LIKE \'...\' kullan.');
      if (isW(t, 'MINUS')) return err('MINUS', 'BigQuery\'de EXCEPT DISTINCT kullanılır.');
      if (isW(t, 'NATURAL')) return err('NATURAL', 'BigQuery NATURAL JOIN desteklemez; JOIN ... USING (sutun) kullan.');
      if (isW(t, 'FETCH')) return err('FETCH', 'BigQuery\'de LIMIT n OFFSET m kullanılır.');
      if (isW(t, 'RETURNING') || isW(t, 'CONFLICT')) return err(t.v, 'BigQuery\'de RETURNING ve ON CONFLICT yoktur; upsert için MERGE kullan.');
      if (t.k === 'tmp' || (t.k === 'var' && !t.v.startsWith('@@'))) return err(t.v, 'Değişkenler ve # geçici tablolar bu taklit katmanında yalnızca SQL Server modunda desteklenir. (BigQuery\'de @parametre ve DECLARE betikleri vardır.)');
      if (t.k === 'q' && t.v[0] === '"') return err(t.v, 'BigQuery\'de çift tırnak metin sabitidir; tanımlayıcılar `ters tırnak` ile yazılır.');
      if (isW(t, 'CREATE') && (isW(T[i + 1], 'INDEX') || (isW(T[i + 1], 'UNIQUE') && isW(T[i + 2], 'INDEX')))) return new DErr('Syntax error: Unexpected identifier "INDEX"', 'BigQuery\'de klasik indeks yoktur. Büyük tablolarda PARTITION BY (tarih) ve CLUSTER BY (sık filtrelenen sütunlar) kullanılır.');
      if (isW(t, 'CREATE') && (isW(T[i + 1], 'TRIGGER') || (isW(T[i + 1], 'OR') && isW(T[i + 3], 'TRIGGER')))) return new DErr('Syntax error: Unexpected identifier "TRIGGER"', 'BigQuery\'de trigger yoktur; değişiklikler zamanlanmış sorgular veya Dataform/dbt ile işlenir.');
      if (isW(t, 'CHECK') && isP(T[i + 1], '(')) return new DErr('CHECK constraints are not supported', 'BigQuery CHECK kısıtını desteklemez; doğrulamayı sorgu veya veri kalite testleriyle yap.');
      if (isW(t, 'UNIQUE') && !isW(T[i + 1], 'INDEX')) return new DErr('UNIQUE constraints are not supported', 'BigQuery UNIQUE kısıtı tanımlamaz; tekilliği sorguyla denetle.');
      if (isW(t, 'AUTOINCREMENT', 'AUTO_INCREMENT', 'IDENTITY')) return err(t.v, 'BigQuery\'de otomatik artan sütun yoktur; GENERATE_UUID() veya ROW_NUMBER() kullan.');
      if (isW(t, 'PRIMARY') && isW(T[i + 1], 'KEY')) { let j = i + 2; if (isP(T[j], '(')) { while (j < T.length && !isP(T[j], ')')) j++; j++; } if (!(isW(T[j], 'NOT') && isW(T[j + 1], 'ENFORCED'))) return new DErr('Enforced PRIMARY KEY constraints are not supported. Use NOT ENFORCED.', 'BigQuery\'de birincil anahtar bilgi amaçlıdır: PRIMARY KEY (id) NOT ENFORCED.'); }
      if (isW(t, 'REFERENCES')) { let j = i + 2; if (isP(T[j], '(')) { while (j < T.length && !isP(T[j], ')')) j++; j++; } if (!(isW(T[j], 'NOT') && isW(T[j + 1], 'ENFORCED'))) return new DErr('Enforced FOREIGN KEY constraints are not supported. Use NOT ENFORCED.', 'BigQuery\'de yabancı anahtar da NOT ENFORCED yazılır.'); }
      if ((isW(t, 'WITH') || isW(t, 'RECURSIVE') && isW(T[i - 1], 'WITH')) && T[i + 1] && (T[i + 1].k === 'w' || T[i + 1].k === 'q') && !isW(T[i + 1], 'RECURSIVE') && isP(T[i + 2], '(')) return new DErr('Syntax error: Expected keyword AS but got "("', 'BigQuery\'de CTE sütun listesi yazılmaz; sütun adlarını CTE\'nin ilk SELECT\'inde AS ile ver.');
      if (isW(t, 'DECLARE') || (isW(t, 'SET') && i === 0)) return err(t.v, 'BigQuery betikleri (DECLARE, SET, IF, LOOP) bu taklit katmanında desteklenmiyor; tek sorgu olarak yaz.');
      if (isW(t, 'UPDATE', 'DELETE') && (i === 0 || isP(T[i - 1], ';'))) { let j = i + 1, has = false; for (; j < T.length && !isP(T[j], ';'); j++) if (isW(T[j], 'WHERE')) { has = true; break; } if (!has) return new DErr(`${u} must have a WHERE clause`, `BigQuery\'de ${u} her zaman WHERE ister; tüm satırlar için WHERE true yaz.`); }
    }
    if (d === 'oracle') {
      if (call(i, 'GENERATE_SERIES', 'STRING_SPLIT', 'LEVENSHTEIN', 'DIFFERENCE')) return err(t.v, { GENERATE_SERIES: 'Oracle\'da seri üretmek için SELECT LEVEL FROM dual CONNECT BY LEVEL <= n veya özyinelemeli WITH kullan.', LEVENSHTEIN: 'Oracle\'da UTL_MATCH.EDIT_DISTANCE kullanılır.' }[u] || 'Bu fonksiyon Oracle\'da yoktur.', 'fn');
      if (isW(t, 'LIMIT')) return err('LIMIT', 'Oracle\'da LIMIT yoktur; FETCH FIRST n ROWS ONLY kullan (eski sürümlerde WHERE ROWNUM <= n).');
      if (isW(t, 'TOP') && isW(T[i - 1], 'SELECT', 'DISTINCT')) return err('TOP', 'Oracle\'da TOP yoktur; FETCH FIRST n ROWS ONLY kullan.');
      if (call(i, 'ISNULL', 'IFNULL', 'LEN', 'DATEADD', 'DATEDIFF', 'DATEPART', 'GETDATE', 'STRFTIME', 'JULIANDAY', 'CHARINDEX', 'IIF', 'GROUP_CONCAT', 'DATE_FORMAT', 'YEAR', 'MONTH', 'DATE_TRUNC', 'STRING_AGG', 'NOW', 'CURDATE', 'DATE_ADD', 'DATEFROMPARTS', 'EOMONTH', 'FORMAT', 'STRPOS')) return err(t.v, { ISNULL: 'Oracle\'da NVL(x, y) veya COALESCE kullan.', IFNULL: 'Oracle\'da NVL(x, y) kullan.', LEN: 'Oracle\'da LENGTH() kullan.', DATEADD: 'Oracle\'da tarih + n (gün) veya ADD_MONTHS(tarih, n) kullan.', DATEDIFF: 'Oracle\'da iki DATE değerini çıkarınca gün farkı bulunur.', YEAR: 'Oracle\'da EXTRACT(YEAR FROM tarih) kullan.', STRFTIME: 'Oracle\'da TO_CHAR(tarih, \'YYYY-MM\') kullan.', GETDATE: 'Oracle\'da SYSDATE kullan.', GROUP_CONCAT: 'Oracle\'da LISTAGG(x, \',\') WITHIN GROUP (ORDER BY x) kullan.', STRING_AGG: 'Oracle\'da LISTAGG kullan.', CHARINDEX: 'Oracle\'da INSTR(metin, aranan) kullan.', IIF: 'Oracle\'da CASE WHEN veya DECODE kullan.', DATE_TRUNC: 'Oracle\'da TRUNC(tarih, \'MM\') kullan.' }[u] || 'Bu fonksiyon Oracle\'da yoktur.', 'fn');
      if (isP(t, '::')) return err('::', 'Oracle\'da CAST(x AS tip) kullan.');
      if (isW(t, 'ILIKE')) return err('ILIKE', 'Oracle\'da UPPER(x) LIKE UPPER(desen) kullan.');
      if (t.k === 'q' && (t.v[0] === '[' || t.v[0] === '`')) return err(t.v, 'Oracle\'da tanımlayıcılar "çift tırnak" ile yazılır.');
      if (t.k === 'var' || t.k === 'tmp') return err(t.v, 'Değişkenler ve # geçici tablolar SQL Server sözdizimidir.');
      if (isW(t, 'RETURNING') || isW(t, 'CONFLICT')) return err(t.v, 'Bu sözdizimi Oracle SQL\'de yoktur (upsert için MERGE kullanılır).');
      if (isW(t, 'RECURSIVE')) return err('RECURSIVE', 'Oracle\'da özyinelemeli sorgu WITH ile (RECURSIVE yazmadan) veya CONNECT BY ile yapılır.');
      if (isW(t, 'AS')) { const p = T[i - 1]; let b = i - 1; if (isP(p, ')')) { let dd = 0; for (let k = i - 1; k >= 0; k--) { if (isP(T[k], ')')) dd++; if (isP(T[k], '(')) { dd--; if (!dd) { b = k; break; } } } } else { while (isP(T[b - 1], '.')) b -= 2; } if (isW(T[b - 1], 'FROM', 'JOIN') && (isP(p, ')') || p.k === 'w' || p.k === 'q')) return new DErr('ORA-00933: SQL command not properly ended', 'Oracle tablo takma adlarında AS kabul etmez: FROM musteriler m şeklinde yaz.'); }
      if (call(i, 'CONCAT')) { const c = closeP(T, i + 1); let commas = 0, dd = 0; for (let k = i + 2; k < c; k++) { if (isP(T[k], '(')) dd++; if (isP(T[k], ')')) dd--; if (!dd && isP(T[k], ',')) commas++; } if (commas > 1) return new DErr('ORA-00909: invalid number of arguments', 'Oracle\'da CONCAT yalnızca 2 argüman alır; daha fazlası için || kullan.'); }
    }
  }
  if (d === 'tsql' || d === 'oracle') {
    let hit = null; groupAliasScan(tokenize(sql), h => { if (!hit && !ALL_COLS.has(h.name.toLowerCase())) hit = h; });
    if (hit) return new DErr(d === 'tsql' ? `Msg 207, Level 16, State 1: Invalid column name '${hit.name}'.` : `ORA-00904: "${hit.name.toUpperCase()}": invalid identifier`, `${DNAME[d]} GROUP BY içinde SELECT takma adını kabul etmez. Takma ad yerine ifadenin kendisini yaz: GROUP BY ${hit.expr}`);
  }
  const se = lintSemantic(sql, d); if (se) return se;
  if (d === 'oracle') {
    // FROM'suz SELECT
    const TT = tokenize(sql); const D = depthAt(TT);
    for (let i = 0; i < TT.length; i++) {
      if (!isW(TT[i], 'SELECT')) continue; const dep = D[i]; let ok = false;
      for (let j = i + 1; j < TT.length; j++) { if (D[j] < dep || (D[j] === dep && (isP(TT[j], ';') || isW(TT[j], 'UNION', 'INTERSECT', 'EXCEPT', 'MINUS')))) break; if (D[j] === dep && isW(TT[j], 'FROM', 'INTO')) { ok = true; break; } }
      if (!ok) return new DErr('ORA-00923: FROM keyword not found where expected', 'Oracle\'da her SELECT bir FROM ister. Tablo yoksa FROM dual kullan.');
    }
  }
  return null;
}

/* ------------------------------------------------------------------ Anlam denetimi
   SQLite'ın kabul edip gerçek motorların reddettiği sorgular. Temkinli çalışır: emin olamadığı durumda hata vermez.
   Bilinen sınır: sütunu türetilmiş tablodan gelen karmaşık sorgularda bazı ihlaller yakalanmayabilir. */
let LINT_DB = null;
const AGG_FN = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STRING_AGG', 'GROUP_CONCAT', 'LISTAGG', 'ARRAY_AGG', 'JSON_AGG', 'JSON_GROUP_ARRAY', 'JSON_ARRAYAGG', 'STDDEV', 'STDDEV_SAMP', 'STDDEV_POP', 'STDEV', 'STDEVP', 'VARIANCE', 'VAR_SAMP', 'VAR_POP', 'VAR', 'VARP', 'MEDIAN', 'PERCENTILE_CONT', 'PERCENTILE_DISC', 'BOOL_OR', 'BOOL_AND', 'COUNTIF', 'LOGICAL_OR', 'LOGICAL_AND', 'ANY_VALUE', 'CORR', 'COVAR_POP', 'COVAR_SAMP', 'APPROX_COUNT_DISTINCT', 'BIT_AND', 'BIT_OR', 'TOTAL', 'APPROX_QUANTILES']);
const NOT_COL = new Set(('SELECT FROM WHERE GROUP BY ORDER HAVING AS ON AND OR NOT IN IS NULL LIKE ILIKE BETWEEN EXISTS DISTINCT ALL ANY SOME CASE WHEN THEN ELSE END CAST TRUE FALSE ASC DESC NULLS FIRST LAST LIMIT OFFSET FETCH ROWS ROW ONLY OVER PARTITION RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT INTERVAL DATE TIMESTAMP TIME UNION INTERSECT EXCEPT MINUS JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING WITH RECURSIVE TOP PERCENT TIES ROLLUP CUBE GROUPING SETS YEAR MONTH DAY HOUR MINUTE SECOND VALUES INTO').split(' '));
function scopesOf(T) {
  const D = []; let dp = 0; for (let i = 0; i < T.length; i++) { if (isP(T[i], ')')) dp--; D.push(dp); if (isP(T[i], '(')) dp++; }
  const out = [];
  for (let i = 0; i < T.length; i++) {
    if (!isW(T[i], 'SELECT')) continue; const d0 = D[i]; const sc = { i, from: -1, where: -1, group: -1, having: -1, order: -1, end: T.length, stop: T.length };
    let j = i + 1;
    for (; j < T.length; j++) { if (D[j] < d0) break; if (D[j] > d0) continue; const t = T[j]; if (isP(t, ';') || isW(t, 'UNION', 'INTERSECT', 'EXCEPT', 'MINUS')) break; if (isW(t, 'FROM') && sc.from < 0) sc.from = j; else if (isW(t, 'WHERE') && sc.where < 0) sc.where = j; else if (isW(t, 'GROUP') && isW(T[j + 1], 'BY') && sc.group < 0) sc.group = j; else if (isW(t, 'HAVING') && sc.having < 0) sc.having = j; else if (isW(t, 'ORDER') && isW(T[j + 1], 'BY') && sc.order < 0) sc.order = j; else if (isW(t, 'LIMIT', 'OFFSET', 'FETCH', 'QUALIFY', 'WINDOW', 'FOR') && sc.stop === T.length) sc.stop = j; }
    sc.end = j; if (sc.stop > j) sc.stop = j; sc.d = d0; out.push(sc);
  }
  return { scopes: out, D };
}
const clauseEnd = (sc, k) => { const c = ['from', 'where', 'group', 'having', 'order'].map(x => sc[x]).filter(x => x > k); return Math.min(sc.stop, sc.end, ...(c.length ? c : [Infinity])); };
function splitComma(T, a, b, D, d0) { const o = []; let s = a; for (let i = a; i < b; i++) if (D[i] === d0 && isP(T[i], ',')) { o.push([s, i]); s = i + 1; } if (s < b) o.push([s, b]); return o; }
function tableCols(name) { const n = name.toLowerCase(); const S = schemaIdx().cols[n]; if (S) return S; if (LINT_DB) { try { const r = LINT_DB.exec(`SELECT name FROM pragma_table_info('${n.replace(/'/g, "''")}')`); if (r[0] && r[0].values.length) return new Set(r[0].values.map(v => String(v[0]).toLowerCase())); } catch (e) { /* yok */ } } return null; }
/* FROM kapsamındaki sütun adları. known: kesin tablo sütunları + türetilmiş/CTE gövdesindeki sözcükler. null: bilinmeyen kaynak, kural uygulanmaz. */
function fromCols(T, sc, D) {
  if (sc.from < 0) return { cols: new Set(), pks: [] };
  const end = clauseEnd(sc, sc.from); const cols = new Set(); const pks = [];
  const add = s => s.forEach(c => cols.add(c));
  for (let i = sc.from + 1; i < end; i++) {
    if (D[i] !== sc.d) continue; const t = T[i], pb = T[i - 1];
    if (isP(t, '(') && (isW(pb, 'FROM', 'JOIN', 'APPLY', 'LATERAL') || isP(pb, ','))) { let c = i; let dp = 0; for (; c < T.length; c++) { if (isP(T[c], '(')) dp++; else if (isP(T[c], ')')) { dp--; if (!dp) break; } } for (let q = i; q < c; q++) if (T[q].k === 'w' || T[q].k === 'q') cols.add(String(T[q].u || T[q].v).toLowerCase().replace(/["`\[\]]/g, '')); i = c; continue; }
    if ((t.k === 'w' || t.k === 'q') && (isW(pb, 'FROM', 'JOIN') || isP(pb, ',')) && !isP(T[i + 1], '(')) {
      let nm = String(t.v).replace(/["`\[\]]/g, ''); let k = i; while (isP(T[k + 1], '.')) { k += 2; nm = String(T[k] ? T[k].v : nm).replace(/["`\[\]]/g, ''); }
      const S = tableCols(nm);
      if (S) { add(S); (schemaIdx().pk[nm.toLowerCase()] || []).forEach(p => pks.push(p)); continue; }
      /* CTE gövdesi ya da oturumda kurulan nesne */
      let found = false; for (let q = 0; q < T.length - 2; q++) { if ((T[q].u === nm.toUpperCase()) && (isW(T[q + 1], 'AS') && isP(T[q + 2], '(') || isP(T[q + 1], '('))) { found = true; let c = isP(T[q + 1], '(') ? q + 1 : q + 2; let dp = 0, e = c; let guard = 0; for (; e < T.length; e++) { if (isP(T[e], '(')) dp++; else if (isP(T[e], ')')) { dp--; if (!dp) { guard++; if (isP(T[q + 1], '(') && guard === 1 && isW(T[e + 1], 'AS')) { e += 2; dp = 0; dp++; continue; } break; } } } for (let z = c; z < e; z++) if (T[z].k === 'w' || T[z].k === 'q') cols.add(String(T[z].u || T[z].v).toLowerCase().replace(/["`\[\]]/g, '')); break; } }
      if (!found) return null;
    }
  }
  return { cols, pks };
}
const VERR = {
  whereAlias: { pg: w => `ERROR: column "${w}" does not exist`, tsql: w => `Msg 207, Level 16, State 1: Invalid column name '${w}'.`, mysql: w => `ERROR 1054 (42S22): Unknown column '${w}' in 'where clause'`, oracle: w => `ORA-00904: "${w.toUpperCase()}": invalid identifier`, bq: w => `Unrecognized name: ${w}` },
  group: { pg: w => `ERROR: column "${w}" must appear in the GROUP BY clause or be used in an aggregate function`, tsql: w => `Msg 8120, Level 16, State 1: Column '${w}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`, mysql: w => `ERROR 1055 (42000): Expression of SELECT list is not in GROUP BY clause and contains nonaggregated column '${w}'`, oracle: () => 'ORA-00979: not a GROUP BY expression', bq: w => `SELECT list expression references column ${w} which is neither grouped nor aggregated` },
  noGroup: { pg: w => `ERROR: column "${w}" must appear in the GROUP BY clause or be used in an aggregate function`, tsql: w => `Msg 8120, Level 16, State 1: Column '${w}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`, mysql: () => 'ERROR 1140 (42000): In aggregated query without GROUP BY, expression of SELECT list contains nonaggregated column', oracle: () => 'ORA-00937: not a single-group group function', bq: w => `SELECT list expression references column ${w} which is neither grouped nor aggregated` },
  boolAgg: { pg: f => `ERROR: function ${f.toLowerCase()}(boolean) does not exist`, tsql: () => "Msg 102, Level 15, State 1: Incorrect syntax near '='.", oracle: () => 'ORA-00907: missing right parenthesis', bq: f => `No matching signature for aggregate function ${f} for argument types: BOOL` },
  distinct: { pg: () => 'ERROR: for SELECT DISTINCT, ORDER BY expressions must appear in select list', tsql: () => 'Msg 145, Level 15, State 1: ORDER BY items must appear in the select list if SELECT DISTINCT is specified.', oracle: () => 'ORA-01791: not a SELECTed expression', bq: () => 'ORDER BY clause expression references column which is not visible after SELECT DISTINCT' }
};
function lintSemantic(sql, d) {
  if (d === 'sqlite') return null;
  const TT = tokenize(sql).filter(t => t.k !== 'ws' && t.k !== 'com' && (typeof sigk !== 'function' || sigk(t))); const T = TT;
  if (!T.some(t => isW(t, 'SELECT'))) return null;
  const { scopes, D } = scopesOf(T); const idx = schemaIdx();
  const ident = (a, b, dep, f) => { for (let i = a; i < b; i++) { if (isP(T[i], '(') && isW(T[i + 1], 'SELECT', 'WITH')) { let dp = 0; for (; i < b; i++) { if (isP(T[i], '(')) dp++; else if (isP(T[i], ')')) { dp--; if (!dp) break; } } continue; } const t = T[i]; if (t.k !== 'w' && !(t.k === 'q' && t.v[0] !== "'")) continue; if (isP(T[i + 1], '(') || isP(T[i + 1], '.')) continue; if (isW(T[i - 1], 'AS')) continue; const nm = String(t.u || t.v).toLowerCase().replace(/["`\[\]]/g, ''); if (NOT_COL.has(nm.toUpperCase())) continue; f(nm, i, t); } };
  /* SUM(koşul), AVG(koşul) */
  if (d !== 'mysql') for (let i = 0; i < T.length; i++) {
    if (T[i].k === 'w' && (T[i].u === 'SUM' || T[i].u === 'AVG') && isP(T[i + 1], '(') && !isP(T[i - 1], '.')) { const c = closeP(T, i + 1); if (c < 0 || c === undefined) continue; const inner = T.slice(i + 2, c); if (hasTopCond(inner)) return new DErr(VERR.boolAgg[d](T[i].u), `Koşulu doğrudan toplayamazsın (bu yalnız SQLite ve MySQL'de çalışır). ${T[i].u}(CASE WHEN koşul THEN 1 ELSE 0 END) yaz.`); if ((d === 'pg' || d === 'tsql') && inner.length && idx.bool.has(String(inner[inner.length - 1].u || '').toLowerCase()) && (inner.length === 1 || (inner.length === 3 && isP(inner[1], '.')))) return new DErr(d === 'pg' ? VERR.boolAgg.pg(T[i].u) : `Msg 8117, Level 16, State 1: Operand data type bit is invalid for ${T[i].u.toLowerCase()} operator.`, `Bu sütun ${d === 'pg' ? 'BOOLEAN' : 'BIT'} türünde. ${T[i].u}(CASE WHEN sütun ${d === 'pg' ? '' : '= 1 '}THEN 1 ELSE 0 END) yaz ya da sütunu CAST ile tam sayıya çevir.`); }
    /* boolean = 1 */
    if (d === 'pg' && T[i].k === 'w' && idx.bool.has(T[i].u.toLowerCase()) && T[i + 1] && ['=', '<>', '!='].includes(T[i + 1].v) && T[i + 2] && /^[01]$/.test(T[i + 2].v) && !T.some(x => isW(x, 'ADD', 'CREATE'))) return new DErr('ERROR: operator does not exist: boolean = integer', `${T[i].v} sütunu PostgreSQL'de BOOLEAN. ${T[i].v} = ${T[i + 2].v === '1' ? 'TRUE' : 'FALSE'} yaz.`);
    /* tarih LIKE */
    if ((d === 'pg' || d === 'bq') && T[i].k === 'w' && idx.date.has(T[i].u.toLowerCase()) && !isP(T[i + 1], '.') && (isW(T[i + 1], 'LIKE') || (isW(T[i + 1], 'NOT') && isW(T[i + 2], 'LIKE'))) && !isW(T[i - 1], 'AS')) return new DErr(d === 'pg' ? 'ERROR: operator does not exist: date ~~ unknown' : 'No matching signature for operator LIKE for argument types: DATE, STRING', 'Tarih sütunu metin değildir, LIKE ile karşılaştırılamaz. Aralık kullan (>= ve <) ya da yılı EXTRACT ile al.');
    /* çift tırnaklı metin */
    if ((d === 'pg' || d === 'oracle') && T[i].k === 'q' && T[i].v[0] === '"' && !isP(T[i + 1], '.') && !isP(T[i - 1], '.') && !isW(T[i - 1], 'AS', 'FROM', 'JOIN', 'TABLE', 'INTO', 'UPDATE', 'VIEW') && !T.some(x => isW(x, 'CREATE', 'ALTER', 'INSERT'))) {
      const nm = T[i].v.slice(1, -1); const low = nm.toLowerCase(); let known = ALL_COLS.has(low) || T.some((x, j) => j !== i && String(x.v).replace(/"/g, '').toLowerCase() === low && (isW(T[j - 1], 'AS') || isP(T[j + 1], '.')));
      if (!known && !T.some((x, j) => isW(x, 'WITH') )) { if (LINT_DB) { try { const tabs = LINT_DB.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view')"); known = !!(tabs[0] && tabs[0].values.some(v => { const S = tableCols(v[0]); return S && S.has(low); })); } catch (e) { known = true; } } if (!known) return new DErr(d === 'pg' ? `ERROR: column "${nm}" does not exist` : `ORA-00904: "${nm}": invalid identifier`, 'Çift tırnak sütun adı içindir. Metin için tek tırnak kullan.'); }
    }
  }
  if (T.some(t => t.k === 'var') ) return null;  // T-SQL değişkenli toplu iş: kapsam çözümü güvenilir değil
  for (const sc of scopes) {
    if (isW(T[sc.i - 2], 'INSERT') && false) continue;
    const selEnd = sc.from >= 0 ? sc.from : clauseEnd(sc, sc.i); let selStart = sc.i + 1; const distinct = isW(T[selStart], 'DISTINCT'); if (distinct) selStart++;
    if (isW(T[selStart], 'TOP')) { selStart += 2; if (isP(T[selStart - 1], '(')) { while (selStart < selEnd && !isP(T[selStart], ')')) selStart++; selStart++; } }
    if (isW(T[selStart], 'ON')) continue;   // DISTINCT ON: kendi kuralı var, burada denetlenmez
    const items = splitComma(T, selStart, selEnd, D, sc.d).map(([a, b]) => { let al = null; const n = b - a; if (n >= 3 && isW(T[b - 2], 'AS')) al = String(T[b - 1].u || T[b - 1].v).toLowerCase().replace(/["`\[\]]/g, ''); else if (n >= 2 && (T[b - 1].k === 'w' || T[b - 1].k === 'q') && !NOT_COL.has(T[b - 1].u) && !isP(T[b - 2], '.') && !(T[b - 2].k === 'o') && !isP(T[b - 2], '(') && !isW(T[b - 2], 'AND', 'OR', 'NOT', 'WHEN', 'THEN', 'ELSE', 'CASE', 'IN', 'LIKE', 'IS') && (isP(T[b - 2], ')') || T[b - 2].k === 'w' || T[b - 2].k === 'n' || T[b - 2].k === 'q' || T[b - 2].k === 's') && !isW(T[b - 2], 'SELECT', 'DISTINCT')) al = String(T[b - 1].u || T[b - 1].v).toLowerCase().replace(/["`\[\]]/g, ''); const key = T.slice(a, al ? (isW(T[b - 2], 'AS') ? b - 2 : b - 1) : b).map(t => String(t.u || t.v).toLowerCase()).join(' ').replace(/\s*([.(),])\s*/g, '$1'); return { a, b, al, key }; });
    if (T.slice(selStart, selEnd).some(t => isP(t, '*')) && items.some(it => it.b - it.a === 1 && isP(T[it.a], '*'))) { if (sc.group < 0) continue; }
    const fc = fromCols(T, sc, D); if (!fc) continue;
    const aliases = new Set(items.map(x => x.al).filter(Boolean));
    /* WHERE'de takma ad */
    if (sc.where >= 0 && aliases.size) { let hit = null; ident(sc.where + 1, clauseEnd(sc, sc.where), sc.d, nm => { if (!hit && aliases.has(nm) && !fc.cols.has(nm)) hit = nm; }); if (hit && !outerHas(T, sc, scopes, hit)) return new DErr(VERR.whereAlias[d](hit), `WHERE, SELECT'ten önce çalışır; "${hit}" takma adı henüz tanımlı değil. İfadenin kendisini yaz ya da sorguyu alt sorgu veya CTE içine al.`); }
    /* HAVING'de takma ad: PostgreSQL, SQL Server ve Oracle kabul etmez */
    if (sc.having >= 0 && aliases.size && (d === 'pg' || d === 'tsql' || d === 'oracle')) { let hit = null; ident(sc.having + 1, clauseEnd(sc, sc.having), sc.d, nm => { if (!hit && aliases.has(nm) && !fc.cols.has(nm)) hit = nm; }); if (hit && !outerHas(T, sc, scopes, hit)) return new DErr(VERR.whereAlias[d](hit), `${DNAME[d]} HAVING içinde SELECT takma adını kabul etmez. Toplama ifadesini yeniden yaz: HAVING COUNT(*) > 2 gibi.`); }
    /* Gruplanmamış sütun */
    const hasGroup = sc.group >= 0;
    const aggMask = (a, b) => { const out = []; for (let i = a; i < b; i++) { const t = T[i]; if (isP(t, '(') && isW(T[i + 1], 'SELECT', 'WITH')) { let dp = 0; for (; i < b; i++) { if (isP(T[i], '(')) dp++; else if (isP(T[i], ')')) { dp--; if (!dp) break; } } continue; } if (t.k === 'w' && isP(T[i + 1], '(')) { const isAgg = AGG_FN.has(t.u); const c = closeP(T, i + 1); const after = T[c + 1]; const win = isW(after, 'OVER'); if (isAgg || win) { let e = c; if (win) { const o = c + 2; if (isP(T[o], '(')) e = closeP(T, o); else e = c + 2; } if (isAgg && !win) out.agg = true; if (isW(T[e + 1], 'WITHIN') && isP(T[e + 3], '(')) e = closeP(T, e + 3); if (isW(T[e + 1], 'FILTER') && isP(T[e + 2], '(')) e = closeP(T, e + 2); i = e; continue; } continue; } if (isW(t, 'CAST') && false) continue; if (isW(T[i - 1], 'AS')) continue; if ((t.k === 'w' || (t.k === 'q' && t.v[0] !== "'")) && !isP(T[i + 1], '.')) { const nm = String(t.u || t.v).toLowerCase().replace(/["`\[\]]/g, ''); if (!NOT_COL.has(nm.toUpperCase())) out.push(nm); } } return out; };
    const masks = items.map(it => aggMask(it.a, it.al ? (isW(T[it.b - 2], 'AS') ? it.b - 2 : it.b - 1) : it.b));
    const anyAgg = masks.some(m => m.agg) || (sc.having >= 0);
    if (!distinct && hasGroup || (!hasGroup && anyAgg)) {
      if (!(hasGroup && (d === 'pg' || d === 'mysql') && groupHasPk(T, sc, fc))) {
        const grpEnd = hasGroup ? clauseEnd(sc, sc.group) : sc.group; const grpWords = new Set(); const grpKeys = new Set();
        if (hasGroup) { const parts = splitComma(T, sc.group + 2, grpEnd, D, sc.d); parts.forEach(([a, b]) => { grpKeys.add(T.slice(a, b).map(t => String(t.u || t.v).toLowerCase()).join(' ').replace(/\s*([.(),])\s*/g, '$1')); const m = aggMask(a, b); m.forEach(w => grpWords.add(w)); if (b - a === 1 && T[a].k === 'n') grpKeys.add('#' + T[a].v); }); }
        for (let k = 0; k < items.length; k++) { const it = items[k]; if (grpKeys.has(it.key) || (it.al && grpKeys.has(it.al)) || grpKeys.has('#' + (k + 1))) continue; for (const w of masks[k]) { if (grpWords.has(w) || !fc.cols.has(w)) continue; if (hasGroup && items.some(x => x.al === w && grpKeys.has(w))) continue; return new DErr((hasGroup ? VERR.group : VERR.noGroup)[d](w), hasGroup ? `"${w}" ne GROUP BY'da ne de bir toplama fonksiyonunun içinde. Her grup için tek değer gerekir: GROUP BY'a ekle ya da MIN/MAX/COUNT içine al. SQLite bunu sessizce kabul eder; gerçek motorlar reddeder.` : `Toplama fonksiyonu varken "${w}" sütunu tek başına kalamaz. GROUP BY ${w} ekle ya da sütunu kaldır.`); } }
      }
    }
    /* DISTINCT + ORDER BY */
    if (distinct && sc.order >= 0 && d !== 'mysql') { const okW = new Set(aliases); masks.forEach(m => m.forEach(w => okW.add(w))); const keys = new Set(items.map(x => x.key)); const parts = splitComma(T, sc.order + 2, clauseEnd(sc, sc.order), D, sc.d); for (const [a0, b0] of parts) { let b = b0; while (b > a0 && isW(T[b - 1], 'ASC', 'DESC', 'FIRST', 'LAST', 'NULLS')) b--; const key = T.slice(a0, b).map(t => String(t.u || t.v).toLowerCase()).join(' ').replace(/\s*([.(),])\s*/g, '$1'); if (keys.has(key) || (b - a0 === 1 && T[a0].k === 'n')) continue; for (const w of aggMask(a0, b)) if (!okW.has(w) && fc.cols.has(w)) return new DErr(VERR.distinct[d](), `SELECT DISTINCT ile yalnız seçtiğin sütunlara göre sıralayabilirsin. "${w}" sütununu SELECT'e ekle ya da DISTINCT yerine GROUP BY kullan.`); } }
  }
  return null;
}
function outerHas(T, sc, scopes, nm) { /* ilişkili alt sorgu: dış kapsamdaki tablo sütunu olabilir */ if (sc.d === 0) return false; return scopes.some(o => o !== sc && o.d < sc.d && (T.slice(o.from < 0 ? o.i : o.from, o.end).some(t => (t.k === 'w') && tableCols(String(t.v)) && tableCols(String(t.v)).has(nm)))); }
function groupHasPk(T, sc, fc) { if (!fc.pks.length) return false; const e = clauseEnd(sc, sc.group); for (let i = sc.group + 2; i < e; i++) { const t = T[i]; if (t.k === 'w' && fc.pks.includes(t.u.toLowerCase())) return true; } return false; }

/* ------------------------------------------------------------------ Ters çeviri (hedef → SQLite) */
const DATE_TYPES = /^(DATE)$/i;
function revType(type, d, tryMode) { // CAST hedef tipi → {fn} ya da SQLite tipi
  const T = type.toUpperCase().replace(/\s+/g, ' ').trim();
  let m;
  if (d === 'tsql') {
    if (/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT)$/.test(T)) return { wrap: x => `tsql_int_(${x}, ${tryMode ? 1 : 0}, '${T.toLowerCase()}')` };
    if (T === 'DATE') return { wrap: x => `tsql_date_(${x}, ${tryMode ? 1 : 0}, 0)` };
    if (/^(DATETIME2?|SMALLDATETIME)(\(\d+\))?$/.test(T)) return { wrap: x => `tsql_date_(${x}, ${tryMode ? 1 : 0}, 1)` };
    if ((m = T.match(/^(DECIMAL|NUMERIC)\s*\(\s*\d+\s*,\s*(\d+)\s*\)$/))) return { wrap: x => `ROUND(tsql_num_(${x}, ${tryMode ? 1 : 0}), ${m[2]})` };
    if (/^(FLOAT|REAL|MONEY|DECIMAL|NUMERIC)$/.test(T)) return { wrap: x => `tsql_num_(${x}, ${tryMode ? 1 : 0})` };
    if ((m = T.match(/^N?VARCHAR\s*\(\s*(\d+)\s*\)$/))) return { wrap: x => `substr(CAST(${x} AS TEXT), 1, ${m[1]})` };
  }
  if (d === 'bq') {
    if (/^(INT64|INTEGER|INT|BIGINT|SMALLINT|TINYINT|BYTEINT)$/.test(T)) return { wrap: x => `bq_int_(${x}, ${tryMode ? 1 : 0})` };
    if (/^(FLOAT64|NUMERIC|BIGNUMERIC|DECIMAL|BIGDECIMAL|REAL)$/.test(T)) return { wrap: x => `bq_num_(${x}, ${tryMode ? 1 : 0})` };
    if (/^(STRING|TEXT)$/.test(T)) return { wrap: x => `CAST(${x} AS TEXT)` };
    if (T === 'DATE') return { wrap: x => `bq_date_(${x}, ${tryMode ? 1 : 0})` };
    if (/^(DATETIME|TIMESTAMP)$/.test(T)) return { wrap: x => `datetime(${x})` };
    if (T === 'BOOL') return { wrap: x => `CAST(${x} AS INTEGER)` };
  }
  if (T === 'DATE') return d === 'oracle' ? { wrap: x => x } : { wrap: x => `date(${x})` };
  if (/^(DATETIME2?|SMALLDATETIME|TIMESTAMP)(\(\d+\))?( WITHOUT TIME ZONE)?$/.test(T)) return { wrap: x => `datetime(${x})` };
  if ((m = T.match(/^(DECIMAL|NUMERIC|NUMBER)\s*\(\s*\d+\s*,\s*(\d+)\s*\)$/))) return { wrap: x => `ROUND(CAST(${x} AS REAL), ${m[2]})` };
  if (/^(NUMBER\s*\(\s*\d+\s*\)|NUMBER\(\d+,\s*0\))$/.test(T)) return { wrap: x => `CAST(ROUND(${x}) AS INTEGER)` };
  if (/^MONEY$/.test(T)) return { wrap: x => `ROUND(CAST(${x} AS REAL), 4)` };
  if (/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|BIT|SIGNED|UNSIGNED|SIGNED INTEGER|INT4|INT8)$/.test(T)) return (d === 'pg' || d === 'mysql' || d === 'oracle') ? { wrap: x => `CAST(ROUND(${x}) AS INTEGER)` } : { wrap: x => `CAST(${x} AS INTEGER)` };
  if (/^(FLOAT|REAL|DOUBLE|DOUBLE PRECISION|DECIMAL|NUMERIC|NUMBER|BINARY_DOUBLE|FLOAT8)(\(\d+\))?$/.test(T)) return { wrap: x => `CAST(${x} AS REAL)` };
  if (/^(N?VARCHAR2?|N?CHAR|TEXT|NTEXT|CHARACTER VARYING|STRING|CLOB)(\s*\(\s*(\d+|MAX)\s*\))?$/.test(T)) return { wrap: x => `CAST(${x} AS TEXT)` };
  if (/^JSONB?$/.test(T)) return { wrap: x => x };
  return { wrap: x => `CAST(${x} AS ${type})` };
}
const PARTMAP = { YEAR: 'year', YY: 'year', YYYY: 'year', QUARTER: 'quarter', QQ: 'quarter', Q: 'quarter', MONTH: 'month', MM: 'month', M: 'month', DAYOFYEAR: 'dayofyear', DY: 'dayofyear', Y: 'dayofyear', DAY: 'day', DD: 'day', D: 'day', WEEK: 'week', WK: 'week', WW: 'week', WEEKDAY: 'weekday', DW: 'weekday', HOUR: 'hour', HH: 'hour', MINUTE: 'minute', MI: 'minute', N: 'minute', SECOND: 'second', SS: 'second', S: 'second', ISO_WEEK: 'isoweek', ISOWK: 'isoweek', DOW: 'dow', DOY: 'dayofyear', EPOCH: 'epoch', ISODOW: 'isodow', DAYS: 'day', MONTHS: 'month', YEARS: 'year', HOURS: 'hour', MINUTES: 'minute', SECONDS: 'second', WEEKS: 'week', DAYOFWEEK: 'weekday', ISOWEEK: 'isoweek' };
const part = s => { const k = String(s).replace(/^'|'$/g, '').trim().toUpperCase(); return PARTMAP[k] || k.toLowerCase(); };
const asInt = x => `CAST(${x} AS INTEGER)`;

function revCall(N, a, A, d, ctx) {
  const fnm = { tsql: 1, pg: 1, mysql: 1, oracle: 1 };
  void fnm;
  switch (N) {
    /* ortak (birden fazla lehçede aynı adla) */
    case 'LEFT': return `left_(${a.join(', ')})`;
    case 'RIGHT': return `right_(${a.join(', ')})`;
    case 'CHAR_LENGTH': case 'CHARACTER_LENGTH': case 'DATALENGTH': return `length(${a[0]})`;
    case 'LEN': return `len_(${a[0]})`;
    case 'SUBSTRING': {
      const toks = A[0] || []; const fi = toks.findIndex(t => isW(t, 'FROM'));
      if (a.length === 1 && fi >= 0) { const fo = toks.findIndex(t => isW(t, 'FOR')); const s = txt(toks.slice(0, fi)), st = txt(toks.slice(fi + 1, fo < 0 ? toks.length : fo)), ln = fo < 0 ? null : txt(toks.slice(fo + 1)); return `substr(${revInner(s, d, ctx)}, ${revInner(st, d, ctx)}${ln ? ', ' + revInner(ln, d, ctx) : ''})`; }
      return `substr(${a.join(', ')})`;
    }
    case 'POSITION': { const toks = A[0] || []; const ii = toks.findIndex(t => isW(t, 'IN')); if (ii < 0) return null; return `instr(${revInner(txt(toks.slice(ii + 1)), d, ctx)}, ${revInner(txt(toks.slice(0, ii)), d, ctx)})`; }
    case 'STRPOS': return `instr(${a[0]}, ${a[1]})`;
    case 'SUBSTRING_INDEX': return d === 'mysql' && a.length === 3 ? `substring_index_(${a[0]}, ${a[1]}, ${a[2]})` : null;
    case 'INSTR': return a.length > 2 ? `instr4_(${a[0]}, ${a[1]}, ${a[2]}, ${a[3] || 1})` : `instr(${a[0]}, ${a[1]})`;
    case 'NEXT_DAY': return d === 'oracle' ? `next_day_(${a[0]}, ${a[1]})` : null;
    case 'CHARINDEX': return `charindex_(${a.join(', ')})`;
    case 'PATINDEX': return `patindex_(${a.join(', ')})`;
    case 'REPLICATE': case 'REPEAT': return `replicate_(${a.join(', ')})`;
    case 'REVERSE': return `reverse_(${a[0]})`;
    case 'STUFF': return `stuff_(${a.join(', ')})`;
    case 'SPACE': return `replicate_(' ', ${a[0]})`;
    case 'LPAD': return `lpad_(${a.join(', ')})`;
    case 'RPAD': return `rpad_(${a.join(', ')})`;
    case 'INITCAP': return `initcap_(${a[0]})`;
    case 'SPLIT_PART': return `split_part_(${a.join(', ')})`;
    case 'ISNULL': return d === 'mysql' ? `(${a[0]} IS NULL)` : `ifnull(${a[0]}, ${a[1]})`;
    case 'NVL': return `ifnull(${a[0]}, ${a[1]})`;
    case 'NVL2': return `nvl2_(${a.join(', ')})`;
    case 'DECODE': return `decode_(${a.join(', ')})`;
    case 'CHOOSE': return `choose_(${a.join(', ')})`;
    case 'IF': return d === 'mysql' || d === 'bq' ? `iif(${a.join(', ')})` : null;
    case 'CONCAT': return d === 'mysql' || d === 'bq' ? `mysql_concat_(${a.join(', ')})` : `concat(${a.join(', ')})`;
    case 'GREATEST': return `max(${a.join(', ')})`;
    case 'LEAST': return `min(${a.join(', ')})`;
    case 'MOD': return `((${a[0]}) % (${a[1]}))`;
    case 'CEILING': return `ceil(${a[0]})`;
    case 'SQUARE': return `((${a[0]}) * (${a[0]}))`;
    case 'LOG': if (d === 'pg') return a.length === 1 ? `log10(${a[0]})` : `(ln(${a[1]}) / ln(${a[0]}))`; if (d === 'oracle') return `(ln(${a[1]}) / ln(${a[0]}))`; return a.length === 1 ? `ln(${a[0]})` : (d === 'tsql' || d === 'bq' ? `(ln(${a[0]}) / ln(${a[1]}))` : `(ln(${a[1]}) / ln(${a[0]}))`);
    case 'LN': return `ln(${a[0]})`;
    case 'RAND': return `(abs(random()) % 1000000) / 1000000.0`;
    case 'NEWID': case 'UUID': case 'GEN_RANDOM_UUID': return `newid_()`;
    case 'ROUND': if (d === 'oracle' && a.length === 2 && /^'/.test(a[1].trim())) return `round_date_(${a[0]}, ${a[1]})`; return null;
    case 'TRUNC': case 'TRUNCATE': return d === 'oracle' || d === 'pg' || d === 'mysql' ? `trunc_(${a.join(', ')})` : null;
    case 'ISNUMERIC': return `isnumeric_(${a[0]})`;
    case 'QUOTENAME': return `quotename_(${a.join(', ')})`;
    case 'STDEV': return `stddev(${a[0]})`;
    case 'STDEVP': return `stddev_pop(${a[0]})`;
    case 'VAR': return `variance(${a[0]})`;
    case 'VARP': return `var_pop(${a[0]})`;
    case 'STD': return `stddev_pop(${a[0]})`;
    case 'MEDIAN': return `median(${a[0]})`;
    /* tarih */
    case 'GETDATE': case 'SYSDATETIME': case 'NOW': case 'CURRENT_TIMESTAMP': case 'LOCALTIMESTAMP': case 'SYSDATE': case 'GETUTCDATE': return `getdate_()`;
    case 'CURDATE': case 'CURRENT_DATE': return `date(getdate_())`;
    case 'DATEADD': return `dateadd_('${part(a[0])}', ${a[1]}, ${a[2]})`;
    case 'DATEDIFF': return d === 'mysql' ? asInt(`mysql_datediff_(${a[0]}, ${a[1]})`) : asInt(`datediff_('${part(a[0])}', ${a[1]}, ${a[2]})`);
    case 'DATEDIFF_BIG': return asInt(`datediff_('${part(a[0])}', ${a[1]}, ${a[2]})`);
    case 'TIMESTAMPDIFF': return asInt(`datediff_('${part(a[0])}', ${a[1]}, ${a[2]})`);
    case 'DATEPART': return asInt(`datepart_('${part(a[0])}', ${a[1]})`);
    case 'DATENAME': return `datename_('${part(a[0])}', ${a[1]})`;
    case 'DATETRUNC': return `datetrunc_('${part(a[0])}', ${a[1]})`;
    case 'DATE_TRUNC': case 'DATETIME_TRUNC': case 'TIMESTAMP_TRUNC': return /^'[A-Za-z_]+'$/.test(a[0] || '') ? `datetrunc_(${a[0]}, ${a[1]})` : `datetrunc_('${part(a[1])}', ${a[0]})`;
    case 'DATE_PART': return asInt(`extract_(${a[0]}, ${a[1]})`);
    case 'EOMONTH': case 'LAST_DAY': return d === 'bq' ? `eomonth_(${a[0]})` : `eomonth_(${a.join(', ')})`;
    case 'DATEFROMPARTS': case 'MAKE_DATE': return `datefromparts_(${a.join(', ')})`;
    case 'YEAR': return asInt(`datepart_('year', ${a[0]})`);
    case 'MONTH': return asInt(`datepart_('month', ${a[0]})`);
    case 'DAY': case 'DAYOFMONTH': return asInt(`datepart_('day', ${a[0]})`);
    case 'QUARTER': return asInt(`datepart_('quarter', ${a[0]})`);
    case 'DAYOFWEEK': return asInt(`datepart_('weekday', ${a[0]})`);
    case 'WEEKDAY': return asInt(`(datepart_('weekday', ${a[0]}) + 5) % 7`);
    case 'DAYOFYEAR': return asInt(`datepart_('dayofyear', ${a[0]})`);
    case 'HOUR': return asInt(`datepart_('hour', ${a[0]})`);
    case 'MINUTE': return asInt(`datepart_('minute', ${a[0]})`);
    case 'WEEK': case 'WEEKOFYEAR': return asInt(`datepart_('week', ${a[0]})`);
    case 'MONTHNAME': return `datename_('month', ${a[0]})`;
    case 'DAYNAME': return `datename_('weekday', ${a[0]})`;
    case 'FORMAT': return d === 'bq' ? `printf(${a.join(', ')})` : `format_(${a.join(', ')})`;
    case 'TO_CHAR': return `to_char_(${a.join(', ')})`;
    case 'TO_DATE': return `to_date_(${a.join(', ')})`;
    case 'TO_NUMBER': return `CAST(${a[0]} AS REAL)`;
    case 'DATE_FORMAT': return `date_format_(${a.join(', ')})`;
    case 'STR_TO_DATE': return `to_date_(${a[0]})`;
    case 'ADD_MONTHS': return `dateadd_('month', ${a[1]}, ${a[0]})`;
    case 'MONTHS_BETWEEN': return `months_between_(${a[0]}, ${a[1]})`;
    case 'DATE_ADD': case 'ADDDATE': case 'DATE_SUB': case 'SUBDATE': case 'DATETIME_ADD': case 'DATETIME_SUB': case 'TIMESTAMP_ADD': case 'TIMESTAMP_SUB': {
      const toks = A[1] || []; if (isW(toks[0], 'INTERVAL')) { const n = txt(toks.slice(1, toks.length - 1)).trim(); const u = toks[toks.length - 1].u; return `dateadd_('${part(u)}', ${N.includes('SUB') ? '-' : ''}(${revInner(n, d, ctx)}), ${a[0]})`; }
      return `dateadd_('day', ${N.includes('SUB') ? '-' : ''}(${a[1]}), ${a[0]})`;
    }
    case 'EXTRACT': {
      const toks = A[0] || []; const fi = toks.findIndex(t => isW(t, 'FROM')); if (fi < 0) return null;
      const p = part(txt(toks.slice(0, fi)).trim()); const inner = trimT(toks.slice(fi + 1));
      if (p === 'epoch' && /^\(\s*\(?\s*julianday/i.test(txt(inner).trim())) return `(${revInner(txt(inner), d, ctx)} * 86400)`;
      if (p === 'epoch') { const it = inner; if (isP(it[0], '(')) { const body = trimT(it.slice(1, it.length - 1)); const parts = splitTop(body, '-'); if (parts.length === 2) return `((julianday(${revInner(txt(parts[0]), d, ctx)}) - julianday(${revInner(txt(parts[1]), d, ctx)})) * 86400)`; } return `((julianday(${revInner(txt(inner), d, ctx)}) - 2440587.5) * 86400)`; }
      return asInt(`extract_('${p}', ${revInner(txt(inner), d, ctx)})`);
    }
    case 'CAST': case 'TRY_CAST': case 'SAFE_CAST': { const c = castParts(A); if (!c) return null; return revType(c.type, d, N !== 'CAST').wrap(revInner(txt(c.xt), d, ctx)); }
    case 'CONVERT': case 'TRY_CONVERT': {
      if (d === 'mysql') { const c = A[0] ? txt(A[0]) : ''; void c; return null; }
      const type = txt(A[0] || []).trim(); const x = a[1]; const style = a[2];
      if (style && /CHAR/i.test(type)) return `convert_style_(${x}, ${style})`;
      return revType(type, d, N === 'TRY_CONVERT').wrap(x);
    }
    case 'STRING_AGG': return `string_agg(${a[0]}, ${a[1] || "','"})`;
    case 'GROUP_CONCAT': {
      if (d !== 'mysql') return null;
      /* ORDER BY birden çok sütun içerebilir (a, b): virgülle bölünen argümanları yeniden birleştir */
      const toks = (A || []).reduce((acc, x, i) => i ? acc.concat([{ k: 'p', v: ',' }], x || []) : (x || []).slice(), []); const si = toks.findIndex(t => isW(t, 'SEPARATOR')); const oi = toks.findIndex(t => isW(t, 'ORDER'));
      let x = txt(toks.slice(0, oi >= 0 ? oi : si >= 0 ? si : toks.length)); let ord = oi >= 0 ? ' ' + txt(toks.slice(oi, si >= 0 ? si : toks.length)) : ''; const sep = si >= 0 ? txt(toks.slice(si + 1)).trim() : "','";
      if (/^\s*DISTINCT\b/i.test(x)) return `replace(group_concat(${revInner(x, d, ctx)}${revInner(ord, d, ctx)}), ',', ${sep})`;
      return `group_concat(${revInner(x, d, ctx)}, ${sep}${revInner(ord, d, ctx)})`;
    }
    case 'JSON_VALUE': case 'JSON_EXTRACT': return `json_extract(${a[0]}, ${a[1]})`;
    case 'JSON_UNQUOTE': return a[0];
    case 'JSON_QUERY': return `json_extract(${a[0]}, ${a[1]})`;
    case 'JSON_LENGTH': return `json_array_length(${a.join(', ')})`;
    case 'JSONB_ARRAY_LENGTH': case 'JSON_ARRAY_LENGTH': return `json_array_length(${a[0]})`;
    case 'JSONB_EXTRACT_PATH_TEXT': case 'JSON_EXTRACT_PATH_TEXT': case 'JSONB_EXTRACT_PATH': case 'JSON_EXTRACT_PATH': return `json_extract(${a[0]}, '$.${a.slice(1).map(unq).join('.')}')`;
    case 'JSON_BUILD_OBJECT': return `json_object(${a.join(', ')})`;
    case 'JSON_AGG': case 'JSONB_AGG': case 'JSON_ARRAYAGG': return `json_group_array(${a[0]})`;
    case 'JSON_OBJECT': {
      if (d === 'tsql' || d === 'oracle') { const parts = []; for (const at of A) { const ci = at.findIndex(t => isP(t, ':') || isW(t, 'VALUE')); if (ci < 0) return null; parts.push(revInner(txt(at.slice(0, ci)), d, ctx).trim(), revInner(txt(at.slice(ci + 1)), d, ctx).trim()); } return `json_object(${parts.join(', ')})`; }
      return `json_object(${a.join(', ')})`;
    }
    case 'SCOPE_IDENTITY': case 'LAST_INSERT_ID': return `last_insert_rowid()`;
    case 'OBJECT_ID': { const nm = unq(a[0] || "''").replace(/^tempdb\.\.|^dbo\./i, '').replace(/^#/, 'tmp_'); return `(SELECT 1 FROM sqlite_master WHERE name = '${nm}' UNION SELECT 1 FROM sqlite_temp_master WHERE name = '${nm}')`; }
    case 'ROW_COUNT': return 'changes()';
    case 'ERROR_MESSAGE': case 'ERROR_NUMBER': case 'ERROR_LINE': case 'ERROR_SEVERITY': case 'ERROR_STATE': case 'ERROR_PROCEDURE':
      return ctx && ctx.err ? lit({ ERROR_MESSAGE: ctx.err.message, ERROR_NUMBER: ctx.err.number, ERROR_LINE: 1, ERROR_SEVERITY: ctx.err.severity || 16, ERROR_STATE: 1, ERROR_PROCEDURE: null }[N]) : 'NULL';
    case 'COUNTIF': return `COUNT(CASE WHEN ${a[0]} THEN 1 END)`;
    case 'SAFE_DIVIDE': return `(CASE WHEN (${a[1]}) = 0 THEN NULL ELSE (${a[0]}) * 1.0 / (${a[1]}) END)`;
    case 'DIV': return d === 'bq' ? `CAST((${a[0]}) / (${a[1]}) AS INTEGER)` : null;
    case 'DATE_DIFF': case 'DATETIME_DIFF': case 'TIMESTAMP_DIFF': return asInt(`datediff_('${part(a[2] || 'DAY')}', ${a[1]}, ${a[0]})`);
    case 'FORMAT_DATE': case 'FORMAT_DATETIME': case 'FORMAT_TIMESTAMP': return `bqfmt_(${a[0]}, ${a[1]})`;
    case 'PARSE_DATE': case 'PARSE_DATETIME': case 'PARSE_TIMESTAMP': return `parse_date_(${a[0]}, ${a[1]}, ${N === 'PARSE_DATE' ? 0 : 1}, 0)`;
    case 'SAFE_PARSE_DATE': case 'SAFE_PARSE_DATETIME': return `parse_date_(${a[0]}, ${a[1]}, ${N === 'SAFE_PARSE_DATE' ? 0 : 1}, 1)`;
    case 'DATE': return d === 'bq' && a.length === 3 ? `datefromparts_(${a.join(', ')})` : null;
    case 'DATETIME': case 'TIMESTAMP': return d === 'bq' && a.length === 1 ? `datetime(${a[0]})` : null;
    case 'CURRENT_DATETIME': return 'getdate_()';
    case 'REGEXP_CONTAINS': return `regexp_like(${a[0]}, ${a[1]})`;
    case 'REGEXP_EXTRACT': return `regexp_extract_(${a.join(', ')})`;
    case 'SPLIT': return d === 'bq' ? `(${splitJson(a[0], a[1] || "','")})` : null;
    case 'ARRAY_LENGTH': return d === 'bq' ? `json_array_length(${a[0]})` : null;
    case 'ARRAY_AGG': return d === 'bq' ? `json_group_array(${a.join(', ')})` : null;
    case 'ARRAY_TO_STRING': return `arr_to_str_(${a.join(', ')})`;
    case 'TO_JSON_STRING': return a[0];
    case 'PARSE_JSON': return `json(${a[0]})`;
    case 'JSON_EXTRACT_SCALAR': return `json_extract(${a[0]}, ${a[1]})`;
    case 'STARTS_WITH': return `(substr(${a[0]}, 1, length(${a[1]})) = ${a[1]})`;
    case 'ENDS_WITH': return `(substr(${a[0]}, -length(${a[1]})) = ${a[1]})`;
    case 'CONTAINS_SUBSTR': return `(instr(lower(${a[0]}), lower(${a[1]})) > 0)`;
    case 'APPROX_COUNT_DISTINCT': return `COUNT(DISTINCT ${a[0]})`;
    case 'APPROX_QUANTILES': return `approx_quantiles_(${a.join(', ')})`;
    case 'LOGICAL_AND': return `min(${a[0]})`;
    case 'LOGICAL_OR': return `max(${a[0]})`;
    case 'GENERATE_UUID': return 'newid_()';
    case 'EDIT_DISTANCE': return `levenshtein(${a[0]}, ${a[1]})`;
    case 'ISJSON': return `json_valid(${a[0]})`;
    case 'JSON_MODIFY': return `CASE WHEN (${a[2]}) IS NULL THEN json_remove(${a[0]}, ${a[1]}) ELSE json_set(${a[0]}, ${a[1]}, ${a[2]}) END`;
    case 'TRANSLATE': return `translate_(${a[0]}, ${a[1]}, ${a[2]}, ${d === 'tsql' ? 1 : 0})`;
    case 'REGEXP_REPLACE': return d === 'pg' ? `regexp_replace_pg_(${a.join(', ')})` : null;
    case 'REGEXP_LIKE': return d === 'mysql' && a.length === 2 ? `regexp_like(${a[0]}, ${a[1]}, 'i')` : null;
    case 'NEXTVAL': return d === 'pg' ? `seq_next_(${a[0]})` : null;
    case 'CURRVAL': return d === 'pg' ? `seq_curr_(${a[0]})` : null;
    case 'SETVAL': return d === 'pg' ? `seq_set_(${a[0]}, ${a[1]})` : null;
    case 'STRING_SPLIT': return d === 'tsql' ? `json_each(${splitJson(a[0], a[1])})` : null;
    case 'STRING_TO_ARRAY': return d === 'pg' ? `json_each(${splitJson(a[0], a[1])})` : null;
    case 'UNNEST': return d === 'pg' && /^json_each\(/.test(a[0] || '') ? a[0] : null;
    case 'STRING_TO_TABLE': return d === 'pg' ? `json_each(${splitJson(a[0], a[1])})` : null;
    case '@@': return null;
  }
  if (ctx && ctx.udf && ctx.udf[N]) return `${ctx.udf[N].sqlName}(${a.join(', ')})`;
  return null;
}
function splitJson(x, sep) { return `'["' || replace(replace(replace(CAST(${x} AS TEXT), '\\', '\\\\'), '"', '\\"'), ${sep}, '","') || '"]'`; }
function revInner(sql, d, ctx) { return renderCalls(rt(sql), (N, a, A) => revCall(N, a, A, d, ctx)); }

function revPercentile(sql) { // PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) [OVER ()]
  let T = rt(sql);
  for (let g = 0; g < 20; g++) {
    const i = T.findIndex(t => isW(t, 'PERCENTILE_CONT', 'PERCENTILE_DISC', 'STRING_AGG', 'LISTAGG'));
    if (i < 0) break;
    const o = nx(T, i), c = closeP(T, o), w = nx(T, c);
    if (!isW(T[w], 'WITHIN')) { T[i] = Object.assign({}, T[i], { u: T[i].u + '#' }); continue; }
    const g1 = nx(T, w), o2 = nx(T, g1), c2 = closeP(T, o2);
    const ob = txt(T.slice(o2 + 1, c2)).trim(); const x = ob.replace(/^ORDER\s+BY\s+/i, '');
    let end = c2; const ov = nx(T, c2);
    if (isW(T[ov], 'OVER')) { const o3 = nx(T, ov), c3 = closeP(T, o3); if (txt(T.slice(o3 + 1, c3)).trim() !== '') throw new DErr('PERCENTILE_CONT ... OVER (PARTITION BY ...) bu tarayıcı motorunda desteklenmiyor.', 'Grup bazlı medyan için GROUP BY ile birlikte kullanılabilen bir yazım tercih et.'); end = c3; }
    const args = argsOf(T, o, c).map(a => txt(a).trim());
    let rep;
    if (T[i].u === 'STRING_AGG' || T[i].u === 'LISTAGG') rep = `string_agg(${args[0]}, ${args[1] || "','"} ${ob})`;
    else rep = args[0] === '0.5' && T[i].u === 'PERCENTILE_CONT' ? `median(${x})` : `percentile_${T[i].u === 'PERCENTILE_CONT' ? 'cont' : 'disc'}_(${args[0]}, ${x})`;
    T = rt(txt(T.slice(0, i)) + rep + txt(T.slice(end + 1)));
  }
  return txt(T).replace(/(PERCENTILE_CONT|PERCENTILE_DISC|STRING_AGG|LISTAGG)#/g, '$1');
}
function revTop(sql, d, db) {
  let T = rt(sql);
  for (let g = 0; g < 20; g++) {
    const D = depthAt(T);
    let ti = -1; for (let i = 0; i < T.length; i++) if (isW(T[i], 'TOP')) { const p = pv(T, i); if (isW(T[p], 'SELECT', 'DISTINCT', 'ALL')) { ti = i; break; } }
    if (ti < 0) break;
    const dep = D[ti]; let ne = nx(T, ti), nTxt, after;
    if (isP(T[ne], '(')) { const c = closeP(T, ne); nTxt = txt(T.slice(ne + 1, c)); after = c; } else { nTxt = T[ne].v; after = ne; }
    let k = nx(T, after), percent = false, ties = false;
    if (isW(T[k], 'PERCENT')) { percent = true; after = k; k = nx(T, k); }
    if (isW(T[k], 'WITH') && isW(T[nx(T, k)], 'TIES')) { ties = true; after = nx(T, k); }
    // kapsam sonu: aynı derinlikte UNION/; ya da kapanan parantez
    let e = T.length; for (let j = after + 1; j < T.length; j++) { if (D[j] < dep || (D[j] === dep && (isP(T[j], ';') || isW(T[j], 'UNION', 'EXCEPT', 'INTERSECT')))) { e = j; break; } }
    let e2 = e; while (e2 > after && !sigk(T[e2 - 1])) e2--;
    const before = txt(T.slice(0, ti)), body = txt(T.slice(after + 1, e2)), tail = txt(T.slice(e2));
    const nExpr = revInner(nTxt, d);
    if (!percent && !ties) { T = rt(before + body.replace(/^\s+/, ' ').replace(/^ /, '') + ' LIMIT ' + nExpr + tail); continue; }
    // ORDER BY'ı ayır
    const BT = rt(body); const BD = depthAt(BT); let oi = -1; for (let j = 0; j < BT.length; j++) if (BD[j] === 0 && isW(BT[j], 'ORDER') && isW(BT[nx(BT, j)], 'BY')) oi = j;
    const selBody = oi >= 0 ? txt(BT.slice(0, oi)) : body; const ordBy = oi >= 0 ? txt(BT.slice(nx(BT, nx(BT, oi)))) : null;
    const selStart = before.replace(/\s+$/, '');
    if (ties) {
      if (!ordBy) throw new DErr('Msg 1062: The TOP N WITH TIES clause is not allowed without a corresponding ORDER BY clause.', 'WITH TIES için ORDER BY gerekir.');
      const inner = 'SELECT ' + selBody.replace(/^\s*/, '') ;
      // sütun adlarını öğren
      let cols = null; try { const st = db.prepare(revSimple(inner, d)); cols = st.getColumnNames(); st.free(); } catch (er) { cols = null; }
      if (!cols) throw new DErr('TOP WITH TIES bu sorguda çevrilemedi.');
      const fromIdx = (() => { const IT = rt(selBody); const ID = depthAt(IT); for (let j = 0; j < IT.length; j++) if (ID[j] === 0 && isW(IT[j], 'FROM')) return j; return -1; })();
      const IT = rt(selBody); const listTxt = fromIdx >= 0 ? txt(IT.slice(0, fromIdx)) : selBody; const restTxt = fromIdx >= 0 ? txt(IT.slice(fromIdx)) : '';
      const q = `SELECT ${cols.map(c => '"' + c.replace(/"/g, '""') + '"').join(', ')} FROM (SELECT ${listTxt.trim()}, RANK() OVER (ORDER BY ${ordBy.trim()}) AS __rk ${restTxt}) WHERE __rk <= ${nExpr} ORDER BY __rk`;
      const pre = selStart.replace(/SELECT$/i, '').replace(/(DISTINCT|ALL)$/i, '');
      T = rt(pre + q + tail); continue;
    }
    if (percent) {
      const q = `SELECT ${selBody.trim()}${ordBy ? ' ORDER BY ' + ordBy.trim() : ''} LIMIT (SELECT CAST(ceil(COUNT(*) * (${nExpr}) / 100.0) AS INTEGER) FROM (SELECT ${selBody.trim()}))`;
      const pre = selStart.replace(/SELECT$/i, '');
      T = rt(pre + q + tail); continue;
    }
  }
  return txt(T);
}
function revOffsetFetch(sql) {
  let s = sql;
  s = s.replace(/\bOFFSET\s+([^;]+?)\s+ROWS?\s+FETCH\s+(?:NEXT|FIRST)\s+([^;]+?)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $2 OFFSET $1');
  s = s.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+([^;]+?)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $1');
  s = s.replace(/\bOFFSET\s+(\S+)\s+ROWS?\b(?!\s+FETCH)/gi, 'LIMIT -1 OFFSET $1');
  s = s.replace(/\bORDER\s+BY\s+\(\s*SELECT\s+NULL\s*\)/gi, '');
  return s;
}
function revMysqlLimit(sql) { return sql.replace(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1'); }
function revRownum(sql) {
  // WHERE ... ROWNUM <= n → LIMIT n (basit durum)
  let T = rt(sql);
  const i = T.findIndex(t => isW(t, 'ROWNUM')); if (i < 0) return sql;
  const op = nx(T, i), nn = nx(T, op);
  if (!(isP(T[op], '<=') || isP(T[op], '<'))) throw new DErr('ROWNUM bu biçimde desteklenmiyor.', 'WHERE ROWNUM <= n veya FETCH FIRST n ROWS ONLY kullan.');
  const n = parseInt(T[nn].v, 10) - (isP(T[op], '<') ? 1 : 0);
  const D = depthAt(T); const dep = D[i];
  const p = pv(T, i); let s0 = i, e0 = nn;
  if (isW(T[p], 'AND')) s0 = p; else if (isW(T[p], 'WHERE')) { const a2 = nx(T, nn); if (isW(T[a2], 'AND')) e0 = a2; else s0 = p; }
  let e = T.length; for (let j = nn + 1; j < T.length; j++) if (D[j] < dep || (D[j] === dep && isP(T[j], ';'))) { e = j; break; }
  let e2 = e; while (e2 > nn && !sigk(T[e2 - 1])) e2--;
  return txt(T.slice(0, s0)) + ' ' + txt(T.slice(e0 + 1, e2)).trim() + ' LIMIT ' + n + txt(T.slice(e2));
}
function revInterval(sql, d) {
  // x + INTERVAL '7 day' | x - INTERVAL '1' MONTH | INTERVAL 7 DAY
  let T = rt(sql);
  for (let g = 0; g < 30; g++) {
    const i = T.findIndex(t => isW(t, 'INTERVAL')); if (i < 0) break;
    const op = pv(T, i); const valI = nx(T, i);
    if (isP(T[op], '*') && T[valI].k === 's') { /* x + (ifade) * INTERVAL '1 hour' */ const me = pv(T, op), ms = primStartBack(T, me), op2 = pv(T, ms); const mv = unq(T[valI].v).trim().match(/^(-?\d+)\s*([A-Za-z]+)$/); if (mv && (isP(T[op2], '+') || isP(T[op2], '-'))) { const le2 = pv(T, op2), ls2 = primStartBack(T, le2); const sg = isP(T[op2], '-') ? '-' : ''; T = rt(txt(T.slice(0, ls2)) + `dateadd_('${part(mv[2])}', ${sg}(${txt(T.slice(ms, me + 1))}) * ${mv[1]}, ${txt(T.slice(ls2, le2 + 1))})` + txt(T.slice(valI + 1))); continue; } }
    if (!(isP(T[op], '+') || isP(T[op], '-'))) { T[i] = Object.assign({}, T[i], { u: 'INTERVAL#' }); continue; }
    let n, u, end = valI;
    if (T[valI].k === 's') { const v = unq(T[valI].v).trim(); const m = v.match(/^(-?\d+)\s*([A-Za-z]+)?$/); if (!m) throw new DErr('INTERVAL biçimi anlaşılamadı: ' + v); n = m[1]; u = m[2]; if (!u) { const un = nx(T, valI); u = T[un].v; end = un; } }
    else { n = T[valI].v; const un = nx(T, valI); u = T[un].v; end = un; }
    const sign = isP(T[op], '-') ? -1 : 1;
    if (!(isP(T[op], '+') || isP(T[op], '-'))) throw new DErr('INTERVAL yalnızca tarih + INTERVAL biçiminde destekleniyor.');
    const le = pv(T, op), ls = primStartBack(T, le);
    const base = txt(T.slice(ls, le + 1));
    T = rt(txt(T.slice(0, ls)) + `dateadd_('${part(u)}', ${sign * parseInt(n, 10)}, ${base})` + txt(T.slice(end + 1)));
  }
  return txt(T).replace(/INTERVAL#/g, 'INTERVAL');
}
function revPgCast(sql) { // x::tip → CAST(x AS tip)
  let T = rt(sql);
  for (let g = 0; g < 50; g++) {
    const i = T.findIndex(t => t.k === 'o' && t.v === '::'); if (i < 0) break;
    const le = pv(T, i), ls = primStartBack(T, le);
    let te = nx(T, i); if (isP(T[nx(T, te)], '(')) te = closeP(T, nx(T, te));
    if (isW(T[te], 'DOUBLE') && isW(T[nx(T, te)], 'PRECISION')) te = nx(T, te);
    T = rt(txt(T.slice(0, ls)) + 'CAST(' + txt(T.slice(ls, le + 1)) + ' AS ' + txt(T.slice(nx(T, i), te + 1)) + ')' + txt(T.slice(te + 1)));
  }
  return txt(T);
}
function revDateArith(sql, d) { // oracle/pg: tarih_sütunu ± n  ve  tarih - tarih
  if (d !== 'oracle' && d !== 'pg') return sql;
  let T = rt(sql);
  const isDateExpr = (s, e) => { const toks = T.slice(s, e + 1).filter(sigk); if (!toks.length) return false; const last = toks[toks.length - 1]; if (toks.length === 1 && last.k === 'w' && DATE_COLS.has(last.u.toLowerCase())) return true; if (toks.length >= 3 && isP(toks[toks.length - 2], '.') && DATE_COLS.has(last.u ? last.u.toLowerCase() : '')) return true; if (toks.length === 2 && isW(toks[0], 'DATE') && toks[1].k === 's') return true; if (toks[0].k === 'w' && /^(DATEADD_|DATE|DATETIME|SYSDATE|TRUNC|DATETRUNC_|TO_DATE)$/i.test(toks[0].u) && !isP(toks[0], '.')) return true; if (toks[0].k === 'w' && toks[0].u === 'CAST' && /AS\s+(DATE|TIMESTAMP)\s*\)$/i.test(txt(T.slice(s, e + 1)))) return true; if (toks[0].k === 'w' && /^(MAX|MIN)$/.test(toks[0].u) && toks.length >= 4 && DATE_COLS.has((toks[toks.length - 2].u || '').toLowerCase())) return true; return false; };
  for (let g = 0; g < 40; g++) {
    let changed = false;
    for (let i = 0; i < T.length; i++) {
      if (!(isP(T[i], '+') || isP(T[i], '-'))) continue;
      const le = pv(T, i); if (le < 0) continue; const ls = primStartBack(T, le);
      let rs = nx(T, i); if (isW(T[rs], 'DATE') && T[nx(T, rs)] && T[nx(T, rs)].k === 's') { /* DATE 'x' */ }
      const re = isW(T[rs], 'DATE') ? nx(T, rs) : primEndFwd(T, rs);
      const L = isDateExpr(ls, le), Rr = isDateExpr(rs, re);
      if (L && Rr && isP(T[i], '-')) { T = rt(txt(T.slice(0, ls)) + `(julianday(${txt(T.slice(ls, le + 1))}) - julianday(${txt(T.slice(rs, re + 1))}))` + txt(T.slice(re + 1))); changed = true; break; }
      if (L && !Rr && T[rs] && (T[rs].k === 'n' || isP(T[rs], '('))) { const n = txt(T.slice(rs, re + 1)); T = rt(txt(T.slice(0, ls)) + `dateadd_('day', ${isP(T[i], '-') ? '-' : ''}(${n}), ${txt(T.slice(ls, le + 1))})` + txt(T.slice(re + 1))); changed = true; break; }
    }
    if (!changed) break;
  }
  return txt(T);
}
function revTsqlPlus(sql) { // '+' metin birleştirme sezgisi
  const T = rt(sql); let out = '';
  const isTextish = (s, e) => { const toks = T.slice(s, e + 1).filter(sigk); if (!toks.length) return false; if (toks.length === 1 && toks[0].k === 's') return true; const last = toks[toks.length - 1]; if (last.k === 'w' && TEXT_COLS.has(last.u.toLowerCase()) && (toks.length === 1 || isP(toks[toks.length - 2], '.'))) return true; if (toks[0].k === 'w' && /^(CAST|CONVERT|TRY_CAST)$/.test(toks[0].u) && /(N?VARCHAR|N?CHAR|TEXT)/i.test(txt(T.slice(s, e + 1)))) return true; if (toks[0].k === 'w' && /^(UPPER|LOWER|LTRIM|RTRIM|TRIM|LEFT|RIGHT|SUBSTRING|REPLACE|CONCAT|FORMAT|DATENAME|REPLICATE|STR|ISNULL|COALESCE)$/.test(toks[0].u) && !(toks[0].u === 'ISNULL' || toks[0].u === 'COALESCE') ) return true; if (toks[0].k === 'w' && /^(ISNULL|COALESCE)$/.test(toks[0].u) && /'/.test(txt(T.slice(s, e + 1)))) return true; return false; };
  for (let i = 0; i < T.length; i++) {
    if (isP(T[i], '+')) {
      const le = pv(T, i), rs = nx(T, i);
      if (le >= 0 && rs < T.length) { const ls = primStartBack(T, le), re = primEndFwd(T, rs);
        /* Tip önceliği: metin sabiti + sayı → SQL Server metni sayıya çevirir ('5' + 1 = 6) */
        const numLit = (s, e) => { const x = T.slice(s, e + 1).filter(sigk); return x.length === 1 && x[0].k === 'n'; }; const strLit = (s, e) => { const x = T.slice(s, e + 1).filter(sigk); return x.length === 1 && x[0].k === 's'; };
        if ((numLit(ls, le) && strLit(rs, re)) || (strLit(ls, le) && numLit(rs, re))) { const sv = unq(T[strLit(ls, le) ? ls : rs].v).trim(); if (!/^-?\d+(\.\d+)?$/.test(sv)) throw new DErr(`Msg 245, Level 16, State 1: Conversion failed when converting the varchar value '${sv}' to data type int.`, 'Sayı ile metni + ile toplayamazsın. Birleştirmek istiyorsan önce sayıyı CAST ile metne çevir.'); out += '+'; continue; }
        if (isTextish(ls, le) || isTextish(rs, re)) { out += '||'; continue; } }
    }
    out += tv(T[i]);
  }
  return out;
}
function revLikeBrackets(sql) { // T-SQL LIKE '[a-c]%' → GLOB
  const T = rt(sql); let out = '';
  for (let i = 0; i < T.length; i++) {
    if (isW(T[i], 'LIKE')) { const r = nx(T, i); if (T[r] && T[r].k === 's' && /\[[^\]]+\]/.test(T[r].v)) { const p = unq(T[r].v).toLowerCase().replace(/\*/g, '[*]').replace(/\?/g, '[?]').replace(/%/g, '*').replace(/_/g, '?').replace(/\[\^/g, '[^'); const neg = isW(T[pv(T, i)], 'NOT'); const le = pv(T, neg ? pv(T, i) : i); const ls = primStartBack(T, le); out = out.slice(0, out.length - txt(T.slice(ls, i)).length); out += `${neg ? 'NOT ' : ''}lower(${txt(T.slice(ls, le + 1))}) GLOB ${lit(p)}`; i = r; continue; } }
    out += tv(T[i]);
  }
  return out;
}
function revDivision(sql) { // MySQL/Oracle: / her zaman ondalıklı
  const T = rt(sql); let out = '';
  for (let i = 0; i < T.length; i++) { if (isP(T[i], '/')) { out += '* 1.0 /'; continue; } out += tv(T[i]); }
  return out;
}
function revNullsOrder(sql) { // PG/Oracle: ASC'de NULL sonda, DESC'de başta
  const T = rt(sql); const D = depthAt(T); const ins = [];
  for (let i = 0; i < T.length; i++) {
    if (!(isW(T[i], 'ORDER') && isW(T[nx(T, i)], 'BY'))) continue;
    const dep = D[i]; let j = nx(T, nx(T, i)); let itemStart = j;
    const finishItem = (end) => { // [itemStart, end)
      const toks = T.slice(itemStart, end); if (toks.some(t => isW(t, 'NULLS'))) return;
      const sig = toks.filter(sigk); if (!sig.length) return; const last = sig[sig.length - 1];
      let k = end; while (k > itemStart && !sigk(T[k - 1])) k--;
      ins.push({ at: k, s: isW(last, 'DESC') ? ' NULLS FIRST' : ' NULLS LAST' });
    };
    for (; j < T.length; j++) {
      if (D[j] < dep || (D[j] === dep && (isP(T[j], ';') || isW(T[j], 'LIMIT', 'OFFSET', 'FETCH', 'ROWS', 'RANGE', 'GROUPS', 'UNION', 'INTERSECT', 'EXCEPT')))) { finishItem(j); break; }
      if (D[j] === dep && isP(T[j], ',')) { finishItem(j); itemStart = j + 1; }
    }
    if (j >= T.length) finishItem(T.length);
  }
  if (!ins.length) return sql;
  ins.sort((a, b) => b.at - a.at); let arr = T.map(tv);
  for (const x of ins) arr.splice(x.at, 0, x.s);
  return arr.join('');
}
function revOracleEmpty(sql) { const T = rt(sql); return T.map(t => t.k === 's' && t.v === "''" ? 'NULL' : tv(t)).join(''); }
function revOracleConcat(sql) { return rewriteChains(sql, '||', ops => 'concat(' + ops.join(', ') + ')'); }
function revDateLits(sql) { const T = rt(sql); let out = ''; for (let i = 0; i < T.length; i++) { if (isW(T[i], 'DATE', 'TIMESTAMP') && T[nx(T, i)] && T[nx(T, i)].k === 's') { const k = nx(T, i); const op = nx(T, k), num = nx(T, op); if (T[op] && (isP(T[op], '+') || isP(T[op], '-')) && T[num] && T[num].k === 'n' && !(T[nx(T, num)] && (isP(T[nx(T, num)], '*') || isP(T[nx(T, num)], '/')))) { const fn = isW(T[i], 'TIMESTAMP') ? 'datetime' : 'date'; out += fn + '(' + T[k].v + ", '" + (isP(T[op], '-') ? '-' : '+') + T[num].v + " days')"; i = num; continue; } out += T[k].v; i = k; continue; } out += tv(T[i]); } return out; }
function revDdlTsql(sql) {
  let s = sql;
  s = s.replace(/\b(N?VARCHAR|VARBINARY)\s*\(\s*MAX\s*\)/gi, 'TEXT');
  s = s.replace(/\bINT\s+IDENTITY\s*(\(\s*\d+\s*,\s*\d+\s*\))?\s+(NOT\s+NULL\s+)?PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY');
  s = s.replace(/\bIDENTITY\s*(\(\s*\d+\s*,\s*\d+\s*\))?/gi, '');
  s = s.replace(/\bGETDATE\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP').replace(/\bSYSDATETIME\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  s = s.replace(/ALTER\s+TABLE\s+(\S+)\s+ADD\s+(?!COLUMN\b|CONSTRAINT\b|PRIMARY\b|FOREIGN\b|UNIQUE\b|CHECK\b)/gi, 'ALTER TABLE $1 ADD COLUMN ');
  s = s.replace(/ALTER\s+TABLE\s+(\S+)\s+ALTER\s+COLUMN\b[^;]*/gi, m => { throw new DErr('ALTER COLUMN bu tarayıcı motorunda desteklenmiyor (SQLite sınırlaması).', 'Gerçek SQL Server\'da çalışır: ' + m.trim()); });
  return s;
}
function revSelectInto(sql) { // SELECT ... INTO t FROM → CREATE TABLE t AS SELECT ...
  const T = rt(sql); const D = depthAt(T);
  const ii = T.findIndex((t, i) => isW(t, 'INTO') && D[i] === 0 && !T.slice(0, i).some(x => isW(x, 'INSERT', 'MERGE')));
  if (ii < 0) return sql;
  const nm = nx(T, ii); let ne = nm; while (isP(T[nx(T, ne)], '.')) ne = nx(T, nx(T, ne));
  const name = txt(T.slice(nm, ne + 1));
  const startSel = (() => { if (isW(T[nx(T, -1)], 'WITH')) return nx(T, -1); return T.findIndex((t, i) => isW(t, 'SELECT') && D[i] === 0); })();
  return txt(T.slice(0, startSel)) + 'CREATE TABLE ' + name + ' AS ' + txt(T.slice(startSel, ii)).replace(/\s+$/, ' ') + txt(T.slice(ne + 1)).replace(/^\s+/, '');
}
function revTemp(sql) { // #tablo → tmp_tablo
  const T = rt(sql); let out = '';
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 'tmp') { const nm = 'tmp_' + t.v.replace(/^#+/, ''); const p = pv(T, i), pp = pv(T, p); if (isW(T[p], 'TABLE') && isW(T[pp], 'CREATE')) { out = out.replace(/CREATE(\s+)TABLE(\s*)$/i, 'CREATE$1TEMP TABLE$2'); } out += nm; continue; }
    out += tv(t);
  }
  return out;
}
function revOutput(sql) { // OUTPUT inserted.x, deleted.y → RETURNING (basit)
  const T = rt(sql); const oi = T.findIndex(t => isW(t, 'OUTPUT')); if (oi < 0) return sql;
  const D = depthAt(T); const head = T.slice(0, oi).find(sigk);
  let e = T.length; const stops = ['FROM', 'WHERE', 'VALUES', 'SELECT', 'DEFAULT'];
  for (let j = nx(T, oi); j < T.length; j++) if (D[j] === D[oi] && (isW(T[j], ...stops) || isP(T[j], ';') || isW(T[j], 'INTO'))) { e = j; break; }
  const list = txt(T.slice(nx(T, oi), e)).trim();
  if (/\bdeleted\./i.test(list) && isW(head, 'UPDATE')) throw new DErr('UPDATE ile OUTPUT deleted.* bu tarayıcı motorunda desteklenmiyor.', 'Gerçek SQL Server\'da eski değerleri döndürür; burada inserted.* kullanabilirsin.');
  const ret = list.replace(/\b(inserted|deleted)\./gi, '');
  let rest = txt(T.slice(e)); const semi = rest.match(/;\s*$/);
  if (semi) rest = rest.slice(0, semi.index);
  return txt(T.slice(0, oi)).replace(/\s+$/, ' ') + rest.replace(/^\s+/, '') + ' RETURNING ' + ret + (semi ? ';' : '');
}
function revInfoSchema(sql) {
  const TBL = "(SELECT 'anadolu' AS TABLE_CATALOG, 'dbo' AS TABLE_SCHEMA, name AS TABLE_NAME, CASE type WHEN 'table' THEN 'BASE TABLE' ELSE 'VIEW' END AS TABLE_TYPE FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%')";
  const COL = "(SELECT m.name AS TABLE_NAME, p.name AS COLUMN_NAME, p.cid + 1 AS ORDINAL_POSITION, tsqltype_(p.type) AS DATA_TYPE, CASE p.\"notnull\" WHEN 1 THEN 'NO' ELSE 'YES' END AS IS_NULLABLE, p.dflt_value AS COLUMN_DEFAULT FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%')";
  const SYST = "(SELECT name, rowid AS object_id, 'U' AS type, 'USER_TABLE' AS type_desc FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%')";
  const SYSC = "(SELECT p.name, (SELECT rowid FROM sqlite_master x WHERE x.name = m.name) AS object_id, p.cid + 1 AS column_id, tsqltype_(p.type) AS type_name, CASE p.\"notnull\" WHEN 1 THEN 0 ELSE 1 END AS is_nullable FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%')";
  const SYSI = "(SELECT name, tbl_name AS table_name, 'NONCLUSTERED' AS type_desc FROM sqlite_master WHERE type = 'index')";
  const SYSV = "(SELECT name FROM sqlite_master WHERE type = 'view')";
  return sql.replace(/\bINFORMATION_SCHEMA\s*\.\s*TABLES\b/gi, TBL).replace(/\bINFORMATION_SCHEMA\s*\.\s*COLUMNS\b/gi, COL)
    .replace(/\bsys\s*\.\s*tables\b/gi, SYST).replace(/\bsys\s*\.\s*columns\b/gi, SYSC).replace(/\bsys\s*\.\s*indexes\b/gi, SYSI).replace(/\bsys\s*\.\s*views\b/gi, SYSV)
    .replace(/\buser_tables\b/gi, "(SELECT ascii_upper_(name) AS TABLE_NAME FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%')")
    .replace(/\buser_tab_columns\b/gi, "(SELECT ascii_upper_(m.name) AS TABLE_NAME, ascii_upper_(p.name) AS COLUMN_NAME, p.cid + 1 AS COLUMN_ID, CASE WHEN ascii_upper_(p.type) LIKE '%INT%' THEN 'NUMBER' WHEN ascii_upper_(p.type) IN ('REAL','FLOAT','DOUBLE') OR ascii_upper_(p.type) LIKE 'DEC%' OR ascii_upper_(p.type) LIKE 'NUM%' THEN 'NUMBER' WHEN ascii_upper_(p.type) LIKE '%DATE%' THEN 'DATE' ELSE 'VARCHAR2' END AS DATA_TYPE, CASE p.\"notnull\" WHEN 1 THEN 'N' ELSE 'Y' END AS NULLABLE FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%')")
    .replace(/\ball_tables\b/gi, "(SELECT 'ANADOLU' AS OWNER, ascii_upper_(name) AS TABLE_NAME FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%')");
}

/* GROUP BY ROLLUP / CUBE / GROUPING SETS / WITH ROLLUP taklitsi */
function revGrouping(sql, d) {
  if (!/\b(ROLLUP|CUBE|GROUPING\s+SETS)\b/i.test(sql)) return sql;
  const T = rt(sql); const D = depthAt(T);
  const gi = T.findIndex((t, i) => isW(t, 'GROUP') && D[i] === 0 && isW(T[nx(T, i)], 'BY'));
  if (gi < 0) throw new DErr('ROLLUP/CUBE yalnızca ana sorgunun GROUP BY kısmında destekleniyor.');
  // ana SELECT
  let si = -1; for (let i = 0; i < gi; i++) if (D[i] === 0 && isW(T[i], 'SELECT')) { si = i; break; }
  let fi = -1; for (let i = si + 1; i < gi; i++) if (D[i] === 0 && isW(T[i], 'FROM')) { fi = i; break; }
  const clauseEnd = (from) => { for (let i = from; i < T.length; i++) if (D[i] === 0 && (isW(T[i], 'HAVING', 'ORDER', 'LIMIT') || isP(T[i], ';'))) return i; return T.length; };
  const gbStart = nx(T, nx(T, gi)); const gbEnd = clauseEnd(gbStart);
  let hv = null, ob = null, tailI = gbEnd;
  if (isW(T[gbEnd], 'HAVING')) { const e = (() => { for (let i = gbEnd + 1; i < T.length; i++) if (D[i] === 0 && (isW(T[i], 'ORDER', 'LIMIT') || isP(T[i], ';'))) return i; return T.length; })(); hv = txt(T.slice(gbEnd, e)); tailI = e; }
  if (isW(T[tailI], 'ORDER')) { const e = (() => { for (let i = tailI + 1; i < T.length; i++) if (D[i] === 0 && (isW(T[i], 'LIMIT') || isP(T[i], ';'))) return i; return T.length; })(); ob = txt(T.slice(tailI, e)); tailI = e; }
  const tail = txt(T.slice(tailI));
  const prefix = txt(T.slice(0, si));
  const selDistinct = isW(T[nx(T, si)], 'DISTINCT');
  const listToks = T.slice(selDistinct ? nx(T, si) + 1 : si + 1, fi);
  const fromTxt = txt(T.slice(fi, gi));
  // grup ifadeleri
  let gbToks = T.slice(gbStart, gbEnd);
  let withRollup = false;
  { const s = gbToks.filter(sigk); if (s.length >= 2 && isW(s[s.length - 1], 'ROLLUP') && isW(s[s.length - 2], 'WITH')) { withRollup = true; const wi = gbToks.lastIndexOf(s[s.length - 2]); gbToks = gbToks.slice(0, wi); } }
  const items = splitTop(gbToks, ',').map(trimT).filter(x => x.length);
  let plain = [], sets = null;
  const norm = s => s.replace(/\s+/g, '').toLowerCase();
  for (const it of items) {
    if (isW(it[0], 'ROLLUP', 'CUBE')) { const cols = argsOf(it, nx(it, 0), closeP(it, nx(it, 0))).map(a => txt(trimT(a))); if (isW(it[0], 'ROLLUP')) { sets = []; for (let k = cols.length; k >= 0; k--) sets.push(cols.slice(0, k)); } else { sets = []; const n = cols.length; for (let m = (1 << n) - 1; m >= 0; m--) sets.push(cols.filter((_, b) => m & (1 << (n - 1 - b)))); } }
    else if (isW(it[0], 'GROUPING') && isW(it[nx(it, 0)], 'SETS')) { const o = nx(it, nx(it, 0)); sets = argsOf(it, o, closeP(it, o)).map(a => { a = trimT(a); if (isP(a[0], '(')) return argsOf(a, 0, closeP(a, 0)).map(x => txt(trimT(x))); return [txt(a)]; }); }
    else plain.push(txt(it));
  }
  if (withRollup) { const cols = plain; plain = []; sets = []; for (let k = cols.length; k >= 0; k--) sets.push(cols.slice(0, k)); }
  if (!sets) return sql;
  const all = [...new Set(plain.concat(...sets))];
  const selItems = splitTop(listToks, ',').map(trimT);
  const branch = (S, first) => {
    const grouped = new Set(plain.concat(S).map(norm));
    const outItems = selItems.map(toks => {
      // takma ad
      let ai = -1, dd = 0; for (let i = 0; i < toks.length; i++) { if (isP(toks[i], '(')) dd++; if (isP(toks[i], ')')) dd--; if (!dd && isW(toks[i], 'AS')) ai = i; }
      let expr = ai >= 0 ? txt(trimT(toks.slice(0, ai))) : txt(toks); let alias = ai >= 0 ? txt(toks.slice(ai + 1)).trim() : null;
      if (!alias) { const sg = toks.filter(sigk); if (sg.length >= 2 && (sg[sg.length - 1].k === 'w' || sg[sg.length - 1].k === 'q') && !isP(sg[sg.length - 2], '.') && sg[sg.length - 2].k !== 'o' && !isW(sg[sg.length - 2], 'CASE', 'END') && !(sg.length === 1)) { /* örtük takma ad */ const last = sg[sg.length - 1]; if (!isP(sg[sg.length - 2], '(')) { const k = toks.lastIndexOf(last); const e2 = txt(trimT(toks.slice(0, k))); if (/[)\w"\]]$/.test(e2) && !/^\w+$/.test(txt(toks).trim())) { expr = e2; alias = last.v; } } } }
      if (!alias) { const m = expr.match(/^(?:\w+\.)?(\w+)$/); if (m) alias = m[1]; }
      let e = expr;
      // GROUPING(x) / GROUPING_ID
      e = e.replace(/\bGROUPING\s*\(\s*([^()]+?)\s*\)/gi, (mm, x) => grouped.has(norm(x)) ? '0' : '1');
      if (all.some(c => norm(c) === norm(expr)) && !grouped.has(norm(expr))) e = 'NULL';
      return e + (alias ? ' AS ' + alias : '');
    });
    return 'SELECT ' + (selDistinct ? 'DISTINCT ' : '') + outItems.join(', ') + ' ' + fromTxt.trim() + (grouped.size ? ' GROUP BY ' + plain.concat(S).join(', ') : '') + (hv ? ' ' + hv.trim() : '');
  };
  const u = sets.map((S, k) => branch(S, k === 0)).join('\nUNION ALL\n');
  let obx = ob ? ' ' + ob.replace(/\b\w+\.(\w+)/g, '$1').replace(/\bGROUPING\s*\([^)]*\)/gi, '0') : '';
  void d;
  return prefix + 'SELECT * FROM (\n' + u + '\n)' + obx + tail;
}
/* PIVOT / UNPIVOT taklitsi */
function revPivot(sql, d, db) {
  if (!/\b(UN)?PIVOT\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 5; g++) {
    const pi = T.findIndex(t => isW(t, 'PIVOT', 'UNPIVOT')); if (pi < 0) break;
    const isUn = T[pi].u === 'UNPIVOT';
    // kaynak: PIVOT'tan önce gelen öğe (tablo [takma ad] veya (alt sorgu) [AS] takma ad)
    let se = pv(T, pi); let alias = null;
    if (T[se].k === 'w' && !isP(T[se], ')')) { const p2 = pv(T, se); if (isW(T[p2], 'AS')) { alias = T[se].v; se = pv(T, p2); } else if (isP(T[p2], ')') || T[p2].k === 'w' || T[p2].k === 'q') { if (!isW(T[p2], 'FROM', 'JOIN')) { alias = T[se].v; se = p2; } } }
    let ss = isP(T[se], ')') ? openP(T, se) : se;
    const srcTxt = txt(T.slice(ss, se + 1));
    const o = nx(T, pi), c = closeP(T, o);
    const inner = T.slice(o + 1, c);
    const forI = inner.findIndex(t => isW(t, 'FOR')), inI = inner.findIndex(t => isW(t, 'IN'));
    const aggTxt = txt(inner.slice(0, forI)).trim(); const pcol = txt(inner.slice(forI + 1, inI)).trim().replace(/^\[|\]$/g, '');
    const lo = inner.findIndex((t, k) => k > inI && isP(t, '(')); const lc = closeP(inner, lo);
    const vals = argsOf(inner, lo, lc).map(a => trimT(a)).map(a => { const tt = a.filter(sigk); let v = tt[0]; let al = null; if (tt.length >= 3 && isW(tt[1], 'AS')) al = tt[2].v; else if (tt.length === 2) al = tt[1].v; const raw = v.k === 'q' ? v.v.slice(1, -1) : v.k === 's' ? unq(v.v) : v.v; return { raw, lit: v.k === 'n' ? v.v : lit(raw), name: (al || raw).replace(/^"|"$/g, '') }; });
    // dış takma ad
    let after = nx(T, c), oalias = null, endI = c;
    if (isW(T[after], 'AS')) { oalias = T[nx(T, after)].v; endI = nx(T, after); } else if (T[after] && (T[after].k === 'w' || T[after].k === 'q') && !isW(T[after], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'ON')) { oalias = T[after].v; endI = after; }
    const srcSql = (isP(T[se], ')') ? srcTxt : srcTxt) + (alias ? ' AS ' + alias : '');
    let ctePrefix = ''; { const DD = depthAt(T); if (isW(T[nx(T, -1)], 'WITH')) { const ms = T.findIndex((t, z) => DD[z] === 0 && isW(t, 'SELECT')); if (ms > 0) ctePrefix = txt(T.slice(0, ms)); } }
    let cols = null; try { const st = db.prepare(revSimple(ctePrefix + 'SELECT * FROM ' + srcSql, d)); cols = st.getColumnNames(); st.free(); } catch (er) { throw new DErr('PIVOT kaynağı çalıştırılamadı: ' + er.message); }
    let rep;
    if (!isU(isUn)) {
      const am = aggTxt.match(/^(\w+)\s*\(\s*(.+?)\s*\)$/); if (!am) throw new DErr('PIVOT toplama ifadesi anlaşılamadı.');
      const vcol = am[2].replace(/^\[|\]$/g, '');
      const others = cols.filter(c2 => c2.toLowerCase() !== pcol.toLowerCase() && c2.toLowerCase() !== vcol.toLowerCase());
      rep = `(SELECT ${others.map(q2).join(', ')}${others.length ? ', ' : ''}${vals.map(v => `${am[1]}(CASE WHEN ${q2(pcol)} = ${v.lit} THEN ${q2(vcol)} END) AS ${q2(v.name)}`).join(', ')} FROM ${srcSql}${others.length ? ' GROUP BY ' + others.map(q2).join(', ') : ''})`;
    } else {
      const vcol = aggTxt.replace(/^\[|\]$/g, '');
      const names = vals.map(v => v.raw); const others = cols.filter(c2 => !names.map(x => x.toLowerCase()).includes(c2.toLowerCase()));
      rep = '(' + vals.map(v => `SELECT ${others.map(q2).join(', ')}${others.length ? ', ' : ''}${lit(v.name)} AS ${q2(pcol)}, ${q2(v.raw)} AS ${q2(vcol)} FROM ${srcSql} WHERE ${q2(v.raw)} IS NOT NULL`).join(' UNION ALL ') + ')';
    }
    T = rt(txt(T.slice(0, ss)) + rep + (oalias ? ' AS ' + oalias : '') + txt(T.slice(endI + 1)));
  }
  return txt(T);
  function isU(x) { return x; }
}
const q2 = c => '"' + String(c).replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').replace(/"/g, '""') + '"';


/* CROSS / OUTER APPLY taklitsi: ilişkili alt sorguyu pencere fonksiyonlu JOIN'e çevirir */
function outerAliases(T, upto) {
  const D = depthAt(T); const set = new Set(); const dep = D[upto];
  let inFrom = false;
  for (let i = 0; i < upto; i++) {
    if (D[i] !== dep) continue;
    if (isW(T[i], 'FROM', 'JOIN', 'APPLY')) { inFrom = true; const n = nx(T, i); if (!T[n]) continue; let e = n; if (isP(T[n], '(')) e = closeP(T, n); else while (isP(T[nx(T, e)], '.')) e = nx(T, nx(T, e)); if (T[e].k === 'w' || T[e].k === 'q') set.add(T[e].v.replace(/^\[|\]$/g, '').toLowerCase()); let a = nx(T, e); if (isW(T[a], 'AS')) a = nx(T, a); if (T[a] && (T[a].k === 'w' || T[a].k === 'q') && !isW(T[a], 'WHERE', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'FULL', 'CROSS', 'OUTER', 'GROUP', 'ORDER', 'APPLY')) set.add(T[a].v.replace(/^\[|\]$/g, '').toLowerCase()); }
    else if (inFrom && isP(T[i], ',')) { const n = nx(T, i); if (T[n] && (T[n].k === 'w' || T[n].k === 'q')) { set.add(T[n].v.toLowerCase()); let a = nx(T, n); if (isW(T[a], 'AS')) a = nx(T, a); if (T[a] && T[a].k === 'w' && !isW(T[a], 'WHERE', 'ON', 'JOIN')) set.add(T[a].v.toLowerCase()); } }
  }
  return set;
}
function refsOuter(toks, outerSet, innerSet) {
  for (let i = 0; i < toks.length; i++) { const t = toks[i]; if ((t.k === 'w' || t.k === 'q') && isP(toks[nx(toks, i)], '.')) { const nm = t.v.replace(/^\[|\]$/g, '').toLowerCase(); if (outerSet.has(nm) && !innerSet.has(nm)) return true; } }
  return false;
}
function revApply(sql, d, db) {
  if (!/\bAPPLY\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 6; g++) {
    const ai = T.findIndex((t, i) => isW(t, 'APPLY') && isW(T[pv(T, i)], 'CROSS', 'OUTER'));
    if (ai < 0) break;
    const kindI = pv(T, ai); const isOuter = T[kindI].u === 'OUTER';
    const o = nx(T, ai);
    if (isW(T[o], 'STRING_SPLIT', 'OPENJSON', 'GENERATE_SERIES') && isP(T[nx(T, o)], '(')) {
      const fo = nx(T, o), fc = closeP(T, fo); const A = argsOf(T, fo, fc).map(a => txt(a).trim());
      let end = fc, src, w = null;
      if (T[o].u === 'STRING_SPLIT') src = `json_each(${splitJson(A[0], A[1])})`;
      else if (T[o].u === 'OPENJSON') { src = `json_each(${A.join(', ')})`; w = ojWith(T, fc); if (w) end = w.end; }
      else throw new DErr('Bu taklit katmanında GENERATE_SERIES APPLY ile kullanılamıyor; FROM içinde kullan.');
      let k = nx(T, end), alias = null, aEnd = end;
      if (isW(T[k], 'AS')) { alias = T[nx(T, k)].v; aEnd = nx(T, k); } else if (T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'OUTER', 'LEFT', 'INNER', 'ON')) { alias = T[k].v; aEnd = k; }
      if (!alias) alias = '__ap' + g;
      let before = txt(T.slice(0, kindI)), after = txt(T.slice(aEnd + 1));
      if (w) { const repl = (s, sel) => { let out = s; for (const df of w.defs) { const ex = ojExpr(df, alias + '.value'); out = out.replace(new RegExp('(^|[^.\\w])(?:' + alias + '\\s*\\.\\s*)?\\[?' + df.name + '\\]?(?![\\w(])', 'g'), (m, p1, off, str) => /\bAS\s*$/i.test(str.slice(0, off + p1.length)) || /'[^']*$/.test(str.slice(0, off).replace(/'[^']*'/g, '')) ? m : p1 + ex + (sel && /^\s*(,|FROM\b)/i.test(str.slice(off + m.length)) ? ' AS ' + df.name : '')); } return out; }; before = repl(before, true); after = repl(after, false); }
      T = rt(before + (isOuter ? 'LEFT JOIN ' : 'JOIN ') + src + ' AS ' + alias + (isOuter ? ' ON 1 = 1' : '') + after);
      continue;
    }
    if (!isP(T[o], '(')) throw new DErr('APPLY bu tarayıcı motorunda yalnızca (alt sorgu) veya satır içi tablo değerli fonksiyonla destekleniyor.', 'STRING_SPLIT / OPENJSON gibi yerleşik fonksiyonlar gerçek SQL Server\'da çalışır.');
    const c = closeP(T, o);
    let k = nx(T, c), alias = null, endI = c;
    if (isW(T[k], 'AS')) { alias = T[nx(T, k)].v; endI = nx(T, k); }
    else if (T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'OUTER', 'LEFT', 'INNER', 'ON')) { alias = T[k].v; endI = k; }
    if (!alias) throw new DErr("Msg 102, Level 15: Incorrect syntax near ')'.", 'APPLY ile kullanılan alt sorguya takma ad ver: CROSS APPLY (...) AS x');
    const inner = trimT(T.slice(o + 1, c)); const ID = depthAt(inner);
    const at = w => inner.findIndex((t, i) => ID[i] === 0 && isW(t, w));
    const sel = at('SELECT'); if (sel < 0) throw new DErr('APPLY alt sorgusu SELECT ile başlamalı.');
    let p = nx(inner, sel), topN = null;
    if (isW(inner[p], 'TOP')) { const q = nx(inner, p); if (isP(inner[q], '(')) { const cc = closeP(inner, q); topN = txt(inner.slice(q + 1, cc)).trim(); p = nx(inner, cc); } else { topN = inner[q].v; p = nx(inner, q); } }
    const fromI = at('FROM'); if (fromI < 0) throw new DErr('APPLY alt sorgusunda FROM bulunamadı.');
    const starts = ['WHERE', 'GROUP', 'HAVING', 'ORDER'].map(w => [w, at(w)]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]);
    const clause = w => { const ix = starts.findIndex(x => x[0] === w); if (ix < 0) return null; const s0 = starts[ix][1]; const e0 = ix + 1 < starts.length ? starts[ix + 1][1] : inner.length; let b = nx(inner, s0); if (w === 'GROUP' || w === 'ORDER') b = nx(inner, b); return inner.slice(b, e0); };
    const fromEnd = starts.length ? starts[0][1] : inner.length;
    const listToks = inner.slice(p, fromI), fromToks = inner.slice(fromI + 1, fromEnd);
    const innerSet = outerAliases(inner, inner.length - 1 >= 0 ? inner.length - 1 : 0); innerSet.add(alias.toLowerCase());
    const outerSet = outerAliases(T, kindI);
    const W = clause('WHERE'), G = clause('GROUP'), H = clause('HAVING'), O = clause('ORDER');
    const conds = W ? splitTop(W, 'AND').map(trimT) : [];
    const ki = [], ko = [], keep = [];
    for (const cnd of conds) {
      if (!refsOuter(cnd, outerSet, innerSet)) { keep.push(txt(cnd)); continue; }
      const sides = splitTop(cnd, '=').map(trimT);
      if (sides.length !== 2) throw new DErr('APPLY içindeki ilişkili koşullar yalnızca eşitlik (=) olabilir.', 'Örn: WHERE o.customer_id = c.customer_id');
      const lo = refsOuter(sides[0], outerSet, innerSet), ro = refsOuter(sides[1], outerSet, innerSet);
      if (lo === ro) throw new DErr('APPLY koşulu çözümlenemedi.');
      ki.push(txt(lo ? sides[1] : sides[0])); ko.push(txt(lo ? sides[0] : sides[1]));
    }
    if ([listToks, fromToks, G || [], H || [], O || []].some(x => refsOuter(x, outerSet, innerSet))) throw new DErr('APPLY alt sorgusunda dış tabloya yalnızca WHERE içindeki eşitliklerle başvurulabilir (bu taklitnin sınırı).');
    const listTxt = txt(listToks).trim();
    const isAgg = /\b(COUNT|SUM|AVG|MIN|MAX|STRING_AGG)\s*\(/i.test(listTxt) && !G;
    let cols = listTxt + (ki.length ? ', ' + ki.map((x, i) => `${x} AS __k${i}`).join(', ') : '');
    if (topN && !isAgg) cols += `, ROW_NUMBER() OVER (${ki.length ? 'PARTITION BY ' + ki.join(', ') + ' ' : ''}ORDER BY ${O ? txt(O).trim() : '(SELECT NULL)'}) AS __rn`;
    let q = `SELECT ${cols} FROM ${txt(fromToks).trim()}${keep.length ? ' WHERE ' + keep.join(' AND ') : ''}`;
    if (isAgg && ki.length) q += ' GROUP BY ' + ki.join(', ');
    else if (G) q += ' GROUP BY ' + txt(G).trim() + (ki.length ? ', ' + ki.join(', ') : '');
    if (H) q += ' HAVING ' + txt(H).trim();
    const on = ki.map((x, i) => `${alias}.__k${i} = ${ko[i]}`).concat(topN && !isAgg ? [`${alias}.__rn <= ${topN}`] : []);
    const join = `${isOuter || isAgg ? 'LEFT JOIN' : 'JOIN'} (${q}) AS ${alias} ON ${on.length ? on.join(' AND ') : '1 = 1'}`;
    // alias.* → açık sütun listesi
    let before = txt(T.slice(0, kindI));
    if (new RegExp('\\b' + alias + '\\s*\\.\\s*\\*').test(before)) {
      let names = null; try { const st = db.prepare(revSimple(`SELECT ${listTxt} FROM ${txt(fromToks)} LIMIT 0`, d)); names = st.getColumnNames(); st.free(); } catch (er) { names = null; }
      if (names) before = before.replace(new RegExp('\\b' + alias + '\\s*\\.\\s*\\*', 'g'), names.map(n => `${alias}.${q2(n)}`).join(', '));
    }
    if (isAgg) { for (const it of splitTop(listToks, ',').map(trimT)) { const sg = it.filter(sigk); if (/^COUNT$/i.test(sg[0] && sg[0].v) && sg.length >= 3 && isW(sg[sg.length - 2], 'AS')) { const al = sg[sg.length - 1].v; before = before.replace(new RegExp('\\b' + alias + '\\s*\\.\\s*' + al + '\\b', 'g'), `COALESCE(${alias}.${al}, 0) AS ${al}`).replace(new RegExp('(COALESCE\\(' + alias + '\\.' + al + ', 0\\) AS ' + al + ')(\\s+AS\\s+\\w+)'), 'COALESCE(' + alias + '.' + al + ', 0)$2'); } } }
    T = rt(before + join + txt(T.slice(endI + 1)));
  }
  return txt(T);
}

/* (VALUES (...), (...)) AS t(a, b) → (SELECT column1 AS a, ... FROM (VALUES ...)) AS t */
function revValuesAlias(sql) {
  if (!/\bVALUES\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 10; g++) {
    let hit = -1;
    for (let i = 0; i < T.length; i++) { if (!isP(T[i], '(')) continue; const v = nx(T, i); if (!isW(T[v], 'VALUES')) continue; const c = closeP(T, i); let a = nx(T, c); if (isW(T[a], 'AS')) a = nx(T, a); const o = nx(T, a); if (T[a] && (T[a].k === 'w' || T[a].k === 'q') && isP(T[o], '(')) { hit = i; break; } }
    if (hit < 0) break;
    const c = closeP(T, hit); let a = nx(T, c); if (isW(T[a], 'AS')) a = nx(T, a); const o = nx(T, a), oc = closeP(T, o);
    const cols = argsOf(T, o, oc).map(x => txt(x).trim());
    const inner = txt(T.slice(hit + 1, c)).trim();
    const rep = `(SELECT ${cols.map((cn, k) => `column${k + 1} AS ${cn}`).join(', ')} FROM (${inner})) AS ${T[a].v}`;
    T = rt(txt(T.slice(0, hit)) + rep + txt(T.slice(oc + 1)));
  }
  return txt(T);
}

/* SQL Server FOR JSON / FOR XML PATH → json_group_array / group_concat */
const JSON_COL = 'JSON_F52E2B61-18A1-11d1-B105-00805F49916B', XML_COL = 'XML_F52E2B61-18A1-11d1-B105-00805F49916B';
function revForJsonXml(sql, db) {
  if (!/\bFOR\s+(JSON|XML)\b/i.test(sql)) return sql;
  for (let g = 0; g < 12; g++) {
    const T = rt(sql), D = depthAt(T);
    let i = -1; for (let k = 0; k < T.length; k++) if (isW(T[k], 'FOR') && isW(T[nx(T, k)], 'JSON', 'XML') && (i < 0 || D[k] > D[i])) i = k;
    if (i < 0) break;
    const dd = D[i];
    let o = -1; for (let j = i - 1; j >= 0; j--) if (isP(T[j], '(') && D[j] === dd - 1 && closeP(T, j) > i) { o = j; break; }
    let segS = 0, segE; if (o >= 0) { segS = o + 1; segE = closeP(T, o); } else { for (let j = i - 1; j >= 0; j--) if (D[j] === 0 && isP(T[j], ';')) { segS = j + 1; break; } segE = T.findIndex((t, j) => j > i && D[j] === 0 && isP(t, ';')); if (segE < 0) segE = T.length; }
    const s = T.findIndex((t, j) => j >= segS && j < i && D[j] === dd && isW(t, 'SELECT'));
    if (s < 0) throw new DErr('FOR JSON / FOR XML bir SELECT ifadesinin sonunda olmalı.');
    const opt = T.slice(nx(T, i), segE).filter(sigk); const kind = opt[0].u; const mode = (opt[1] && opt[1].u) || 'PATH';
    const optTxt = txt(T.slice(nx(T, i), segE));
    let rowTag = 'row'; { const m = optTxt.match(/\b(?:PATH|RAW)\s*\(\s*'([^']*)'\s*\)/i); if (m) rowTag = m[1]; else if (/\bAUTO\b/i.test(optTxt)) rowTag = null; }
    const root = (optTxt.match(/\bROOT\s*\(\s*'([^']*)'\s*\)/i) || [])[1] || (/\bROOT\b(?!\s*\()/i.test(optTxt) ? 'root' : null);
    const inclNull = /\bINCLUDE_NULL_VALUES\b/i.test(optTxt), noWrap = /\bWITHOUT_ARRAY_WRAPPER\b/i.test(optTxt);
    // .value('.', 'NVARCHAR(MAX)') takibi
    let tail = segE, asText = false;
    if (o >= 0) { const a1 = nx(T, segE); if (isP(T[a1], '.') && isW(T[nx(T, a1)], 'VALUE')) { const vo = nx(T, nx(T, a1)); tail = closeP(T, vo); asText = true; } }
    // seçim listesi
    const inner = T.slice(s, i); const ID = depthAt(inner);
    let p = nx(inner, 0); let head = 'SELECT ';
    if (isW(inner[p], 'DISTINCT')) { head += 'DISTINCT '; p = nx(inner, p); }
    if (isW(inner[p], 'TOP')) { const q = nx(inner, p); let e2 = q; if (isP(inner[q], '(')) e2 = closeP(inner, q); head += 'TOP ' + txt(inner.slice(q, e2 + 1)) + ' '; p = nx(inner, e2); }
    let fI = inner.findIndex((t, j) => j > p && ID[j] === 0 && isW(t, 'FROM')); const rest = fI < 0 ? '' : txt(inner.slice(fI));
    const items = splitTop(inner.slice(p, fI < 0 ? inner.length : fI), ',').map(trimT);
    let cols = [];
    if (items.length === 1 && items[0].filter(sigk).length === 1 && isP(items[0].find(sigk), '*') || items.some(it => { const sg = it.filter(sigk); return isP(sg[sg.length - 1], '*'); })) {
      let names = null; try { const st = db.prepare(reverse('SELECT ' + txt(inner.slice(p)), 'tsql', db)); names = st.getColumnNames(); st.free(); } catch (e) { names = null; }
      if (!names) throw new DErr('FOR JSON/XML ile SELECT * bu taklit katmanında ilişkili alt sorguda kullanılamıyor; sütunları tek tek yaz.');
      cols = names.map(n => ({ expr: q2(n), name: n }));
    } else {
      cols = items.map(it => { const sg = it.filter(sigk); let name = null, expr = txt(it).trim();
        if (sg.length >= 3 && isW(sg[sg.length - 2], 'AS')) { name = sg[sg.length - 1].v; expr = txt(it.slice(0, it.indexOf(sg[sg.length - 2]))).trim(); }
        else if (sg.length >= 3 && (sg[0].k === 'w' || sg[0].k === 'q') && isP(sg[1], '=')) { name = sg[0].v; expr = txt(it.slice(it.indexOf(sg[1]) + 1)).trim(); }
        else if (sg.length >= 2 && (sg[sg.length - 1].k === 'w' || sg[sg.length - 1].k === 'q') && !isP(sg[sg.length - 2], '.') && !isW(sg[sg.length - 1], 'END')) { name = sg[sg.length - 1].v; expr = txt(it.slice(0, it.indexOf(sg[sg.length - 1]))).trim(); }
        else if (sg.length && (sg[sg.length - 1].k === 'w' || sg[sg.length - 1].k === 'q') && sg.every(t => t.k === 'w' || t.k === 'q' || isP(t, '.'))) name = sg[sg.length - 1].v;
        if (name) name = name.replace(/^[\["']|[\]"']$/g, '');
        return { expr, name }; });
    }
    const sub = `${head}${cols.map((c, k) => `${c.expr} AS __c${k}`).join(', ')} ${rest}`;
    let agg;
    if (kind === 'JSON') {
      if (cols.some(c => !c.name)) throw new DErr('Msg 13605, Level 16: Column expressions and data sources without names or aliases cannot be formatted as JSON text using FOR JSON clause. Add alias to the unnamed column or table.', 'Hesaplanan her sütuna AS ile bir ad ver.');
      const tree = {}; cols.forEach((c, k) => { const parts = mode === 'PATH' ? c.name.split('.') : [c.name]; let node = tree; parts.slice(0, -1).forEach(pp => { node = node[pp] = node[pp] || {}; }); node[parts[parts.length - 1]] = `__c${k}`; });
      const build = n => 'json_object(' + Object.keys(n).map(key => `'${key.replace(/'/g, "''")}', ${typeof n[key] === 'string' ? n[key] : build(n[key])}`).join(', ') + ')';
      let obj = build(tree); if (!inclNull) obj = `json_patch('{}', ${obj})`;
      agg = noWrap ? `group_concat(${obj}, ',')` : `json_group_array(json(${obj}))`;
      if (root) agg = `json_object('${root}', json(${agg}))`;
      agg = `nullif(${agg}, '[]')`;
    } else {
      const esc = x => asText ? x : `replace(replace(replace(CAST(${x} AS TEXT), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')`;
      const parts = cols.map((c, k) => { const v = `__c${k}`; if (!c.name || c.name === 'text()' || c.name === '*' || asText) return `coalesce(${esc(v)}, '')`; if (c.name.startsWith('@')) return `coalesce(${esc(v)}, '')`; return `coalesce('<${c.name}>' || ${esc(v)} || '</${c.name}>', '')`; });
      let rowE = parts.join(' || ');
      if (rowTag && !asText) rowE = `'<${rowTag}>' || ${rowE} || '</${rowTag}>'`;
      agg = `group_concat(${rowE}, '')`;
      if (root && !asText) agg = `'<${root}>' || ${agg} || '</${root}>'`;
    }
    const colName = o >= 0 ? '' : ` AS "${kind === 'JSON' ? JSON_COL : XML_COL}"`;
    const rep = `SELECT ${agg}${colName} FROM (${sub})`;
    let out;
    if (o >= 0) out = txt(T.slice(0, o)) + (kind === 'JSON' ? `json((${rep}))` : `(${rep})`) + txt(T.slice(tail + 1));
    else out = txt(T.slice(0, s)) + rep + txt(T.slice(segE));
    sql = out;
  }
  return sql;
}

/* GENERATE_SERIES (SQL Server 2022, PostgreSQL) → özyinelemeli CTE alt sorgusu */
let gsSeq = 0;
function revGenSeries(sql, d) {
  if (!/\bGENERATE_SERIES\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 10; g++) {
    const i = T.findIndex((t, k) => isW(t, 'GENERATE_SERIES') && isP(T[nx(T, k)], '('));
    if (i < 0) break;
    const prev = T[pv(T, i)];
    if (!(isW(prev, 'FROM', 'JOIN') || isP(prev, ','))) throw new DErr(d === 'tsql' ? 'GENERATE_SERIES tablo döndüren bir fonksiyondur; FROM içinde kullan.' : 'Bu taklit katmanında generate_series yalnızca FROM içinde destekleniyor.', 'Örn: SELECT value FROM GENERATE_SERIES(1, 10)');
    const o = nx(T, i), c = closeP(T, o); const A = argsOf(T, o, c).map(a => txt(a).trim());
    let k = nx(T, c), alias = null, col = null, end = c;
    if (isW(T[k], 'AS')) k = nx(T, k);
    if (T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'LEFT', 'INNER', 'ON', 'LIMIT', 'UNION', 'HAVING', 'OUTER', 'RIGHT', 'FULL')) { alias = T[k].v; end = k; const o2 = nx(T, k); if (isP(T[o2], '(')) { const c2 = closeP(T, o2); col = txt(T.slice(o2 + 1, c2)).trim(); end = c2; } }
    const cte = '__gs' + (++gsSeq);
    if (!col) col = d === 'tsql' ? 'value' : (alias || 'generate_series');
    if (!alias) alias = d === 'tsql' ? cte + 't' : 'generate_series';
    const st = A[2]; let base;
    const iv = st && st.match(/'\s*(-?\d+)\s*(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes)\s*'/i);
    if (iv) {
      let n = +iv[1], u = iv[2].toLowerCase().replace(/s$/, ''); if (u === 'week') { n *= 7; u = 'day'; }
      const fn = /\d\d:\d\d/.test(A[0] + A[1]) || u === 'hour' || u === 'minute' ? 'datetime' : 'date';
      const nextE = `${fn}(v, '${n >= 0 ? '+' : ''}${n} ${u}s')`;
      base = `SELECT ${fn}(${A[0]}) AS v UNION ALL SELECT ${nextE} FROM ${cte} WHERE ${nextE} ${n >= 0 ? '<=' : '>='} ${fn}(${A[1]})`;
    } else {
      const neg = st && /^\s*-/.test(st); const stp = st || '1';
      base = `SELECT ${A[0]} AS v UNION ALL SELECT v + (${stp}) FROM ${cte} WHERE v + (${stp}) ${neg ? '>=' : '<='} (${A[1]})`;
    }
    const rep = `(WITH RECURSIVE ${cte}(v) AS (${base}) SELECT v AS ${col} FROM ${cte}) AS ${alias}`;
    T = rt(txt(T.slice(0, i)) + rep + txt(T.slice(end + 1)));
  }
  return txt(T);
}
/* PostgreSQL ~ ~* !~ !~* → regexp_like */
function revPgRegex(sql) {
  if (!/~/.test(sql.replace(/'(?:[^']|'')*'/g, ''))) return sql;
  let T = rt(sql);
  for (let g = 0; g < 30; g++) {
    const i = T.findIndex(t => t.k === 'o' && t.v === '~');
    if (i < 0) break;
    let s = i, e = i; let neg = false, ci = false;
    if (isP(T[i - 1], '!')) { neg = true; s = i - 1; }
    if (isP(T[i + 1], '*')) { ci = true; e = i + 1; }
    const le = pv(T, s), ls = primStartBack(T, le); const rs = nx(T, e), re = primEndFwd(T, rs);
    const rep = `${neg ? 'NOT ' : ''}regexp_like(${txt(T.slice(ls, le + 1))}, ${txt(T.slice(rs, re + 1))}${ci ? ", 'i'" : ''})`;
    T = rt(txt(T.slice(0, ls)) + rep + txt(T.slice(re + 1)));
  }
  return txt(T);
}
/* SQL Server: FROM STRING_SPLIT(...) / FROM OPENJSON(...) [WITH (...)] (yanal olmayan kullanım) */
const OJ_TYPE = "CASE type WHEN 'null' THEN 0 WHEN 'text' THEN 1 WHEN 'integer' THEN 2 WHEN 'real' THEN 2 WHEN 'true' THEN 3 WHEN 'false' THEN 3 WHEN 'array' THEN 4 ELSE 5 END";
function ojWith(T, c) { // OPENJSON(...) sonrası WITH (...) → [{name, type, path, asJson}], bitiş
  const w = nx(T, c); if (!isW(T[w], 'WITH')) return null; const o = nx(T, w); if (!isP(T[o], '(')) return null; const cc = closeP(T, o);
  const defs = splitTop(trimT(T.slice(o + 1, cc)), ',').map(trimT).map(p => { const s = p.filter(sigk); const name = s[0].v.replace(/^\[|\]$/g, ''); const pi = s.findIndex(t => t.k === 's'); const aj = s.some(t => isW(t, 'JSON')); const type = txt(p.slice(p.indexOf(s[1]), pi >= 0 ? p.indexOf(s[pi]) : (aj ? p.indexOf(s.find(t => isW(t, 'AS'))) : p.length))).trim(); return { name, type, path: pi >= 0 ? unq(s[pi].v) : '$.' + name, asJson: aj }; });
  return { defs, end: cc };
}
function ojExpr(def, src) { const e = `json_extract(${src}, '${def.path.replace(/'/g, "''")}')`; return def.asJson ? e : revType(def.type, 'tsql', true).wrap(e); }
function revTsqlTvf(sql) {
  if (!/\b(STRING_SPLIT|OPENJSON)\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 10; g++) {
    const i = T.findIndex((t, k) => isW(t, 'STRING_SPLIT', 'OPENJSON') && isP(T[nx(T, k)], '(') && !T[k].lat);
    if (i < 0) break;
    const o = nx(T, i), c = closeP(T, o); const A = argsOf(T, o, c).map(a => txt(a).trim());
    let rep, end = c;
    if (T[i].u === 'STRING_SPLIT') rep = `(SELECT value${A[2] && A[2] !== '0' ? ', CAST(key AS INTEGER) + 1 AS ordinal' : ''} FROM json_each(${splitJson(A[0], A[1])}))`;
    else { const w = ojWith(T, c); const src = `json_each(${A.join(', ')})`; if (w) { rep = `(SELECT ${w.defs.map(df => ojExpr(df, 'value') + ' AS ' + q2(df.name)).join(', ')} FROM ${src})`; end = w.end; } else rep = `(SELECT key, value, ${OJ_TYPE} AS type FROM ${src})`; }
    let k = nx(T, end); if (!isW(T[k], 'AS') && !(T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'LEFT', 'INNER', 'ON', 'UNION', 'OUTER', 'OPTION'))) rep += ' AS __tvf' + g;
    T = rt(txt(T.slice(0, i)) + rep + txt(T.slice(end + 1)));
  }
  return txt(T);
}

/* BigQuery: proje.veriseti.tablo adları, dizi sabitleri ve [OFFSET(n)] erişimi */
function revBqNames(sql) {
  let T = rt(sql.replace(/\banadolu\s*\.\s*(?=[A-Za-z_])/gi, ''));
  let out = [];
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 'q' && t.v[0] === '`') { const parts = t.v.slice(1, -1).split('.'); out.push({ k: 'w', v: parts[parts.length - 1], u: parts[parts.length - 1].toUpperCase() }); continue; }
    if (t.k === 'q' && t.v[0] === '[') {
      const m = t.v.match(/^\[\s*(SAFE_)?(OFFSET|ORDINAL)\s*\(\s*([\s\S]+?)\s*\)\s*\]$/i);
      if (m) {
        let k = out.length - 1; while (k >= 0 && !sigk(out[k])) k--;
        const OT = out.slice(0, k + 1); const st = primStartBack(OT, k);
        const prim = txt(OT.slice(st)); const idx = /^\d+$/.test(m[3]) ? String(+m[3] - (m[2].toUpperCase() === 'ORDINAL' ? 1 : 0)) : `' || ((${m[3]})${m[2].toUpperCase() === 'ORDINAL' ? ' - 1' : ''}) || '`;
        out = out.slice(0, st); out.push({ k: 'w', v: `json_extract(${prim}, '$[${idx}]')`, u: 'JSON_EXTRACT' }); continue;
      }
      out.push({ k: 'w', v: `json_array(${t.v.slice(1, -1)})`, u: 'JSON_ARRAY' }); continue;
    }
    out.push(t);
  }
  return out.map(tv).join('');
}
function revBqUnnest(sql) {
  if (!/\bUNNEST\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 10; g++) {
    const i = T.findIndex((t, k) => isW(t, 'UNNEST') && isP(T[nx(T, k)], '('));
    if (i < 0) break;
    const o = nx(T, i), c = closeP(T, o); const inner = trimT(T.slice(o + 1, c)); const inTxt = txt(inner).trim();
    const prev = T[pv(T, i)];
    if (isW(prev, 'IN')) { T = rt(txt(T.slice(0, i)) + `(SELECT value FROM json_each(${inTxt}))` + txt(T.slice(c + 1))); continue; }
    let k = nx(T, c), end = c, alias = null, off = null;
    if (isW(T[k], 'AS')) k = nx(T, k);
    if (T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'LEFT', 'INNER', 'ON', 'LIMIT', 'UNION', 'WITH', 'HAVING')) { alias = T[k].v; end = k; k = nx(T, k); }
    if (isW(T[k], 'WITH') && isW(T[nx(T, k)], 'OFFSET')) { end = nx(T, k); let m = nx(T, end); if (isW(T[m], 'AS')) m = nx(T, m); if (T[m] && T[m].k === 'w' && !isW(T[m], 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'LIMIT')) { off = T[m].v; end = m; } else off = 'offset'; }
    if (!alias) alias = '__un' + g;
    const fT = inner.filter(sigk);
    if (isW(fT[0], 'GENERATE_DATE_ARRAY', 'GENERATE_ARRAY') && isP(fT[1], '(')) {
      const fo = inner.indexOf(fT[1]), fc = closeP(inner, fo); const A = argsOf(inner, fo, fc).map(x => txt(x).trim());
      const cte = '__ga' + (++gsSeq); let base;
      if (fT[0].u === 'GENERATE_DATE_ARRAY') { const mm = A[2] && A[2].match(/INTERVAL\s+(-?\d+)\s+(DAY|WEEK|MONTH|YEAR)/i); let n = mm ? +mm[1] : 1, u = mm ? mm[2].toLowerCase() : 'day'; if (u === 'week') { n *= 7; u = 'day'; } const nextE = `date(v, '${n >= 0 ? '+' : ''}${n} ${u}s')`; base = `SELECT date(${A[0]}) AS v UNION ALL SELECT ${nextE} FROM ${cte} WHERE ${nextE} ${n >= 0 ? '<=' : '>='} date(${A[1]})`; }
      else { const stp = A[2] || '1'; const neg = /^\s*-/.test(stp); base = `SELECT ${A[0]} AS v UNION ALL SELECT v + (${stp}) FROM ${cte} WHERE v + (${stp}) ${neg ? '>=' : '<='} (${A[1]})`; }
      const rep = `(WITH RECURSIVE ${cte}(v) AS (${base}) SELECT v AS ${alias}${off ? `, ROW_NUMBER() OVER () - 1 AS ${off}` : ''} FROM ${cte}) AS ${alias}`;
      T = rt(txt(T.slice(0, i)) + rep + txt(T.slice(end + 1))); continue;
    }
    const fix = s0 => { let s1 = s0.replace(new RegExp('(^|[^.\\w])' + alias + '(?![\\w.(])', 'g'), (m, p1, o2, str) => /\bAS\s*$/i.test(str.slice(0, o2 + p1.length)) || /'[^']*$/.test(str.slice(0, o2).replace(/'[^']*'/g, '')) ? m : p1 + alias + '.value'); if (off) s1 = s1.replace(new RegExp('(^|[^.\\w])' + off + '(?![\\w.(])', 'g'), (m, p1, o2, str) => /\bAS\s*$/i.test(str.slice(0, o2 + p1.length)) ? m : p1 + alias + '.key'); return s1; };
    T = rt(fix(txt(T.slice(0, i))) + `json_each(${inTxt}) AS ${alias}` + fix(txt(T.slice(end + 1))));
  }
  return txt(T);
}
/* BigQuery SELECT * EXCEPT (a, b) */
function revBqStarExcept(sql, db) {
  if (!/\*\s*EXCEPT\s*\(/i.test(sql)) return sql;
  const T = rt(sql), D = depthAt(T);
  const i = T.findIndex((t, k) => isP(t, '*') && isW(T[nx(T, k)], 'EXCEPT') && isP(T[nx(T, nx(T, k))], '('));
  if (i < 0) return sql;
  const e = nx(T, i), o = nx(T, e), c = closeP(T, o);
  const ex = argsOf(T, o, c).map(x => txt(x).trim().toLowerCase());
  let pre = '', st = i; const p = pv(T, i); if (isP(T[p], '.')) { st = pv(T, p); pre = T[st].v + '.'; }
  const plain = txt(T.slice(0, i)) + '*' + txt(T.slice(c + 1));
  let names = null; try { const q = reverse(plain.replace(/;\s*$/, ''), 'bq', db); const stt = db.prepare(q); names = stt.getColumnNames(); stt.free(); } catch (er) { names = null; }
  if (!names) throw new DErr('SELECT * EXCEPT bu taklit katmanında yalnızca ana sorguda destekleniyor.');
  const keep = names.filter(n => !ex.includes(n.toLowerCase())); void D;
  return txt(T.slice(0, st)) + keep.map(n => pre + q2(n)).join(', ') + txt(T.slice(c + 1));
}
/* x op ANY/SOME/ALL (alt sorgu) → SQLite karşılığı */
function revAnyAll(sql) {
  if (!/\b(ANY|SOME|ALL)\s*\(/i.test(sql)) return sql;
  for (let g = 0; g < 10; g++) {
    const T = rt(sql);
    const i = T.findIndex((t, k) => isW(t, 'ANY', 'SOME', 'ALL') && isP(T[nx(T, k)], '(') && T[pv(T, k)] && T[pv(T, k)].k === 'o' && ['>', '>=', '<', '<=', '=', '<>', '!='].includes(T[pv(T, k)].v));
    if (i < 0) break;
    const op = T[pv(T, i)].v, o = nx(T, i), c = closeP(T, o), q = txt(T.slice(o + 1, c)).trim();
    const all = isW(T[i], 'ALL'); let rep;
    const agg = (f, empty) => `(WITH __aa(__v) AS (${q}) SELECT ${empty ? `CASE WHEN COUNT(*) = 0 THEN ${empty} ELSE ${f}(__v) END` : `${f}(__v)`} FROM __aa)`;
    if (op === '=' && !all) rep = `IN (${q})`;
    else if ((op === '<>' || op === '!=') && all) rep = `NOT IN (${q})`;
    else if (op === '=' || op === '<>' || op === '!=') throw new DErr(`${op} ${T[i].u} bu taklit katmanında desteklenmiyor.`, 'Eşdeğerini IN / NOT IN veya EXISTS ile yaz.');
    else if (all) rep = op[0] === '>' ? `${op} ${agg('MAX', '-1e308')}` : `${op} ${agg('MIN', 'char(1114111)')}`;
    else rep = op[0] === '>' ? `${op} ${agg('MIN')}` : `${op} ${agg('MAX')}`;
    sql = txt(T.slice(0, pv(T, i))) + rep + txt(T.slice(c + 1));
  }
  return sql;
}
/* PostgreSQL SELECT DISTINCT ON (anahtar) ... ORDER BY ... */
function revDistinctOn(sql, db) {
  if (!/\bDISTINCT\s+ON\s*\(/i.test(sql)) return sql;
  const T = rt(sql), D = depthAt(T);
  const s = T.findIndex((t, k) => isW(t, 'SELECT') && isW(T[nx(T, k)], 'DISTINCT') && isW(T[nx(T, nx(T, k))], 'ON'));
  if (s < 0) return sql;
  const dep = D[s], o = nx(T, nx(T, nx(T, s))), c = closeP(T, o);
  const keys = txt(T.slice(o + 1, c)).trim();
  let fr = -1, ob = -1, end = T.length;
  for (let j = c + 1; j < T.length; j++) { if (D[j] < dep || (D[j] === dep && isP(T[j], ')'))) { end = j; break; } if (D[j] !== dep) continue; if (isP(T[j], ';')) { end = j; break; } if (fr < 0 && isW(T[j], 'FROM')) fr = j; if (isW(T[j], 'ORDER') && isW(T[nx(T, j)], 'BY')) ob = j; }
  if (fr < 0) return sql;
  let lim = end; if (ob > 0) for (let j = ob; j < end; j++) if (D[j] === dep && isW(T[j], 'LIMIT', 'OFFSET', 'FETCH')) { lim = j; break; }
  const sel = txt(T.slice(c + 1, fr)).trim(), body = txt(T.slice(fr, ob > 0 ? ob : end)).trim();
  const order = ob > 0 ? txt(T.slice(nx(T, nx(T, ob)) - 0, lim)).trim() : keys;
  const inner = `SELECT ${sel} ${body}`;
  let cols = null; try { const st = db.prepare(reverse(inner, 'pg', db)); cols = st.getColumnNames(); st.free(); } catch (e) { cols = null; }
  const proj = cols ? cols.map(q2).join(', ') : '*';
  const rep = `SELECT ${proj} FROM (SELECT ${sel}, ROW_NUMBER() OVER (PARTITION BY ${keys} ORDER BY ${order}) AS __rn ${body}) AS __d WHERE __rn = 1 ORDER BY ${keys}${lim < end ? ' ' + txt(T.slice(lim, end)).trim() : ''}`;
  return txt(T.slice(0, s)) + rep + txt(T.slice(end));
}
/* Oracle hiyerarşik sorgu: START WITH ... CONNECT BY PRIOR ... ve CONNECT BY LEVEL <= n satır üreteci */
function revConnectBy(sql) {
  if (!/\bCONNECT\s+BY\b/i.test(sql)) return sql;
  const T = rt(sql), D = depthAt(T);
  const cb = T.findIndex((t, k) => isW(t, 'CONNECT') && isW(T[nx(T, k)], 'BY') && D[k] === 0);
  if (cb < 0) {
    const k = T.findIndex((t, j) => isW(t, 'CONNECT') && isW(T[nx(T, j)], 'BY'));
    if (k < 0) return sql;
    let o = -1, dd = 0; for (let j = k; j >= 0; j--) { if (isP(T[j], ')')) dd++; else if (isP(T[j], '(')) { if (dd === 0) { o = j; break; } dd--; } }
    if (o < 0) return sql; const c = closeP(T, o);
    return txt(T.slice(0, o + 1)) + revConnectBy(txt(T.slice(o + 1, c))) + txt(T.slice(c));
  }
  const sel = T.findIndex((t, k) => isW(t, 'SELECT') && D[k] === 0);
  const fr = T.findIndex((t, k) => k > sel && isW(t, 'FROM') && D[k] === 0);
  if (sel < 0 || fr < 0) return sql;
  const at = (w, from, to) => { for (let j = from; j < to; j++) if (D[j] === 0 && isW(T[j], w)) return j; return -1; };
  let end = T.length; for (let j = cb; j < T.length; j++) if (D[j] === 0 && isP(T[j], ';')) { end = j; break; }
  const sw = at('START', fr, end), wh = at('WHERE', fr, end);
  let ob = -1; for (let j = cb; j < end; j++) if (D[j] === 0 && isW(T[j], 'ORDER')) { ob = j; break; }
  const cbEnd = ob > 0 ? ob : end;
  const fromEnd = Math.min(...[sw, wh, cb].filter(x => x > 0));
  const fromTxt = txt(T.slice(fr + 1, fromEnd)).trim();
  const list = txt(T.slice(sel + 1, fr)).trim();
  let cond = txt(T.slice(nx(T, nx(T, cb)), cbEnd)).trim().replace(/^NOCYCLE\s+/i, '');
  const startTxt = sw > 0 ? txt(T.slice(nx(T, nx(T, sw)), Math.min(...[cb, wh].filter(x => x > sw).concat([cb])))).trim() : null;
  const whereTxt = wh > 0 ? txt(T.slice(nx(T, wh), Math.min(...[sw, cb].filter(x => x > wh).concat([cb])))).trim() : null;
  let orderTxt = ob > 0 ? txt(T.slice(ob, end)).trim() : '';
  let sib = null; const ms = orderTxt.match(/^ORDER\s+SIBLINGS\s+BY\s+([\s\S]+)$/i); if (ms) { sib = ms[1].trim(); orderTxt = ''; }
  // satır üreteci
  const gen = cond.match(/^LEVEL\s*(<=|<)\s*(.+)$/i);
  if (gen && /^dual$/i.test(fromTxt)) {
    const lim = gen[1] === '<' ? `(${gen[2]}) - 1` : `(${gen[2]})`;
    const lst = splitTop(rt(list), ',').map(x => txt(x)).map(it => /^\s*LEVEL\s*$/i.test(it) ? ' __lvl AS LEVEL' : it.replace(/\bLEVEL\b/gi, '__lvl')).join(',');
    return txt(T.slice(0, sel)) + `WITH RECURSIVE __cb(__lvl) AS (SELECT 1 UNION ALL SELECT __lvl + 1 FROM __cb WHERE __lvl < ${lim}) SELECT ${lst} FROM __cb` + (whereTxt ? ' WHERE ' + whereTxt.replace(/\bLEVEL\b/gi, '__lvl') : '') + (orderTxt ? ' ' + orderTxt.replace(/\bLEVEL\b/gi, '__lvl') : '') + txt(T.slice(end));
  }
  const fm = fromTxt.match(/^([\w.]+)(?:\s+(?:AS\s+)?(\w+))?$/i);
  if (!fm) throw new DErr('Bu CONNECT BY biçimi taklit katmanında desteklenmiyor (tek tablo olmalı).');
  const tbl = fm[1], al = fm[2] || fm[1].split('.').pop();
  const strip = x => x.replace(new RegExp('\\b' + al + '\\s*\\.\\s*', 'gi'), '');
  let pc = strip(cond), parentCol, childCol;
  let m2 = pc.match(/^PRIOR\s+(\w+)\s*=\s*(\w+)$/i); if (m2) { parentCol = m2[1]; childCol = m2[2]; }
  else { m2 = pc.match(/^(\w+)\s*=\s*PRIOR\s+(\w+)$/i); if (m2) { childCol = m2[1]; parentCol = m2[2]; } }
  if (!parentCol) throw new DErr('CONNECT BY koşulu PRIOR a = b biçiminde olmalı.');
  const paths = [], roots = [];
  let lst = list.replace(/\bSYS_CONNECT_BY_PATH\s*\(\s*([^,()]+?)\s*,\s*('(?:[^']|'')*')\s*\)/gi, (mm, c, sep) => { paths.push({ c: strip(c).trim(), sep }); return `${al}.__path${paths.length}`; });
  lst = lst.replace(/\bCONNECT_BY_ROOT\s+(\w+(?:\s*\.\s*\w+)?)/gi, (mm, c) => { roots.push(strip(c).trim()); return `${al}.__root${roots.length}`; });
  const leaf = `(CASE WHEN EXISTS (SELECT 1 FROM ${tbl} __c WHERE __c.${childCol} = ${al}.${parentCol}) THEN 0 ELSE 1 END)`;
  const fix = x => x.replace(/\bCONNECT_BY_ISLEAF\b/gi, leaf).replace(/\bLEVEL\b/gi, `${al}.__lvl`);
  lst = splitTop(rt(lst), ',').map(x => txt(x)).map(it => /^\s*LEVEL\s*$/i.test(it) ? ` ${al}.__lvl AS __LEVELAS` : it).join(',');
  lst = fix(lst).replace(/__LEVELAS/g, 'LEVEL');
  const skE = x => `CASE WHEN typeof(${x}) IN ('integer', 'real') THEN printf('%020.4f', ${x}) ELSE CAST(${x} AS TEXT) END`;
  const sk0 = sib ? skE(sib.replace(/\s+(ASC|DESC)$/i, '')) : `printf('%012d', ${al}.rowid)`;
  const sk1 = sib ? skE(sib.replace(/\s+(ASC|DESC)$/i, '').replace(new RegExp('\\b' + al + '\\s*\\.', 'gi'), '__k.')) : `printf('%012d', __k.rowid)`;
  const sibK = sib ? sib.replace(/\s+(ASC|DESC)$/i, '').replace(new RegExp('\\b' + al + '\\s*\\.\\s*', 'gi'), '') : null;
  const sk1b = sib ? skE('__k.' + sibK.trim()) : sk1;
  const extra0 = paths.map((p, i) => `, ${p.sep} || CAST(${al}.${p.c} AS TEXT) AS __path${i + 1}`).join('') + roots.map((r, i) => `, ${al}.${r} AS __root${i + 1}`).join('');
  const extra1 = paths.map((p, i) => `, __p.__path${i + 1} || ${p.sep} || CAST(__k.${p.c} AS TEXT)`).join('') + roots.map((r, i) => `, __p.__root${i + 1}`).join('');
  const anchor = `SELECT ${al}.*, 1 AS __lvl, ${sk0} AS __sk${extra0} FROM ${tbl} ${al}${startTxt ? ' WHERE ' + startTxt : ''}`;
  const rec = `SELECT __k.*, __p.__lvl + 1, __p.__sk || '/' || ${sk1b}${extra1} FROM ${tbl} __k JOIN __h __p ON __k.${childCol} = __p.${parentCol} WHERE __p.__lvl < 100`;
  const outer = `SELECT ${lst} FROM __h ${al}` + (whereTxt ? ' WHERE ' + fix(whereTxt) : '') + ' ' + (orderTxt ? fix(orderTxt) : `ORDER BY ${al}.__sk`);
  return txt(T.slice(0, sel)) + `WITH RECURSIVE __h AS (${anchor} UNION ALL ${rec}) ${outer}` + txt(T.slice(end));
}
/* BigQuery QUALIFY → dış sorguda WHERE */
function revBqQualify(sql, db) {
  if (!/\bQUALIFY\b/i.test(sql)) return sql;
  for (let g = 0; g < 6; g++) {
    const T = rt(sql), D = depthAt(T);
    const q = T.findIndex(t => isW(t, 'QUALIFY')); if (q < 0) break;
    const dep = D[q];
    let s = -1; for (let j = q - 1; j >= 0; j--) { if (D[j] < dep) break; if (D[j] === dep && isW(T[j], 'SELECT')) s = j; if (D[j] === dep && isP(T[j], ';')) break; }
    if (s < 0) throw new DErr('QUALIFY bir SELECT içinde olmalı.');
    let e = T.length, bal = 0; for (let j = q + 1; j < T.length; j++) { if (isP(T[j], '(')) bal++; else if (isP(T[j], ')')) { if (bal === 0) { e = j; break; } bal--; } else if (bal === 0 && (isP(T[j], ';') || isW(T[j], 'ORDER', 'LIMIT', 'UNION', 'EXCEPT', 'INTERSECT'))) { e = j; break; } }
    let te = e; bal = 0; for (let j = e; j < T.length; j++) { if (isP(T[j], '(')) bal++; else if (isP(T[j], ')')) { if (bal === 0) { te = j; break; } bal--; } else if (bal === 0 && (isP(T[j], ';') || isW(T[j], 'UNION', 'EXCEPT', 'INTERSECT'))) { te = j; break; } te = j + 1; }
    const inner = txt(T.slice(s, q)).trim(), cond = txt(T.slice(q + 1, e)).trim(), tail = txt(T.slice(e, te)).trim().replace(/\b[A-Za-z_]\w*\s*\.\s*([A-Za-z_]\w*)\b/g, '$1');
    let cols = null; try { const st = db.prepare(reverse(inner, 'bq', db)); cols = st.getColumnNames(); st.free(); } catch (er) { cols = null; }
    const proj = cols ? cols.map(q2).join(', ') : '*';
    let fr = -1; for (let j = s + 1; j < q; j++) if (D[j] === dep && isW(T[j], 'FROM')) { fr = j; break; }
    const rep = fr > 0 && !isW(T[nx(T, s)], 'DISTINCT')
      ? `SELECT ${proj} FROM (${txt(T.slice(s, fr)).trim()}, (${cond}) AS __q ${txt(T.slice(fr, q)).trim()}) AS __qo WHERE __q${tail ? ' ' + tail : ''}`
      : `SELECT ${proj} FROM (SELECT __qi.*, (${cond}) AS __q FROM (${inner}) AS __qi) AS __qo WHERE __q${tail ? ' ' + tail : ''}`;
    sql = txt(T.slice(0, s)) + rep + txt(T.slice(te));
  }
  return sql;
}

/* Tek bir ifadeyi SQLite'a çevir (veritabanı gerektirmeyen adımlar) */
/* case_sensitive_like açıkken ILIKE, iki tarafı küçülterek taklit edilir */
function revIlike(sql) {
  let T = rt(sql);
  for (let g = 0; g < 40; g++) {
    const i = T.findIndex(t => isW(t, 'ILIKE')); if (i < 0) break;
    const pe0 = pv(T, i); const neg = isW(T[pe0], 'NOT'); const le = neg ? pv(T, pe0) : pe0; const ls = primStartBack(T, le); const rs = nx(T, i); const re = primEndFwd(T, rs);
    T = rt(txt(T.slice(0, ls)) + `lower(${txt(T.slice(ls, le + 1))})${neg ? ' NOT' : ''} LIKE lower(${txt(T.slice(rs, re + 1))})` + txt(T.slice(re + 1)));
  }
  return txt(T);
}
function revSimple(sql, d, ctx) {
  let s = sql;
  if (d === 'sqlite') return s;
  if (d === 'tsql') {
    s = s.replace(/\bdbo\s*\.\s*/gi, ''); s = revTemp(s); s = revDdlTsql(s);
    s = s.replace(/\bWITH\s*\(\s*(NOLOCK|READUNCOMMITTED|UPDLOCK|HOLDLOCK|ROWLOCK|PAGLOCK|TABLOCKX?|XLOCK|READPAST|NOEXPAND|INDEX\s*\([^)]*\))(\s*,\s*(\w+|INDEX\s*\([^)]*\)))*\s*\)/gi, '');
    s = s.replace(/\bOPTION\s*\(\s*(MAXRECURSION\s+\d+|RECOMPILE|OPTIMIZE\s+FOR\s+UNKNOWN)(\s*,\s*[^)]*)?\)/gi, '');
    s = s.replace(/\b(NON)?CLUSTERED\b/gi, '').replace(/\bINCLUDE\s*\([^)]*\)/gi, '').replace(/(\bON\s+\w+\s*\([^)]*\)[^;]*?)\bWITH\s*\(\s*(FILLFACTOR|PAD_INDEX|ONLINE|DATA_COMPRESSION|SORT_IN_TEMPDB)[^)]*\)/gi, '$1');
    s = s.replace(/\bWITH\s+SCHEMABINDING\b/gi, '');
    s = s.replace(/\bNEXT\s+VALUE\s+FOR\s+\[?(\w+)\]?(\s+OVER\s*\([^)]*\))?/gi, "seq_next_('$1')");
    s = revTsqlTvf(s);
    if (/^\s*CREATE\s+(UNIQUE\s+)?\s*COLUMNSTORE\s+INDEX/i.test(s)) return "SELECT 'Columnstore indeksi taklit katmanında sembolik olarak oluşturuldu' AS bilgi WHERE 0";
    if (/\/\s*\(?\s*0+(\.0+)?\s*\)?(?![\d.\w])/.test(s.replace(/'(?:[^']|'')*'/g, "''"))) throw new DErr('Msg 8134, Level 16, State 1: Divide by zero error encountered.', 'Sıfıra bölme hatası. Paydayı NULLIF(payda, 0) ile koruyabilirsin.');
  }
  if (d === 'bq') {
    s = s.replace(/\b(UNION|INTERSECT|EXCEPT)\s+DISTINCT\b/gi, '$1').replace(/\bNOT\s+ENFORCED\b/gi, '');
    s = s.replace(/\b(INT64|FLOAT64|STRING|BOOL|BIGNUMERIC|BYTES)\b/gi, m => ({ INT64: 'INTEGER', FLOAT64: 'REAL', STRING: 'TEXT', BOOL: 'INTEGER', BIGNUMERIC: 'REAL', BYTES: 'BLOB' })[m.toUpperCase()]);
    if (/^\s*CREATE\s+(TEMP\s+|TEMPORARY\s+)?TABLE\b/i.test(s)) { const TT = rt(s), DD = depthAt(TT); let cut = -1, end = TT.length; for (let j = 0; j < TT.length; j++) { if (DD[j] !== 0) continue; if (cut < 0 && (isW(TT[j], 'PARTITION', 'CLUSTER') && isW(TT[nx(TT, j)], 'BY') || isW(TT[j], 'OPTIONS'))) cut = j; if (cut >= 0 && isW(TT[j], 'AS')) { end = j; break; } } if (cut >= 0) s = txt(TT.slice(0, cut)) + ' ' + txt(TT.slice(end)); }
    if (/\/\s*\(?\s*0+(\.0+)?\s*\)?(?![\d.\w])/.test(s.replace(/'(?:[^']|'')*'/g, "''"))) throw new DErr('Query error: division by zero: 1 / 0', 'Sıfıra bölme hatası. BigQuery\'de SAFE_DIVIDE(pay, payda) sıfırda NULL döndürür.');
  }
  s = revInfoSchema(s);
  s = revValuesAlias(s);
  s = revPercentile(s);
  if (d === 'pg') s = revIlike(revPgCast(s));
  if (d === 'pg') s = s.replace(/\bctid\b/gi, 'rowid');
  if (d === 'pg') s = revPgRegex(s);
  if (d === 'pg' || d === 'tsql') s = revGenSeries(s, d);
  if (d === 'oracle') s = s.replace(/\b(\w+)\s*\.\s*NEXTVAL\b/gi, "seq_next_('$1')").replace(/\b(\w+)\s*\.\s*CURRVAL\b/gi, "seq_curr_('$1')");
  if (d === 'mysql') { s = s.replace(/\bRLIKE\b/gi, 'REGEXP'); if (s.includes('\\')) s = rt(s).map(t => t.k === 's' && t.v.includes('\\') ? "'" + t.v.slice(1, -1).replace(/\\(.)/g, (m, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c === "'" ? "''" : (c === '%' || c === '_') ? m : c) + "'" : tv(t)).join(''); }
  if (d === 'oracle') { s = s.replace(/\bFROM\s+dual\b/gi, '').replace(/\bMINUS\b/gi, 'EXCEPT'); s = revRownum(s); s = revOracleEmpty(s); s = s.replace(/\bSYSDATE\b(?!\s*\()/gi, 'SYSDATE()').replace(/\bSYSTIMESTAMP\b(?!\s*\()/gi, 'SYSDATE()').replace(/\bDBMS_RANDOM\s*\.\s*VALUE\b/gi, '((abs(random()) % 1000000) / 1000000.0)').replace(/\bROWID\b/g, 'rowid'); }
  if (d === 'mysql') { s = s.replace(/([\w.)]+)\s+DIV\s+([\w.(]+)/gi, 'CAST($1 / $2 AS INTEGER)'); s = revMysqlLimit(s).replace(/\bFROM\s+dual\b/gi, ''); s = s.replace(/\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/gi, 'ON CONFLICT DO UPDATE SET').replace(/\bVALUES\s*\(\s*(\w+)\s*\)(?=\s*(,|;|$))/gi, 'excluded.$1'); s = s.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT OR IGNORE INTO'); }
  if (d === 'oracle') s = s.replace(/(ALTER\s+TABLE\s+\S+\s+ADD)\s*\(([\s\S]*)\)\s*$/i, '$1 COLUMN $2');
  if (d === 'pg') s = s.replace(/\bOFFSET\s+(\d+|\([^()]*\))\s+LIMIT\s+(\d+|ALL|\([^()]*\))/gi, (m, o, l) => /^ALL$/i.test(l) ? 'LIMIT -1 OFFSET ' + o : 'LIMIT ' + l + ' OFFSET ' + o);
  if (d !== 'mysql') s = revOffsetFetch(s);
  s = s.replace(/\bCURRENT_DATE\b(?!\s*\()/gi, 'CURRENT_DATE()').replace(/\bCURRENT_TIMESTAMP\b(?!\s*\()/gi, (m, off, str) => /DEFAULT\s+$/i.test(str.slice(0, off)) ? m : 'CURRENT_TIMESTAMP()');
  s = revDateLits(s);
  if (d === 'pg' || d === 'oracle' || d === 'mysql') s = revInterval(s, d);
  if (d === 'oracle' || d === 'pg') s = revDateArith(s, d);
  if (d === 'tsql') { s = revLikeBrackets(s); s = revTsqlPlus(s); s = revSelectInto(s); s = revOutput(s); s = s.replace(/\bTRAN\b/gi, 'TRANSACTION'); }
  s = revInner(s, d, ctx);
  if (d === 'oracle') s = revOracleConcat(s);
  if (d === 'mysql' || d === 'oracle' || d === 'bq') s = revDivision(s);
  if (d === 'pg' || d === 'oracle') s = revNullsOrder(s);
  if (d === 'tsql' && /\bBEGIN\s+TRANSACTION\b/i.test(s)) s = s.replace(/\bBEGIN\s+TRANSACTION\s+\w+/gi, 'BEGIN TRANSACTION');
  if (d === 'mysql') s = s.replace(/\bSTART\s+TRANSACTION\b/gi, 'BEGIN TRANSACTION');
  return s;
}
/* LATERAL alt sorgularını APPLY biçimine çevirir (PostgreSQL, MySQL, Oracle); alt sorgudaki LIMIT / FETCH FIRST → TOP */
function lateralLimitToTop(inner) {
  let m, n = null, body = inner;
  if ((m = body.match(/\s+LIMIT\s+(\d+)\s*$/i))) { n = m[1]; body = body.slice(0, m.index); }
  else if ((m = body.match(/\s+FETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\s*$/i))) { n = m[1]; body = body.slice(0, m.index); }
  if (n === null) return inner;
  return body.replace(/^(\s*SELECT)(\s+DISTINCT)?\b/i, (x, a, b) => a + (b || '') + ' TOP ' + n);
}
function revLateral(sql) {
  if (!/\b(LATERAL|APPLY)\b/i.test(sql)) return sql;
  let T = rt(sql);
  for (let g = 0; g < 6; g++) {
    const li = T.findIndex((t, i) => isW(t, 'LATERAL') && isW(T[pv(T, i)], 'JOIN'));
    if (li < 0) break;
    const ji = pv(T, li); const p1 = pv(T, ji); let outer = false, startI = ji;
    if (isW(T[p1], 'OUTER') && isW(T[pv(T, p1)], 'LEFT')) { outer = true; startI = pv(T, p1); }
    else if (isW(T[p1], 'LEFT')) { outer = true; startI = p1; }
    else if (isW(T[p1], 'CROSS', 'INNER')) startI = p1;
    const o = nx(T, li);
    if (!isP(T[o], '(')) throw new DErr('LATERAL bu tarayıcı motorunda yalnızca (alt sorgu) ile destekleniyor.', 'Örn: CROSS JOIN LATERAL (SELECT ... FROM orders o WHERE o.customer_id = c.customer_id ORDER BY ... LIMIT 3) AS s');
    const c = closeP(T, o);
    let k = nx(T, c), endI = c;
    if (isW(T[k], 'AS')) endI = nx(T, k);
    else if (T[k] && (T[k].k === 'w' || T[k].k === 'q') && !isW(T[k], 'ON', 'WHERE', 'ORDER', 'GROUP', 'JOIN', 'CROSS', 'LEFT', 'INNER', 'LIMIT')) endI = k;
    let tail = endI + 1; const on = nx(T, endI);
    if (isW(T[on], 'ON')) {
      const a = nx(T, on);
      if (isW(T[a], 'TRUE')) tail = a + 1;
      else if (T[a] && T[a].v === '1' && isP(T[nx(T, a)], '=') && T[nx(T, nx(T, a))] && T[nx(T, nx(T, a))].v === '1') tail = nx(T, nx(T, a)) + 1;
      else throw new DErr('Bu taklit katmanında LATERAL birleşimi yalnızca ON TRUE ile destekleniyor.', 'İlişkili koşulu alt sorgunun WHERE kısmına yaz, birleşimi ON TRUE ile kapat.');
    }
    T = rt(txt(T.slice(0, startI)) + (outer ? 'OUTER APPLY (' : 'CROSS APPLY (') + txt(T.slice(o + 1, c)) + ')' + txt(T.slice(c + 1, endI + 1)) + txt(T.slice(tail)));
  }
  /* APPLY alt sorgularındaki LIMIT / FETCH FIRST */
  for (let i = 0; i < T.length; i++) {
    if (isW(T[i], 'APPLY') && isW(T[pv(T, i)], 'CROSS', 'OUTER')) {
      const o = nx(T, i); if (!isP(T[o], '(')) continue; const c = closeP(T, o);
      const inner = txt(T.slice(o + 1, c)), conv = lateralLimitToTop(inner);
      if (conv !== inner) { T = rt(txt(T.slice(0, o + 1)) + conv + txt(T.slice(c))); }
    }
  }
  return txt(T);
}
/* MySQL NULL güvenli eşitlik: a <=> b → a IS b */
function revNullSafeEq(sql) {
  if (!/<=>/.test(sql)) return sql;
  const T = rt(sql); const out = [];
  for (let i = 0; i < T.length; i++) {
    if (T[i].k === 'o' && T[i].v === '<=' && T[i + 1] && T[i + 1].k === 'o' && T[i + 1].v === '>') { out.push({ k: 'w', v: 'IS', u: 'IS' }); i++; continue; }
    if (T[i].k === 'o' && T[i].v === '<=>') { out.push({ k: 'w', v: 'IS', u: 'IS' }); continue; }
    out.push(T[i]);
  }
  return txt(out);
}
function reverse(sql, d, db, ctx) {
  if (d === 'sqlite') return sql;
  let s = sql;
  if (d !== 'sqlite') s = revAnyAll(s);
  if (d === 'pg') s = revDistinctOn(s, db);
  if (d === 'oracle') s = revConnectBy(s);
  if (d === 'bq') { s = revBqNames(s); s = s.replace(/\bSAFE\s*\.\s*(PARSE_DATE|PARSE_DATETIME)\s*\(/gi, 'SAFE_$1('); s = revBqUnnest(s); s = revBqStarExcept(s, db); s = revBqQualify(s, db); }
  if (d === 'tsql' || d === 'oracle' || d === 'pg' || d === 'mysql' || d === 'bq') s = revGrouping(s, d);
  if (d === 'tsql' || d === 'oracle' || d === 'bq') s = revPivot(s, d, db);
  if (d === 'tsql') s = revForJsonXml(s, db);
  if (d === 'tsql') { s = revApply(s, d, db); s = revTop(s, d, db); }
  if (d === 'pg' || d === 'mysql' || d === 'oracle') { const s0 = s; s = revLateral(s); if (s !== s0 || /\bAPPLY\b/i.test(s)) s = revApply(s, d, db); }
  if (d === 'mysql') s = revNullSafeEq(s);
  return revSimple(s, d, ctx);
}

/* ------------------------------------------------------------------ Çalıştırma */
function splitSemis(sql) { const T = tokenize(sql); const parts = []; let cur = [], dd = 0, inTrig = false; for (let i = 0; i < T.length; i++) { const t = T[i]; if (isP(t, '(')) dd++; if (isP(t, ')')) dd--; if (isW(t, 'TRIGGER') && cur.some(x => isW(x, 'CREATE'))) inTrig = true; if (inTrig && isW(t, 'END')) { cur.push(t); const n = nx(T, i); if (isP(T[n], ';')) { i = n; cur.push(T[n]); } parts.push(cur); cur = []; inTrig = false; continue; } if (dd === 0 && !inTrig && isP(t, ';')) { parts.push(cur); cur = []; continue; } cur.push(t); } parts.push(cur); return parts.map(p => txt(p)).filter(p => tokenize(p).some(sigk)); }
let lastFnError = null;
function execOne(db, sql) {
  lastFnError = null;
  /* JS fonksiyonları indeks ifadesinde kullanılamaz; UPPER/LOWER indeksleri düz sütun indeksi olarak kurulur (sonucu etkilemez) */
  if (/^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(sql)) sql = sql.replace(/\b(UPPER|LOWER)\s*\(\s*([\w."]+)\s*\)/gi, '$2');
  let st;
  try { st = db.prepare(sql); } catch (e) { if (lastFnError) throw new DErr(lastFnError); throw e; }
  try {
    const cols = st.getColumnNames(); const rows = [];
    while (st.step()) rows.push(st.get());
    return cols.length ? { columns: cols, values: rows } : null;
  } catch (e) { if (lastFnError) throw new DErr(lastFnError); throw e; }
  finally { st.free(); }
}
function fnErr(msg) { lastFnError = msg; throw new Error(msg); }
function friendly(e, d) {
  const m = String(e && e.message || e); const V = VENDOR[d] || VENDOR.sqlite;
  let mm;
  if (e instanceof DErr) return { message: m, hint: e.hint };
  if ((mm = m.match(/no such table: (?:\w+\.)?(\S+)/))) return { message: V.table(mm[1].replace(/^tmp_/, '#')), hint: 'Tablo adını kontrol et; tablolar Veri Seti sayfasında listeleniyor.' };
  if ((mm = m.match(/no such column: (\S+)/))) return { message: V.col(mm[1]), hint: 'Sütun adını ve hangi tabloya ait olduğunu kontrol et.' };
  if ((mm = m.match(/no such function: (\S+)/))) return { message: V.fn(mm[1].replace(/_$/, '')), hint: 'Bu fonksiyon seçili programda yok ya da adı farklı.' };
  if ((mm = m.match(/near "([^"]*)": syntax error/))) return { message: V.syntax(mm[1]), hint: 'Virgül, parantez ve anahtar kelime sırasını kontrol et.' };
  if (/incomplete input/.test(m)) return { message: d === 'tsql' ? "Msg 102, Level 15: Incorrect syntax near the end of input." : d === 'oracle' ? 'ORA-00921: unexpected end of SQL command' : d === 'pg' ? 'ERROR: syntax error at end of input' : d === 'mysql' ? "ERROR 1064 (42000): ... near '' at end of input" : m, hint: 'Sorgu yarım kalmış: kapanmayan parantez veya tırnak olabilir.' };
  if ((mm = m.match(/ambiguous column name: (\S+)/))) return { message: d === 'tsql' ? `Msg 209, Level 16: Ambiguous column name '${mm[1]}'.` : d === 'pg' ? `ERROR: column reference "${mm[1]}" is ambiguous` : d === 'oracle' ? 'ORA-00918: column ambiguously defined' : d === 'mysql' ? `ERROR 1052 (23000): Column '${mm[1]}' in field list is ambiguous` : m, hint: 'Sütun birden fazla tabloda var; başına tablo takma adını ekle (ör. o.' + mm[1] + ').' };
  if (/misuse of aggregate/.test(m)) return { message: d === 'tsql' ? 'Msg 147, Level 15: An aggregate may not appear in the WHERE clause unless it is in a subquery contained in a HAVING clause.' : d === 'pg' ? 'ERROR: aggregate functions are not allowed in WHERE' : d === 'oracle' ? 'ORA-00934: group function is not allowed here' : d === 'mysql' ? 'ERROR 1111 (HY000): Invalid use of group function' : m, hint: 'Toplama sonucuna göre filtrelemek için HAVING kullan.' };
  if ((mm = m.match(/UNIQUE constraint failed: (\S+)/))) return { message: d === 'tsql' ? `Msg 2627, Level 14: Violation of PRIMARY KEY/UNIQUE constraint. Cannot insert duplicate key (${mm[1]}).` : d === 'pg' ? `ERROR: duplicate key value violates unique constraint (${mm[1]})` : d === 'oracle' ? 'ORA-00001: unique constraint violated' : d === 'mysql' ? `ERROR 1062 (23000): Duplicate entry for key '${mm[1]}'` : m, hint: 'Bu anahtar değeri zaten var.' };
  if ((mm = m.match(/NOT NULL constraint failed: (\S+)/))) return { message: d === 'tsql' ? `Msg 515, Level 16: Cannot insert the value NULL into column '${mm[1]}'.` : d === 'pg' ? `ERROR: null value in column violates not-null constraint (${mm[1]})` : d === 'oracle' ? `ORA-01400: cannot insert NULL into (${mm[1].toUpperCase()})` : d === 'mysql' ? `ERROR 1048 (23000): Column '${mm[1]}' cannot be null` : m, hint: 'Bu sütun boş bırakılamaz.' };
  if (/CHECK constraint failed/.test(m)) return { message: d === 'tsql' ? 'Msg 547, Level 16: The INSERT statement conflicted with the CHECK constraint.' : d === 'pg' ? 'ERROR: new row violates check constraint' : d === 'oracle' ? 'ORA-02290: check constraint violated' : d === 'mysql' ? 'ERROR 3819 (HY000): Check constraint is violated.' : m, hint: 'Değer CHECK kuralına uymuyor.' };
  if (/FOREIGN KEY constraint failed/.test(m)) return { message: d === 'tsql' ? 'Msg 547, Level 16: The statement conflicted with the FOREIGN KEY constraint.' : m, hint: 'Referans verilen kayıt yok.' };
  if ((mm = m.match(/table (\S+) already exists/))) return { message: d === 'tsql' ? `Msg 2714, Level 16: There is already an object named '${mm[1].replace(/^tmp_/, '#')}' in the database.` : d === 'pg' ? `ERROR: relation "${mm[1]}" already exists` : d === 'oracle' ? 'ORA-00955: name is already used by an existing object' : d === 'mysql' ? `ERROR 1050 (42S01): Table '${mm[1]}' already exists` : m, hint: '' };
  if (/do not have the same number of result columns/.test(m)) return { message: d === 'tsql' ? 'Msg 205, Level 16: All queries combined using a UNION, INTERSECT or EXCEPT operator must have an equal number of expressions in their target lists.' : d === 'oracle' ? 'ORA-01789: query block has incorrect number of result columns' : m, hint: 'Küme işleminin iki tarafı aynı sayıda sütun döndürmeli.' };
  if (/cannot (commit|rollback) - no transaction is active/.test(m)) return { message: d === 'tsql' ? 'Msg 3902, Level 16: The COMMIT/ROLLBACK TRANSACTION request has no corresponding BEGIN TRANSACTION.' : m, hint: 'Önce BEGIN TRANSACTION ile işlem başlat.' };
  if (/wrong number of arguments to function (\S+)/.test(m)) { const f = m.match(/function (\S+?)_?\(/); return { message: d === 'tsql' ? `Msg 174, Level 15: The ${f ? f[1] : ''} function requires a different number of arguments.` : m, hint: 'Fonksiyona verilen argüman sayısını kontrol et.' }; }
  return { message: m, hint: '' };
}
function headerize(sets, d) {
  if (d === 'sqlite') return sets;
  for (const s of sets) {
    let bqAnon = 0;
    s.columns = s.columns.map(c => {
      { const m = String(c).match(/^seq_(next|curr)_\('([^']*)'\)$/i); if (m) return d === 'oracle' ? (m[2] + '.' + (m[1].toLowerCase() === 'next' ? 'NEXTVAL' : 'CURRVAL')).toUpperCase() : d === 'pg' ? (m[1].toLowerCase() === 'next' ? 'nextval' : 'currval') : d === 'tsql' ? '(No column name)' : c; }
      const simple = /^[A-Za-z_À-ɏİı][\wÀ-ɏİı]*$/.test(c) || /^".*"$/.test(c) || /^(JSON|XML)_F52E2B61/.test(c);
      if (d === 'oracle') return simple ? c.toUpperCase() : c.toUpperCase().replace(/\s+/g, '');
      if (d === 'bq') return simple ? c : 'f' + (bqAnon++) + '_';
      if (simple) return d === 'pg' ? c.toLowerCase() : c;
      if (d === 'tsql') return '(No column name)';
      if (d === 'pg') { const m = c.match(/^\s*(\w+)\s*\(/); return m ? m[1].toLowerCase().replace(/_$/, '').replace(/^(len|left|right|charindex|datepart|datediff|dateadd|format|to_char|date_format|extract)$/, x => x) : '?column?'; }
      return c;
    });
  }
  return sets;
}


/* MERGE → UPDATE/DELETE/INSERT dizisi (T-SQL ve Oracle) */
function mergeToSql(text) {
  const T2 = rt(text.replace(/;\s*$/, '')); const D2 = depthAt(T2); const sg = i => T2[i];
  let i = nx(T2, -1); i = nx(T2, i); if (isW(sg(i), 'INTO')) i = nx(T2, i);
  while (isP(T2[nx(T2, i)], '.')) i = nx(T2, nx(T2, i));
  const tgt = T2[i].v; let j = nx(T2, i); let ta = tgt; if (isW(sg(j), 'AS')) j = nx(T2, j); if (!isW(sg(j), 'USING')) { ta = T2[j].v; j = nx(T2, j); }
  if (!isW(sg(j), 'USING')) throw new DErr('MERGE sözdizimi anlaşılamadı (USING bekleniyor).');
  const us = nx(T2, j); let ue = us; if (isP(sg(us), '(')) ue = closeP(T2, us);
  const srcTxt = txt(T2.slice(us, ue + 1)); let k = nx(T2, ue); let sa = srcTxt; if (isW(sg(k), 'AS')) k = nx(T2, k); if (!isW(sg(k), 'ON')) { sa = T2[k].v; k = nx(T2, k); }
  const onS = nx(T2, k); const onE = T2.findIndex((t, z) => z > onS && D2[z] === 0 && isW(t, 'WHEN')); const onTxt = txt(T2.slice(onS, onE)).trim();
  const whens = []; let cur = null;
  for (let z = onE; z < T2.length; z++) { if (D2[z] === 0 && isW(T2[z], 'WHEN')) { if (cur) whens.push(cur); cur = { s: z }; } }
  if (cur) whens.push(cur);
  whens.forEach((w, idx) => { w.e = idx + 1 < whens.length ? whens[idx + 1].s : T2.length; w.t = txt(T2.slice(w.s, w.e)).trim().replace(/;\s*$/, ''); });
  const srcFrom = `${srcTxt} AS ${sa}`; const out = [];
  for (const w of whens) {
    let m;
    if ((m = w.t.match(/^WHEN\s+MATCHED(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+UPDATE\s+SET\s+([\s\S]+)$/i))) {
      const sets = splitTop(rt(m[2]), ',').map(x => txt(x).trim()).map(x => { const e = x.indexOf('='); const col = x.slice(0, e).trim().replace(/^\w+\./, ''); const ex = x.slice(e + 1).trim(); return `${col} = (SELECT ${ex} FROM ${srcFrom} WHERE ${onTxt}${m[1] ? ' AND ' + m[1] : ''})`; });
      out.push(`UPDATE ${tgt} AS ${ta} SET ${sets.join(', ')} WHERE EXISTS (SELECT 1 FROM ${srcFrom} WHERE ${onTxt}${m[1] ? ' AND ' + m[1] : ''})`);
    } else if ((m = w.t.match(/^WHEN\s+MATCHED(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+DELETE$/i))) {
      out.push(`DELETE FROM ${tgt} AS ${ta} WHERE EXISTS (SELECT 1 FROM ${srcFrom} WHERE ${onTxt}${m[1] ? ' AND ' + m[1] : ''})`);
    } else if ((m = w.t.match(/^WHEN\s+NOT\s+MATCHED(?:\s+BY\s+TARGET)?(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+INSERT\s*(\([^)]*\))?\s*VALUES\s*(\([\s\S]*\))$/i))) {
      const vals = m[3].trim().slice(1, -1);
      out.push(`INSERT INTO ${tgt} ${m[2] || ''} SELECT ${vals} FROM ${srcFrom} WHERE NOT EXISTS (SELECT 1 FROM ${tgt} AS ${ta} WHERE ${onTxt})${m[1] ? ' AND ' + m[1] : ''}`);
    } else if ((m = w.t.match(/^WHEN\s+NOT\s+MATCHED\s+BY\s+SOURCE(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+DELETE$/i))) {
      out.push(`DELETE FROM ${tgt} AS ${ta} WHERE NOT EXISTS (SELECT 1 FROM ${srcFrom} WHERE ${onTxt})${m[1] ? ' AND ' + m[1] : ''}`);
    } else throw new DErr('Bu MERGE kolu desteklenmiyor: ' + w.t.slice(0, 60));
  }
  return out;
}

/* ------------------------------------------------------------------ T-SQL yorumlayıcısı */
const STMT_KW = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DECLARE', 'SET', 'PRINT', 'IF', 'ELSE', 'WHILE', 'BEGIN', 'END', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'EXEC', 'EXECUTE', 'WITH', 'RETURN', 'THROW', 'RAISERROR', 'BREAK', 'CONTINUE', 'COMMIT', 'ROLLBACK', 'SAVE', 'USE', 'GRANT', 'REVOKE', 'DENY', 'OPEN', 'FETCH', 'CLOSE', 'DEALLOCATE']);
function isCursorFetch(T, i) {
  const n1 = T[nx(T, i)], n2 = T[nx(T, nx(T, i))];
  if (isW(n1, 'NEXT', 'PRIOR', 'FIRST', 'LAST')) return isW(n2, 'FROM');
  if (isW(n1, 'ABSOLUTE', 'RELATIVE')) return true;
  return !!n1 && (n1.k === 'w' || n1.k === 'q' || n1.k === 'var') && !isW(n1, 'NEXT', 'FIRST');
}
function splitTsql(T) {
  // T: tüm tokenlar. Sonuç: ifade token dizileri (GO ve ; ayırır)
  const out = []; let cur = [], d = 0, caseD = 0, head = null, sawSel = false, extendAll = false, prevSig = null;
  const flush = () => { if (cur.some(sigk)) out.push(cur); cur = []; caseD = 0; head = null; sawSel = false; extendAll = false; };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 'w' && t.u === 'GO' && d === 0) { const p = T[i - 1], n = T[i + 1]; if ((!p || (p.k === 'ws' && /\n/.test(p.v)) || i === 0) && (!n || (n.k === 'ws' && /\n/.test(n.v)) || (n.k === 'n'))) { flush(); out.push('GO'); continue; } }
    if (isP(t, '(')) d++; if (isP(t, ')')) d--;
    if (!sigk(t)) { cur.push(t); continue; }
    if (d === 0 && isP(t, ';') && !extendAll) { cur.push(t); flush(); prevSig = t; continue; }
    if (d === 0 && t.k === 'w' && !extendAll) {
      let boundary = STMT_KW.has(t.u) && head !== null;
      const ps = prevSig;
      if (boundary) {
        if (t.u === 'SELECT') { if (isW(ps, 'UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'AS', 'FOR', 'DISTINCT') || (head === 'WITH' && !sawSel) || (head === 'INSERT' && !sawSel) || isP(ps, '(')) boundary = false; }
        if (head === 'WITH' && !sawSel && ['MERGE', 'UPDATE', 'DELETE', 'INSERT'].includes(t.u)) { boundary = false; sawSel = true; }
        if (t.u === 'SET' && (head === 'UPDATE' || head === 'MERGE' || cur.some(x => isW(x, 'UPDATE', 'MERGE')) || isW(ps, 'ON', 'DELETE', 'UPDATE'))) boundary = false;
        if ((t.u === 'UPDATE' || t.u === 'DELETE' || t.u === 'INSERT') && (head === 'MERGE' || isW(ps, 'AFTER', 'FOR', 'OF', 'ON', 'THEN', 'INSTEAD') || isP(ps, ','))) boundary = false;
        if (t.u === 'WITH') { const n1 = nx(T, i), n2 = nx(T, n1); const cte = T[n1] && (T[n1].k === 'w' || T[n1].k === 'q') && (isW(T[n2], 'AS') || isP(T[n2], '(')) && !isW(T[n1], 'TIES', 'ROLLUP', 'CUBE', 'CHECK', 'NOCHECK', 'RECOMPILE', 'SCHEMABINDING', 'ENCRYPTION', 'EXECUTE'); if (!cte || head === 'CREATE' || head === 'MERGE' || head === 'DECLARE') boundary = false; }
        if (t.u === 'END' && caseD > 0) { boundary = false; caseD--; }
        else if (t.u === 'ELSE' && caseD > 0) boundary = false;
        if ((t.u === 'COMMIT' || t.u === 'ROLLBACK') && head === 'BEGIN' && false) boundary = false;
        if (t.u === 'BEGIN' && head === 'CREATE') boundary = false;
        if (t.u === 'EXEC' && head === 'INSERT') boundary = false;
        if (t.u === 'FETCH' && !isCursorFetch(T, i)) boundary = false;
        if (t.u === 'OPEN' || t.u === 'CLOSE') { const n1 = T[nx(T, i)]; if (!n1 || !(n1.k === 'w' || n1.k === 'q' || n1.k === 'var')) boundary = false; }
        if (t.u === 'IF' && isW(ps, 'DROP', 'EXISTS', 'TABLE', 'VIEW', 'PROC', 'PROCEDURE', 'FUNCTION', 'INDEX', 'TRIGGER', 'SCHEMA', 'SEQUENCE')) boundary = false;
      }
      if (boundary) { flush(); }
      if (head === null) { head = t.u; const n1 = T[nx(T, i)]; if ((t.u === 'CREATE' || t.u === 'ALTER') && n1) { let k = nx(T, i); if (isW(T[k], 'OR')) k = nx(T, nx(T, k)); if (isW(T[k], 'PROC', 'PROCEDURE', 'FUNCTION', 'TRIGGER')) extendAll = true; } }
      if (t.u === 'CASE') caseD++;
      if (t.u === 'SELECT' || t.u === 'VALUES' || t.u === 'EXEC') sawSel = true;
      // END sonrası: END, BEGIN, ELSE gibi tek kelimelik ifadeler hemen biter
      cur.push(t); prevSig = t;
      if ((t.u === 'BEGIN' && !isW(T[nx(T, i)], 'TRAN', 'TRANSACTION', 'TRY', 'CATCH', 'DISTRIBUTED')) || t.u === 'ELSE' || t.u === 'BREAK' || t.u === 'CONTINUE') { if (cur.filter(sigk).length === 1) flush(); }
      if ((t.u === 'TRY' || t.u === 'CATCH') && cur.filter(sigk).length === 2 && (head === 'BEGIN' || head === 'END')) flush();
      if (t.u === 'END' && cur.filter(sigk).length === 1) { const n = nx(T, i); if (!isW(T[n], 'TRY', 'CATCH')) flush(); }
      if ((t.u === 'TRAN' || t.u === 'TRANSACTION') && head === 'BEGIN') { const n = nx(T, i); if (T[n] && T[n].k === 'w' && !STMT_KW.has(T[n].u)) { cur.push(...T.slice(i + 1, n + 1)); i = n; } flush(); }
      continue;
    }
    if (head === null && t.k !== 'ws') head = t.k === 'w' ? t.u : '?';
    cur.push(t); prevSig = t;
  }
  flush();
  return out;
}
function headOf(S) { const s = S.filter(sigk); return s.map(t => t.u || t.v); }
function parseTsql(stmts) {
  let i = 0;
  function one() {
    const S = stmts[i];
    if (S === 'GO') { i++; return { t: 'go' }; }
    const h = headOf(S);
    if (h[0] === 'BEGIN' && h[1] === 'TRY') { i++; const body = seq(x => x[0] === 'END' && x[1] === 'TRY'); i++; const c = stmts[i]; const hc = c && c !== 'GO' ? headOf(c) : []; if (!(hc[0] === 'BEGIN' && hc[1] === 'CATCH')) throw new DErr("Msg 102: Incorrect syntax: BEGIN TRY bloğundan sonra BEGIN CATCH gelmeli."); i++; const cat = seq(x => x[0] === 'END' && x[1] === 'CATCH'); i++; return { t: 'try', body, cat }; }
    if (h[0] === 'BEGIN' && h.length === 1) { i++; const body = seq(x => x[0] === 'END' && x.length <= 1); i++; return { t: 'block', body }; }
    if (h[0] === 'IF') { i++; const cond = trimT(S.slice(S.findIndex(t => isW(t, 'IF')) + 1)); const then = one(); let els = null; const n = stmts[i]; if (n && n !== 'GO' && headOf(n)[0] === 'ELSE' && headOf(n).length === 1) { i++; els = one(); } return { t: 'if', cond, then, els }; }
    if (h[0] === 'WHILE') { i++; const cond = trimT(S.slice(S.findIndex(t => isW(t, 'WHILE')) + 1)); const body = one(); return { t: 'while', cond, body }; }
    i++;
    const map = { OPEN: 'copen', FETCH: 'cfetch', CLOSE: 'cclose', DEALLOCATE: 'cdealloc', DECLARE: 'declare', PRINT: 'print', THROW: 'throw', RAISERROR: 'raiserror', RETURN: 'return', BREAK: 'break', CONTINUE: 'continue', EXEC: 'exec', EXECUTE: 'exec', USE: 'use' };
    if (h[0] === 'SET' && S.filter(sigk)[1] && S.filter(sigk)[1].k === 'var') return { t: 'set', S };
    if (h[0] === 'SET') return { t: 'noop', S };
    if ((h[0] === 'CREATE' || h[0] === 'ALTER') && (h.includes('PROC') || h.includes('PROCEDURE')) && h.indexOf('PROC') < 4 | h.indexOf('PROCEDURE') < 4) { const k = Math.max(h.indexOf('PROC'), h.indexOf('PROCEDURE')); if (k >= 1 && k <= 3) return { t: 'createproc', S }; }
    if ((h[0] === 'CREATE' || h[0] === 'ALTER') && h.slice(1, 4).includes('FUNCTION')) return { t: 'createfunc', S };
    if ((h[0] === 'CREATE' || h[0] === 'ALTER') && h.slice(1, 4).includes('TRIGGER')) return { t: 'createtrigger', S };
    if (map[h[0]]) return { t: map[h[0]], S };
    if (h[0] === 'ELSE' || h[0] === 'END') throw new DErr(`Msg 156, Level 15: Incorrect syntax near the keyword '${h[0]}'.`, h[0] === 'ELSE' ? 'ELSE, bir IF ifadesinden hemen sonra gelmeli.' : 'Fazladan END var; BEGIN/END eşleşmelerini kontrol et.');
    return { t: 'sql', S };
  }
  function seq(stop) {
    const out = [];
    while (i < stmts.length) { const S = stmts[i]; if (S !== 'GO' && stop && stop(headOf(S))) return out; out.push(one()); }
    if (stop) throw new DErr('Msg 102, Level 15: Incorrect syntax near the end of the batch.', 'BEGIN ile açılan bir blok END ile kapanmamış.');
    return out;
  }
  return seq(null);
}
class Signal { constructor(kind, val) { this.kind = kind; this.val = val; } }
function tsqlRun(db, sql, opt) {
  const R = { sets: [], messages: [], changes: 0, translated: [] };
  const env = opt.env || (opt.env = { procs: {}, funcs: {}, tvfs: {}, tran: 0, nocount: false });
  const T = tokenize(sql);
  const nodes = parseTsql(splitTsql(T));
  const scope = { vars: {}, tables: {}, rowcount: 0 };
  execNodes(nodes, scope, null);
  return R;

  function sqlOfVal(v) { return lit(v); }
  function subst(S, sc, ctx) {
    // değişkenler, tablo değişkenleri, @@ fonksiyonları
    let out = '';
    for (let k = 0; k < S.length; k++) {
      const t = S[k];
      if (t.k === 'var') {
        const n = t.v.toLowerCase();
        if (n === '@@rowcount') { out += String(sc.rowcount); continue; }
        if (n === '@@trancount') { out += String(env.tran); continue; }
        if (n === '@@fetch_status') { out += String(env.fetchStatus === undefined ? -1 : env.fetchStatus); continue; }
        if (n === '@@cursor_rows') { out += String(env.cursorRows || 0); continue; }
        if (n === '@@error') { out += ctx && ctx.err ? String(ctx.err.number) : '0'; continue; }
        if (n === '@@identity') { out += 'last_insert_rowid()'; continue; }
        if (n === '@@version') { out += "'Microsoft SQL Server 2022 (Kesit SQL taklitsi)'"; continue; }
        if (n === '@@servername') { out += "'SQLPATIKA'"; continue; }
        if (sc.tables[n]) { out += sc.tables[n]; continue; }
        if (!(n in sc.vars)) throw new DErr(`Msg 137, Level 15: Must declare the scalar variable "${t.v}".`, 'Değişkeni önce DECLARE ile tanımla.');
        out += sqlOfVal(sc.vars[n].v); continue;
      }
      out += tv(t);
    }
    return out;
  }
  function udfExpand(s) {
    // satır içi tablo değerli fonksiyonlar: FROM dbo.f(args)
    for (const name in env.tvfs) {
      const f = env.tvfs[name]; const re = new RegExp('(?:\\bdbo\\s*\\.\\s*)?\\b' + name + '\\s*\\(', 'i');
      for (let g = 0; g < 10; g++) {
        const TT = rt(s); const idx = TT.findIndex((t, k) => isW(t, name.toUpperCase()) && isP(TT[nx(TT, k)], '('));
        if (idx < 0) break; void re;
        const o = nx(TT, idx), c = closeP(TT, o); const args = argsOf(TT, o, c).map(a => txt(a).trim());
        let start = idx; const p = pv(TT, idx); if (isP(TT[p], '.') && isW(TT[pv(TT, p)], 'DBO')) start = pv(TT, p);
        let body = f.body; f.params.forEach((pp, k) => { body = body.replace(new RegExp(pp.name.replace('@', '@') + '\\b', 'gi'), '(' + (args[k] !== undefined ? args[k] : pp.def || 'NULL') + ')'); });
        s = txt(TT.slice(0, start)) + '(' + body + ')' + txt(TT.slice(c + 1));
      }
    }
    return s;
  }
  function toSqlite(text, ctx) {
    const sq = reverse(udfExpand(text), 'tsql', db, { err: ctx && ctx.err, udf: env.funcs });
    return sq;
  }
  function evalExpr(exprToks, sc, ctx) {
    const e = subst(exprToks, sc, ctx);
    const q = toSqlite('SELECT ' + e, ctx);
    R.translated.push(q);
    const r = execOne(db, q);
    return r && r.values.length ? r.values[0][0] : null;
  }
  function evalCond(condToks, sc, ctx) {
    const e = subst(condToks, sc, ctx);
    const q = toSqlite('SELECT CASE WHEN ' + e + ' THEN 1 ELSE 0 END', ctx);
    R.translated.push(q);
    const r = execOne(db, q); return r && r.values[0][0] === 1;
  }
  function coerce(type, v) {
    if (v === null || v === undefined) return null;
    const T = (type || '').toUpperCase();
    if (/^(INT|BIGINT|SMALLINT|TINYINT|BIT)/.test(T)) { const n = Number(v); return isNaN(n) ? (() => { throw new DErr(`Msg 245, Level 16: Conversion failed when converting the varchar value '${v}' to data type int.`); })() : Math.trunc(n); }
    let m;
    if ((m = T.match(/^(DECIMAL|NUMERIC)\s*\(\s*\d+\s*,\s*(\d+)\s*\)/))) { const n = Number(v); return Math.round(n * Math.pow(10, +m[2])) / Math.pow(10, +m[2]); }
    if (/^(FLOAT|REAL|MONEY|DECIMAL|NUMERIC)/.test(T)) return Number(v);
    if ((m = T.match(/^N?(VAR)?CHAR\s*\(\s*(\d+)\s*\)/))) return String(v).slice(0, +m[2]);
    if (/^N?(VAR)?CHAR/.test(T) && !/\(/.test(T)) return String(v).slice(0, 1);
    if (/^DATE$/.test(T)) { const s = String(v); return s.slice(0, 10); }
    return v;
  }
  function execNodes(list, sc, ctx) { for (const n of list) execNode(n, sc, ctx); }
  function execNode(n, sc, ctx) {
    switch (n.t) {
      case 'go': return;
      case 'noop': { const s = txt(n.S).toUpperCase(); if (/NOCOUNT\s+ON/.test(s)) env.nocount = true; if (/NOCOUNT\s+OFF/.test(s)) env.nocount = false; return; }
      case 'use': R.messages.push('Veritabanı bağlamı değiştirildi (taklit katmanında tek veritabanı var: anadolu).'); return;
      case 'block': return execNodes(n.body, sc, ctx);
      case 'if': if (evalCond(n.cond, sc, ctx)) execNode(n.then, sc, ctx); else if (n.els) execNode(n.els, sc, ctx); return;
      case 'while': { let g = 0; while (evalCond(n.cond, sc, ctx)) { if (++g > 5000) throw new DErr('WHILE döngüsü 5000 turu aştı; sonsuz döngü olabilir.'); try { execNode(n.body, sc, ctx); } catch (s) { if (s instanceof Signal && s.kind === 'break') break; if (s instanceof Signal && s.kind === 'continue') continue; throw s; } } return; }
      case 'break': throw new Signal('break');
      case 'continue': throw new Signal('continue');
      case 'return': { const S = n.S.filter(sigk); let v = null; if (S.length > 1) v = evalExpr(trimT(n.S.slice(n.S.indexOf(S[1]))), sc, ctx); throw new Signal('return', v); }
      case 'try': {
        const before = env.tran;
        try { execNodes(n.body, sc, ctx); }
        catch (e) {
          if (e instanceof Signal) throw e;
          const info = errInfo(e); void before;
          execNodes(n.cat, sc, { err: info });
        }
        return;
      }
      case 'throw': {
        const S = trimT(n.S.slice(n.S.findIndex(t => isW(t, 'THROW')) + 1));
        if (!S.length) { if (ctx && ctx.err) throw Object.assign(new Error(ctx.err.message), { tsql: ctx.err }); throw new DErr('Msg 10704: THROW without parameters must be inside a CATCH block.'); }
        const A = splitTop(S, ',').map(a => trimT(a));
        const num = evalExpr(A[0], sc, ctx), msg = evalExpr(A[1], sc, ctx);
        const er = new Error(`Msg ${num}, Level 16, State 1: ${msg}`); er.tsql = { number: num, message: msg, severity: 16 }; throw er;
      }
      case 'raiserror': {
        const S = n.S; const o = S.findIndex(t => isP(t, '(')); const c = closeP(S, o); const A = argsOf(S, o, c).map(trimT);
        let msg = String(evalExpr(A[0], sc, ctx)); const sev = A[1] ? Number(evalExpr(A[1], sc, ctx)) : 16;
        A.slice(3).forEach(a => { const v = evalExpr(a, sc, ctx); msg = msg.replace(/%[sd]/, v === null ? '(null)' : String(v)); });
        if (sev <= 10) { R.messages.push(msg); return; }
        const er = new Error(`Msg 50000, Level ${sev}, State 1: ${msg}`); er.tsql = { number: 50000, message: msg, severity: sev }; throw er;
      }
      case 'print': { const S = trimT(n.S.slice(n.S.findIndex(t => isW(t, 'PRINT')) + 1)); const v = evalExpr(S, sc, ctx); R.messages.push(v === null ? '' : String(v)); return; }
      case 'declare': return doDeclare(n.S, sc, ctx);
      case 'set': {
        const S = n.S.filter(sigk); const vtok = S[1]; const nm = vtok.v.toLowerCase();
        if (!(nm in sc.vars)) throw new DErr(`Msg 137, Level 15: Must declare the scalar variable "${vtok.v}".`, 'Değişkeni önce DECLARE ile tanımla.');
        const opT = S[2]; const compound = /^[+\-*/%]$/.test(opT.v) && S[3] && S[3].v === '=';
        const ei = n.S.indexOf(compound ? S[4] : S[3]);
        let exprToks = trimT(n.S.slice(ei)); if (isP(exprToks[exprToks.length - 1], ';')) exprToks = trimT(exprToks.slice(0, -1));
        let v = evalExpr(exprToks, sc, ctx);
        const cur = sc.vars[nm].v;
        if (compound) { if (cur === null || v === null) v = null; else if (opT.v === '+') v = typeof cur === 'string' || typeof v === 'string' ? String(cur) + String(v) : cur + v; else if (opT.v === '-') v = cur - v; else if (opT.v === '*') v = cur * v; else if (opT.v === '/') v = (/^(INT|BIGINT|SMALLINT|TINYINT)/i.test(sc.vars[nm].type) ? Math.trunc(cur / v) : cur / v); else if (opT.v === '%') v = cur % v; }
        sc.vars[nm].v = coerce(sc.vars[nm].type, v); return;
      }
      case 'exec': return doExec(n.S, sc, ctx);
      case 'copen': case 'cfetch': case 'cclose': case 'cdealloc': return doCursor(n.t, n.S, sc, ctx);
      case 'createproc': return doCreateProc(n.S);
      case 'createfunc': return doCreateFunc(n.S);
      case 'createtrigger': return doCreateTrigger(n.S, ctx);
      case 'sql': return doSql(n.S, sc, ctx);
    }
  }
  function errInfo(e) {
    if (e.tsql) return e.tsql;
    const f = friendly(e, 'tsql'); const m = f.message.match(/^Msg (\d+), Level (\d+)[^:]*: (.*)$/);
    return m ? { number: +m[1], severity: +m[2], message: m[3] } : { number: 50000, severity: 16, message: f.message };
  }
  function doDeclare(S0, sc, ctx) {
    let S = trimT(S0.slice(S0.findIndex(t => isW(t, 'DECLARE')) + 1)); if (isP(S[S.length - 1], ';')) S = trimT(S.slice(0, -1));
    // tablo değişkeni
    const sig = S.filter(sigk);
    if (sig[0] && sig[0].k === 'var' && isW(sig[1], 'TABLE')) {
      const nm = sig[0].v.toLowerCase(); const tname = 'tv_' + nm.slice(1);
      const o = S.findIndex(t => isP(t, '(')); const c = closeP(S, o);
      db.exec(`DROP TABLE IF EXISTS temp.${tname}`);
      const q = toSqlite(`CREATE TEMP TABLE ${tname} ` + txt(S.slice(o, c + 1)), ctx);
      R.translated.push(q); db.exec(q); sc.tables[nm] = tname; return;
    }
    if (sig[0] && (sig[0].k === 'w' || sig[0].k === 'q') && sig.slice(1, 6).some(t => isW(t, 'CURSOR'))) {
      const nm = sig[0].v.replace(/^\[|\]$/g, '').toLowerCase(); env.cursors = env.cursors || {};
      if (env.cursors[nm]) throw new DErr(`Msg 16915, Level 16: A cursor with the name '${sig[0].v}' already exists.`, 'Önceki imleci DEALLOCATE ile serbest bırakmayı unutmuş olabilirsin.');
      const fi = S.findIndex((t, z) => isW(t, 'FOR') && z > S.indexOf(sig[1]));
      if (fi < 0) throw new DErr("Msg 102, Level 15: Incorrect syntax near 'CURSOR'.", 'Doğru biçim: DECLARE imlec CURSOR FOR SELECT ...');
      const opts = S.slice(0, fi).filter(sigk).map(t => t.u);
      let q = trimT(S.slice(fi + 1)); const qs = q.filter(sigk); const fu = qs.findIndex((t, z) => isW(t, 'FOR') && isW(qs[z + 1], 'UPDATE', 'READ')); if (fu >= 0) q = trimT(q.slice(0, q.indexOf(qs[fu])));
      const scroll = opts.some(o => ['SCROLL', 'STATIC', 'KEYSET', 'DYNAMIC'].includes(o)) && !opts.some(o => ['FORWARD_ONLY', 'FAST_FORWARD'].includes(o));
      env.cursors[nm] = { name: sig[0].v, q, scroll, rows: null, pos: -1 };
      return;
    }
    if (sig[0] && sig[0].k === 'var' && isW(sig[1], 'CURSOR')) throw new DErr('İmleçler (CURSOR) bu tarayıcı motorunda desteklenmiyor.', 'Çoğu imleç kullanımı küme tabanlı bir sorgu veya WHILE döngüsüyle yazılabilir.');
    for (const part of splitTop(S, ',')) {
      const P = trimT(part); const ps = P.filter(sigk); if (!ps.length) continue;
      const nm = ps[0].v.toLowerCase(); let k = 1; if (isW(ps[1], 'AS')) k = 2;
      const eqI = P.findIndex(t => isP(t, '='));
      const typeTxt = txt(P.slice(P.indexOf(ps[k]), eqI < 0 ? P.length : eqI)).trim();
      let v = null; if (eqI >= 0) v = evalExpr(trimT(P.slice(eqI + 1)), sc, ctx);
      sc.vars[nm] = { type: typeTxt, v: coerce(typeTxt, v) };
    }
  }
  function doSql(S0, sc, ctx) {
    let S = trimT(S0); if (isP(S[S.length - 1], ';')) S = trimT(S.slice(0, -1));
    const sig = S.filter(sigk); if (!sig.length) return;
    // değişkene atayan SELECT
    let k0 = 1; if (isW(sig[1], 'DISTINCT')) k0 = 2; if (isW(sig[k0], 'TOP')) k0 += 2;
    if (isW(sig[0], 'SELECT') && sig[k0] && sig[k0].k === 'var' && isP(sig[k0 + 1], '=')) {
      const T2 = S; const D2 = depthAt(T2); const sI = T2.indexOf(sig[0]); let fI = T2.length;
      for (let j = sI + 1; j < T2.length; j++) if (D2[j] === 0 && isW(T2[j], 'FROM', 'WHERE', 'ORDER', 'GROUP')) { fI = j; break; }
      const items = splitTop(T2.slice(T2.indexOf(sig[k0]), fI), ',').map(trimT);
      const targets = [], exprs = [];
      for (const it of items) { const vt = it.find(sigk); const eq = it.findIndex(t => isP(t, '=')); targets.push(vt.v.toLowerCase()); exprs.push(txt(trimT(it.slice(eq + 1)))); }
      const q0 = txt(T2.slice(0, T2.indexOf(sig[k0]))) + exprs.join(', ') + ' ' + txt(T2.slice(fI));
      const q = toSqlite(subst(rt(q0), sc, ctx), ctx); R.translated.push(q);
      const r = execOne(db, q);
      if (r && r.values.length) { const row = r.values[r.values.length - 1]; targets.forEach((tn, j) => { if (!(tn in sc.vars)) throw new DErr(`Msg 137: Must declare the scalar variable "${tn}".`); sc.vars[tn].v = coerce(sc.vars[tn].type, row[j]); }); }
      sc.rowcount = r ? r.values.length : 0; return;
    }
    // INSERT INTO ... EXEC proc
    const ei = S.findIndex(t => isW(t, 'EXEC', 'EXECUTE'));
    if (isW(sig[0], 'INSERT') && ei > 0) {
      const sub = { sets: [] }; const keep = R.sets; R.sets = sub.sets; doExec(S.slice(ei), sc, ctx); R.sets = keep;
      const last = sub.sets[sub.sets.length - 1]; if (!last) return;
      const head = txt(S.slice(0, ei));
      for (const row of last.values) { const q = toSqlite(subst(rt(head + ' VALUES (' + row.map(lit).join(', ') + ')'), sc, ctx), ctx); db.exec(q); }
      sc.rowcount = last.values.length; if (!env.nocount) R.messages.push(`(${last.values.length} satır etkilendi)`); return;
    }
    const text = subst(S, sc, ctx);
    if (/^\s*(CREATE|DROP|ALTER)\s+SEQUENCE\b/i.test(text)) { const msg = seqDdl(text, env, 'tsql'); if (msg && msg !== 'skip') R.messages.push(msg); return; }
    if (/\bNEXT\s+VALUE\s+FOR\b/i.test(text) && /\b(TOP|OFFSET)\b/i.test(text)) throw new DErr('Msg 11739, Level 15: NEXT VALUE FOR function cannot be used if ROWCOUNT option has been set, or the query contains TOP or OFFSET.', 'NEXT VALUE FOR, TOP veya OFFSET içeren sorgularda kullanılamaz; önce satırları geçici tabloya al ya da WHERE ile süz.');
    if (/\bWHERE\s+CURRENT\s+OF\b/i.test(text)) throw new DErr('WHERE CURRENT OF bu taklit katmanında desteklenmiyor.', 'İmleçten okuduğun anahtar değeriyle güncelle: UPDATE ... WHERE id = @id');
    { const m = text.match(/^\s*DROP\s+(PROC|PROCEDURE|FUNCTION)\s+(IF\s+EXISTS\s+)?(?:dbo\s*\.\s*)?\[?(\w+)\]?/i); if (m) { const nm = m[3].toLowerCase(); const had = env.procs[nm] || env.tvfs[nm] || env.funcs[nm.toUpperCase()]; delete env.procs[nm]; delete env.tvfs[nm]; delete env.funcs[nm.toUpperCase()]; if (!had && !m[2]) throw new DErr(`Msg 3701, Level 11: Cannot drop the ${m[1].toLowerCase().startsWith('f') ? 'function' : 'procedure'} '${m[3]}', because it does not exist or you do not have permission.`); return; } }
    { const m = text.match(/^\s*(CREATE\s+OR\s+ALTER|ALTER)\s+VIEW\s+(?:dbo\s*\.\s*)?(\w+)/i); if (m) { db.exec(`DROP VIEW IF EXISTS ${m[2]}`); const q = toSqlite(text.replace(/^\s*(CREATE\s+OR\s+ALTER|ALTER)\s+VIEW/i, 'CREATE VIEW'), ctx); R.translated.push(q); db.exec(q); R.messages.push('Komutlar başarıyla tamamlandı.'); return; } }
    if (/^\s*MERGE\b/i.test(text) || (/^\s*WITH\b/i.test(text) && (() => { const TT = rt(text); const DD = depthAt(TT); return TT.some((t, z) => DD[z] === 0 && isW(t, 'MERGE')); })())) return doMerge(text, sc, ctx);
    if (/^\s*(BEGIN)\s+(TRAN|TRANSACTION)\b/i.test(text)) { if (env.tran === 0) db.exec('BEGIN TRANSACTION'); env.tran++; return; }
    if (/^\s*COMMIT\b/i.test(text)) { if (env.tran === 0) throw new DErr('Msg 3902, Level 16: The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION.'); env.tran--; if (env.tran === 0) db.exec('COMMIT'); return; }
    if (/^\s*ROLLBACK\b/i.test(text)) { const m = text.match(/^\s*ROLLBACK\s+(?:TRAN|TRANSACTION)\s+(\w+)/i); if (m && env.saves && env.saves.includes(m[1].toLowerCase())) { db.exec('ROLLBACK TO ' + m[1]); return; } if (env.tran === 0) throw new DErr('Msg 3903, Level 16: The ROLLBACK TRANSACTION request has no corresponding BEGIN TRANSACTION.'); env.tran = 0; db.exec('ROLLBACK'); return; }
    if (/^\s*SAVE\s+(TRAN|TRANSACTION)\s+(\w+)/i.test(text)) { const m = text.match(/(\w+)\s*$/); (env.saves = env.saves || []).push(m[1].toLowerCase()); db.exec('SAVEPOINT ' + m[1]); return; }
    if (/^\s*TRUNCATE\s+TABLE\s+/i.test(text)) { const q = toSqlite(text.replace(/^\s*TRUNCATE\s+TABLE/i, 'DELETE FROM'), ctx); db.exec(q); return; }
    for (const part of splitSemis(text)) {
      const q = toSqlite(part, ctx); R.translated.push(q);
      const isSel = /^\s*(WITH|SELECT|VALUES)\b/i.test(q) || /\bRETURNING\b/i.test(q);
      const before = db.getRowsModified ? null : null; void before;
      const res = execOne(db, q);
      if (res) { R.sets.push(res); sc.rowcount = res.values.length; }
      if (!isSel || /\bRETURNING\b/i.test(q)) { const ch = db.getRowsModified(); if (/^\s*(INSERT|UPDATE|DELETE|CREATE\s+TABLE\s+\S+\s+AS)/i.test(q)) { const n = /^\s*CREATE/i.test(q) ? (execOne(db, 'SELECT COUNT(*) FROM ' + q.match(/CREATE\s+TABLE\s+(\S+)/i)[1]).values[0][0]) : ch; sc.rowcount = n; R.changes += n; if (!env.nocount) R.messages.push(`(${n} satır etkilendi)`); } }
    }
  }
  function doMerge(text, sc, ctx) {
    let total = 0; let prefix = '';
    { const TT = rt(text); const DD = depthAt(TT); const mi = TT.findIndex((t, z) => DD[z] === 0 && isW(t, 'MERGE')); if (mi > 0) { prefix = txt(TT.slice(0, mi)); text = txt(TT.slice(mi)); } }
    for (const q00 of mergeToSql(text)) { const q0 = prefix + q00; const qq = toSqlite(q0, ctx); R.translated.push(qq); db.exec(qq); total += db.getRowsModified(); }
    sc.rowcount = total; if (!env.nocount) R.messages.push(`(${total} satır etkilendi)`);
  }
  function parseParams(T2, from, to) {
    const out = []; let toks = trimT(T2.slice(from, to)); if (isP(toks[0], '(') && closeP(toks, 0) === toks.length - 1) toks = trimT(toks.slice(1, -1));
    if (!toks.length) return out;
    for (const p of splitTop(toks, ',')) { const P = trimT(p); const ps = P.filter(sigk); if (!ps.length) continue; const eq = P.findIndex(t => isP(t, '=')); const outp = ps.some(t => isW(t, 'OUTPUT', 'OUT')); const typeEnd = eq >= 0 ? eq : (outp ? P.findIndex(t => isW(t, 'OUTPUT', 'OUT')) : P.length); out.push({ name: ps[0].v.toLowerCase(), type: txt(P.slice(P.indexOf(ps[1]) >= 0 ? P.indexOf(ps[1]) : 1, typeEnd)).trim().replace(/^AS\s+/i, ''), def: eq >= 0 ? txt(P.slice(eq + 1)).replace(/\b(OUTPUT|OUT|READONLY)\b/gi, '').trim() : undefined, out: outp }); }
    return out;
  }
  function doCreateProc(S) {
    const sig = S.filter(sigk); let k = 1; if (isW(sig[1], 'OR')) k = 3; const nameI = S.indexOf(sig[k + 1]); let ne = nameI; while (isP(S[nx(S, ne)], '.')) ne = nx(S, nx(S, ne));
    const name = S[ne].v.replace(/^\[|\]$/g, '').toLowerCase(); const asI = S.findIndex((t, z) => z > ne && isW(t, 'AS') && depthAt(S)[z] === 0);
    const params = parseParams(S, ne + 1, asI);
    const bodyToks = S.slice(asI + 1);
    env.procs[name] = { params, nodes: parseTsql(splitTsql(bodyToks)) };
    R.messages.push('Komutlar başarıyla tamamlandı. (Prosedür oluşturuldu: ' + S[ne].v + ')');
  }
  function doCreateFunc(S) {
    const sig = S.filter(sigk); let k = 1; if (isW(sig[1], 'OR')) k = 3; const nameI = S.indexOf(sig[k + 1]); let ne = nameI; while (isP(S[nx(S, ne)], '.')) ne = nx(S, nx(S, ne));
    const name = S[ne].v.replace(/^\[|\]$/g, ''); const o = nx(S, ne); const c = closeP(S, o);
    const params = parseParams(S, o, c + 1);
    const ri = S.findIndex((t, z) => z > c && isW(t, 'RETURNS')); const asI = S.findIndex((t, z) => z > ri && isW(t, 'AS') && depthAt(S)[z] === 0);
    const retType = txt(S.slice(nx(S, ri), asI)).replace(/\bWITH\s+\w+/i, '').trim();
    const body = trimT(S.slice(asI + 1));
    if (/^TABLE$/i.test(retType)) {
      let b = body.filter(() => true); const bs = b.filter(sigk); if (isW(bs[0], 'RETURN')) b = trimT(b.slice(b.indexOf(bs[0]) + 1)); if (isP(b[0], '(') && closeP(b, 0) === b.length - 1 - (isP(b[b.length - 1], ';') ? 1 : 0)) b = b.slice(1, closeP(b, 0));
      env.tvfs[name.toLowerCase()] = { params, body: txt(b).trim().replace(/;\s*$/, '') };
      R.messages.push('Komutlar başarıyla tamamlandı. (Tablo değerli fonksiyon oluşturuldu: ' + name + ')'); return;
    }
    const nodes = parseTsql(splitTsql(body));
    const sqlName = 'udf_' + name.toLowerCase();
    const fn = function () { const args = arguments; const sc2 = { vars: {}, tables: {}, rowcount: 0 }; params.forEach((p, z) => { sc2.vars[p.name] = { type: p.type, v: coerce(p.type, args[z] === undefined ? null : args[z]) }; }); try { execNodes(nodes, sc2, null); } catch (s) { if (s instanceof Signal && s.kind === 'return') return coerce(retType, s.val); throw s; } return null; };
    Object.defineProperty(fn, 'length', { value: params.length });
    db.create_function(sqlName, fn);
    env.funcs[name.toUpperCase()] = { sqlName };
    R.messages.push('Komutlar başarıyla tamamlandı. (Skaler fonksiyon oluşturuldu: dbo.' + name + ')');
  }
  function doCreateTrigger(S, ctx) {
    const sig = S.filter(sigk); let k = 1; if (isW(sig[1], 'OR')) k = 3;
    const nameT = sig[k + 1]; let z = S.indexOf(nameT); while (isP(S[nx(S, z)], '.')) z = nx(S, nx(S, z)); const tname = S[z].v.replace(/^\[|\]$/g, '');
    const onI = S.findIndex((t, q) => q > z && isW(t, 'ON')); let tb = nx(S, onI); while (isP(S[nx(S, tb)], '.')) tb = nx(S, nx(S, tb)); const table = S[tb].v.replace(/^\[|\]$/g, '');
    const asI = S.findIndex((t, q) => q > tb && isW(t, 'AS')); const evs = S.slice(tb + 1, asI).filter(sigk).map(t => t.u);
    if (evs.includes('INSTEAD')) throw new DErr('INSTEAD OF tetikleyiciler bu tarayıcı motorunda desteklenmiyor.', 'AFTER tetikleyici kullan.');
    const events = evs.filter(e => ['INSERT', 'UPDATE', 'DELETE'].includes(e));
    let body = trimT(S.slice(asI + 1)); while (body.length && isP(body.filter(sigk).slice(-1)[0], ';')) body = trimT(body.slice(0, body.lastIndexOf(body.filter(sigk).slice(-1)[0]))); const bs = body.filter(sigk); if (isW(bs[0], 'BEGIN') && isW(bs[bs.length - 1], 'END')) body = trimT(body.slice(body.indexOf(bs[0]) + 1, body.lastIndexOf(bs[bs.length - 1])));
    const cols = execOne(db, `SELECT name FROM pragma_table_info('${table}')`).values.map(r => r[0]);
    const pseudo = (which) => '(SELECT ' + cols.map(c => `${which}."${c}" AS "${c}"`).join(', ') + ')';
    const stmts = parseTsql(splitTsql(body)).filter(n => !(n.t === 'noop'));
    if (stmts.some(n => n.t !== 'sql')) throw new DErr('Tetikleyici gövdesinde yalnızca SQL ifadeleri destekleniyor (IF/PRINT gibi akış komutları değil).');
    for (const ev of events) {
      const parts = stmts.map(n => { let s = txt(trimT(n.S)).replace(/;\s*$/, ''); s = s.replace(/\binserted\b/gi, ev === 'DELETE' ? pseudo('OLD') : pseudo('NEW')).replace(/\bdeleted\b/gi, pseudo('OLD')); return toSqlite(s, ctx); });
      const q = `CREATE TRIGGER "${tname}_${ev.toLowerCase()}" AFTER ${ev} ON ${table} FOR EACH ROW BEGIN ${parts.join('; ')}; END`;
      R.translated.push(q); db.exec(q);
    }
    R.messages.push('Komutlar başarıyla tamamlandı. (Tetikleyici oluşturuldu: ' + tname + ')');
  }
  function doExec(S0, sc, ctx) {
    let S = trimT(S0.slice(S0.findIndex(t => isW(t, 'EXEC', 'EXECUTE')) + 1)); if (isP(S[S.length - 1], ';')) S = trimT(S.slice(0, -1));
    const sig = S.filter(sigk);
    if (isP(sig[0], '(')) { const v = evalExpr(trimT(S.slice(1, closeP(S, S.indexOf(sig[0])))), sc, ctx); return runBatch(String(v), {}, ctx); }
    let k = 0; let retVar = null; if (sig[0].k === 'var' && isP(sig[1], '=')) { retVar = sig[0].v.toLowerCase(); k = 2; }
    let ni = S.indexOf(sig[k]); let ne = ni; while (isP(S[nx(S, ne)], '.')) ne = nx(S, nx(S, ne));
    const name = S[ne].v.replace(/^\[|\]$/g, '').toLowerCase();
    const argToks = trimT(S.slice(ne + 1)); const args = argToks.length ? splitTop(argToks, ',').map(trimT) : [];
    const parsed = args.map(a => { const as = a.filter(sigk); const outp = as.some(t => isW(t, 'OUTPUT', 'OUT')); let a2 = a.filter(t => !isW(t, 'OUTPUT', 'OUT')); if (as[0] && as[0].k === 'var' && isP(as[1], '=')) { return { name: as[0].v.toLowerCase(), expr: trimT(a2.slice(a2.indexOf(as[1]) + 1)), out: outp }; } return { name: null, expr: trimT(a2), out: outp }; });
    if (name === 'sp_executesql') {
      const sqlText = String(evalExpr(parsed[0].expr, sc, ctx));
      const defs = parsed[1] ? String(evalExpr(parsed[1].expr, sc, ctx)) : '';
      const pdefs = defs ? parseParams(rt(defs), 0, rt(defs).length) : [];
      const vals = {}; pdefs.forEach((p, z) => { const a = parsed.slice(2).find(x => x.name === p.name) || parsed[2 + z]; vals[p.name] = { type: p.type, v: a ? coerce(p.type, evalExpr(a.expr, sc, ctx)) : null }; });
      return runBatch(sqlText, vals, ctx);
    }
    if (name === 'sp_help' || name === 'sp_columns') {
      const t = String(evalExpr(parsed[0].expr, sc, ctx)).replace(/^dbo\./i, '');
      const r = execOne(db, `SELECT name AS Column_name, tsqltype_(type) AS Type, CASE "notnull" WHEN 1 THEN 'no' ELSE 'yes' END AS Nullable, CASE pk WHEN 0 THEN '' ELSE 'PK' END AS [Key] FROM pragma_table_info('${t.replace(/'/g, "''")}')`);
      if (!r || !r.values.length) throw new DErr(`Msg 15009, Level 16: The object '${t}' does not exist in database 'anadolu'.`);
      R.sets.push(r); return;
    }
    if (name === 'sp_rename') {
      const a = parsed.map(p => String(evalExpr(p.expr, sc, ctx)));
      if ((a[2] || '').toUpperCase() === 'COLUMN') { const [tb, col] = a[0].split('.'); db.exec(`ALTER TABLE ${tb} RENAME COLUMN ${col} TO ${a[1]}`); }
      else db.exec(`ALTER TABLE ${a[0]} RENAME TO ${a[1]}`);
      R.messages.push('Uyarı: Bir nesne adının herhangi bir parçasını değiştirmek betikleri ve saklı yordamları bozabilir.'); return;
    }
    if (name === 'sp_helpindex') {
      const t = String(evalExpr(parsed[0].expr, sc, ctx)).replace(/^dbo\./i, '').replace(/'/g, "''");
      const r = execOne(db, `SELECT il.name AS index_name, CASE WHEN il."unique" = 1 THEN 'nonclustered, unique' ELSE 'nonclustered' END AS index_description, (SELECT group_concat(ii.name, ', ') FROM pragma_index_info(il.name) ii) AS index_keys FROM pragma_index_list('${t}') il WHERE il.origin = 'c'`);
      if (!r || !r.values.length) { R.messages.push(`The object '${t}' does not have any indexes, or you do not have permissions.`); return; }
      R.sets.push(r); return;
    }
    if (name === 'sp_tables') { R.sets.push(execOne(db, "SELECT 'anadolu' AS TABLE_QUALIFIER, 'dbo' AS TABLE_OWNER, name AS TABLE_NAME, ascii_upper_(type) AS TABLE_TYPE FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")); return; }
    const pr = env.procs[name];
    if (!pr) throw new DErr(`Msg 2812, Level 16: Could not find stored procedure '${S[ne].v}'.`, 'Prosedürü önce CREATE PROCEDURE ile aynı çalıştırmada oluştur.');
    const sc2 = { vars: {}, tables: Object.assign({}, sc.tables), rowcount: 0 };
    pr.params.forEach((p, z) => { const a = parsed.find(x => x.name === p.name) || (parsed[z] && !parsed[z].name ? parsed[z] : null); let v = null; if (a) v = evalExpr(a.expr, sc, ctx); else if (p.def !== undefined) v = evalExpr(rt(p.def), sc, ctx); else throw new DErr(`Msg 201, Level 16: Procedure or function '${S[ne].v}' expects parameter '${p.name}', which was not supplied.`); sc2.vars[p.name] = { type: p.type, v: coerce(p.type, v) }; });
    let ret = 0;
    try { execNodes(pr.nodes, sc2, null); } catch (s) { if (s instanceof Signal && s.kind === 'return') ret = s.val; else throw s; }
    pr.params.forEach((p, z) => { if (!p.out) return; const a = parsed.find(x => x.name === p.name) || (parsed[z] && !parsed[z].name ? parsed[z] : null); if (a && a.out) { const vt = a.expr.find(sigk); if (vt && vt.k === 'var') sc.vars[vt.v.toLowerCase()].v = sc2.vars[p.name].v; } });
    if (retVar) sc.vars[retVar].v = ret;
  }
  function doCursor(kind, S0, sc, ctx) {
    let S = trimT(S0); if (isP(S[S.length - 1], ';')) S = trimT(S.slice(0, -1));
    const sig = S.filter(sigk); env.cursors = env.cursors || {};
    let k = 1, dir = 'NEXT', n = null;
    if (kind === 'cfetch') {
      if (isW(sig[1], 'NEXT', 'PRIOR', 'FIRST', 'LAST')) { dir = sig[1].u; k = 2; }
      else if (isW(sig[1], 'ABSOLUTE', 'RELATIVE')) { dir = sig[1].u; const ve = sig[2]; n = Number(ve.k === 'var' ? (sc.vars[ve.v.toLowerCase()] || {}).v : ve.v); k = 3; }
      if (isW(sig[k], 'FROM')) k++;
    }
    if (isW(sig[k], 'GLOBAL')) k++;
    const ct = sig[k]; if (!ct) throw new DErr('İmleç adı bekleniyordu.');
    const nm = ct.v.replace(/^\[|\]$/g, '').toLowerCase(); const c = env.cursors[nm];
    if (!c) throw new DErr(`Msg 16916, Level 16: A cursor with the name '${ct.v}' does not exist.`, 'İmleci önce DECLARE ad CURSOR FOR SELECT ... ile tanımla.');
    if (kind === 'copen') {
      if (c.rows) throw new DErr('Msg 16905, Level 16: The cursor is already open.');
      const q = toSqlite(subst(c.q, sc, ctx), ctx); R.translated.push(q);
      const r = execOne(db, q); c.rows = r ? r.values : []; c.cols = r ? r.columns : []; c.pos = -1; env.cursorRows = c.rows.length; return;
    }
    if (kind === 'cdealloc') { delete env.cursors[nm]; return; }
    if (!c.rows) throw new DErr('Msg 16917, Level 16: Cursor is not open.', 'FETCH/CLOSE öncesinde OPEN ' + ct.v + ' çalıştır.');
    if (kind === 'cclose') { c.rows = null; return; }
    if (dir !== 'NEXT' && !c.scroll) throw new DErr(`Msg 16911, Level 16: fetch: The fetch type ${dir} cannot be used with forward only cursors.`, 'Bu yönler için imleci SCROLL veya STATIC olarak tanımla.');
    const L = c.rows.length;
    if (dir === 'NEXT') c.pos = Math.min(c.pos + 1, L); else if (dir === 'PRIOR') c.pos = Math.max(c.pos - 1, -1); else if (dir === 'FIRST') c.pos = L ? 0 : -1; else if (dir === 'LAST') c.pos = L - 1; else if (dir === 'ABSOLUTE') c.pos = n > 0 ? n - 1 : L + n; else if (dir === 'RELATIVE') c.pos = c.pos + n;
    const ok = c.pos >= 0 && c.pos < L; env.fetchStatus = ok ? 0 : -1;
    const ii = S.findIndex(t => isW(t, 'INTO'));
    if (ii >= 0) {
      const vs = splitTop(trimT(S.slice(ii + 1)), ',').map(x => x.find(sigk));
      if (ok && vs.length !== c.cols.length) throw new DErr('Msg 16924, Level 16: Cursorfetch: The number of variables declared in the INTO list must match that of selected columns.');
      if (ok) vs.forEach((vt, z) => { const vn = vt.v.toLowerCase(); if (!(vn in sc.vars)) throw new DErr(`Msg 137, Level 15: Must declare the scalar variable "${vt.v}".`); sc.vars[vn].v = coerce(sc.vars[vn].type, c.rows[c.pos][z]); });
    } else if (ok) R.sets.push({ columns: c.cols.slice(), values: [c.rows[c.pos].slice()] });
  }
  function runBatch(text, vars, ctx) {
    const sc2 = { vars: Object.assign({}, vars), tables: {}, rowcount: 0 };
    const nodes2 = parseTsql(splitTsql(tokenize(text)));
    try { execNodes(nodes2, sc2, ctx); } catch (s) { if (!(s instanceof Signal)) throw s; }
  }
}
function errOut(e, d) { if (e instanceof Signal) return null; if (e && e.tsql) return { message: `Msg ${e.tsql.number}, Level ${e.tsql.severity || 16}, State 1: ${e.tsql.message}`, hint: '' }; return friendly(e, d); }

function seqDdl(text, env, d) {
  const s = String(text).replace(/^(\s|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, '').replace(/;\s*$/, '').trim(); let m;
  env.seqs = env.seqs || {};
  const okMsg = d === 'tsql' ? 'Komutlar başarıyla tamamlandı.' : d === 'pg' ? 'CREATE SEQUENCE' : 'Sequence created.';
  if ((m = s.match(/^CREATE\s+SEQUENCE\s+(IF\s+NOT\s+EXISTS\s+)?(?:\w+\s*\.\s*)?["\[]?(\w+)["\]]?([\s\S]*)$/i))) {
    const nm = m[2].toLowerCase(), o = m[3];
    if (env.seqs[nm]) { if (m[1]) return 'skip'; throw new DErr(d === 'tsql' ? `Msg 2714, Level 16: There is already an object named '${m[2]}' in the database.` : d === 'pg' ? `ERROR: relation "${nm}" already exists` : 'ORA-00955: name is already used by an existing object'); }
    const num = re => { const x = o.match(re); return x ? Number(x[1]) : null; };
    const inc = num(/\bINCREMENT\s+(?:BY\s+)?(-?\d+)/i) ?? 1;
    const typ = ((o.match(/\bAS\s+(\w+)/i) || [])[1] || 'BIGINT').toUpperCase();
    const tmin = { TINYINT: 0, SMALLINT: -32768, INT: -2147483648, INTEGER: -2147483648, BIGINT: -9223372036854775808 }[typ];
    const tmax = { TINYINT: 255, SMALLINT: 32767, INT: 2147483647, INTEGER: 2147483647 }[typ] ?? null;
    const min = num(/\bMINVALUE\s+(-?\d+)/i) ?? (d === 'tsql' ? (tmin ?? null) : (inc > 0 ? 1 : null));
    const max = num(/\bMAXVALUE\s+(-?\d+)/i) ?? (d === 'tsql' ? tmax : null);
    let start = num(/\bSTART\s+(?:WITH\s+)?(-?\d+)/i); let warn = '';
    if (start === null) { start = inc > 0 ? (min ?? 1) : (max ?? -1); if (d === 'tsql') warn = `\nNot: START WITH yazılmadığı için sıra ${typ} tipinin en küçük değerinden (${start}) başlar. Gerçek projelerde START WITH 1 yazmayı unutma.`; }
    env.seqs[nm] = { start, inc, min, max, cycle: /\bCYCLE\b/i.test(o) && !/\bNO\s*CYCLE\b/i.test(o), cur: null };
    return okMsg + warn;
  }
  if ((m = s.match(/^DROP\s+SEQUENCE\s+(IF\s+EXISTS\s+)?(?:\w+\s*\.\s*)?["\[]?(\w+)["\]]?$/i))) {
    const nm = m[2].toLowerCase(); if (!env.seqs[nm]) { if (m[1]) return 'skip'; throw new DErr(d === 'tsql' ? `Msg 3701, Level 11: Cannot drop the sequence '${m[2]}', because it does not exist or you do not have permission.` : d === 'pg' ? `ERROR: sequence "${nm}" does not exist` : 'ORA-02289: sequence does not exist'); }
    delete env.seqs[nm]; return d === 'tsql' ? okMsg : d === 'pg' ? 'DROP SEQUENCE' : 'Sequence dropped.';
  }
  if ((m = s.match(/^ALTER\s+SEQUENCE\s+(?:\w+\s*\.\s*)?["\[]?(\w+)["\]]?\s+RESTART(?:\s+(?:WITH\s+)?(-?\d+))?/i))) {
    const q = env.seqs[m[1].toLowerCase()]; if (!q) throw new DErr(d === 'tsql' ? `Msg 15151: Cannot find the object '${m[1]}'.` : 'sequence does not exist');
    if (m[2] !== undefined) q.start = Number(m[2]); q.cur = null; return d === 'tsql' ? okMsg : d === 'pg' ? 'ALTER SEQUENCE' : 'Sequence altered.';
  }
  return null;
}
function bindSeq(db, env, d) {
  const get = n => { const s = env.seqs[String(n).toLowerCase().replace(/^.*\./, '')]; if (!s) fnErr(d === 'tsql' ? `Msg 208, Level 16: Invalid object name '${n}'.` : d === 'pg' ? `ERROR: relation "${n}" does not exist` : d === 'oracle' ? 'ORA-02289: sequence does not exist' : 'no such sequence: ' + n); return s; };
  db.create_function('seq_next_', n => { const s = get(n); let v = s.cur === null ? s.start : s.cur + s.inc; if ((s.max !== null && v > s.max) || (s.min !== null && v < s.min)) { if (!s.cycle) return fnErr(d === 'tsql' ? `Msg 11728, Level 16: The sequence object '${n}' has reached its minimum or maximum value. Restart the sequence object to allow new values to be generated.` : d === 'pg' ? `ERROR: nextval: reached maximum value of sequence "${n}"` : `ORA-08004: sequence ${String(n).toUpperCase()}.NEXTVAL exceeds MAXVALUE and cannot be instantiated`); v = s.inc > 0 ? s.min : s.max; } s.cur = v; return v; });
  db.create_function('seq_curr_', n => { const s = get(n); if (s.cur === null) return fnErr(d === 'pg' ? `ERROR: currval of sequence "${n}" is not yet defined in this session` : `ORA-08002: sequence ${String(n).toUpperCase()}.CURRVAL is not yet defined in this session`); return s.cur; });
  db.create_function('seq_set_', (n, v) => { const s = get(n); s.cur = Number(v); return s.cur; });
}
function runDialect(db, sql, d, opt) {
  opt = opt || {};
  const env0 = opt.env || (opt.env = { procs: {}, funcs: {}, tvfs: {}, tran: 0, nocount: false }); env0.seqs = env0.seqs || {}; env0.fetchStatus = -1;
  if (d !== 'sqlite') bindSeq(db, env0, d);
  if (d === 'oracle') oracleBlankToNull(db);
  LINT_DB = db;
  /* LIKE: PostgreSQL, Oracle ve BigQuery'de büyük/küçük harf duyarlıdır */
  try { db.run('PRAGMA case_sensitive_like=' + (d === 'pg' || d === 'oracle' || d === 'bq' ? 'ON' : 'OFF')); } catch (e) { /* yok */ }
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const res = { sets: [], messages: [], changes: 0, translated: [], d };
  try {
    if (d === 'tsql') {
      const r = tsqlRunChecked(db, sql, opt);
      Object.assign(res, r);
    } else {
      const le = lint(sql, d); if (le) throw le;
      const parts = splitSemis(sql);
      let autoTx = false;
      const hd = p => p.replace(/^(\s|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, '');
      if (d === 'oracle' && parts.some(p => /^(INSERT|UPDATE|DELETE|MERGE)\b/i.test(hd(p))) && parts.some(p => /^(ROLLBACK|COMMIT)\b/i.test(hd(p)))) { db.exec('BEGIN TRANSACTION'); autoTx = true; }
      for (const p0 of parts) {
        const p = hd(p0);
        if (autoTx && /^\s*(CREATE|DROP|ALTER|TRUNCATE)\b/i.test(p)) { db.exec('COMMIT'); }
        if (d === 'oracle' && /^\s*ROLLBACK\s+TO\s+(SAVEPOINT\s+)?\w+/i.test(p)) { const sp = p.trim().match(/^ROLLBACK\s+TO\s+(?:SAVEPOINT\s+)?(\w+)/i)[1]; if (autoTx) db.exec('ROLLBACK TO ' + sp); continue; }
        if (d === 'oracle' && /^\s*(COMMIT|ROLLBACK)\b/i.test(p)) { if (autoTx) { db.exec(p.trim().split(/\s+/)[0].toUpperCase()); db.exec('BEGIN TRANSACTION'); } continue; }
        if (d !== 'sqlite' && /^(CREATE|DROP|ALTER)\s+SEQUENCE\b/i.test(p)) { const msg = seqDdl(p, env0, d); if (msg && msg !== 'skip') res.messages.push(msg); continue; }
        if (d === 'bq' && /^CREATE\s+OR\s+REPLACE/i.test(p)) { const m = p.match(/^CREATE\s+OR\s+REPLACE\s+(TEMP\s+|TEMPORARY\s+)?(TABLE|VIEW)\s+(`[^`]+`|[\w.]+)/i); if (m) { const nm = m[3].replace(/`/g, '').split('.').pop(); db.exec(`DROP ${m[2].toUpperCase()} IF EXISTS "${nm}"`); } }
        if ((d === 'oracle' || d === 'bq') && /^MERGE\b/i.test(p)) { let n = 0; for (const m0 of mergeToSql(p)) { const qq = reverse(m0, d, db); res.translated.push(qq); db.exec(qq); n += db.getRowsModified(); } res.messages.push(`(${n} satır birleştirildi)`); continue; }
        const q = reverse(p, d, db); res.translated.push(q);
        const r = execOne(db, q);
        if (r) res.sets.push(r);
        if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(q)) { const n = db.getRowsModified(); res.changes += n; res.messages.push(`(${n} satır etkilendi)`); }
        if (autoTx && /^\s*(CREATE|DROP|ALTER)\b/i.test(p)) db.exec('BEGIN TRANSACTION');
      }
      if (autoTx) { try { db.exec('COMMIT'); } catch (er) { /* yok */ } }
    }
    if (d === 'tsql') { const L = lintTsqlPost(sql); if (L) throw L; }
  } catch (e) {
    const f = errOut(e, d); if (f) { res.error = f.message; res.hint = f.hint; }
    if (d !== 'sqlite' && res.error) { /* yarım kalan işlemi kapat */ try { db.exec('ROLLBACK'); } catch (er) { /* yok */ } }
  }
  res.ms = Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0);
  headerize(res.sets, d);
  return res;
}
function lintTsqlPost() { return null; }
/* Oracle boş metni ('') NULL olarak saklar: örnek verideki boş metinleri bir kez NULL'a çevir */
function oracleBlankToNull(db) {
  if (db.__oraBlank) return; db.__oraBlank = true;
  try {
    const tabs = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    for (const [t] of (tabs[0] ? tabs[0].values : [])) {
      const cols = db.exec('PRAGMA table_info("' + t + '")');
      for (const c of (cols[0] ? cols[0].values : [])) {
        if (c[3]) continue; /* NOT NULL sütunlara dokunma */
        try { db.exec('UPDATE "' + t + '" SET "' + c[1] + '" = NULL WHERE "' + c[1] + '" = \'\''); } catch (er) { /* yok say */ }
      }
    }
  } catch (er) { /* yok say */ }
}

/* T-SQL modunda ön denetim (yorumlayıcıdan önce) */
const _tsqlRun = tsqlRun;
function tsqlRunChecked(db, sql, opt) { const le = lint(sql, 'tsql'); if (le) throw le; return _tsqlRun(db, sql, opt); }

/* ------------------------------------------------------------------ SQLite'a eklenen yardımcı fonksiyonlar */
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function pd(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/))) return { y: +m[1], mo: +m[2], d: +m[3], H: +(m[4] || 0), Mi: +(m[5] || 0), S: +(m[6] || 0), t: !!m[4] };
  if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) return { y: +m[3], mo: +m[2], d: +m[1], H: 0, Mi: 0, S: 0, t: false };
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return { y: +m[1], mo: +m[2], d: +m[3], H: 0, Mi: 0, S: 0, t: false };
  return null;
}
const p2 = n => String(n).padStart(2, '0');
const D = p => new Date(Date.UTC(p.y, p.mo - 1, p.d, p.H, p.Mi, p.S));
const fmtD = (dt, t) => dt.getUTCFullYear() + '-' + p2(dt.getUTCMonth() + 1) + '-' + p2(dt.getUTCDate()) + (t ? ' ' + p2(dt.getUTCHours()) + ':' + p2(dt.getUTCMinutes()) + ':' + p2(dt.getUTCSeconds()) : '');
const dayNum = p => Math.floor(Date.UTC(p.y, p.mo - 1, p.d) / 86400000);
function addMonths(p, n) { const tot = p.y * 12 + (p.mo - 1) + n; const y = Math.floor(tot / 12), mo = tot - y * 12 + 1; const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return Object.assign({}, p, { y, mo, d: Math.min(p.d, last) }); }
function dateadd(pt, n, v) {
  const p = pd(v); if (!p || n === null) return null; n = Math.trunc(Number(n));
  let r;
  switch (pt) {
    case 'year': r = addMonths(p, 12 * n); break; case 'quarter': r = addMonths(p, 3 * n); break; case 'month': r = addMonths(p, n); break;
    case 'week': r = D(p); r = new Date(r.getTime() + 7 * n * 86400000); return fmtD(r, p.t);
    case 'day': case 'dayofyear': case 'weekday': r = new Date(D(p).getTime() + n * 86400000); return fmtD(r, p.t);
    case 'hour': return fmtD(new Date(D(p).getTime() + n * 3600000), true);
    case 'minute': return fmtD(new Date(D(p).getTime() + n * 60000), true);
    case 'second': return fmtD(new Date(D(p).getTime() + n * 1000), true);
    default: return null;
  }
  return fmtD(D(r), p.t);
}
function datediff(pt, a, b) {
  const A = pd(a), B = pd(b); if (!A || !B) return null;
  switch (pt) {
    case 'year': return B.y - A.y;
    case 'quarter': return (B.y * 4 + Math.floor((B.mo - 1) / 3)) - (A.y * 4 + Math.floor((A.mo - 1) / 3));
    case 'month': return (B.y * 12 + B.mo) - (A.y * 12 + A.mo);
    case 'day': case 'dayofyear': case 'weekday': return dayNum(B) - dayNum(A);
    case 'week': return Math.floor((dayNum(B) + 4) / 7) - Math.floor((dayNum(A) + 4) / 7);
    case 'hour': return Math.floor(D(B).getTime() / 3600000) - Math.floor(D(A).getTime() / 3600000);
    case 'minute': return Math.floor(D(B).getTime() / 60000) - Math.floor(D(A).getTime() / 60000);
    case 'second': return Math.round((D(B).getTime() - D(A).getTime()) / 1000);
  }
  return null;
}
function datepart(pt, v) {
  const p = pd(v); if (!p) return null; const dt = D(p);
  const doy = dayNum(p) - dayNum({ y: p.y, mo: 1, d: 1 }) + 1; const dow = dt.getUTCDay();
  switch (pt) {
    case 'year': return p.y; case 'quarter': return Math.floor((p.mo - 1) / 3) + 1; case 'month': return p.mo; case 'day': return p.d;
    case 'dayofyear': return doy; case 'weekday': return dow + 1; case 'dow': return dow; case 'isodow': return dow === 0 ? 7 : dow;
    case 'week': { const j1 = new Date(Date.UTC(p.y, 0, 1)).getUTCDay(); return Math.floor((doy - 1 + j1) / 7) + 1; }
    case 'isoweek': { const t = new Date(Date.UTC(p.y, p.mo - 1, p.d)); const dn = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - dn + 3); const fy = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - fy) / 86400000 - 3 + ((fy.getUTCDay() + 6) % 7)) / 7); }
    case 'hour': return p.H; case 'minute': return p.Mi; case 'second': return p.S;
  }
  return null;
}
function datetrunc(pt, v) {
  const p = pd(v); if (!p) return null; pt = part(pt);
  switch (pt) {
    case 'year': return `${p.y}-01-01`; case 'quarter': return `${p.y}-${p2(Math.floor((p.mo - 1) / 3) * 3 + 1)}-01`; case 'month': return `${p.y}-${p2(p.mo)}-01`;
    case 'week': { const dt = D(Object.assign({}, p, { H: 0, Mi: 0, S: 0 })); return fmtD(new Date(dt.getTime() - dt.getUTCDay() * 86400000), false); }
    case 'day': return `${p.y}-${p2(p.mo)}-${p2(p.d)}`;
    case 'hour': return `${p.y}-${p2(p.mo)}-${p2(p.d)} ${p2(p.H)}:00:00`;
  }
  return v;
}
const INTL = {};
function intlF(loc, kind, style) { const k = loc + kind + style; return INTL[k] || (INTL[k] = new Intl.DateTimeFormat(loc, { [kind]: style, timeZone: 'UTC' })); }
function dnetFormat(v, f, culture) {
  if (v === null || v === undefined || f === null) return null;
  const p = pd(v); const num = typeof v === 'number' || (/^-?\d+(\.\d+)?$/.test(String(v)) && !p);
  const loc = culture || 'en-US';
  if (num || /^[NCPFD]\d*$/i.test(f)) {
    const n = Number(v); const m = f.match(/^([NCPFD])(\d*)$/i);
    if (m) { const k = m[2] === '' ? (m[1].toUpperCase() === 'D' ? 0 : 2) : +m[2]; const L = m[1].toUpperCase(); if (L === 'N') return n.toLocaleString(loc, { minimumFractionDigits: k, maximumFractionDigits: k }); if (L === 'F') return n.toFixed(k); if (L === 'D') return String(Math.trunc(n)).padStart(k, '0'); if (L === 'P') return (n * 100).toLocaleString(loc, { minimumFractionDigits: k, maximumFractionDigits: k }) + (loc.startsWith('tr') ? ' %' : '%').replace(' %', '%'); if (L === 'C') return n.toLocaleString(loc, { style: 'currency', currency: loc.startsWith('tr') ? 'TRY' : 'USD', minimumFractionDigits: k, maximumFractionDigits: k }); }
    const dec = (f.split('.')[1] || '').replace(/[^0#]/g, '').length; const grp = /,/.test(f.split('.')[0]);
    return grp ? n.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : n.toFixed(dec);
  }
  if (!p) return String(v);
  const dt = D(p);
  const mname = (style) => intlF(loc, 'month', style).format(dt);
  const dname = (style) => intlF(loc, 'weekday', style).format(dt);
  const F = { yyyy: () => p.y, yy: () => String(p.y).slice(2), MMMM: () => mname('long'), MMM: () => mname('short'), MM: () => p2(p.mo), M: () => p.mo, dddd: () => dname('long'), ddd: () => dname('short'), dd: () => p2(p.d), d: () => p.d, HH: () => p2(p.H), H: () => p.H, hh: () => p2((p.H % 12) || 12), h: () => (p.H % 12) || 12, mm: () => p2(p.Mi), ss: () => p2(p.S), tt: () => p.H < 12 ? 'AM' : 'PM' };
  return f.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|ss|tt/g, t => F[t]());
}
function oraFormat(v, f) {
  if (v === null || v === undefined) return null;
  if (f === undefined || f === null) return String(v);
  const p = pd(v);
  if (!p && !isNaN(Number(v))) { const n = Number(v); const F = f.replace(/^FM/i, ''); const dec = (F.split(/[.D]/)[1] || '').length; const grp = /[,G]/.test(F.split(/[.D]/)[0]); let s = grp ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : n.toFixed(dec); return s; }
  if (!p) return String(v);
  const dt = D(p); const dow = dt.getUTCDay();
  return f.replace(/YYYY|YY|Q|MONTH|Month|MON|Mon|MM|DDD|DD|DAY|Day|DY|Dy|D|HH24|HH12|HH|MI|SS|WW|IW|AM|PM/g, t => ({ YYYY: p.y, YY: String(p.y).slice(2), Q: Math.floor((p.mo - 1) / 3) + 1, MONTH: MONTHS_EN[p.mo - 1].toUpperCase().padEnd(9), Month: MONTHS_EN[p.mo - 1].padEnd(9), MON: MONTHS_EN[p.mo - 1].slice(0, 3).toUpperCase(), Mon: MONTHS_EN[p.mo - 1].slice(0, 3), MM: p2(p.mo), DDD: String(datepart('dayofyear', v)).padStart(3, '0'), DD: p2(p.d), DAY: DAYS_EN[dow].toUpperCase().padEnd(9), Day: DAYS_EN[dow].padEnd(9), DY: DAYS_EN[dow].slice(0, 3).toUpperCase(), Dy: DAYS_EN[dow].slice(0, 3), D: dow + 1, HH24: p2(p.H), HH12: p2((p.H % 12) || 12), HH: p2((p.H % 12) || 12), MI: p2(p.Mi), SS: p2(p.S), WW: p2(Math.floor((datepart('dayofyear', v) - 1) / 7) + 1), IW: p2(datepart('isoweek', v)), AM: p.H < 12 ? 'AM' : 'PM', PM: p.H < 12 ? 'AM' : 'PM' })[t]).replace(/^FM/, '');
}
function mysqlFormat(v, f) {
  const p = pd(v); if (!p || f === null) return null; const dt = D(p); const dow = dt.getUTCDay();
  return f.replace(/%([a-zA-Z%])/g, (m, c) => ({ Y: p.y, y: String(p.y).slice(2), m: p2(p.mo), c: p.mo, d: p2(p.d), e: p.d, H: p2(p.H), h: p2((p.H % 12) || 12), i: p2(p.Mi), s: p2(p.S), S: p2(p.S), M: MONTHS_EN[p.mo - 1], b: MONTHS_EN[p.mo - 1].slice(0, 3), W: DAYS_EN[dow], a: DAYS_EN[dow].slice(0, 3), j: String(datepart('dayofyear', v)).padStart(3, '0'), w: dow, p: p.H < 12 ? 'AM' : 'PM', u: p2(datepart('isoweek', v)), U: p2(datepart('week', v) - 1), '%': '%' })[c] ?? m);
}
function convertStyle(v, style) {
  const p = pd(v); if (!p) return v === null ? null : String(v); style = Number(style);
  switch (style) {
    case 23: case 126: return `${p.y}-${p2(p.mo)}-${p2(p.d)}`;
    case 120: case 121: return `${p.y}-${p2(p.mo)}-${p2(p.d)} ${p2(p.H)}:${p2(p.Mi)}:${p2(p.S)}`;
    case 103: return `${p2(p.d)}/${p2(p.mo)}/${p.y}`; case 104: return `${p2(p.d)}.${p2(p.mo)}.${p.y}`; case 105: return `${p2(p.d)}-${p2(p.mo)}-${p.y}`;
    case 101: return `${p2(p.mo)}/${p2(p.d)}/${p.y}`; case 112: return `${p.y}${p2(p.mo)}${p2(p.d)}`; case 108: return `${p2(p.H)}:${p2(p.Mi)}:${p2(p.S)}`;
    case 106: return `${p2(p.d)} ${MONTHS_EN[p.mo - 1].slice(0, 3)} ${p.y}`;
  }
  return `${p.y}-${p2(p.mo)}-${p2(p.d)}`;
}
function likeToRe(pat) { let s = ''; for (let i = 0; i < pat.length; i++) { const c = pat[i]; if (c === '%') s += '.*'; else if (c === '_') s += '.'; else if (c === '[') { const j = pat.indexOf(']', i); s += pat.slice(i, j + 1); i = j; } else s += c.replace(/[.*+?^${}()|\\]/g, '\\$&'); } return new RegExp('^' + s, 'i'); }
function trUpper(s) { if (s === null || s === undefined) return s === undefined ? null : s; s = String(s); return (s.includes('@') ? s : s.replace(/i/g, 'İ').replace(/ı/g, 'I')).toUpperCase(); }
function trLower(s) { if (s === null || s === undefined) return s === undefined ? null : s; s = String(s); return (s.includes('@') ? s.replace(/İ/g, 'i') : s.replace(/İ/g, 'i').replace(/I/g, 'ı')).toLowerCase(); }
function register(db) {
  const F = (name, fn, variadic) => { if (variadic) Object.defineProperty(fn, 'length', { value: -1 }); db.create_function(name, fn); };
  /* SQLite'ın UPPER ve LOWER'ı yalnız ASCII dönüştürür; Türkçe metinler bozulmasın diye yerine yazılır. E-posta içeren metinlerde i/I İngilizce kurala göre çevrilir. */
  F('upper', s => trUpper(s)); F('lower', s => trLower(s));
  F('ascii_upper_', s => s === null || s === undefined ? null : String(s).toUpperCase());
  F('dateadd_', (pt, n, v) => dateadd(part(pt), n, v));
  F('substring_index_', (str, delim, cnt) => { if (str === null || delim === null || cnt === null) return null; str = String(str); delim = String(delim); const n = Math.trunc(Number(cnt)); if (!delim || !n) return ''; const parts = str.split(delim); return n > 0 ? parts.slice(0, n).join(delim) : parts.slice(n).join(delim); });
  F('datediff_', (pt, a, b) => datediff(part(pt), a, b));
  F('datepart_', (pt, v) => datepart(part(pt), v));
  F('datename_', (pt, v) => { const p = pd(v); if (!p) return null; pt = part(pt); if (pt === 'month') return MONTHS_EN[p.mo - 1]; if (pt === 'weekday') return DAYS_EN[D(p).getUTCDay()]; const r = datepart(pt, v); return r === null ? null : String(r); });
  F('datetrunc_', (pt, v) => datetrunc(pt, v));
  F('extract_', (pt, v) => { pt = part(pt); return pt === 'epoch' ? (pd(v) ? D(pd(v)).getTime() / 1000 : null) : datepart(pt, v); });
  F('eomonth_', function (v, n) { const p = pd(v); if (!p) return null; const q = addMonths(Object.assign({}, p, { d: 1 }), Number(n || 0)); return fmtD(new Date(Date.UTC(q.y, q.mo, 0)), false); }, true);
  F('datefromparts_', (y, m, d) => (y === null || m === null || d === null) ? null : fmtD(new Date(Date.UTC(y, m - 1, d)), false));
  F('getdate_', () => { const n = new Date(); return n.getFullYear() + '-' + p2(n.getMonth() + 1) + '-' + p2(n.getDate()) + ' ' + p2(n.getHours()) + ':' + p2(n.getMinutes()) + ':' + p2(n.getSeconds()); });
  F('mysql_datediff_', (a, b) => { const A = pd(a), B = pd(b); return A && B ? dayNum(A) - dayNum(B) : null; });
  F('months_between_', (a, b) => { const A = pd(a), B = pd(b); if (!A || !B) return null; return (A.y * 12 + A.mo) - (B.y * 12 + B.mo) + (A.d - B.d) / 31; });
  F('format_', function (v, f, c) { return dnetFormat(v, f, c); }, true);
  F('to_char_', function (v, f) { return oraFormat(v, f); }, true);
  F('to_date_', function (v) { const p = pd(v); return p ? fmtD(D(p), p.t) : null; }, true);
  F('date_format_', (v, f) => mysqlFormat(v, f));
  F('convert_style_', (v, s) => convertStyle(v, s));
  F('len_', s => s === null ? null : String(s).replace(/\s+$/, '').length);
  F('left_', (s, n) => s === null ? null : String(s).slice(0, Math.max(0, n)));
  F('right_', (s, n) => s === null ? null : (n <= 0 ? '' : String(s).slice(-n)));
  F('replicate_', (s, n) => s === null ? null : String(s).repeat(Math.max(0, n)));
  F('reverse_', s => s === null ? null : [...String(s)].reverse().join(''));
  F('stuff_', (s, st, ln, ins) => s === null ? null : String(s).slice(0, st - 1) + (ins === null ? '' : ins) + String(s).slice(st - 1 + ln));
  F('charindex_', function (sub, s, st) { if (s === null || sub === null) return null; return String(s).toLowerCase().indexOf(String(sub).toLowerCase(), (st || 1) - 1) + 1; }, true);
  F('patindex_', (pat, s) => { if (s === null) return null; const p = String(pat); const re = likeToRe(p.replace(/^%/, '').replace(/%$/, '')); const str = String(s); for (let i = 0; i < str.length; i++) if (re.test(str.slice(i))) return i + 1; return 0; });
  F('lpad_', function (s, n, c) { if (s === null) return null; s = String(s); c = c === undefined ? ' ' : String(c); if (s.length >= n) return s.slice(0, n); return (c.repeat(n)).slice(0, n - s.length) + s; }, true);
  F('rpad_', function (s, n, c) { if (s === null) return null; s = String(s); c = c === undefined ? ' ' : String(c); if (s.length >= n) return s.slice(0, n); return s + (c.repeat(n)).slice(0, n - s.length); }, true);
  F('initcap_', s => s === null ? null : String(s).toLocaleLowerCase('tr').replace(/(^|[^\p{L}])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('tr')));
  F('split_part_', (s, sep, n) => s === null ? null : (String(s).split(sep)[n - 1] || ''));
  F('nvl2_', (a, b, c) => a !== null ? b : c);
  F('decode_', function () { const a = [...arguments]; const x = a[0]; for (let i = 1; i + 1 < a.length; i += 2) if (a[i] === x || (a[i] === null && x === null) || String(a[i]) === String(x)) return a[i + 1]; return a.length % 2 === 0 ? a[a.length - 1] : null; }, true);
  F('choose_', function () { const a = [...arguments]; const i = a[0]; return i >= 1 && i < a.length ? a[i] : null; }, true);
  F('mysql_concat_', function () { const a = [...arguments]; if (a.some(x => x === null)) return null; return a.join(''); }, true);
  F('instr4_', function (s, sub, pos, occ) { if (s === null || sub === null) return null; s = String(s); sub = String(sub); pos = Number(pos || 1); occ = Number(occ || 1); if (pos > 0) { let i = pos - 2; for (let k = 0; k < occ; k++) { i = s.indexOf(sub, i + 1); if (i < 0) return 0; } return i + 1; } let i = s.length + pos + 1; for (let k = 0; k < occ; k++) { i = s.lastIndexOf(sub, i - 1); if (i < 0) return 0; } return i + 1; }, true);
  F('next_day_', function (v, dn) { const p = pd(v); if (!p || dn === null) return null; const names = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, PAZ: 0, PZT: 1, SAL: 2, ÇAR: 3, CAR: 3, PER: 4, CUM: 5, CMT: 6 }; const key = String(dn).trim().toUpperCase(); let t = names[key.slice(0, 3)]; if (/^PAZARTES/.test(key)) t = 1; if (/^CUMARTES/.test(key)) t = 6; if (t === undefined) return null; const dt = D(p); let k = (t - dt.getUTCDay() + 7) % 7; if (k === 0) k = 7; return fmtD(new Date(dt.getTime() + k * 86400000), p.t); }, true);
  F('round_date_', function (v, f) { const p = pd(v); if (!p) return null; const ff = String(f || 'DD').toUpperCase(); if (/^(MM|MONTH|MON)$/.test(ff)) { const q = p.d >= 16 ? addMonths(Object.assign({}, p, { d: 1 }), 1) : p; return `${q.y}-${p2(q.mo)}-01`; } if (/^(YYYY|YEAR|YY|Y)$/.test(ff)) return `${p.mo >= 7 ? p.y + 1 : p.y}-01-01`; return `${p.y}-${p2(p.mo)}-${p2(p.d)}`; }, true);
  F('trunc_', function (v, f) { const p = typeof v === 'string' ? pd(v) : null; if (p) { const ff = (f || 'DD').toUpperCase(); if (/^(MM|MONTH|MON)$/.test(ff)) return datetrunc('month', v); if (/^(YYYY|YEAR|YY|Y)$/.test(ff)) return datetrunc('year', v); if (/^(Q)$/.test(ff)) return datetrunc('quarter', v); if (/^(IW|WW|W|DAY|DY|D)$/.test(ff)) return datetrunc('week', v); return datetrunc('day', v); } if (v === null) return null; const k = Math.pow(10, Number(f || 0)); return Math.trunc(Number(v) * k) / k; }, true);
  F('isnumeric_', v => v !== null && v !== '' && !isNaN(Number(v)) ? 1 : 0);
  F('newid_', () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16).toUpperCase(); }));
  F('tsql_int_', (v, tr, ty) => { if (v === null) return null; if (typeof v === 'number') return Math.trunc(v); const t = String(v).trim(); if (/^[-+]?\d+$/.test(t)) return parseInt(t, 10); if (tr) return null; return fnErr(`Msg 245, Level 16, State 1: Conversion failed when converting the varchar value '${v}' to data type ${ty}.`); });
  F('tsql_num_', (v, tr) => { if (v === null) return null; if (typeof v === 'number') return v; const t = String(v).trim(); if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return Number(t); if (tr) return null; return fnErr(`Msg 8114, Level 16, State 5: Error converting data type varchar to numeric.`); });
  F('tsql_date_', (v, tr, dt) => { if (v === null) return null; const p = pd(v); if (p && p.mo >= 1 && p.mo <= 12 && p.d >= 1 && p.d <= new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate()) return fmtD(D(p), !!dt); if (tr) return null; return fnErr(`Msg 241, Level 16, State 1: Conversion failed when converting date and/or time from character string.`); });
  F('quotename_', function (s, q) { if (s === null) return null; q = q || '['; return q === '[' ? '[' + String(s).replace(/]/g, ']]') + ']' : q + s + q; }, true);
  F('tsqltype_', t => { const T = String(t || '').toUpperCase(); if (/INT/.test(T)) return 'int'; if (/REAL|FLOA|DOUB|DEC|NUM/.test(T)) return 'decimal'; if (/DATE|TIME/.test(T)) return 'date'; return 'nvarchar'; });
  F('affinity_', t => { const T = String(t || '').toUpperCase(); if (/INT/.test(T)) return 'INTEGER'; if (/^NUMBER\s*\(\s*\d+\s*\)$/.test(T)) return 'INTEGER'; if (/CHAR|CLOB|TEXT|DATE|TIME/.test(T)) return 'TEXT'; if (/BLOB/.test(T) || T === '') return 'BLOB'; return 'REAL'; });
  const pct = (cont) => ({ init: () => ({ p: null, a: [] }), step: (s, p, x) => { if (s.p === null) s.p = Number(p); if (x !== null && !isNaN(+x)) s.a.push(+x); return s; }, finalize: s => { const a = s.a.sort((x, y) => x - y); if (!a.length) return null; if (!cont) return a[Math.max(0, Math.ceil(s.p * a.length) - 1)]; const r = s.p * (a.length - 1); const lo = Math.floor(r), hi = Math.ceil(r); return a[lo] + (a[hi] - a[lo]) * (r - lo); } });
  try { db.create_aggregate('percentile_cont_', pct(true)); db.create_aggregate('percentile_disc_', pct(false)); } catch (e) { /* yok */ }
  /* düzenli ifadeler (Oracle / MySQL 8 / SQL Server 2025 / PostgreSQL 15 imzaları) */
  F('regexp', (p, v) => (p === null || v === null) ? null : (mkRe(p, 'i').test(String(v)) ? 1 : 0));
  F('regexp_like', function (v, p, f) { if (v === null || p === null) return null; return mkRe(p, f).test(String(v)) ? 1 : 0; }, true);
  F('regexp_count', function (v, p, pos, f) { if (v === null || p === null) return null; const s = String(v).slice((pos || 1) - 1); return (s.match(mkRe(p, f, true)) || []).length; }, true);
  F('regexp_substr', function (v, p, pos, occ, f, sub) { if (v === null || p === null) return null; const re = mkRe(p, f, true); const s = String(v).slice((pos || 1) - 1); let m, k = 0; while ((m = re.exec(s))) { if (++k === (occ || 1)) return m[sub || 0] === undefined ? null : m[sub || 0]; if (m[0] === '') re.lastIndex++; } return null; }, true);
  F('regexp_instr', function (v, p, pos, occ, ro, f) { if (v === null || p === null) return null; const re = mkRe(p, f, true); const st = (pos || 1) - 1; const s = String(v).slice(st); let m, k = 0; while ((m = re.exec(s))) { if (++k === (occ || 1)) return st + m.index + 1 + (ro ? m[0].length : 0); if (m[0] === '') re.lastIndex++; } return 0; }, true);
  F('regexp_replace', function (v, p, r, pos, occ, f) { if (v === null || p === null) return null; const st = (pos || 1) - 1; const s = String(v); const rep = jsRepl(r); occ = occ || 0; const re = mkRe(p, f, true); if (!occ) return s.slice(0, st) + s.slice(st).replace(re, rep); let k = 0; return s.slice(0, st) + s.slice(st).replace(re, function (m) { k++; if (k !== occ) return m; const a = [...arguments]; return m.replace(mkRe(p, f), rep); void a; }); }, true);
  F('regexp_replace_pg_', function (v, p, r, f) { if (v === null || p === null) return null; f = f || ''; return String(v).replace(mkRe(p, f.replace('g', ''), f.includes('g')), jsRepl(r)); }, true);
  F('translate_', (s, a, b, strict) => { if (s === null || a === null || b === null) return null; const A = [...String(a)], B = [...String(b)]; if (strict && A.length !== B.length) return fnErr('Msg 9828, Level 16, State 1: The second and third arguments of the TRANSLATE built-in function must contain an equal number of characters.'); return [...String(s)].map(ch => { const i = A.indexOf(ch); return i < 0 ? ch : (i < B.length ? B[i] : ''); }).join(''); });
  F('soundex', s => soundex(s));
  F('difference', (a, b) => { const x = soundex(a), y = soundex(b); if (x === null || y === null) return null; let n = 0; for (let i = 0; i < 4; i++) if (x[i] === y[i]) n++; return n; });
  F('bq_int_', (v, tr) => { if (v === null) return null; if (typeof v === 'number') return v < 0 ? -Math.round(-v) : Math.round(v); const t = String(v).trim(); if (/^[-+]?\d+$/.test(t)) return parseInt(t, 10); if (tr) return null; return fnErr(`Bad int64 value: ${v}`); });
  F('bq_num_', (v, tr) => { if (v === null) return null; if (typeof v === 'number') return v; const t = String(v).trim(); if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return Number(t); if (tr) return null; return fnErr(`Bad double value: ${v}`); });
  F('bq_date_', (v, tr) => { if (v === null) return null; const p = pd(v); if (p && p.mo >= 1 && p.mo <= 12 && p.d >= 1 && p.d <= new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate() && /^\d{4}-/.test(String(v).trim())) return fmtD(D(p), false); if (tr) return null; return fnErr(`Invalid date: '${v}'`); });
  F('bqfmt_', (f, v) => bqFormat(f, v));
  F('parse_date_', function (f, s, dt, safe) { if (safe) { try { return bqParse(f, s, dt); } catch (e) { lastFnError = null; return null; } } return bqParse(f, s, dt); }, true);
  F('regexp_extract_', function (v, p, pos, occ) { if (v === null || p === null) return null; const re = mkRe(p, '', true); const s = String(v).slice((pos || 1) - 1); let m, k = 0; while ((m = re.exec(s))) { if (++k === (occ || 1)) return m.length > 1 ? (m[1] === undefined ? null : m[1]) : m[0]; if (m[0] === '') re.lastIndex++; } return null; }, true);
  F('arr_to_str_', (a, sep) => { if (a === null) return null; let arr; try { arr = JSON.parse(a); } catch (e) { return String(a); } return Array.isArray(arr) ? arr.filter(x => x !== null).join(sep === null ? '' : sep) : String(a); });
  try { db.create_aggregate('approx_quantiles_', { init: () => ({ a: [], n: null }), step: (st, x, n) => { if (st.n === null) st.n = Number(n); if (x !== null && x !== undefined) st.a.push(x); return st; }, finalize: st => { const a = st.a.sort((x, y) => (typeof x === 'number' && typeof y === 'number') ? x - y : String(x) < String(y) ? -1 : 1); if (!a.length) return null; const n = st.n || 1; const out = []; for (let i = 0; i <= n; i++) out.push(a[Math.round(i * (a.length - 1) / n)]); return JSON.stringify(out); } }); } catch (e) { /* yok */ }
  F('levenshtein', (a, b) => { if (a === null || b === null) return null; a = String(a); b = String(b); const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; });
}
const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function bqFormat(f, v) {
  if (f === null || v === null || v === undefined) return null; const p = pd(v); if (!p) return null; const dt = D(p);
  const doy = Math.floor((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(p.y, 0, 1)) / 864e5) + 1; const wd = dt.getUTCDay();
  const map = { Y: () => p.y, y: () => p2(p.y % 100), m: () => p2(p.mo), d: () => p2(p.d), e: () => String(p.d).padStart(2, ' '), H: () => p2(p.H), I: () => p2((p.H % 12) || 12), M: () => p2(p.Mi), S: () => p2(p.S), p: () => p.H < 12 ? 'AM' : 'PM', B: () => MON_EN[p.mo - 1], b: () => MON_EN[p.mo - 1].slice(0, 3), h: () => MON_EN[p.mo - 1].slice(0, 3), A: () => DAYS_EN[wd], a: () => DAYS_EN[wd].slice(0, 3), j: () => String(doy).padStart(3, '0'), w: () => wd, u: () => wd || 7, Q: () => Math.ceil(p.mo / 3), F: () => `${p.y}-${p2(p.mo)}-${p2(p.d)}`, D: () => `${p2(p.mo)}/${p2(p.d)}/${p2(p.y % 100)}`, T: () => `${p2(p.H)}:${p2(p.Mi)}:${p2(p.S)}`, R: () => `${p2(p.H)}:${p2(p.Mi)}`, U: () => p2(Math.floor((doy + 6 - wd) / 7)), W: () => p2(Math.floor((doy + 6 - ((wd + 6) % 7)) / 7)), '%': () => '%' };
  return String(f).replace(/%([A-Za-z%])/g, (m, c) => map[c] ? map[c]() : m);
}
function bqParse(f, s, dt) {
  if (f === null || s === null) return null;
  const groups = []; let re = '';
  const spec = { Y: '(\\d{4})', y: '(\\d{2})', m: '(\\d{1,2})', d: '(\\d{1,2})', e: '\\s?(\\d{1,2})', H: '(\\d{1,2})', M: '(\\d{1,2})', S: '(\\d{1,2})', B: '([A-Za-z]+)', b: '([A-Za-z]{3})', F: '(\\d{4})-(\\d{1,2})-(\\d{1,2})' };
  for (let i = 0; i < f.length; i++) { const c = f[i]; if (c === '%' && i + 1 < f.length) { const k = f[++i]; if (spec[k]) { re += spec[k]; if (k === 'F') groups.push('Y', 'm', 'd'); else groups.push(k); } else re += k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const m = String(s).trim().match(new RegExp('^' + re + '$', 'i')); if (!m) return fnErr(`Failed to parse input string "${s}"`);
  const o = { Y: 1970, m: 1, d: 1, H: 0, M: 0, S: 0 };
  groups.forEach((g, i) => { const v = m[i + 1]; if (g === 'B' || g === 'b') o.m = MON_EN.findIndex(x => x.toLowerCase().startsWith(v.toLowerCase().slice(0, 3))) + 1; else if (g === 'y') o.Y = 2000 + +v; else if (g === 'e') o.d = +v; else o[g] = +v; });
  if (o.m < 1 || o.m > 12 || o.d < 1 || o.d > new Date(Date.UTC(o.Y, o.m, 0)).getUTCDate()) return fnErr(`Failed to parse input string "${s}"`);
  return `${o.Y}-${p2(o.m)}-${p2(o.d)}` + (dt ? ` ${p2(o.H)}:${p2(o.M)}:${p2(o.S)}` : '');
}
function mkRe(p, f, g) {
  let src = String(p); f = String(f || '');
  const cls = { alpha: '\\p{L}', digit: '0-9', alnum: '\\p{L}\\p{N}', upper: '\\p{Lu}', lower: '\\p{Ll}', space: '\\s', punct: '\\p{P}', xdigit: '0-9A-Fa-f' };
  src = src.replace(/\[:(\w+):\]/g, (m, c) => cls[c] || m);
  if (f.includes('x')) src = src.replace(/\s+/g, '');
  let fl = 'u'; const iI = f.lastIndexOf('i'), cI = f.lastIndexOf('c'); if (iI > cI) fl += 'i'; if (f.includes('m')) fl += 'm'; if (f.includes('n') || f.includes('s')) fl += 's'; if (g) fl += 'g';
  try { return new RegExp(src, fl); } catch (e) { try { return new RegExp(src, fl.replace('u', '')); } catch (e2) { return fnErr('Geçersiz düzenli ifade: ' + p); } }
}
function jsRepl(r) { if (r === null || r === undefined) return ''; return String(r).replace(/\$/g, '$$$$').replace(/\\(\d)/g, '$$$1'); }
function soundex(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).replace(/[çÇ]/g, 'C').replace(/[şŞ]/g, 'S').replace(/[ğĞ]/g, 'G').replace(/[üÜ]/g, 'U').replace(/[öÖ]/g, 'O').replace(/[ıİ]/g, 'I').toUpperCase().replace(/[^A-Z]/g, '');
  if (!t) return '';
  const code = c => 'BFPV'.includes(c) ? '1' : 'CGJKQSXZ'.includes(c) ? '2' : 'DT'.includes(c) ? '3' : c === 'L' ? '4' : 'MN'.includes(c) ? '5' : c === 'R' ? '6' : '';
  let out = t[0], last = code(t[0]);
  for (let i = 1; i < t.length && out.length < 4; i++) { const c = t[i], k = code(c); if (k && k !== last) out += k; if (c !== 'H' && c !== 'W') last = k; }
  return (out + '000').slice(0, 4);
}

/* İçerik yardımcısı: lehçe varyantlı kod kutusu */
root.CODE = function (src, v, o) {
  o = o || {}; const enc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<pre class="code"' + (v ? ' data-v="' + enc(JSON.stringify(v)) + '"' : '') + (o.base ? ' data-base="' + o.base + '"' : '') + (o.nr ? ' data-nr="' + o.nr.join(' ') + '"' : '') + (o.norun ? ' data-norun' : '') + (o.diff ? ' data-diff="' + o.diff.join(' ') + '"' : '') + (o.na ? ' data-na="' + o.na.join(' ') + '"' : '') + (o.err ? ' data-err' : '') + '>' + enc(src) + '</pre>';
};
/* Yöntem kuralları: görev bir yöntem istiyorsa sonuç tek başına yetmez. Yorum ve metin sabitleri kuralları etkilemez.
   Arayüz (index.html) ve denetim (araclar/denetim/run.js) bu tek işlevi kullanır. */
function mustFail(e, code, d) {
  const bareOf = s => tokenize(s).filter(t => t.k !== 'com' && t.k !== 's').map(t => t.v).join('');
  const bare = bareOf(code);
  if (e.must) for (const m of e.must) { if (m.d && !m.d.includes(d)) continue; if (!new RegExp(m.re, 'i').test(bare)) return m.msg; }
  if (e.mustNot) for (const m of e.mustNot) { if (m.d && !m.d.includes(d)) continue; if (new RegExp(m.re, 'i').test(bare)) return m.msg; }
  /* Çözüm tablodan okuyorsa (FROM metin sabitinde değil, kodda) cevap da okumalı. Dinamik SQL'de FROM metnin içindedir, kural uygulanmaz. */
  if (!e.check && e.sol && /\bFROM\b/i.test(bareOf(e.sol)) && !/\bFROM\b/i.test(bare)) return 'Bu görevde sonucu tablodan hesaplaman gerekiyor; sabit değer yazmak sayılmaz.';
  return '';
}
root.SQLP_DIALECT = { DIALECTS, DNAME, mustFail, tokenize, forward, reverse, lint, runDialect, register, splitSemis, execOne, friendly,
  convert, isProcedural, forwardCanon,
  setSchemaHints(dateCols, textCols, allCols, dtCols) { (dtCols || []).forEach(c => DT_COLS.add(c)); dateCols.forEach(c => DATE_COLS.add(c)); textCols.forEach(c => TEXT_COLS.add(c)); (allCols || []).forEach(c => ALL_COLS.add(String(c).toLowerCase())); } };
// T-SQL yolunda da önce denetim uygula
root.SQLP_DIALECT._tsqlLint = true;
void tsqlRunChecked; void DATE_TYPES;
})(typeof window !== 'undefined' ? window : globalThis);
