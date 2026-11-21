"""Kesit SQL <-> gerçek PostgreSQL / MySQL karşılaştırması.
python db_karsilastir.py pg|mysql [--yukle]
İlk çalıştırmada (ya da --yukle ile) kesitsql veritabanını kurar ve base.sqlite'tan yükler.
PostgreSQL: her çözüm bir işlem içinde çalışır ve geri alınır (çözümün BEGIN/COMMIT/ROLLBACK'i kayıt noktasına çevrilmiştir).
MySQL: DDL işlemi kapattığı için veri değiştiren çözüm, kullandığı tabloların geçici bir kopyasında (kx_tmp veritabanı) çalışır."""
import json, os, re, sys, time, sqlite3, decimal, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
# Sürücüler (libpq, OpenSSL) ortamın kendi Library\bin klasöründen yüklensin; yoksa sistemdeki başka bir libpq sürecin çökmesine yol açıyor
_E = os.path.dirname(sys.executable)
if os.name == "nt":
    os.environ["PATH"] = os.pathsep.join([_E, os.path.join(_E, "Library", "bin"), os.environ.get("PATH", "")])
    try:
        os.add_dll_directory(os.path.join(_E, "Library", "bin"))
    except Exception:
        pass
D = next((a for a in sys.argv[1:] if a in ("pg", "mysql")), "pg")
TR = "tr" in sys.argv[1:]
SUF = "_tr" if TR else ""
# PostgreSQL: kesitsql_c (C yerel ayarı) / kesitsql_tr (Windows Türkçe); MySQL: kesitsql (utf8mb4_0900_ai_ci) / kesitsql_tr (utf8mb4_tr_0900_ai_ci)
DB = ("kesitsql_tr" if TR else "kesitsql_c") if D == "pg" else ("kesitsql_tr" if TR else "kesitsql")
MYCOLL = "utf8mb4_tr_0900_ai_ci" if TR else "utf8mb4_0900_ai_ci"
if D == "pg":
    import psycopg2, psycopg2.extras
else:
    import pymysql, pymysql.constants.CLIENT as CL


def connect(db=None, auto=True):
    if D == "pg":
        cn = psycopg2.connect(host="127.0.0.1", port=5432, user="postgres", dbname=db or "postgres", connect_timeout=10)
        cn.autocommit = auto
        cur = cn.cursor(); cur.execute("SET client_encoding TO 'UTF8'"); cur.execute("SET statement_timeout = '60s'")
        return cn
    cn = pymysql.connect(host="127.0.0.1", port=3306, user="root", password="", database=db, charset="utf8mb4", collation="utf8mb4_tr_0900_ai_ci" if TR else "utf8mb4_0900_ai_ci", autocommit=auto, client_flag=CL.MULTI_STATEMENTS, local_infile=True, read_timeout=120)
    # bağlantı harmanlaması veritabanınınkiyle aynı olsun: CAST('x' AS CHAR) gibi değişmezler sütunlarla karşılaştırılabilsin
    cn.cursor().execute("SET SESSION max_execution_time = 60000")
    return cn


def qi(n):
    return '"%s"' % n if D == "pg" else "`%s`" % n


