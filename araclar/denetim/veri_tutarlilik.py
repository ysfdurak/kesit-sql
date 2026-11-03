#!/usr/bin/env python3
"""Ortak veri setlerinin fiziksel tutarlılığını denetler ve bilerek bırakılan izleri sayar.
Kullanım: python3 veri_tutarlilik.py [base.sqlite]      Beklenenden sapma varsa çıkış kodu 1.
Kanat: uçak ışınlanması, çakışma, dönüş süresi, koltuk, gec_gelen_ucak. Pedal: bisiklet ışınlanması, çakışma, bakımda yolculuk,
tip, kapanmamış yolculuk, yuva. Anadolu: web_events tekrar ve sıra izleri."""
import sqlite3, sys, os, collections, datetime as dt, statistics as st
DB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'base.sqlite')
c = sqlite3.connect(DB)
T = lambda s: int(dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc).timestamp())
INTL = {'FRA', 'BER', 'AMS', 'LHR', 'CDG', 'DXB', 'BAK'}
sorun = []
def rapor(ad, deger, beklenen=None):
    tut = beklenen is None or deger == beklenen
    print(f"  {ad}: {deger}" + ('' if beklenen is None else (' (beklenen %s)' % beklenen if tut else f'  <<< BEKLENEN {beklenen}')))
    if not tut: sorun.append(ad)

print('== Kanat Havayolları')
F = c.execute("""select f.flight_id,f.tail_no,r.origin,r.dest,f.sched_dep,f.sched_arr,f.actual_dep,f.actual_arr,f.status,f.pax,r.block_min,a.seats,a.model
  from hv_flights f join hv_routes r using(route_id) join hv_aircraft a using(tail_no) order by f.flight_id""").fetchall()
def varsa(q):
    try: return c.execute(q).fetchall()
    except sqlite3.OperationalError: return []
P = varsa('select tail_no,origin,dest,dep_time,arr_time from hv_repositioning')
ev = collections.defaultdict(list)
for x in F:
    fid, tail, o, d, sd, sa, ad, aa, s, pax, blk, seats, model = x
    if s == 'cancelled': continue
    end = T(aa) if aa else T(ad) + (blk + 240) * 60   # yön değiştiren: uçak hedefe sonradan döner
    ev[tail].append(dict(k='f', id=fid, o=o, d=d, a=T(ad), b=end, sd=T(sd), sa=T(sa), intl=o in INTL or d in INTL, late=(T(aa) - T(sa)) / 60 if aa else None))
for tail, o, d, a, b in P:
    ev[tail].append(dict(k='p', id=None, o=o, d=d, a=T(a), b=T(b), sd=T(a), sa=T(b), intl=o in INTL or d in INTL, late=None))
tel = ov = ta = sta = 0; gaps = []
for tail, L in ev.items():
    L.sort(key=lambda e: e['a'])
    for u, v in zip(L, L[1:]):
        if u['d'] != v['o']: tel += 1
        g = (v['a'] - u['b']) / 60
        if g < 0: ov += 1
        need = 60 if (u['intl'] or v['intl']) else 35
        if g < need: ta += 1
        if (v['sd'] - u['sa']) / 60 < need: sta += 1
        gaps.append(g)
rapor('uçak ışınlanması (uçuş + konumlandırma zinciri)', tel, 0)
rapor('aynı uçak aynı anda (gerçek zaman)', ov, 0)
rapor('dönüş süresi ihlali, gerçek (iç 35, dış 60 dk)', ta, 0)
rapor('dönüş süresi ihlali, plan', sta, 0)
rapor('yolcu > koltuk', sum(1 for x in F if x[9] and x[9] > x[11]), 0)
rapor('Dubai seferi A330 dışında', sum(1 for x in F if 'DXB' in (x[2], x[3]) and x[12] != 'A330-300'), 0)
rapor('A330 iç hatta', sum(1 for x in F if x[12] == 'A330-300' and not ({x[2], x[3]} & INTL)), 0)
pl = collections.defaultdict(list)
for x in F: pl[x[1]].append((T(x[4]), T(x[5])))
ovs = 0
for t, L in pl.items():
    L.sort()
    ovs += sum(1 for u, v in zip(L, L[1:]) if v[0] < u[1])
