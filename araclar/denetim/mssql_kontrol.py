"""Kesit SQL <-> gerçek SQL Server karşılaştırması.
python mssql_kontrol.py [beklenen.json] [--yukle]
İlk çalıştırmada (ya da --yukle ile) KesitSQL veritabanını kurar ve base.sqlite'tan yükler.
Her çözüm bir işlem içinde çalışır ve geri alınır; çözümün kendi BEGIN/COMMIT/ROLLBACK komutları kayıt noktasına çevrilir."""
import json, os, re, sys, time, sqlite3, decimal, datetime
import pyodbc

HERE = os.path.dirname(os.path.abspath(__file__))
LATIN = "--latin" in sys.argv
DB = "KesitSQL_L" if LATIN else "KesitSQL"
COLL = "SQL_Latin1_General_CP1_CI_AS" if LATIN else None
SUF = "_L" if LATIN else ""
DRV = next((d for d in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server Native Client 11.0"] if d in pyodbc.drivers()), "SQL Server")
CS = "DRIVER={%s};SERVER=localhost;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=no" % DRV


def connect(db=None):
    cn = pyodbc.connect(CS + (";DATABASE=" + db if db else ""), autocommit=True, timeout=10)
    cn.timeout = 60
    return cn


def load(force):
    cn = connect()
    cur = cn.cursor()
    has = cur.execute("SELECT DB_ID(?)", DB).fetchone()[0]
    if has and not force:
        return
    if has:
        cur.execute("ALTER DATABASE [%s] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [%s]" % (DB, DB))
    cur.execute("CREATE DATABASE [%s]" % DB + (" COLLATE " + COLL if COLL else ""))
    cur.execute("ALTER DATABASE [%s] SET RECOVERY SIMPLE" % DB)
    cn.close()
    cn = connect(DB)
    cur = cn.cursor()
    cur.fast_executemany = True
    ddl = json.load(open(os.path.join(HERE, "ddl.json"), encoding="utf-8"))
    sq = sqlite3.connect(os.path.join(HERE, "base.sqlite"))
    t0 = time.time()
    for t, d in ddl.items():
        cur.execute(d["ddl"])
        rows = sq.execute('SELECT * FROM "%s"' % t).fetchall()
        if rows:
            types = d["types"]
            def conv(r):
                out = []
                for v, ty in zip(r, types):
                    if v is not None and ty.startswith("DATETIME") and isinstance(v, str):
                        v = v.replace("T", " ")
                    if v is not None and ty == "DATE" and isinstance(v, str):
                        v = v[:10]
                    out.append(v)
                return out
            rows = [conv(r) for r in rows]
            sql = "INSERT INTO [%s] (%s) VALUES (%s)" % (t, ",".join("[%s]" % c for c in d["cols"]), ",".join("?" * len(d["cols"])))
            if d.get("identity"):
                cur.execute("SET IDENTITY_INSERT [%s] ON" % t)
            for i in range(0, len(rows), 5000):
                cur.executemany(sql, rows[i:i + 5000])
            if d.get("identity"):
                cur.execute("SET IDENTITY_INSERT [%s] OFF" % t)
        print("yüklendi", t, len(rows))
    for q in ["orders(customer_id)", "order_items(order_id)", "lk_orders(customer_id)", "lk_order_lines(order_id)", "bank_txns(account_id)", "ik_salaries(emp_id)", "hv_flights(route_id)", "bk_trips(bike_id)", "bk_trips(user_id)"]:
        t, c = q[:-1].split("(")
        try:
            cur.execute("CREATE INDEX ix_%s_%s ON [%s]([%s])" % (t, c, t, c))
        except Exception:
            pass
    print("yükleme süresi", round(time.time() - t0), "sn")
    cn.close()


TX_BEGIN = re.compile(r"\bBEGIN\s+TRAN(SACTION)?\b(\s+(?!TRY\b|CATCH\b)[A-Za-z_@]\w*)?", re.I)
TX_COMMIT = re.compile(r"\bCOMMIT(\s+TRAN(SACTION)?\b(\s+(?!TRY\b)[A-Za-z_@]\w*)?|\s+WORK\b)?", re.I)
TX_ROLLBACK = re.compile(r"\bROLLBACK(\s+TRAN(SACTION)?\b(\s+(?!TRY\b)[A-Za-z_@]\w*)?|\s+WORK\b)?", re.I)


def txsafe(sql):
    saves = set(m.lower() for m in re.findall(r"\bSAVE\s+TRAN(?:SACTION)?\s+(\w+)", sql, re.I))
    s = TX_BEGIN.sub("SAVE TRANSACTION kx", sql)
    s = TX_COMMIT.sub("SET NOCOUNT ON", s)
    def rb(m):
        nm = (m.group(3) or "").strip()
        return m.group(0) if nm and nm.lower() in saves else "ROLLBACK TRANSACTION kx"
    return TX_ROLLBACK.sub(rb, s)


def nv(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return 1.0 if v else 0.0
    if isinstance(v, (int, float, decimal.Decimal)):
        return round(float(v), 2)
    if isinstance(v, datetime.datetime):
        s = v.strftime("%Y-%m-%d %H:%M:%S")
        return s[:10] if s.endswith(" 00:00:00") else s
    if isinstance(v, datetime.date):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, datetime.time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, (bytes, bytearray)):
        return v.hex()
    s = str(v).strip()
    if re.match(r"^-?\d+(\.\d+)?$", s):
        return round(float(s), 2)
    m = re.match(r"^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d(:\d\d)?)(\.0+)?$", s)
    if m:
        t = m.group(2) if m.group(3) else m.group(2) + ":00"
        return m.group(1) if t == "00:00:00" else m.group(1) + " " + t
    return s



# Uygulamadaki keyCols (index.html) ile aynı: sıralamayı belirleyen sütunlar. Yalnız bu sütunlarda aynı sırada olan
# sonuçlar eşit değerlerin farklı dizilişidir; uygulama da öğrencinin cevabını böyle kabul eder.
def _cmpv(a, b):
    if a == b: return 0
    if a is None: return -1
    if b is None: return 1
    if isinstance(a, (int, float)) and isinstance(b, (int, float)): return -1 if a < b else 1
    return -1 if str(a) < str(b) else 1


def _mono(arr):
    up = dn = True; v = 0
    for i in range(1, len(arr)):
        c = _cmpv(arr[i - 1], arr[i])
        if c > 0: up = False
        if c < 0: dn = False
        if c: v += 1
    return (0 if not v else 1 if up else -1 if dn else None), v


def key_cols(vals):
    if not vals: return []
    n = len(vals[0]); keys = []; groups = [list(range(len(vals)))]
    while groups and len(keys) < n:
        found = -1
        for c in range(n):
            if c in keys: continue
            ms = [_mono([vals[i][c] for i in g]) for g in groups]
            if any(m[0] is None for m in ms): continue
            dirs = {m[0] for m in ms if m[0]}
            v = sum(m[1] for m in ms)
            if len(dirs) != 1: continue
            if keys and v < 3: continue
            found = c; break
        if found < 0: break
        keys.append(found); ng = []
        for g in groups:
            r = [g[0]]
            for q in g[1:]:
                if _cmpv(vals[q][found], vals[r[0]][found]) == 0: r.append(q)
                else:
                    if len(r) > 1: ng.append(r)
                    r = [q]
            if len(r) > 1: ng.append(r)
        groups = ng
    return keys

def key(r):
    return json.dumps([nv(x) for x in r], ensure_ascii=False, default=str)


def run_item(cn, it):
    cur = cn.cursor()
    last = None
    msgs = []
    ro = not re.search(r"\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|TRUNCATE|EXEC|EXECUTE|INTO|BEGIN\s+TRAN|COMMIT|ROLLBACK|SAVE)\b", it["sql"], re.I)
    cur.execute("SET NOCOUNT ON; SET XACT_ABORT OFF;" + ("" if ro else " BEGIN TRANSACTION"))
    try:
        for batch in re.split(r"^\s*GO\s*;?\s*$", txsafe(it["sql"]), flags=re.I | re.M):
            if not batch.strip():
                continue
            cur.execute(batch)
            while True:
                if cur.description:
                    last = ([d[0] for d in cur.description], cur.fetchall())
                if not cur.nextset():
                    break
        if it.get("check") and it["check"] != "__yapi__":
            cur.execute(it["check"])
            while True:
                if cur.description:
                    last = ([d[0] for d in cur.description], cur.fetchall())
                if not cur.nextset():
                    break
        err = None
    except pyodbc.Error as e:
        err = re.sub(r"\[Microsoft\]\[[^\]]*\]\[SQL Server\]", "", str(e.args[1] if len(e.args) > 1 else e))[:300]
    finally:
        try:
            cur.execute("IF @@TRANCOUNT > 0 ROLLBACK")
        except Exception:
            pass
    return last, err


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    bek = os.path.abspath(args[0] if args else os.path.join(HERE, "beklenen.json"))
    load("--yukle" in sys.argv)
    items = json.load(open(bek, encoding="utf-8"))
    cn = connect(DB)
    print("SQL Server:", cn.cursor().execute("SELECT @@VERSION").fetchone()[0].splitlines()[0])
    res = []
    VER = re.compile(r"REGEXP_|GREATEST|LEAST|DATETRUNC|GENERATE_SERIES|DATE_BUCKET|IS (NOT )?DISTINCT FROM|JSON_OBJECT|JSON_ARRAY|\bWINDOW\b|STRING_SPLIT\s*\([^)]*,[^)]*,|APPROX_PERCENTILE|LTRIM\s*\([^)]*,|RTRIM\s*\([^)]*,|TRIM\s*\(\s*(LEADING|TRAILING|BOTH)", re.I)
    t0 = time.time()
    for i, it in enumerate(items, 1):
        last, err = run_item(cn, it)
        rec = {"id": it["id"]}
        if re.search(r"\b(BEGIN\s+TRAN|COMMIT|ROLLBACK|@@TRANCOUNT|XACT_STATE)", it["sql"], re.I):
            rec["tx"] = True
        if it.get("env"):
            rec["env"] = True
        if err and it.get("error"):
            st = "ikisiHata"
        elif err:
            st = "surum" if VER.search(it["sql"]) else "sqlHata"
            rec["msg"] = err
        elif it.get("error"):
            st = "emuHata"
            rec["msg"] = it["error"]
        elif it.get("check") == "__yapi__":
            st = "ayni"
        else:
            want = it.get("rows")
            if want is None and last is None:
                st = "ayni"
            elif want is None or last is None:
                st = "fark"
                rec["diff"] = "biri boş: motor %s, SQL Server %s" % (want is not None, last is not None)
            elif len(last[0]) != len(it.get("cols") or []):
                st = "fark"
                rec["diff"] = "sütun sayısı: motor %d, SQL Server %d" % (len(it.get("cols") or []), len(last[0]))
            else:
                A = [key(r) for r in last[1]]
                B = [key(r) for r in want]
                if len(A) != len(B):
                    st = "fark"
                    rec["diff"] = "satır sayısı: motor %d, SQL Server %d" % (len(B), len(A))
                elif (A == B) or (sorted(A) == sorted(B) and (not it.get("ord") or True)):
                    st = "ayni" if (A == B or not it.get("ord")) else "sira"
                    if st == "sira":
                        ks = key_cols(want)
                        if ks and [[nv(r[c]) for c in ks] for r in last[1]] == [[nv(r[c]) for c in ks] for r in want]:
                            st = "ayni"; rec["not"] = "eşit değerlerin sırası (uygulama da kabul eder)"
                else:
                    sa, sb = sorted(A), sorted(B)
                    k = next(i for i, (x, y) in enumerate(zip(sa, sb)) if x != y)
                    st = "fark"
                    rec["diff"] = "ilk fark: motor %s / SQL Server %s" % (sb[k][:200], sa[k][:200])
        rec["st"] = st
        if st != "ayni":
            rec["sql"] = it["sql"][:1500]
            if last is not None and st in ("fark", "sira"):
                rec["ss"] = [[nv(x) for x in r] for r in last[1][:40]]
        res.append(rec)
        if i % 100 == 0:
            print(i, "/", len(items), round(time.time() - t0), "sn")
    stem = os.path.splitext(os.path.basename(bek))[0].replace("beklenen", "")
    od = os.path.dirname(bek)
    json.dump(res, open(os.path.join(od, "sonuc%s.json" % stem), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    by = {}
    for r in res:
        k = r["st"] + ("(ortam)" if r.get("env") and r["st"] != "ayni" else "(işlem)" if r.get("tx") and r["st"] != "ayni" else "")
        by[k] = by.get(k, 0) + 1
    lines = ["ÖZET", "Madde: %d | %s" % (len(res), " | ".join("%s: %d" % kv for kv in sorted(by.items()))), ""]
    for r in res:
        if r["st"] not in ("ayni", "ikisiHata"):
            lines.append("%s%s  %s :: %s" % (r["st"].upper(), "(ortam)" if r.get("env") else "(işlem)" if r.get("tx") else "", r["id"], r.get("diff") or r.get("msg") or ""))
    open(os.path.join(od, "sonuc%s.txt" % stem), "w", encoding="utf-8").write("\n".join(lines))
    print("\n".join(lines[:2]))
    print("Ayrıntı: sonuc%s.txt" % stem)


if __name__ == "__main__":
    main()
