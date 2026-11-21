import sys, os, json, decimal, datetime
import pyodbc
here = os.path.dirname(os.path.abspath(__file__))
Q = json.load(open(os.path.join(here, "sorgu.json"), encoding="utf-8"))
drv = sorted([d for d in pyodbc.drivers() if "ODBC Driver" in d], reverse=True)[0]
def conn(db):
    return pyodbc.connect("DRIVER={%s};SERVER=localhost;DATABASE=%s;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=no" % (drv, db), autocommit=True)
def cv(v):
    if isinstance(v, decimal.Decimal): return float(v)
    if isinstance(v, (datetime.date, datetime.datetime)): return str(v)
    if isinstance(v, bytes): return v.hex()
    return v
out = []
cs = {}
for i, q in enumerate(Q):
    db = q.get("db", "master")
    try:
        if db not in cs: cs[db] = conn(db)
        cur = cs[db].cursor(); cur.execute(q["sql"])
        sets = []
        while True:
            if cur.description: sets.append([[cv(x) for x in r] for r in cur.fetchall()])
            if not cur.nextset(): break
        out.append({"id": q.get("id", i), "sets": sets})
    except Exception as e:
        out.append({"id": q.get("id", i), "err": str(e)[:400]})
    if i % 20 == 0: print(i, "/", len(Q))
json.dump(out, open(os.path.join(here, "sorgu_sonuc.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("Bitti:", len(out), "sorgu. Pencereyi kapatabilirsin.")