rapor('planlanan aralıkları çakışan ardışık sefer (iptaller dahil)', ovs, 0)
n = c.execute("""with u as (select f.tail_no,r.dest,lead(r.origin) over (partition by f.tail_no order by f.sched_dep,f.flight_id) s from hv_flights f join hv_routes r using(route_id)) select count(*) from u where s<>dest""").fetchone()[0]
n2 = c.execute("""with u as (select f.tail_no,r.dest,lead(r.origin) over (partition by f.tail_no order by f.sched_dep,f.flight_id) s from hv_flights f join hv_routes r using(route_id) where f.status<>'cancelled') select count(*) from u where s<>dest""").fetchone()[0]
rapor('yalnız hv_flights ile kopukluk, iptaller dahil (bilgi)', n)
rapor('yalnız hv_flights ile kopukluk, iptaller hariç (bilgi; konumlandırmayla kapanır)', n2)
rapor('konumlandırma uçuşu (bilgi)', len(P))
rapor('konumlandırma blok saati (bilgi)', round(sum(T(p[4]) - T(p[3]) for p in P) / 3600))
canc_away = 0
for x in F:
    if x[8] != 'cancelled': continue
    L = ev[x[1]]; cur = L[0]['o'] if L else None; m = T(x[4])
    for e in L:
        if e['a'] > m: break
        cur = e['d']
    if cur != x[2]: canc_away += 1
rapor('iptal sefer: planlanan uçak kalkış anında başka yerde (bilgi; iptal nedeni olabilir)', canc_away)
# rötar nedeni
d = collections.defaultdict(list)
for fid, reason, mins in c.execute('select flight_id,reason,minutes from hv_delays'): d[fid].append((reason, mins))
prev = {}
for tail, L in ev.items():
    fs = [e for e in L]
    for u, v in zip(fs, fs[1:]):
        if v['k'] == 'f': prev[v['id']] = u
bad = keep = strict = 0; gl = []
for fid, rows in d.items():
    if not any(r == 'gec_gelen_ucak' for r, _ in rows): continue
    p = prev.get(fid)
    if not p or p['k'] != 'f' or p['late'] is None or p['late'] < 15: bad += 1; continue
    keep += 1
    v = next(e for e in ev[next(x[1] for x in F if x[0] == fid)] if e['id'] == fid)
    g = (v['sd'] - p['b']) / 60; gl.append(g)
    if g < (60 if p['intl'] or v['intl'] else 35): strict += 1
rapor('gec_gelen_ucak var ama önceki sefer zamanında indi', bad, 0)
rapor('gec_gelen_ucak satırı (bilgi)', c.execute("select count(*) from hv_delays where reason='gec_gelen_ucak'").fetchone()[0])
rapor('  bunlardan uçak planlanan kalkışa hazır değildi (bilgi)', strict)
if gl: rapor('  önceki iniş ile planlanan kalkış arası, medyan dk (bilgi)', round(st.median(gl)))
# zincir olasılığı
pp = lat = np_ = lat2 = 0
for tail, L in ev.items():
    fs = [e for e in L if e['k'] == 'f']
    for u, v in zip(fs, fs[1:]):
        dl = (v['a'] - v['sd']) / 60
        if u['late'] is None: continue
        if u['late'] >= 15:
            pp += 1; lat += dl >= 15
        else:
            np_ += 1; lat2 += dl >= 15
rapor('önceki sefer geç indiyse sonraki de >=15 dk geç kalkar, % (bilgi)', round(100 * lat / pp, 1))
rapor('önceki sefer zamanında indiyse sonraki >=15 dk geç kalkar, % (bilgi)', round(100 * lat2 / np_, 1))

print('== Pedal İzmir')
Tr = c.execute("""select t.trip_id,t.bike_id,t.start_station,t.end_station,t.started_at,t.ended_at,t.distance_km,b.model from bk_trips t join bk_bikes b using(bike_id) order by t.started_at,t.trip_id""").fetchall()
Mn = c.execute('select bike_id,opened_at,closed_at from bk_maintenance').fetchall()
Rb = varsa('select bike_id,from_station,to_station,moved_at from bk_rebalancing')
Cap = dict(c.execute('select station_id,capacity from bk_stations'))
big = collections.defaultdict(list)
for x in Tr:
    big[x[1]].append(dict(k='t', id=x[0], s=x[2], e=x[3], a=T(x[4]), b=T(x[5]) if x[5] else None))
