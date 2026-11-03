#!/usr/bin/env python3
"""Kanat Havayolları kuyruk ataması: seferlerin rota, saat, rötar, durum ve yolcusuna dokunmadan her
uçuşa fiziksel olarak tutarlı bir uçak bulur, gereken konumlandırma uçuşlarını ve rötar nedeni düzeltmelerini
hesaplar. Çıktı hv.js içindeki ATAMA bloğuna gömülür; site ve Power BI bu betiği çalıştırmaz.

Kullanım: python3 veri_atama_hv.py base.sqlite cikti.json   (scipy gerekir, sonuç deterministiktir)

Model: her uçak sınıfı için zaman-mekân ağı. Sefer yayı zorunlu, yer yayı serbest, konumlandırma yayı maliyetli.
Kural: dönüş süresi iç hat 35, dış hat 60 dk; hem plan hem gerçek zamanlar için geçerli. Yolcu <= koltuk.
Dubai'yi yalnız A330 uçar; A330 başka dış hatlara da gidebilir, iç hatta gitmez. İptal sefer uçağı hareket ettirmez.
Yön değiştiren seferde uçak varış havalimanına en erken gerçek kalkış + blok + 240 dk içinde döner sayılır."""
import sqlite3, collections, datetime as dt, sys, bisect, json, time, random
import numpy as np, scipy.sparse as sp
from scipy.optimize import linprog

DB, OUT = sys.argv[1], sys.argv[2]
c = sqlite3.connect(DB)
T = lambda s: int(dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc).timestamp() // 60)
S = lambda m: dt.datetime.fromtimestamp(m * 60, dt.timezone.utc).strftime('%Y-%m-%d %H:%M:00')
INTL = {'FRA', 'BER', 'AMS', 'LHR', 'CDG', 'DXB', 'BAK'}
TA_I, TA_D, DIV_HOLD = 60, 35, 240
ROWS = c.execute("""select f.flight_id,r.origin,r.dest,f.sched_dep,f.sched_arr,f.actual_dep,f.actual_arr,f.status,f.pax,r.block_min
                    from hv_flights f join hv_routes r using(route_id) order by f.flight_id""").fetchall()
ROUTES = {(o, d): b for o, d, b in c.execute('select origin,dest,block_min from hv_routes')}
# Rota tablosunda olmayan ama konumlandırmada kullanılabilen kısa hat: İstanbul'un iki havalimanı ve SAW-ESB (blok, hv.js formülüyle)
ROUTES.update({('IST', 'SAW'): 35, ('SAW', 'IST'): 35, ('SAW', 'ESB'): 58, ('ESB', 'SAW'): 58})
HUB = sorted({o for o, d in ROUTES})
GG = {r[0] for r in c.execute("select flight_id from hv_delays where reason='gec_gelen_ucak'")}
class Fl: pass
FL, CANC = {}, []
for fid, o, d, sd, sa, ad, aa, st, pax, blk in ROWS:
    f = Fl(); f.id, f.o, f.d, f.sd, f.sa, f.st, f.pax, f.blk = fid, o, d, T(sd), T(sa), st, pax, blk
    f.intl = o in INTL or d in INTL; f.ad = T(ad) if ad else None; f.aa = T(aa) if aa else None
    if st == 'cancelled': CANC.append(f); continue
    f.ta = TA_I if f.intl else TA_D
    f.dep_t = min(f.sd, f.ad) - (TA_I - TA_D if f.intl else 0)
    f.rdy_t = (max(f.sa, f.aa) + f.ta) if f.aa else f.ad + f.blk + DIV_HOLD
    FL[fid] = f
WIDE = {i for i, f in FL.items() if 'DXB' in (f.o, f.d)}
CLS = {'W': (['TC-KWA', 'TC-KWB'], 289), 'A': (['TC-KNE', 'TC-KNF', 'TC-KNG'], 220),
       'B': (['TC-KBA', 'TC-KBB', 'TC-KBC', 'TC-KMA', 'TC-KMB'], 189), 'N': (['TC-KNA', 'TC-KNB', 'TC-KNC', 'TC-KND', 'TC-KYA'], 180)}

