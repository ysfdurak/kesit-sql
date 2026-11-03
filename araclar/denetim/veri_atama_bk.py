#!/usr/bin/env python3
"""Pedal İzmir bisiklet ataması: yolculukların kullanıcı, istasyon, saat, mesafe ve ücretine dokunmadan her yolculuğa
aynı tipten (klasik/elektrikli) fiziksel olarak tutarlı bir bisiklet bulur; kamyonet dengelemesini (bk_rebalancing) ve
kullanıma orantılı bakım kayıtlarını (bk_maintenance) üretir. Çıktı bk.js içine gömülür; site ve Power BI bu betiği çalıştırmaz.

Kullanım: python3 veri_atama_bk.py taban.sqlite i_esleme.json cikti.json [filo]
taban.sqlite: bk_trips satırları için; bike_id yalnız tip (mod 4) için okunur. i_esleme.json: trip_id -> üreteç sırası i.

Kurallar: bisiklet son bıraktığı istasyondan kalkar, iki yolculukta aynı anda olmaz, bakımdayken yola çıkmaz; kapanmamış
yolculuktan sonra bisikleti saha ekibi toplar (başlangıç istasyonundan kayıt). Kamyonet turları günde iki kez başlar (00:30, 12:00),
her tur bir sonraki tura kadarki talebi önceden bilir. Sonda tam 25 yolculuk bilerek çakıştırılır (konum zincirini bozmadan)."""
import os, sqlite3, json, sys, random, collections, datetime as dt, math
DB, IMAP, OUT = sys.argv[1:4]; FLEET = int(sys.argv[4]) if len(sys.argv) > 4 else 700
BATCH = int(__import__('os').environ.get('BATCH', 8)); HOR = __import__('os').environ.get('HOR', 'tur'); VANS = int(__import__('os').environ.get('VANS', 4)); TRAPS = 25; WRITE = FLEET == 700
c = sqlite3.connect(DB)
T = lambda s: int(dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc).timestamp())
S = lambda m: dt.datetime.fromtimestamp(m, dt.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
RN = random.Random(20240601 + 7)
ST = {r[0]: r for r in c.execute('select station_id,lat,lon,capacity,district from bk_stations')}
SIDS = sorted(ST)
dist = lambda a, b: math.hypot((ST[a][1] - ST[b][1]) * 111, (ST[a][2] - ST[b][2]) * 87)
NEAR = {a: sorted((b for b in SIDS if b != a), key=lambda b: (dist(a, b), b)) for a in SIDS}
TR = []
for tid, oldb, s, e, a, b in c.execute('select trip_id,bike_id,start_station,end_station,started_at,ended_at from bk_trips order by trip_id'):
    TR.append((tid, 'e' if oldb % 4 == 0 else 'c', s, e, T(a), T(b) if b else None))
BIKES = {'e': [i for i in range(1, 701) if i % 4 == 0], 'c': [i for i in range(1, 701) if i % 4]}
if FLEET != 700:  # yalnız "kaç bisiklet yeterdi" ölçümü
    BIKES = {k: v[:round(len(v) * FLEET / 700)] for k, v in BIKES.items()}
T0 = T('2024-06-01 00:00:00'); DAY = 86400; TEND = T('2024-09-01 00:00:00')
# ---- bakım seçimi: tam 1400 kayıt, kapanmış yolculuk sonrası rastgele; kullanım arttıkça artar
closed = [t for t in TR if t[5] is not None]
pick = RN.sample(range(len(closed)), 1400); pick.sort()
ISSUE = [('batarya', 20, 12, 70), ('fren', 20, 6, 36), ('lastik', 20, 4, 24), ('zincir', 10, 6, 36), ('kilit', 10, 12, 48), ('temizlik', 20, 2, 6)]
TK = {}
for ii, pi in enumerate(pick):
    t = closed[pi]; v = RN.random() * 100
    for name, w, lo, hi in ISSUE:
        v -= w
        if v < 0: break
    if name == 'batarya' and t[1] != 'e': name, lo, hi = 'fren', 6, 36
    op = t[5] + RN.randint(5, 90) * 60; op -= op % 60
    TK[t[0]] = dict(open=op, close=op + RN.randint(lo, hi) * 3600 + RN.randint(0, 11) * 300, issue=name)
# 60 kayıt açık kalır: bisiklet dönem sonuna kadar servis dışı (20'si 15 Ağustos'tan önce açılmış, unutulmuş)
early = [k for k, v in TK.items() if v['open'] < T('2024-08-15 00:00:00') and v['open'] > T('2024-06-20 00:00:00')]
late = [k for k, v in TK.items() if v['open'] >= T('2024-08-15 00:00:00')]
for k in RN.sample(early, 20) + RN.sample(late, 40): TK[k]['close'] = None
# ---- kapanmamış yolculuklar: bisiklet 1-3 gece sonra toplanır
UNC = {t[0]: None for t in TR if t[5] is None}
# ---- durum
idle = {s: {'e': [], 'c': []} for s in SIDS}   # (boşta bisikletler)
docked = collections.Counter()
ROWS = []; MAINT = []; ASSIGN = {}
ev_end = []   # (zaman, tür, ...) sıralı işlenir
import heapq
heap = []; hseq = 0
def push(t, kind, data):
    global hseq
    hseq += 1; heapq.heappush(heap, (t, hseq, kind, data))
LAST = {}   # bike -> son yolculuk (trip_id) / son konum zamanı
BLOC = {}
# ---- talep indeksleri
START = sorted(TR, key=lambda t: (t[4], t[0]))
def horizon_events(a, b):
    """(a,b] içindeki istasyon olayları; yeni başlayan yolculuklar ve bitişler, bakım dönüşleri"""
    return HE[a]
def plan_round(t0, t1, si):
    """t0 anı için: her istasyon-tip gereksinimi. si: START içindeki sıradaki yolculuk indisi"""
    ev = collections.defaultdict(list)
    i = si
    while i < len(START) and START[i][4] < t1:
        x = START[i]; ev[x[2]].append((x[4], -1, x[1])); i += 1
    # uçuştaki ve yeni bitişler
    for x in START[si:i]:
        if x[5] is not None:
            tk = TK.get(x[0])
            ev[x[3]].append((x[5], 1 if not tk else 0, x[1]))
            if tk: ev[x[3]].append((x[5], 2, x[1]))
    for t, _, kind, d in heap:
        if t < t1:
            if kind == 'end':
                tk = d['tk']; ev[d['st']].append((t, 1 if not tk else 0, d['ty']))
                if tk: ev[d['st']].append((t, 2, d['ty']))
            elif kind == 'close':
                ev[d['st']].append((t, 3, d['ty']))
            elif kind == 'drop':
                ev[d['to']].append((t, 3, d['ty']))
    for x in START[si:i]:
        tk = TK.get(x[0])
        if tk and tk['close'] and tk['close'] < t1 and x[5] is not None: ev[x[3]].append((tk['close'], 3, x[1]))
    res = {}
    for s in SIDS:
        cur = {'e': 0, 'c': 0}; mn = {'e': 0, 'c': 0}; dock = 0; up = 0; first = {'e': None, 'c': None}; fo = None; d0 = sum(len(idle[s][q]) for q in 'ec')
        av0 = {y: len(idle[s][y]) for y in 'ec'}
        for t, k, y in sorted(ev.get(s, []), key=lambda e: (e[0], -e[1])):
            if k == -1:
                cur[y] -= 1; dock -= 1
                if cur[y] < mn[y]: mn[y] = cur[y]
                if first[y] is None and av0[y] + cur[y] < 0: first[y] = t
            elif k == 1: cur[y] += 1; dock += 1
            elif k == 0: dock += 1       # bakıma gidecek bisiklet geldi, hemen yuvadan çıkar
            elif k == 2: dock -= 1
            elif k == 3: cur[y] += 1; dock += 1
            if dock > up: up = dock
            if fo is None and d0 + dock > ST[s][3]: fo = t
        res[s] = dict(need={y: -mn[y] for y in 'ec'}, up=up, first=first, fo=fo)
    return res

moves = 0; emer = 0; overflow = 0; batches = []
def do_moves(t0, t1, si, night, t2=None):
    """Tur planı: eksik istasyonlara yakın fazlalıktan kamyonetle taşı. t2: gece turunda ertesi gecenin talebi (imkân varsa)."""
    global moves
    P = plan_round(t0, t1, si)
    Q = plan_round(t0, t2, si) if t2 else None
    exc = {s: {y: max(0, len(idle[s][y]) - P[s]['need'][y]) for y in 'ec'} for s in SIDS}   # fiziken verilebilecek fazlalık
    dem = []
    for s in SIDS:
        for y in 'ec':
            k = P[s]['need'][y] - len(idle[s][y])
            if k > 0: dem.append((s, y, k, P[s]['first'][y] or t1))
    dem.sort(key=lambda d: (d[3], -d[2], d[0]))
    agg = {}
    def net(s):  # tur sonrası istasyondaki bisiklet farkı
        return sum(a['e'] + a['c'] for k_, a in agg.items() if k_[1] == s) - sum(a['e'] + a['c'] for k_, a in agg.items() if k_[0] == s)
    def room(s):
        return ST[s][3] - P[s]['up'] - sum(len(idle[s][y]) for y in 'ec') - net(s)
    for s, y, n, dl in dem:
        want = n
        for o in NEAR[s]:
            if want <= 0: break
            k = min(exc[o][y], want)
            if k <= 0: continue
            a = agg.setdefault((o, s), dict(e=0, c=0, dl=dl)); a[y] += k; a['dl'] = min(a['dl'], dl)
            exc[o][y] -= k; want -= k
        if want > 0: raise RuntimeError(('bisiklet yetmiyor', S(t0), s, y, want))
    if Q:   # gece turu: ertesi güne de yetsin; yalnız bu turun ihtiyacını aşan fazlalıktan, yalnız yola zaten çıkılan durağa
        dq = sorted(((Q[s]['need'][y] - P[s]['need'][y], s, y) for s in SIDS for y in 'ec' if Q[s]['need'][y] > P[s]['need'][y]), key=lambda x: (-x[0], x[1], x[2]))
        for k0, s, y in dq:
            for (o, s2), a in sorted(agg.items()):
                if s2 != s or k0 <= 0: continue
                k = min(k0, exc[o][y], room(s))
                if k > 0: a[y] += k; exc[o][y] -= k; k0 -= k
    # Kamyonet tek bisiklet için çıkmaz: yuva varsa durağa en az BATCH bisiklet götür
    for (o, s), a in sorted(agg.items()):
        for y in 'ec':
            k = min(BATCH - (a['e'] + a['c']), exc[o][y], room(s))
            if k > 0: a[y] += k; exc[o][y] -= k
    # Taşma: yuva yetmeyecekse fazlayı en yakın boş istasyona
    for s in SIDS:
        over = -room(s)
        for o in NEAR[s]:
            if over <= 0: break
            mv = min(room(o), over)
            for y in 'ce':
                k = min(mv, exc[s][y])
                if k > 0:
                    a = agg.setdefault((s, o), dict(e=0, c=0, dl=P[s]['fo'] or t1)); a['dl'] = min(a['dl'], P[s]['fo'] or t1); a[y] += k; exc[s][y] -= k; mv -= k; over -= k
    # Saatleri ver: VANS kamyonet, durak başı 25 dk; son teslim saatine göre sırala
    order = sorted(agg.items(), key=lambda kv: (kv[1]['dl'], kv[0]))
    span = (5 if night else 2) * 3600
    slot = [t0] * VANS
    for ix, ((o, s), a) in enumerate(order):
        van = ix % VANS; at = slot[van] + 25 * 60; slot[van] = at
        if at >= a['dl']: at = max(t0, a['dl'] - 120)
        if at > t0: at -= at % 60
        batches.append(at)
        for y in 'ce':
            for _ in range(a[y]):
                L = idle[o][y]; b = L.pop(RN.randrange(len(L)))
                push(at, 'drop', dict(bike=b, fr=o, to=s, ty=y))
                moves += 1

# Başlangıç yerleşimi: ilk turun talebine göre, kalan kapasiteye orantılı
P0 = plan_round(T0, T0 + DAY // 2, 0)
pool = {y: list(BIKES[y]) for y in 'ec'}
for y in 'ec': RN.shuffle(pool[y])
for s in SIDS:
    for y in 'ec':
        k = min(P0[s]['need'][y], len(pool[y]))
        for _ in range(k): idle[s][y].append(pool[y].pop())
tries = 0
weights = {s: ST[s][3] for s in SIDS}
while (pool['e'] or pool['c']) and tries < 100000:
    tries += 1
    s = RN.choices(SIDS, weights=[weights[x] for x in SIDS])[0]
    if sum(len(idle[s][y]) for y in 'ec') + P0[s]['up'] >= ST[s][3] * 0.8: continue
    y = 'c' if pool['c'] and (not pool['e'] or RN.random() < 0.75) else 'e'
    idle[s][y].append(pool[y].pop())
for y in 'ec':
    while pool[y]:
        s = min(SIDS, key=lambda s: sum(len(idle[s][q]) for q in 'ec') / ST[s][3]); idle[s][y].append(pool[y].pop())
START_POS = {s: {y: list(idle[s][y]) for y in 'ec'} for s in SIDS}

# ---- ana döngü
day0 = T0
rounds = []
d = T0
while d < TEND + DAY:
    rounds.append((d + 1800, True)); rounds.append((d + 12 * 3600, False)); d += DAY
ri = 0; si = 0; finished = 0; lost = []
SINCE = {}; RIDES = collections.Counter()
def process_until(t):
    global overflow
    while heap and heap[0][0] <= t:
        tm, _, kind, dd = heapq.heappop(heap)
        SINCE[dd.get('bike')] = tm
        if kind == 'end':
            s = dd['st']
            if dd['tk']:
                tk = dd['tk']; MAINT.append((dd['bike'], tk['open'], tk['close'], tk['issue']))
                if tk['close']: push(tk['close'], 'close', dict(bike=dd['bike'], st=s, ty=dd['ty']))
            else:
                if sum(len(idle[s][q]) for q in 'ec') >= ST[s][3]: overflow += 1
                idle[s][dd['ty']].append(dd['bike'])
        elif kind == 'close':
            idle[dd['st']][dd['ty']].append(dd['bike'])
        elif kind == 'drop':
            ROWS.append((dd['bike'], dd['fr'], dd['to'], tm))
            idle[dd['to']][dd['ty']].append(dd['bike'])
for x in START:
    tid, ty, s, e, a, b = x
    while ri < len(rounds) and rounds[ri][0] <= a:
        t0 = rounds[ri][0]; t1 = rounds[ri + 1][0] if ri + 1 < len(rounds) else t0 + DAY
        t2 = rounds[ri + 2][0] if rounds[ri][1] and ri + 2 < len(rounds) and HOR == 'gun' else None
        process_until(t0)
        # toplanan kayıp bisikletler
        if rounds[ri][1]:
            for item in lost[:]:
                lb, lst, lty, ready = item
                if ready <= t0:
                    lost.remove(item)
                    to = next(o for o in NEAR[lst] if sum(len(idle[o][q]) for q in 'ec') < ST[o][3] - 2)
                    push(t0 + 600, 'drop', dict(bike=lb, fr=lst, to=to, ty=lty))
        do_moves(t0, t1, si, rounds[ri][1], t2)
        ri += 1
    process_until(a)
    L = idle[s][ty]
    if not L:   # beklenmedik: acil dengeleme
        emer += 1
        if os.environ.get('DBG'): print('acil', S(a), s, ty, [ (S(x[0]),x[2],x[3]) for x in heap if x[2]=='drop' and x[3]['to']==s and x[3]['ty']==ty][:3])
        src = next(o for o in NEAR[s] if any(SINCE.get(q, 0) < a - 900 for q in idle[o][ty]))
        b_ = next(q for q in idle[src][ty] if SINCE.get(q, 0) < a - 900); idle[src][ty].remove(b_)
        mv_ = a - 120; mv_ -= mv_ % 60; ROWS.append((b_, src, s, mv_)); L.append(b_)
    if tid in TK and RN.random() < 0.85:   # bakım çoğunlukla en çok yol yapmış bisiklete düşer
        bike = max(L, key=lambda q: (RIDES[q], -q)); L.remove(bike)
    else:
        bike = L.pop(RN.randrange(len(L)))
    ASSIGN[tid] = bike; RIDES[bike] += 1
    if tid in TK: RIDES[bike] = 0
    if b is None:
        lost.append((bike, s, ty, a + RN.randint(8, 60) * 3600))
    else:
        push(b, 'end', dict(bike=bike, st=e, ty=ty, tk=TK.get(tid)))
    si += 1
process_until(TEND + 40 * DAY)
print('filo', FLEET, 'yolculuk', len(ASSIGN), 'dengeleme satırı', len(ROWS), 'tur-durak', len(batches), 'ortalama yük', round(moves / max(1, len(batches)), 1), 'acil', emer, 'yuva taşması', overflow, 'kullanılan', len(set(ASSIGN.values())), 'bakım', len(MAINT))
if not WRITE: sys.exit(0)

# ---- bilinçli tuzak: 25 yolculuk başka bir bisikletin yolculuğuyla çakışır; konum zinciri bozulmaz
bytrip = {t[0]: t for t in TR}
perb = collections.defaultdict(list)
for t in TR: perb[ASSIGN[t[0]]].append(t)
for v in perb.values(): v.sort(key=lambda t: t[4])
RB = collections.defaultdict(list)
for b, f, to, at in ROWS: RB[b].append(at)
MB = collections.defaultdict(list)
for b, o, cl, _ in MAINT: MB[b].append((o, cl))
RT = random.Random(20240625)
cand = [t for t in TR if t[5] is not None and t[2] == t[3] and t[0] not in TK]
RT.shuffle(cand)
early = [t for t in cand if t[4] < T('2024-06-04 00:00:00')]
order = early + [t for t in cand if t[4] >= T('2024-06-04 00:00:00')]
ending = collections.defaultdict(list)
for t in TR:
    if t[5] is not None: ending[(t[3], t[1])].append(t)
for v in ending.values(): v.sort(key=lambda t: t[5])
import bisect
trap = []; usedb = set(); nearly = 0
for t in order:
    if len(trap) >= TRAPS: break
    if t[4] < T('2024-06-04 00:00:00') and nearly >= 4: continue
    Es = ending[(t[2], t[1])]; ks = [e[5] for e in Es]; j = bisect.bisect_right(ks, t[4])
    for q in Es[j:j + 6]:          # q: t başlarken sürüyor, t'nin istasyonunda bitiyor
        if not (q[4] < t[4] < q[5]): continue
        B = ASSIGN[q[0]]
        if B in usedb or B == ASSIGN[t[0]] or q[0] in TK: continue
        seq = perb[B]; ix = seq.index(q); nx = seq[ix + 1] if ix + 1 < len(seq) else None
        endt = max(t[5], q[5])
        if nx is not None and nx[4] <= endt + 60: continue
        if any(q[4] < a < endt + 60 for a in RB[B]): continue
        if any(o < endt + 60 and (cl is None or cl > q[4]) for o, cl in MB[B]): continue
        # eski bisikletin zinciri: t gidiş-dönüş, çıkarınca bozulmaz; ama bakım t'ye bağlı değil
        trap.append((t[0], ASSIGN[t[0]], B)); usedb.add(B); usedb.add(ASSIGN[t[0]])
        if t[4] < T('2024-06-04 00:00:00'): nearly += 1
        ASSIGN[t[0]] = B
        break
print('tuzak', len(trap), 'ilk üç gün', nearly)
# ---- yaz
IM = json.load(open(IMAP))
MAXI = max(IM.values())
arr = [0] * (MAXI + 1)
for tid, b in ASSIGN.items(): arr[IM[str(tid)]] = b
A36 = '0123456789abcdefghijklmnopqrstuvwxyz'
enc = ''.join(A36[b // 36] + A36[b % 36] for b in arr[1:])
ROWS.sort(key=lambda r: (r[3], r[1], r[2], r[0]))
MAINT.sort(key=lambda r: (r[1], r[0]))
json.dump(dict(atama=enc, rebal=[[b, f, t, S(at)] for b, f, t, at in ROWS],
               maint=[[b, S(o), S(cl) if cl else None, i] for b, o, cl, i in MAINT], trap=[list(x) for x in trap]), open(OUT, 'w'))
