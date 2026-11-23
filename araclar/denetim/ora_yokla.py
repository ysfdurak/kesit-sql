"""Gerçek Oracle'da tek tek SQL yoklaması: python ora_yokla.py (ora_yokla.sql'deki her ';;' ile ayrılmış ifade)."""
import os, sys
sys.argv.append("oracle")
import db_karsilastir as K

cn = K.connect()
cur = cn.cursor()
metin = open(os.path.join(K.HERE, "ora_yokla.sql"), encoding="utf-8").read()
for q in [x.strip() for x in metin.split(";;") if x.strip()]:
    try:
        cur.execute(q)
        r = cur.fetchall() if cur.description else None
        print("OK  ", q[:160].replace("\n", " "), "=>", str(r)[:300])
    except Exception as e:
        print("HATA", q[:160].replace("\n", " "), "=>", str(e).splitlines()[0][:200])
    cn.rollback()