def network(fids, fleet, rewards=None, full=False):
    """fids: bu sınıfın uçuşları. Dönen: (yay listesi, düğüm sayısı, başlangıç, bitiş, b)"""
    ev = collections.defaultdict(list); nid = {}; n = 0
    def node(k):
        nonlocal n
        nid[k] = n; n += 1; return n - 1
    for i in fids:
        f = FL[i]
        node(('d', i)); node(('D', i)); node(('r', i)); node(('R', i))
        ev[f.o].append((f.dep_t, 1, i)); ev[f.d].append((f.rdy_t, 0, i))
    if full:  # sınıfın uçuşu olmayan havalimanından da geçilebilsin: 6 saatte bir geçiş noktası
        t0, t1 = min(FL[i].dep_t for i in FL), max(FL[i].rdy_t for i in FL)
        for a in HUB:
            for tz in range(t0, t1, 360):
                node(('z', a, tz)); ev[a].append((tz, 2, ('z', a, tz)))
    s = node('S'); t = node('T')
    A = []  # (u,v,cost,lb,ub,tag)
    times = {}
    for a, e in ev.items():
        e.sort(key=lambda x: (x[0], x[1], str(x[2]))); times[a] = e
        ids = [(nid[i] if k == 2 else nid[('D', i)] if k else nid[('r', i)]) for _, k, i in e]
        for u, v in zip(ids, ids[1:]): A.append((u, v, 0, 0, None, 'g'))
        A.append((s, ids[0], 0, 0, None, 's')); A.append((ids[-1], t, 0, 0, None, 'e'))
    A.append((s, t, 10**6, 0, None, 'x'))
    for i in fids:
        f = FL[i]
        A.append((nid[('D', i)], nid[('d', i)], 0, 0, None, 'G2'))  # yerden kalkış düğümüne
        A.append((nid[('d', i)], nid[('R', i)], 0, 1, 1, ('f', i)))
        A.append((nid[('R', i)], nid[('r', i)], 0, 0, None, 'G3'))
    # D düğümü zincirde kalır: yer zinciri D içinden geçer, uçak d'ye çıkar; r düğümü de zincirdedir
    for (o, d), blk in ROUTES.items():
        if o not in times or d not in times: continue
        ta = TA_I if (o in INTL or d in INTL) else TA_D
        keys = [x[0] for x in times[d]]
        for tt, k, i in times[o]:
            if k and not full: continue
            j = bisect.bisect_left(keys, tt + blk + ta)
            if j < len(keys):
                v = times[d][j]
                A.append((nid[i] if k == 2 else nid[('D' if k else 'r', i)], nid[v[2]] if v[1] == 2 else nid[('D', v[2])] if v[1] else nid[('r', v[2])], 1000 + blk, 0, None, ('p', o, d, blk, i)))
    if rewards:
        fset = set(fids)
        for (i, j), w in rewards.items():
            if i in fset and j in fset: A.append((nid[('R', i)], nid[('d', j)], -w, 0, 1, ('c', i, j)))
    b = np.zeros(n); b[s] = fleet; b[t] = -fleet
    return A, n, nid, s, t, b

def solve(A, n, b):
    m = len(A)
    M = sp.coo_matrix((np.r_[np.ones(m), -np.ones(m)], (np.r_[[a[0] for a in A], [a[1] for a in A]], np.r_[np.arange(m), np.arange(m)])), shape=(n, m)).tocsr()
    return linprog([a[2] for a in A], A_eq=M, b_eq=b, bounds=[(a[3], a[4]) for a in A], method='highs-ds')