for b, f, t, m in Rb: big[b].append(dict(k='r', id=None, s=f, e=t, a=T(m), b=T(m)))
bm = collections.defaultdict(list)
for b, o, cl in Mn: bm[b].append((T(o), T(cl) if cl else 10**12))
tel = pairs = rmove = unc_bad = 0; ovt = set(); tm = 0; tcount = collections.Counter()
for b, L in big.items():
    L.sort(key=lambda e: (e['a'], e['k'] == 't'))
    loc = None; busy = 0; lastT = None
    for e in L:
        if e['k'] == 't': tcount[b] += 1
        if loc is not None and e['s'] != loc: tel += 1
        if e['k'] == 't':
            if busy > e['a']: pairs += 1; ovt.add(e['id'])
            busy = max(busy, e['b'] or 10**12 if e['b'] else busy)
            if e['b'] is None: loc = e['s']; busy = 0; pend = True
            else: loc = e['e']; pend = False
            if any(o <= e['a'] < cl for o, cl in bm[b]): tm += 1
        else:
            if busy > e['a']: rmove += 1
            loc = e['e']
rapor('bisiklet ışınlanması (yolculuk + dengeleme zinciri)', tel, 0)
rapor('aynı bisiklet aynı anda, çakışan çift (bilerek)', c.execute("""select count(*) from bk_trips a join bk_trips b on b.bike_id=a.bike_id and a.trip_id<b.trip_id and a.started_at<b.ended_at and b.started_at<a.ended_at where a.ended_at is not null and b.ended_at is not null""").fetchone()[0], 25)
rapor('  1-3 Haziran penceresindeki çift (bilgi)', c.execute("""with t as (select * from bk_trips where started_at>='2024-06-01' and started_at<'2024-06-04' and ended_at is not null) select count(*) from t a join t b on b.bike_id=a.bike_id and a.trip_id<b.trip_id and a.started_at<b.ended_at and b.started_at<a.ended_at""").fetchone()[0])
rapor('bakım açıkken başlayan yolculuk', tm, 0)
rapor('yolculuk sürerken dengeleme', rmove, 0)
over_open = 0
for b, L in big.items():
    L2 = [e for e in L if e['k'] == 't']
rapor('kapanmamış yolculuk', sum(1 for x in Tr if x[5] is None), 316)
un = 0
for b, L in big.items():
    for u, v in zip(L, L[1:]):
        if u['k'] == 't' and u['b'] is None and not (v['k'] == 'r' and v['s'] == u['s']): un += 1
rapor('kapanmamış yolculuktan sonra bisiklet toplanmadan kullanıldı', un, 0)
sp = c.execute("""select m, round(avg(v),1) from (select b.model m, t.distance_km/((julianday(t.ended_at)-julianday(t.started_at))*24) v from bk_trips t join bk_bikes b using(bike_id) where t.ended_at is not null and t.end_station<>t.start_station) group by m""").fetchall()
rapor('ortalama hız km/s (elektrikli hızlı kalmalı, bilgi)', sp)
# Üreteçteki hız bandı: klasik 12, elektrikli 17 km/s, çarpan 0,9-1,29, 2 dk açılış. Mesafe yuvarlandığı için en az 2 km'de bakılır, %3 pay.
tip = 0
for x in Tr:
    if x[5] and x[2] != x[3] and x[6] >= 2:
        d_ = (T(x[5]) - T(x[4])) / 60 - 2
        v_ = x[6] / d_ * 60
        if (x[7] == 'klasik' and v_ > 12 / .9 * 1.03) or (x[7] == 'elektrikli' and v_ < 17 / 1.29 * .97): tip += 1