def load(force):
    cn = connect()
    cur = cn.cursor()
    if D == "pg":
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB,)); has = cur.fetchone()
    else:
        cur.execute("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = %s", (DB,)); has = cur.fetchone()
    if has and not force:
        return
    if has:
        if D == "pg":
            cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()", (DB,))
        cur.execute("DROP DATABASE " + DB)
    cur.execute("CREATE DATABASE " + DB + ((" ENCODING 'UTF8' TEMPLATE template0" + ("" if TR else " LC_COLLATE 'C' LC_CTYPE 'C'")) if D == "pg" else " CHARACTER SET utf8mb4 COLLATE " + MYCOLL))
    cn.close()
    cn = connect(DB, auto=False)
    cur = cn.cursor()
    ddl = json.load(open(os.path.join(HERE, "ddl_%s.json" % D), encoding="utf-8"))
    sq = sqlite3.connect(os.path.join(HERE, "base.sqlite"))
    t0 = time.time()
    for t, d in ddl.items():
        cur.execute(d["ddl"])
        rows = sq.execute('SELECT * FROM "%s"' % t).fetchall()
        types = [x.upper() for x in d["types"]]
        def conv(r):
            out = []
            for v, ty in zip(r, types):
                if v is not None and isinstance(v, str) and (ty.startswith("DATETIME") or ty.startswith("TIMESTAMP")):
                    v = v.replace("T", " ")
                if v is not None and ty == "DATE" and isinstance(v, str):
                    v = v[:10]
                if v is not None and ty == "BOOLEAN":
                    v = bool(v)
                out.append(v)
            return out
        rows = [conv(r) for r in rows]
        cols = ",".join(qi(c) for c in d["cols"])
        if rows:
            if D == "pg":
                psycopg2.extras.execute_values(cur, "INSERT INTO %s (%s) VALUES %%s" % (qi(t), cols), rows, page_size=2000)
            else:
                sql = "INSERT INTO %s (%s) VALUES (%s)" % (qi(t), cols, ",".join(["%s"] * len(d["cols"])))
                for i in range(0, len(rows), 2000):
                    cur.executemany(sql, rows[i:i + 2000])
        print("yüklendi", t, len(rows))
    cn.commit()
    if D == "pg" and any(d.get("identity") for d in ddl.values()):
        for t, d in ddl.items():
            if d.get("identity"):
                c0 = d["cols"][0]
                cur.execute("SELECT setval(pg_get_serial_sequence('%s', '%s'), COALESCE((SELECT MAX(%s) FROM %s), 0) + 1, false)" % (t, c0, qi(c0), qi(t)))
    for q in ["orders(customer_id)", "order_items(order_id)", "lk_orders(customer_id)", "lk_order_lines(order_id)", "bank_txns(account_id)", "ik_salaries(emp_id)", "hv_flights(route_id)", "bk_trips(bike_id)", "bk_trips(user_id)", "bk_trips(start_station)"]:
        t, c = q[:-1].split("(")
        try:
            cur.execute("CREATE INDEX ix_%s_%s ON %s(%s)" % (t, c, qi(t), qi(c)))
        except Exception:
            cn.rollback()
    cn.commit()
    if D == "pg":
        cn.autocommit = True; cn.cursor().execute("ANALYZE")
    print("yükleme süresi", round(time.time() - t0), "sn")
    cn.close()


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
    if isinstance(v, datetime.timedelta):
        return str(v)
    if isinstance(v, (bytes, bytearray)):
        try:
            return nv(v.decode("utf-8"))
        except Exception:
            return v.hex()
    if isinstance(v, (dict, list)):
        v = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
    s = str(v).strip()
    if re.match(r"^-?\d+(\.\d+)?$", s):
        return round(float(s), 2)
    m = re.match(r"^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d(:\d\d)?)(\.0+)?$", s)
    if m:
        t = m.group(2) if m.group(3) else m.group(2) + ":00"
        return m.group(1) if t == "00:00:00" else m.group(1) + " " + t
    if s[:1] in "[{":
        s = re.sub(r"([:,])\s+", r"\1", s)
    return s


def key(r):
    return json.dumps([nv(x) for x in r], ensure_ascii=False, default=str)


TABLES = []
WRITE = re.compile(r"\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|TRUNCATE|CALL|DO|INTO|REPLACE\s+INTO|BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|SAVEPOINT|SET|LOAD|GRANT|REVOKE|LOCK|RENAME|ANALYZE|VACUUM|REFRESH|COPY)\b", re.I)


def fetch_all_sets(cur):
    last = None
    while True:
        if cur.description:
            last = ([d[0] for d in cur.description], list(cur.fetchall()))
        if D == "pg" or not cur.nextset():
            break
    return last


def run_pg(cn, it):
    cur = cn.cursor()
    last = None
    try:
        cur.execute("BEGIN")
        if "$$" in it["sql"] or re.search(r"\$\w*\$", it["sql"]):
            cur.execute(it["sql"]); r = fetch_all_sets(cur); last = r or last
        else:
            for p in it["parts"]:
                cur.execute(p)
                if cur.description:
                    last = ([d[0] for d in cur.description], list(cur.fetchall()))
        if it.get("check") and it["check"] != "__yapi__":
            cur.execute(it["check"]); last = fetch_all_sets(cur)
        err = None
    except Exception as e:
        err = str(e).strip().splitlines()[0][:300]
    finally:
        try:
            cur.execute("ROLLBACK")
        except Exception:
            pass
    return last, err