def classes_lp(rew):
    """Uçuşları uçak sınıflarına dağıtır: çok ürünlü LP, ardından dalış (kesirli uçuşları adım adım sabitle)."""
    fids = list(FL)
    allowed = {i: ['W'] if i in WIDE else [k for k in ('NBAW' if FL[i].intl else 'NBA') if FL[i].pax <= CLS[k][1]] for i in fids}
    ks = list('NBAW'); off = 0; hdr = []
    for k in ks:
        fs = [i for i in fids if k in allowed[i]]
        A, n, nid, s, tt, b = network(fs, len(CLS[k][0]), rew)
        hdr.append((k, A, n, off, b, fs)); off += n
    ri = []; ci = []; v = []; cost = []; bnd = []; beq = np.zeros(off + len(fids))
    yv = collections.defaultdict(dict); col = 0
    for k, A, n, o, b, fs in hdr:
        beq[o:o + n] = b
        for a in A:
            ri += [o + a[0], o + a[1]]; ci += [col, col]; v += [1, -1]; cost.append(a[2])
            if isinstance(a[5], tuple) and a[5][0] == 'f':
                bnd.append((0, 1)); yv[a[5][1]][k] = col
                if k == 'W' and a[5][1] not in WIDE: cost[-1] = 300
            else: bnd.append((a[3], a[4]))
            col += 1
    for r, i in enumerate(fids):
        for k, cc in yv[i].items(): ri.append(off + r); ci.append(cc); v.append(1)
        beq[off + r] = 1
    M = sp.coo_matrix((v, (ri, ci)), shape=(off + len(fids), col)).tocsr()
    fixed = {}
    for it in range(40):
        bb = list(bnd)
        for i, k in fixed.items():
            for kk, cc in yv[i].items(): bb[cc] = (1, 1) if kk == k else (0, 0)
        t0 = time.time(); res = linprog(cost, A_eq=M, b_eq=beq, bounds=bb, method='highs')
        if res.status != 0:
            print('dalış geri', it, res.message[:50], flush=True)
            for i in last: fixed.pop(i)
            step = max(1, len(last) // 2); order = last[:step]
            for i in order: fixed[i] = sel[i]
            last = order
            continue
        sel = {i: max(yv[i], key=lambda k: (res.x[yv[i][k]], k)) for i in fids}
        fr = sorted([i for i in fids if i not in fixed and res.x[yv[i][sel[i]]] < 0.999], key=lambda i: -res.x[yv[i][sel[i]]])
        print('LP', it, round(res.fun), 'kesirli', len(fr), round(time.time() - t0), 's', flush=True)
        for i in fids:
            if res.x[yv[i][sel[i]]] >= 0.999: fixed[i] = sel[i]
        if not fr: break
        last = fr[:max(1, len(fr) // 3)]
        for i in last: fixed[i] = sel[i]
    print('dağılım', collections.Counter(fixed.values()), flush=True)
    return fixed

def reward_arcs():
    R = {}
    by = collections.defaultdict(list)
    for f in FL.values():
        if f.st == 'landed': by[f.d].append(f)
    for j in GG:
        if j not in FL: continue
        J = FL[j]
        for I in by[J.o]:
            ta = TA_I if (I.intl or J.intl) else TA_D
            if I.sa + ta > J.sd or I.aa + ta > J.ad or I.aa - I.sa < 15: continue
            gap = J.sd - I.aa
            if gap > 48 * 60: continue
            R[(I.id, j)] = 450 if gap < 0 or I.aa + ta > J.sd else 330 if gap < 6 * 60 else 270 if gap < 12 * 60 else 210 if gap < 24 * 60 else 120
    print('ödüllü bağlantı', len(R), flush=True)
    return R

def trace(k, fids, rew):
    A, n, nid, s, t, b = network(fids, len(CLS[k][0]), rew, True)
    res = solve(A, n, b)
    assert res.status == 0, res.message
    x = np.round(res.x).astype(int)
    assert abs(res.x - x).max() < 1e-6
    out = collections.defaultdict(list); indeg = [0] * n
    for a, f in zip(A, x):
        if f > 0: out[a[0]].append((a, f)); indeg[a[1]] += f
    # düğüm sırası: Kahn; her düğümde uçak kuyruğu (en uzun bekleyen önce kalkar)
    tails = list(CLS[k][0]); at = collections.defaultdict(list); paths = {x_: [] for x_ in tails}
    from collections import deque
    pend = [0] * n; 
    for u in out:
        for a, f in out[u]: pend[a[1]] += 1
    q = deque([s]); at[s] = list(tails)
    while q:
        u = q.popleft()
        prio = lambda a: 0 if isinstance(a[0][5], tuple) and a[0][5][0] in ('f', 'c') else 1 if a[0][1] in dhead else 2
        dhead = {nid[('d', i)] for i in fids}
        arcs = sorted(out.get(u, []), key=prio)
        for a, f in arcs:
            for _ in range(int(f)):
                p = at[u].pop(0)
                if isinstance(a[5], tuple):
                    if a[5][0] == 'f': paths[p].append(('f', a[5][1]))
                    elif a[5][0] == 'p': paths[p].append(('p',) + a[5][1:4])
                at[a[1]].append(p)
            pend[a[1]] -= 1
            if pend[a[1]] == 0: q.append(a[1])
    return paths, sum(1 for a, f in zip(A, x) if f > 0 and isinstance(a[5], tuple) and a[5][0] == 'p'), sum(1 for a, f in zip(A, x) if f > 0 and isinstance(a[5], tuple) and a[5][0] == 'c')

REW = reward_arcs()
cl = classes_lp(REW)
PATHS = {}
for k in 'WABN':
    fs = sorted(i for i in FL if cl[i] == k)
    p, nf, nc = trace(k, fs, REW)
    print(k, 'uçuş', len(fs), 'konumlandırma', nf, 'ödüllü', nc, flush=True)
    PATHS.update(p)

# ---------- İkinci aşama: uçak adları, konumlandırma saatleri, iptaller, rötar nedenleri ----------
RX = random.Random(20240902)
FLEET = ['TC-KNA','TC-KNB','TC-KNC','TC-KND','TC-KNE','TC-KNF','TC-KNG','TC-KBA','TC-KBB','TC-KBC','TC-KMA','TC-KMB','TC-KWA','TC-KWB','TC-KYA']
SEATS = {t: CLS[k][1] for k in CLS for t in CLS[k][0]}

def ready_next(prev_f):  # uçağın önceki olaydan sonra serbest kalış zamanı
    return prev_f.rdy_t

ferries = []
def place(tail, path):
    """Yoldaki konumlandırmaları önceki uçuştan sonraya ve bir sonraki uçuştan önceye yerleştirir."""
    i = 0; prev = None; n = len(path)
    while i < n:
        if path[i][0] == 'f': prev = FL[path[i][1]]; i += 1; continue
        j = i
        while j < n and path[j][0] == 'p': j += 1
        chain = path[i:j]; nxt = FL[path[j][1]] if j < n else None
        low = prev.rdy_t if prev else min(FL[x[1]].dep_t for x in path if x[0] == 'f') - 3000
        assert nxt, (tail, 'sonda konumlandırma')
        lim = min(nxt.sd, nxt.ad); rows = []
        for k, (_, o, d, blk) in reversed(list(enumerate(chain))):
            intl = o in INTL or d in INTL or nxt.intl
            ta = TA_I if intl else TA_D
            slack = RX.choice([20, 30, 40, 50, 60])
            arr = lim - ta - slack
            dep = arr - blk
            h = dep % 1440 // 60
            if 1 <= h < 5:   # gece 01-05 arası kalkma: mümkünse akşama çek
                alt = dep - ((dep % 1440) - 23 * 60 - 0 if (dep % 1440) >= 23 * 60 else (dep % 1440) + 40)
                if alt >= low + 40 * len(chain): dep = alt; arr = dep + blk
            if dep < low:  # sıkışık pencere: ne kadar geç olursa olsun alt sınıra otur
                dep = low; arr = dep + blk
            dep -= dep % 5; 
            if dep < low: dep += 5
            arr = dep + blk
            rows.append((tail, o, d, dep, arr)); lim = dep
        ferries.extend(reversed(rows)); i = j

# Sınıf içinde hangi tescilin hangi yolu alacağı: derslerdeki örnekler boş kalmasın
def score_perm(tails, paths, want):
    best = None; import itertools
    keys = list(tails)
    for perm in itertools.permutations(keys):
        sc = 0
        for a, b in zip(keys, perm):
            fl = [FL[x[1]] for x in paths[a] if x[0] == 'f']
            sc += sum(w(b, fl) for w in want)
        if best is None or sc > best[0]: best = (sc, perm)
    return dict(zip(keys, best[1]))
day = lambda m: S(m)[:10]
def w_kna(b, fl):
    if b != 'TC-KNA': return 0
    a = sum(1 for f in fl if day(f.sd) in ('2024-12-01', '2024-12-02')); c_ = sum(1 for f in fl if day(f.sd) == '2024-12-10')
    late = sum(1 for f in fl if day(f.sd) in ('2024-12-01', '2024-12-02') and f.ad - f.sd >= 15)
    return min(a, 5) * 10 + min(c_, 3) * 10 + late * 3
def w_kbb(b, fl):
    if b != 'TC-KBB': return 0
    return min(3, sum(1 for f in fl if day(f.sd) == '2024-12-31')) * 10 + min(2, sum(1 for f in fl if day(f.sd) == '2024-12-30')) * 3
perm = {}
for k in 'WABN': perm.update(score_perm(CLS[k][0], PATHS, [w_kna, w_kbb]))
PATHS2 = {perm[a]: p for a, p in PATHS.items()}
TAIL = {}; SEQ = {}
for t, p in PATHS2.items():
    place(t, p)
    SEQ[t] = [FL[x[1]] for x in p if x[0] == 'f']
    for x in p:
        if x[0] == 'f': TAIL[x[1]] = t
ferries.sort(key=lambda r: (r[3], r[0]))

# İptal seferler: planlanan uçak, kalkış anında o havalimanında ve planlanan aralıkta boş
import bisect as _b
def loc_at(t, m):
    """uçağın m anındaki konumu; havadaysa None"""
    ev = []
    for f in SEQ[t]:
        ev.append((f.ad, f.rdy_t, f.o, f.d, f))
    for r in ferries:
        if r[0] == t: ev.append((r[3], r[4], r[1], r[2], None))
    ev.sort(key=lambda e: e[0])
    cur = ev[0][2]
    for dep, arr, o, d, _ in ev:
        if dep > m: return cur
        if arr > m: return None
        cur = d
    return cur
FSPAN = {t: sorted((f.sd, f.sa) for f in SEQ[t]) for t in SEQ}
CSPAN = collections.defaultdict(list); away = 0
for f in sorted(CANC, key=lambda x: x.sd):
    wide = 'DXB' in (f.o, f.d)
    pool = CLS['W'][0] if wide else (CLS['A'][0] + CLS['B'][0] + CLS['N'][0])
    free = [t for t in pool if not any(a < f.sa and f.sd < b for a, b in FSPAN[t] + CSPAN[t])]
    here = [t for t in free if loc_at(t, f.sd) == f.o]
    cand = here or free or list(pool)
    if not here: away += 1
    cand = sorted(cand, key=lambda t: (len(CSPAN[t]) + len(SEQ[t]) / 1000, t))
    t = cand[0]; TAIL[f.id] = t; CSPAN[t].append((f.sd, f.sa))
print('iptal seferi: uçağı başka yerde', away, 'toplam', len(CANC))

# Rötar nedeni: önceki uçuşu gerçekten geç inmediyse gec_gelen_ucak başka nedene döner, dakika aynı kalır
reasons = c.execute('select rowid,flight_id,reason,minutes from hv_delays').fetchall()
byf = collections.defaultdict(list)
for r in reasons: byf[r[1]].append(r)
PREV = {}
for t, fl in SEQ.items():
    fl = sorted(fl, key=lambda f: (f.ad, f.id))
    for a, b in zip(fl, fl[1:]): PREV[b.id] = a
fer_by = collections.defaultdict(list)
for r in ferries: fer_by[r[0]].append(r)
def direct(a, b):
    return not any(a.ad < r[3] < b.ad for r in fer_by[TAIL[a.id]])
others = [('hava', 337), ('teknik', 168), ('yer_hizmetleri', 169), ('hava_trafik', 166)]
RELAB = []; keep = 0; strict = 0; gaps = []
for fid in sorted(byf):
    rows = byf[fid]
    gg = [r for r in rows if r[2] == 'gec_gelen_ucak']
    if not gg: continue
    p = PREV.get(fid); f = FL.get(fid)
    ok = p is not None and p.aa is not None and p.aa - p.sa >= 15 and direct(p, f)
    if ok:
        keep += 1; gaps.append(f.sd - p.aa)
        if p.aa + (TA_I if (p.intl or f.intl) else TA_D) > f.sd: strict += 1
        continue
    used = {r[2] for r in rows}
    pool = [(a, w) for a, w in others if a not in used]
    v = RX.random() * sum(w for _, w in pool)
    for a, w in pool:
        v -= w
        if v < 0: break
    RELAB.append((fid, a))
print('gec_gelen tutulan', keep, 'dönen', len(RELAB), 'uçak hazır değil (katı)', strict, 'ara medyan dk', sorted(gaps)[len(gaps) // 2] if gaps else None,
      '<6s', sum(1 for g in gaps if g < 360), '<12s', sum(1 for g in gaps if g < 720), '<24s', sum(1 for g in gaps if g < 1440))
print('uçak başına', sorted(collections.Counter(TAIL.values()).items()))
print('konumlandırma', len(ferries), 'toplam blok saat', round(sum(r[4] - r[3] for r in ferries) / 60), 'çiftler', collections.Counter((r[1], r[2]) for r in ferries).most_common(8))
FIDX = {t: chr(97 + i) for i, t in enumerate(FLEET)}
json.dump({'tails': ''.join(FIDX[TAIL[f[0]]] for f in ROWS),
           'ferries': [[r[0], r[1], r[2], S(r[3]), S(r[4])] for r in ferries],
           'relabel': RELAB, 'fleet_order': FLEET}, open(OUT, 'w'), ensure_ascii=False)
