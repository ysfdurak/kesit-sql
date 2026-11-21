"""PostgreSQL ve MySQL'de harmanlama davranışını yoklar; sonuç db_yokla2.json'a yazılır."""
import os, sys, json
_E = os.path.dirname(sys.executable)
os.environ["PATH"] = os.pathsep.join([_E, os.path.join(_E, "Library", "bin"), os.environ.get("PATH", "")])
try: os.add_dll_directory(os.path.join(_E, "Library", "bin"))
except Exception: pass
import psycopg2, pymysql
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "S3.json"), encoding="utf-8"))
pats = ["i%", "I%", "ı%", "İ%", "%ı%", "%i%", "c%", "ç%", "%geç%", "%gec%", "a%", "_b", "ab"]
out = {}
def run(cur, name, sql, params=None):
    try:
        cur.execute(sql, params); out[name] = [list(r) for r in cur.fetchall()]
    except Exception as e:
        out[name] = "HATA " + str(e)[:300]
        try: cur.connection.rollback()
        except Exception: pass
# PostgreSQL
pg = psycopg2.connect(host="127.0.0.1", port=5432, user="postgres", dbname="postgres"); pg.autocommit = True; c = pg.cursor(); c.execute("SET client_encoding TO 'UTF8'")
vals = ",".join(c.mogrify("(%s,%s)", (i, s)).decode() for i, s in enumerate(S))
run(c, "pg_colls", "SELECT collname, collprovider, collcollate FROM pg_collation WHERE collname IN ('C','POSIX','default','tr-TR-x-icu','tr-x-icu','und-x-icu','en-US-x-icu') OR collname ILIKE 'tr%' ORDER BY 1")
for nm, cl in [("default", None), ("C", '"C"'), ("tr_icu", '"tr-TR-x-icu"'), ("und_icu", '"und-x-icu"')]:
    col = "s" if cl is None else "s COLLATE " + cl
    run(c, "pg_rank_" + nm, "SELECT i, DENSE_RANK() OVER (ORDER BY %s) AS r, upper(%s), lower(%s), initcap(%s) FROM (VALUES %s) v(i,s) ORDER BY i" % (col, col, col, col, vals))
    run(c, "pg_like_" + nm, "SELECT i, " + ", ".join("CASE WHEN %s ILIKE %s THEN 1 ELSE 0 END" % (col, c.mogrify("%s", (p,)).decode()) for p in pats) + ", " + ", ".join("CASE WHEN %s LIKE %s THEN 1 ELSE 0 END" % (col, c.mogrify("%s", (p,)).decode()) for p in pats) + " FROM (VALUES %s) v(i,s) ORDER BY i" % vals)
run(c, "pg_eq", "SELECT 'a' = 'A', 'ab' = 'ab ', 'i' = 'İ', 'abc' < 'abd'")
# MySQL
my = pymysql.connect(host="127.0.0.1", port=3306, user="root", password="", charset="utf8mb4", autocommit=True); m = my.cursor()
mvals = ",".join(my.escape("x") and "ROW(%d,%s)" % (i, my.escape(s)) for i, s in enumerate(S))
for cl in ["utf8mb4_0900_ai_ci", "utf8mb4_tr_0900_ai_ci", "utf8mb4_0900_as_ci", "utf8mb4_unicode_ci", "utf8mb4_general_ci", "utf8mb4_bin"]:
    col = "CONVERT(s USING utf8mb4) COLLATE " + cl
    run(m, "my_rank_" + cl, "SELECT i, DENSE_RANK() OVER (ORDER BY %s) AS r, UPPER(%s), LOWER(%s), CHAR_LENGTH(s) FROM (VALUES %s) AS v(i,s) ORDER BY i" % (col, col, col, mvals))
    run(m, "my_like_" + cl, "SELECT i, " + ", ".join("CASE WHEN %s LIKE %s THEN 1 ELSE 0 END" % (col, my.escape(p)) for p in pats) + " FROM (VALUES %s) AS v(i,s) ORDER BY i" % mvals)
    run(m, "my_fn_" + cl, "SELECT i, REPLACE(%s, 'i', '#'), LOCATE('i', %s), INSTR(%s, 'ı') FROM (VALUES %s) AS v(i,s) ORDER BY i" % (col, col, col, mvals))
run(m, "my_eq", "SELECT 'a' = 'A', 'ab' = 'ab ', 'e' = 'é', 'ı' = 'i', 'ß' = 'ss', @@collation_connection, @@default_collation_for_utf8mb4")
out["S"] = S; out["pats"] = pats
json.dump(out, open(os.path.join(HERE, "db_yokla2.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("Bitti.")
