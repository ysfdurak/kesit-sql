"""PostgreSQL ve MySQL'i (D:\\Users\\YsF\\kesitdb) başlatır, bağlantıyı dener, sonucu db_kontrol.json'a yazar."""
import os, sys, json, time, socket, subprocess, glob
E = r"D:\Users\YsF\kesitdb\env"; D = r"D:\Users\YsF\kesitdb"; B = E + r"\Library\bin"
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ["PATH"] = ";".join([E, B, E + r"\Scripts", os.environ.get("PATH", "")])
DET = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
def acik(p):
    s = socket.socket(); s.settimeout(1)
    try: return s.connect_ex(("127.0.0.1", p)) == 0
    finally: s.close()
out = {"adim": []}
if not acik(5432):
    subprocess.Popen([B + r"\pg_ctl.exe", "-D", D + r"\pg", "-l", D + r"\pg.log", "-o", "-p 5432", "start"], creationflags=DET, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
    out["adim"].append("pg baslatildi")
if not acik(3306):
    em = glob.glob(E + r"\Library\share\mysql\english\errmsg.sys")
    lc = os.path.dirname(os.path.dirname(em[0])) if em else E + r"\Library\share\mysql"
    if not os.path.exists(D + r"\my\mysql"):
        r = subprocess.run([B + r"\mysqld.exe", "--initialize-insecure", "--basedir=" + E + r"\Library", "--datadir=" + D + r"\my", "--lc-messages-dir=" + lc], capture_output=True, text=True, errors="ignore")
        out["adim"].append("mysql init " + str(r.returncode))
    subprocess.Popen([B + r"\mysqld.exe", "--basedir=" + E + r"\Library", "--datadir=" + D + r"\my", "--port=3306", "--lc-messages-dir=" + lc, "--log-error=" + D + r"\mysql.err", "--local-infile=1"], creationflags=DET, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
    out["adim"].append("mysql baslatildi")
for _ in range(40):
    if acik(5432) and acik(3306): break
    time.sleep(1)
out["port"] = {"5432": acik(5432), "3306": acik(3306)}
try:
    import psycopg2
    c = psycopg2.connect(host="127.0.0.1", port=5432, user="postgres", dbname="postgres", connect_timeout=5); k = c.cursor()
    k.execute("SELECT version()"); out["pg"] = k.fetchone()[0]
    k.execute("SELECT datcollate, datctype FROM pg_database WHERE datname='postgres'"); out["pg_locale"] = k.fetchone()
    c.close()
except Exception as e: out["pg_hata"] = str(e)[:300]
try:
    import pymysql
    c = pymysql.connect(host="127.0.0.1", port=3306, user="root", password="", connect_timeout=5); k = c.cursor()
    k.execute("SELECT VERSION(), @@character_set_server, @@collation_server, @@sql_mode, @@lower_case_table_names"); out["mysql"] = k.fetchone()
    c.close()
except Exception as e: out["mysql_hata"] = str(e)[:300]
try: out["mysql_err"] = open(D + r"\mysql.err", encoding="utf-8", errors="ignore").read()[-1500:]
except Exception: pass
json.dump(out, open(os.path.join(HERE, "db_kontrol.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1)); print("Bitti. Pencereyi kapatabilirsin.")