def run_my(cn, it):
    cur = cn.cursor()
    sql = it["sql"]
    write = bool(WRITE.search(re.sub(r"'(?:[^']|'')*'", "''", sql)))
    last = None
    err = None
    used = None
    try:
        if write:
            low = sql.lower()
            used = [t for t in TABLES if re.search(r"\b%s\b" % re.escape(t.lower()), low)]
            cur.execute("DROP DATABASE IF EXISTS kx_tmp; CREATE DATABASE kx_tmp CHARACTER SET utf8mb4 COLLATE " + MYCOLL)
            for t in used:
                cur.execute("CREATE TABLE kx_tmp.`%s` LIKE %s.`%s`" % (t, DB, t))
                cur.execute("INSERT INTO kx_tmp.`%s` SELECT * FROM %s.`%s`" % (t, DB, t))
            cur.execute("USE kx_tmp")
        cur.execute(sql)
        last = fetch_all_sets(cur)
        if it.get("check") and it["check"] != "__yapi__":
            cur.execute(it["check"]); last = fetch_all_sets(cur)
    except Exception as e:
        err = str(e)[:300]
        try:
            while cur.nextset():
                pass
        except Exception:
            pass
    finally:
        try:
            cn.rollback()
            if write:
                c2 = cn.cursor(); c2.execute("USE %s" % DB); c2.execute("DROP DATABASE IF EXISTS kx_tmp")
        except Exception:
            pass
    return last, err


def main():
    global TABLES
    load("--yukle" in sys.argv)
    bek = os.path.join(HERE, "beklenen_%s%s.json" % (D, SUF))
    items = json.load(open(bek, encoding="utf-8"))
    TABLES = list(json.load(open(os.path.join(HERE, "ddl_%s.json" % D), encoding="utf-8")).keys())
    cn = connect(DB, auto=True)
    cur = cn.cursor(); cur.execute("SELECT version()"); ver = cur.fetchone()[0]
    print(D, ver)
    res = []
    t0 = time.time()
    for i, it in enumerate(items, 1):
        last, err = (run_pg if D == "pg" else run_my)(cn, it)
        rec = {"id": it["id"]}
        if re.search(r"\b(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|SAVEPOINT)\b", it["sql"], re.I):
            rec["tx"] = True
        if it.get("env"):
            rec["env"] = True
        if err and it.get("error"):
            st = "ikisiHata"; rec["msg"] = err; rec["emu"] = it["error"]
        elif err:
            st = "sqlHata"; rec["msg"] = err
        elif it.get("error"):
            st = "emuHata"; rec["msg"] = it["error"]
        elif it.get("check") == "__yapi__":
            st = "ayni"
        else:
            want = it.get("rows")
            if want is None and last is None:
                st = "ayni"
            elif want is None or last is None:
                st = "fark"; rec["diff"] = "biri boş: motor %s, sunucu %s" % (want is not None, last is not None)
            elif len(last[0]) != len(it.get("cols") or []):
                st = "fark"; rec["diff"] = "sütun sayısı: motor %d, sunucu %d" % (len(it.get("cols") or []), len(last[0]))
            else:
                A = [key(r) for r in last[1]]; B = [key(r) for r in want]
                if len(A) != len(B):
                    st = "fark"; rec["diff"] = "satır sayısı: motor %d, sunucu %d" % (len(B), len(A))
                elif A == B or sorted(A) == sorted(B):
                    st = "ayni" if (A == B or not it.get("ord")) else "sira"
                else:
                    sa, sb = sorted(A), sorted(B)
                    k = next(j for j, (x, y) in enumerate(zip(sa, sb)) if x != y)
                    st = "fark"; rec["diff"] = "ilk fark: motor %s / sunucu %s" % (sb[k][:200], sa[k][:200])
        rec["st"] = st
        if st != "ayni":
            rec["sql"] = it["sql"][:1500]
            if last is not None and st in ("fark", "sira"):
                rec["ss"] = [[nv(x) for x in r] for r in last[1][:40]]
                rec["emuRows"] = (it.get("rows") or [])[:40]
        res.append(rec)
        if i % 100 == 0:
            print(i, "/", len(items), round(time.time() - t0), "sn")
    json.dump(res, open(os.path.join(HERE, "sonuc_%s%s.json" % (D, SUF)), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    by = {}
    for r in res:
        k = r["st"] + ("(ortam)" if r.get("env") and r["st"] != "ayni" else "") + ("(işlem)" if r.get("tx") and r["st"] != "ayni" else "")
        by[k] = by.get(k, 0) + 1
    lines = ["ÖZET", "Sunucu: " + ver, "Madde: %d | " % len(res) + " | ".join("%s: %d" % kv for kv in sorted(by.items())), ""]
    for r in res:
        if r["st"] != "ayni":
            lines.append("== %s %s%s%s | %s" % (r["st"], r["id"], " (ortam)" if r.get("env") else "", " (işlem)" if r.get("tx") else "", r.get("diff") or r.get("msg") or ""))
    open(os.path.join(HERE, "sonuc_%s%s.txt" % (D, SUF)), "w", encoding="utf-8").write("\n".join(lines))
    print("\n".join(lines[:3]))
    print("Ayrıntı: sonuc_%s%s.txt" % (D, SUF))


if __name__ == "__main__":
    main()