rapor('bisiklet tipine aykırı hızda yolculuk', tip, 0)
sd = dict(sp)
if not sd.get('elektrikli', 0) > sd.get('klasik', 0) + 2: sorun.append('hız farkı')
rapor('kullanılan bisiklet (bilgi)', len(tcount))
v = sorted(tcount.values())
rapor('bisiklet başına yolculuk en az/medyan/en çok (bilgi)', (v[0], v[len(v) // 2], v[-1]))
rapor('100 yolculuğun altında kalan bisiklet (bilgi)', sum(1 for x in v if x < 100))
rapor('bakım kaydı', len(Mn), 1400)
mc = collections.Counter(b for b, _, _ in Mn)
rapor('bakım gören bisiklet / bisiklet başına en çok (bilgi)', (len(mc), max(mc.values())))
tv = [(tcount[b], mc.get(b, 0)) for b in tcount]
mx = st.mean(a for a, _ in tv); my = st.mean(b for _, b in tv)
cor = sum((a - mx) * (b - my) for a, b in tv) / (sum((a - mx) ** 2 for a, _ in tv) * sum((b - my) ** 2 for _, b in tv)) ** .5
rapor('yolculuk ile bakım sayısı korelasyonu (bilgi)', round(cor, 2))
rapor('açık bakım kaydı (bilgi)', sum(1 for m in Mn if m[2] is None))
batch = collections.Counter((f, t, m) for _, f, t, m in Rb)
rapor('dengeleme satırı / kamyonet yükü (bilgi)', (len(Rb), len(batch)))
rapor('tek bisikletlik yük (bilgi)', sum(1 for x in batch.values() if x == 1))
# yuva
now = collections.Counter()
evs = []
loc0 = {}
for b, L in big.items():
    if L: now[L[0]['s']] += 1; 
    for e in L:
        if e['k'] == 't':
            evs.append((e['a'], 0, e['s'], -1))
            if e['b']: evs.append((e['b'], 1, e['e'], 1))
        else:
            evs.append((e['a'], 1, e['s'], -1) if False else (e['a'], 0, e['s'], -1)); evs.append((e['a'], 1, e['e'], 1))
for b, L in bm.items():   # bakımdaki bisiklet yuva tutmaz
    for o, cl in L:
        at = None
        for e in sorted(big.get(b, []), key=lambda e: e['a']):
            if (e['b'] or e['a']) <= o: at = e['e'] if e['b'] else e['s']
        if at is None: continue
        evs.append((o, 0, at, -1))
        if cl < 10**12: evs.append((cl, 1, at, 1))
evs.sort(key=lambda x: (x[0], x[1])); over = 0
for t, _, s, d_ in evs:
    now[s] += d_
    if d_ > 0 and now[s] > Cap[s]: over += 1
rapor('yuva sayısını aşan bitiş anı (bilgi; bakımdaki bisiklet yuva tutmaz)', over)
ne = c.execute("""with g as (select end_station s,count(*) n from bk_trips where end_station is not null group by 1), k as (select start_station s,count(*) n from bk_trips group by 1) select min(g.n-k.n),max(g.n-k.n) from g join k using(s)""").fetchone()
rapor('istasyon net akışı en düşük/en yüksek (bilgi)', ne)

print('== Anadolu Market web_events')
W = c.execute('select event_id,user_id,event_type,event_time,device from web_events order by event_id').fetchall()
rapor('satır / kullanıcı (bilgi)', (len(W), len({w[1] for w in W})))
rapor('kullanıcı', len({w[1] for w in W}), 600)
dup = c.execute('select coalesce(sum(n-1),0) from (select count(*) n from web_events group by user_id,event_type,event_time,device having count(*)>1)').fetchone()[0]
rapor('çift gönderilen olay (bilerek)', dup, 40)
rapor('  bunlardan purchase', c.execute("select coalesce(sum(n-1),0) from (select count(*) n from web_events where event_type='purchase' group by user_id,event_time having count(*)>1)").fetchone()[0], 8)
sira = {'visit': 1, 'product_view': 2, 'add_to_cart': 3, 'checkout': 4, 'purchase': 5}
bu = collections.defaultdict(list)
for w in W: bu[w[1]].append(w)
ters = 0
for u, L in bu.items():
    L.sort(key=lambda w: w[0])
    if any(a[3] > b[3] for a, b in zip(L, L[1:]) if a[0] + 1 == b[0] and b[0] <= len(W) - 40): ters += 1
rapor('event_id sırasında zamanı geri giden kullanıcı (bilerek)', ters, 24)
rapor('huni tekil kullanıcı (bilgi)', [(k, len({w[1] for w in W if w[2] == k})) for k in sira])
rapor('huni ham olay (bilgi)', [(k, sum(1 for w in W if w[2] == k)) for k in sira])
print('SORUN', len(sorun), sorun if sorun else '')
sys.exit(1 if sorun else 0)
