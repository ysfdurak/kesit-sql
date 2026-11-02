/* ---------- SQL Arena (Oyun Alanı) ---------- */
const AR = window.SQLP_ARENA || {ch:[], pred:[], pz:[], det:[]};
const ARCH = {}; AR.ch.forEach(c=>ARCH[c.id]=c);
const ARDET = {}; AR.det.forEach(c=>ARDET[c.id]=c);
const DIFFN=['','Kolay','Orta','Zor'], DPTS=[0,10,25,50];
const SETN={market:'Anadolu Market', bank:'Anadolu Bank', hava:'Kanat Havayolları'};
const RANKS=[[0,'Çaylak'],[100,'Sorgu Çırağı'],[300,'Veri Avcısı'],[700,'Analist'],[1200,'Sorgu Ustası'],[2000,'SQL Efsanesi']];
let ARS=null, arTimer=null, arFlt={d:0, set:'', st:''};
function arP(){ const a=P.ar=P.ar||{}; a.pts=a.pts||0; a.ch=a.ch||{}; a.daily=a.daily||{}; a.speed=a.speed||{best:0, runs:0}; a.pred=a.pred||{seen:{}, best:0}; a.pz=a.pz||{}; a.det=a.det||{}; return a; }
function arRank(p){ let i=0; RANKS.forEach((r,j)=>{ if(p>=r[0]) i=j; }); const nx=RANKS[i+1]; return {name:RANKS[i][1], i, next:nx, pct: nx? Math.round(100*(p-RANKS[i][0])/(nx[0]-RANKS[i][0])) : 100}; }
function arGain(n, why){ if(!n) return; const a=arP(); const before=arRank(a.pts).i; a.pts+=n; addXP(Math.max(1,Math.round(n/2))); save(); const after=arRank(a.pts); toast('+'+n+' puan'+(why?' · '+why:'')+(after.i>before?' · Yeni unvan: '+after.name:'')); }
function arDaily(){ const t=today(); let h=0; for(const ch of t) h=(h*31+ch.charCodeAt(0))>>>0; const list=AR.ch.filter(c=>c.diff>=2); return list.length? list[h%list.length] : AR.ch[0]; }
function arStop(){ clearInterval(arTimer); arTimer=null; }
function arDial(){ return ARS&&ARS.d || P.dialect; }
function arDialSel(d){ return '<label class="muted" style="display:flex;gap:6px;align-items:center;font-size:.82rem">Program <select id="arD" class="input" style="width:auto;padding:5px 8px">'+DIAL.map(x=>'<option value="'+x.id+'"'+(x.id===d?' selected':'')+'>'+x.name+'</option>').join('')+'</select></label>'; }
function arEditorHTML(d, extra){ return '<div class="ed-shell"><div class="ed-top"><span style="font-size:.8rem">'+esc(DNAME[d])+'</span><span class="row" style="gap:8px"><button class="btn sm ghost" data-act="fmt" style="color:var(--code-ink);padding:2px 6px">Biçimlendir</button><span class="kbd-hint">Ctrl/⌘ + Enter</span></span></div><div id="ed"></div></div><div class="ed-actions">'+(extra||'')+'</div>'; }
function arBack(){ return '<button class="linkbtn" data-ar="hub" style="align-self:flex-start">← Oyun Alanı</button>'; }

function viewArena(){
  const id=S.id||'';
  if(id.startsWith('ch-') && ARCH[id.slice(3)]) return arChView(ARCH[id.slice(3)]);
  if(id==='hiz') return arSpeedView();
  if(id==='tahmin') return arPredView();
  if(id==='bulmaca') return arPzView();
  if(id.startsWith('dedektif-') && ARDET[id.slice(9)]) return arDetView(ARDET[id.slice(9)]);
  return arHub();
}
function mountArena(){
  const id=S.id||''; arStop();
  if(id.startsWith('ch-') && ARCH[id.slice(3)]) return arChMount(ARCH[id.slice(3)]);
  if(id==='hiz') return arSpeedMount();
  if(id.startsWith('dedektif-') && ARDET[id.slice(9)]) return arDetMount(ARDET[id.slice(9)]);
  ARS=null;
}
function arHub(){
  const a=arP(), rk=arRank(a.pts), solved=AR.ch.filter(c=>a.ch[c.id]&&a.ch[c.id].s).length, dl=arDaily(), dDone=a.daily[today()];
  let h='<div class="wrap" style="gap:18px"><div><span class="eyebrow">Oyun Alanı</span><h1>SQL Arena</h1><p class="muted" style="max-width:76ch;margin:6px 0 0">Gizli testli meydan okumalar, süreli oyunlar ve bir dedektif vakası. Her doğru çözüm puan kazandırır, puanlar unvanını yükseltir. Meydan okumalarda sorgun yalnızca örnek veride değil, <b>değiştirilmiş gizli veri setlerinde</b> de doğru çalışmalı: sabit değer yazmak ya da sınır durumunu atlamak yakalanır.</p></div>';
  h+='<section class="panel ar-rank"><div class="ar-badge">'+(rk.i+1)+'</div><div><span class="eyebrow">Unvan</span><h2>'+esc(rk.name)+'</h2><div class="bar"><i style="width:'+rk.pct+'%"></i></div><span class="muted" style="font-size:.8rem">'+(rk.next?(rk.next[0]-a.pts)+' puan sonra: '+esc(rk.next[1]):'En yüksek unvana ulaştın')+'</span></div><div class="ar-nums"><div><b>'+a.pts+'</b><span>puan</span></div><div><b>'+solved+'/'+AR.ch.length+'</b><span>meydan okuma</span></div><div><b>'+(a.speed.best||0)+'</b><span>hız rekoru</span></div></div></section>';
  if(dl) h+='<section class="panel ar-daily"><div><span class="eyebrow">Günün sorusu · '+(dDone?'çözüldü':'puan × 1,5')+'</span><h3>'+esc(dl.title)+'</h3><span class="muted" style="font-size:.85rem">'+esc(SETN[dl.set])+' · '+DIFFN[dl.diff]+' · '+Math.round(DPTS[dl.diff]*1.5)+' puan</span></div><button class="btn pri" data-ar="ch" data-id="'+dl.id+'">'+(dDone?'Tekrar aç':'Çöz')+'</button></section>';
  const det=AR.det[0];
  const modes=[
    ['ch-list','Meydan okumalar','Gizli testli problemler. Kolay 10, orta 25, zor 50 puan.', AR.ch.length+' problem'],
    ['hiz','Hız turu','5 dakikada çözebildiğin kadar temel görev. Doğru cevap seni bir sonrakine geçirir.', 'Rekor: '+(a.speed.best||0)],
    ['tahmin','Sonucu tahmin et','Sorguyu çalıştırmadan çıktısını tahmin et. Seçenekler tuzak sorguların gerçek çıktısıdır.', AR.pred.length+' soru'],
    ['bulmaca','Sorgu bulmacası','Karışık satırları doğru sıraya diz, tuzak satırları dışarıda bırak.', Object.keys(a.pz).length+'/'+AR.pz.length+' çözüldü'],
    det?['dedektif-'+det.id,'SQL Dedektif: '+det.title,'Bir depoda kaybolan kargonun izini kayıtlar üzerinden sür. Altı adım, altı sorgu.', (a.det[det.id]||0)+'/'+det.steps.length+' adım']:null,
    ['mulakat','Mülakat simülasyonu','Süreli, gerçek bir teknik mülakat gibi 4 görev ve 45 dakika.', 'Sınavlar bölümünde'],
    ['serbest','Serbest çalışma','Kendi sorgularını yaz, tablo oluştur, programları karşılaştır.', 'Sınırsız']
  ].filter(Boolean);
  h+='<div class="ar-modes">'+modes.map(m=>'<button class="ar-mode" data-ar="mode" data-id="'+m[0]+'"><span class="ar-ic">'+esc(m[3])+'</span><h3>'+esc(m[1])+'</h3><p>'+esc(m[2])+'</p></button>').join('')+'</div>';
  h+='<section class="lvl-block" id="arList"><div class="sec-head"><h2>Meydan okumalar</h2><div class="ar-flt">'+
    [[0,'Tümü'],[1,'Kolay'],[2,'Orta'],[3,'Zor']].map(([v,t])=>'<button data-ar="flt" data-k="d" data-v="'+v+'" aria-pressed="'+(arFlt.d===v)+'">'+t+'</button>').join('')+'<span style="width:8px"></span>'+
    [['','Tüm veriler'],['market','Market'],['bank','Banka'],['hava','Havayolu']].map(([v,t])=>'<button data-ar="flt" data-k="set" data-v="'+v+'" aria-pressed="'+(arFlt.set===v)+'">'+t+'</button>').join('')+'<span style="width:8px"></span>'+
    [['','Hepsi'],['acik','Çözülmemiş'],['ok','Çözülmüş']].map(([v,t])=>'<button data-ar="flt" data-k="st" data-v="'+v+'" aria-pressed="'+(arFlt.st===v)+'">'+t+'</button>').join('')+'</div></div>';
  const list=AR.ch.filter(c=>(!arFlt.d||c.diff===arFlt.d)&&(!arFlt.set||c.set===arFlt.set)&&(!arFlt.st||(arFlt.st==='ok')===!!(a.ch[c.id]&&a.ch[c.id].s)));
  h+='<div class="panel lessons ar-list">'+(list.length?list.map(c=>{ const st=a.ch[c.id]; return '<button class="litem" data-ar="ch" data-id="'+c.id+'"><span class="ar-st'+(st&&st.s?' ok':'')+'">'+(st&&st.s?'✓':'')+'</span><span><b>'+esc(c.title)+'</b><span class="ar-tags"><span>'+esc(SETN[c.set])+'</span>'+c.tags.map(t=>'<span>· '+esc(t)+'</span>').join('')+'</span></span><span class="chip d'+c.diff+'">'+DIFFN[c.diff]+'</span><span class="ar-pts num muted" style="font-size:.85rem;min-width:56px;text-align:right">'+(st&&st.s?st.pts+' / ':'')+DPTS[c.diff]+' p</span></button>'; }).join(''):'<div class="empty">Bu filtreye uyan problem yok.</div>')+'</div></section>';
  return h+'</div>';
}

/* --- Meydan okuma --- */
function arChView(c){
  const a=arP(), st=a.ch[c.id]||{}, d=(ARS&&ARS.mode==='ch'&&ARS.id===c.id)?ARS.d:P.dialect, daily=arDaily()&&arDaily().id===c.id&&!a.daily[today()];
  const pts=Math.round(DPTS[c.diff]*(daily?1.5:1));
  let h='<div class="wrap" style="gap:14px">'+arBack()+'<div class="ar-prob"><section class="panel ar-desc"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip d'+c.diff+'">'+DIFFN[c.diff]+'</span><span class="chip">'+esc(SETN[c.set])+'</span><span class="chip">'+pts+' puan'+(daily?' · günün sorusu':'')+'</span>'+(st.s?'<span class="chip okc">Çözüldü · '+st.pts+' p</span>':'')+'</div><h1>'+esc(c.title)+'</h1>'+c.q+
    '<div><span class="eyebrow">Örnek çıktı (ilk 5 satır)</span><div id="arSample" style="margin-top:6px"><div class="empty">Hazırlanıyor…</div></div></div>'+
    '<div class="msg info" style="margin:0"><b>Değerlendirme</b>Gönderdiğinde sorgun örnek veride ve '+c.tests.length+' gizli veri setinde çalıştırılır. Hepsinde beklenen sonucu vermelidir. Sütun adları değil, sütun sırası ve değerler karşılaştırılır.'+(c.ord?' Satır sırası da önemlidir.':'')+'</div>'+
    (c.hint?'<div id="arHint">'+(st.h||st.s?'<div class="tip" style="margin:0"><b>İpucu</b>'+esc(c.hint)+'</div>':'<button class="btn sm ghost" data-ar="hint">İpucunu aç (puanın %30\'u düşer)</button>')+'</div>':'')+
    '<div class="row" style="gap:8px"><button class="btn sm ghost" data-ar="schema">Tabloları göster</button>'+((st.s||st.f>=3)?'<button class="btn sm ghost" data-ar="showsol">Örnek çözümü gör'+(st.s?'':' (puan alınmaz)')+'</button>':'')+'</div><div id="arSchema" hidden></div><div id="arSol"></div></section>'+
    '<div class="work"><div class="row" style="justify-content:flex-end">'+arDialSel(d)+'</div>'+arEditorHTML(d,'<button class="btn" data-ar="run" data-needs-engine '+(engineReady()?'':'disabled')+'>Çalıştır</button><button class="btn pri" data-ar="submit" data-needs-engine '+(engineReady()?'':'disabled')+'>Gönder</button>')+'<div id="arFb"></div><div class="panel result" id="res"><div class="empty">Sorgunu yaz. <b>Çalıştır</b> yalnızca örnek veride sonucu gösterir; <b>Gönder</b> gizli testleri de çalıştırır.</div></div></div></div></div>';
  return h;
}
function arChMount(c){
  if(!ARS||ARS.mode!=='ch'||ARS.id!==c.id) ARS={mode:'ch', id:c.id, d:P.dialect};
  const dk='__ar:'+c.id+':'+ARS.d, tables=tablesIn(c.sol);
  ED=makeEditor($('#ed'), P.drafts[dk]!==undefined?P.drafts[dk]:'', arChSubmit, ARS.d, tables);
  ED.onChange=v=>{ P.drafts[dk]=v; save(); };
  onEngine(()=>{ const db=fresh(); const r=run(db,c.sol,'sqlite'); db.close(); const s=lastSet(r); const el=$('#arSample'); if(el&&s) el.innerHTML=setTable({columns:s.columns, values:s.values.slice(0,5)}, s.values.length>5?'toplam '+s.values.length+' satırdan ilk 5':''); });
}
function arChRun(){ if(!engineReady()||!ED) return; const code=ED.get(); if(!code.trim()) return; const db=fresh(); const r=run(db,code,ARS.d); db.close(); $('#res').innerHTML=resultHTML(r); }
function arChSubmit(){
  if(!engineReady()||!ED||!ARS) return; const c=ARCH[ARS.id]; const code=ED.get(); if(!code.trim()) return;
  const cases=[{ad:'Örnek veri', sql:''}].concat(c.tests); const out=[]; let firstR=null;
  for(let i=0;i<cases.length;i++){ const t=cases[i];
    const dbS=fresh(); if(t.sql) try{ dbS.exec(t.sql); }catch(e){} const sr=run(dbS,c.sol,'sqlite'); dbS.close();
    const dbU=fresh(); if(t.sql) try{ dbU.exec(t.sql); }catch(e){} const ur=run(dbU,code,ARS.d); dbU.close(); if(!i) firstR=ur;
    if(ur.error){ out.push({ad:t.ad, ok:false, why:'Hata: '+ur.error}); break; }
    const cm=compare(lastSet(ur), lastSet(sr), c.ord); out.push({ad:t.ad, ok:cm.ok, why:cm.why}); }
  if(firstR) $('#res').innerHTML=resultHTML(firstR);
  const a=arP(), st=a.ch[c.id]=a.ch[c.id]||{}; const all=out.length===cases.length&&out.every(x=>x.ok);
  let h='<div class="msg '+(all?'ok':'err')+'"><b>'+(all?'Tüm testler geçti':'Bazı testler geçmedi')+'</b><div class="ar-tests">'+out.map((x,i)=>'<div class="ar-test '+(x.ok?'ok':'no')+'"><i>'+(x.ok?'✓':'✗')+'</i><span>'+(i?'Gizli test '+i:'Örnek veri')+(i&&!x.ok?': '+esc(x.ad):'')+(x.ok?'':'<br><span class="muted">'+esc(x.why)+'</span>')+'</span></div>').join('')+(out.length<cases.length?'<div class="ar-test no"><i>·</i><span class="muted">Kalan '+(cases.length-out.length)+' test çalıştırılmadı.</span></div>':'')+'</div>';
  if(all){ if(!st.s){ const daily=arDaily()&&arDaily().id===c.id&&!a.daily[today()]; let p=DPTS[c.diff]; if(st.h) p=Math.round(p*0.7); if(st.v) p=0; if(daily&&p){ p=Math.round(p*1.5); a.daily[today()]=1; } st.s=1; st.pts=p; st.at=today(); save(); arGain(p, c.title); h+='<p style="margin:8px 0 0">'+(p?'+'+p+' puan kazandın.':'Çözümü gördükten sonra puan verilmez, ama artık bu problemi çözdün.')+'</p>'; }
    const nx=AR.ch.find(x=>!(a.ch[x.id]&&a.ch[x.id].s)); if(nx) h+='<div class="row" style="margin-top:10px"><button class="btn sm pri" data-ar="ch" data-id="'+nx.id+'">Sonraki problem: '+esc(nx.title)+'</button></div>'; }
  else { st.f=(st.f||0)+1; save(); if(st.f===3&&!st.s) h+='<p class="muted" style="margin:8px 0 0">Üç denemeden sonra örnek çözümü görebilirsin (puan alınmaz).</p>'; }
  $('#arFb').innerHTML=h+'</div>';
  if(!all&&st.f===3){ const sb=$('.ar-desc .row:last-of-type'); if(sb&&!sb.querySelector('[data-ar=showsol]')) sb.insertAdjacentHTML('beforeend','<button class="btn sm ghost" data-ar="showsol">Örnek çözümü gör (puan alınmaz)</button>'); }
}

/* --- Hız turu --- */
function arSpeedPool(){ return PRACTICE.filter(x=>x.L==='temel'&&x.sol&&!x.check&&!x.dl&&!['dml','ddl','prg'].includes(x.t)&&/^\s*(SELECT|WITH)\b/i.test(x.sol)); }
function arSpeedView(){
  const a=arP();
  if(!ARS||ARS.mode!=='hiz'||ARS.state==='intro') return '<div class="wrap" style="gap:16px;max-width:820px">'+arBack()+'<section class="panel ar-q"><span class="eyebrow">Hız turu</span><h1 style="margin:0">5 dakika, olabildiğince çok görev</h1><p class="muted" style="margin:0">Temel seviyede kısa görevler gelir. Doğru sorgu seni otomatik olarak bir sonrakine geçirir; takıldığında <b>Geç</b> diyebilirsin. Her doğru cevap 3 puan. Rekorun: <b>'+(a.speed.best||0)+'</b>.</p><div class="row" style="gap:10px">'+arDialSel(P.dialect)+'<button class="btn pri" data-ar="speed-start">Başla</button></div></section></div>';
  if(ARS.state==='done') return '<div class="wrap" style="gap:16px;max-width:820px">'+arBack()+'<section class="panel ar-q"><span class="eyebrow">Hız turu bitti</span><h1 style="margin:0">'+ARS.ok+' doğru'+(ARS.rec?' · yeni rekor!':'')+'</h1><p class="muted" style="margin:0">'+ARS.skip+' görev geçildi · rekorun '+(a.speed.best||0)+' · +'+(ARS.ok*3)+' puan</p><div class="row" style="gap:8px"><button class="btn pri" data-ar="speed-start">Yeniden oyna</button><button class="btn" data-ar="hub">Oyun Alanı</button></div></section>'+(ARS.log.length?'<section class="panel lessons">'+ARS.log.map(l=>'<div class="litem" style="grid-template-columns:24px minmax(0,1fr)"><span class="ar-st'+(l.ok?' ok':'')+'">'+(l.ok?'✓':'')+'</span><span>'+esc(PRMAP[l.id].title)+'</span></div>').join('')+'</section>':'')+'</div>';
  const p=PRMAP[ARS.items[ARS.cur]];
  return '<div class="wrap" style="gap:14px">'+'<div class="ar-hud"><span class="exclock num" id="arClock">'+fmtTime(Math.max(0,Math.round((ARS.end-Date.now())/1000)))+'</span><span class="chip">Doğru: <b id="arOk">'+ARS.ok+'</b></span><span class="chip">Geçilen: '+ARS.skip+'</span><span class="chip">Rekor: '+(a.speed.best||0)+'</span><span style="flex:1"></span><button class="btn sm" data-ar="speed-end">Bitir</button></div><div class="ar-prob"><section class="panel ar-desc"><span class="eyebrow">Görev '+(ARS.cur+1)+'</span><h1 style="font-size:1.15rem">'+esc(p.title)+'</h1>'+p.q+'</section><div class="work">'+arEditorHTML(ARS.d,'<button class="btn pri" data-ar="speed-submit">Gönder</button><button class="btn" data-ar="speed-skip">Geç</button>')+'<div id="arFb"></div><div class="panel result" id="res"><div class="empty">Yaz ve gönder (Ctrl/⌘ + Enter).</div></div></div></div></div>';
}
function arSpeedMount(){
  if(!ARS||ARS.mode!=='hiz'||ARS.state!=='run') return;
  const p=PRMAP[ARS.items[ARS.cur]]; ED=makeEditor($('#ed'), '', arSpeedSubmit, ARS.d, tablesIn(p.sol+' '+p.q)); ED.focus();
  arTimer=setInterval(()=>{ if(S.view!=='play'||!ARS||ARS.mode!=='hiz'||ARS.state!=='run'){ arStop(); return; } const s=Math.max(0,Math.round((ARS.end-Date.now())/1000)); const el=$('#arClock'); if(el){ el.textContent=fmtTime(s); el.classList.toggle('low', s<30); } if(s<=0) arSpeedEnd(); },500);
}
function arSpeedStart(){ const sel=$('#arD'); const d=sel?sel.value:P.dialect; const pool=shuffle(arSpeedPool()).filter(x=>exText(x.sol,x,d)!==null); ARS={mode:'hiz', state:'run', d, items:pool.map(x=>x.id), cur:0, ok:0, skip:0, log:[], end:Date.now()+5*60000}; render(); }
function arSpeedNext(ok){ ARS.log.push({id:ARS.items[ARS.cur], ok}); if(ok) ARS.ok++; else ARS.skip++; ARS.cur++; if(ARS.cur>=ARS.items.length) return arSpeedEnd(); render(); }
function arSpeedSubmit(){
  if(!engineReady()||!ARS||ARS.state!=='run') return; if(Date.now()>ARS.end) return arSpeedEnd();
  const p=PRMAP[ARS.items[ARS.cur]], code=ED.get(); if(!code.trim()) return;
  const db=fresh(); const r=run(db,code,ARS.d); db.close(); $('#res').innerHTML=resultHTML(r);
  if(r.error){ $('#arFb').innerHTML=errHTML(r); return; }
  const s=solResult(p,'pr:'+p.id); const cm=compare(lastSet(r), s.set, p.ord);
  if(cm.ok){ toast('Doğru!'); arSpeedNext(true); } else $('#arFb').innerHTML='<div class="msg err"><b>Henüz değil</b>'+esc(cm.why)+'</div>';
}
function arSpeedEnd(){ if(!ARS||ARS.mode!=='hiz') return; arStop(); const a=arP(); ARS.state='done'; a.speed.runs=(a.speed.runs||0)+1; ARS.rec=ARS.ok>(a.speed.best||0); if(ARS.rec) a.speed.best=ARS.ok; save(); if(ARS.ok) arGain(ARS.ok*3,'Hız turu'); if(S.view==='play') render(); }

/* --- Sonucu tahmin et --- */
function arPredVal(sql, d){ const db=fresh(); const r=run(db, d==='sqlite'?sql:DX.forward(sql,d), d); db.close(); if(r.error) return null; const s=lastSet(r); if(!s||!s.values.length) return '(satır yok)'; const v=s.values[0][0]; return v===null?'NULL':typeof v==='number'?String(Math.round(v*100)/100):String(v); }
function arPredBuild(item, d){ const ans=arPredVal(item.sql,d); const opts=[ans]; item.traps.forEach(t=>{ const v=arPredVal(t,d); if(v!==null&&!opts.includes(v)) opts.push(v); }); return {ans, opts:mcOrder(opts, item.id+d).map(i=>opts[i])}; }
function arPredView(){
  const a=arP();
  if(!ARS||ARS.mode!=='tahmin') ARS={mode:'tahmin', d:P.dialect, order:shuffle(AR.pred.map(x=>x.id)), cur:0, ok:0, picked:null, built:null};
  if(ARS.cur>=ARS.order.length){ const rec=ARS.ok>(a.pred.best||0); if(rec){ a.pred.best=ARS.ok; save(); } return '<div class="wrap" style="gap:16px;max-width:820px">'+arBack()+'<section class="panel ar-q"><span class="eyebrow">Tur bitti</span><h1 style="margin:0">'+ARS.ok+' / '+ARS.order.length+' doğru tahmin</h1><p class="muted" style="margin:0">En iyi skorun: '+(a.pred.best||0)+'. İlk kez doğru bildiğin her soru 5 puan kazandırır.</p><div class="row" style="gap:8px"><button class="btn pri" data-ar="pred-again">Yeni tur</button><button class="btn" data-ar="hub">Oyun Alanı</button></div></section></div>'; }
  const item=AR.pred.find(x=>x.id===ARS.order[ARS.cur]);
  let body;
  if(!engineReady()){ body='<div class="empty">SQL motoru yükleniyor…</div>'; onEngine(()=>{ if(S.view==='play'&&S.id==='tahmin') render(); }); }
  else { if(!ARS.built||ARS.built.id!==item.id||ARS.built.d!==ARS.d) ARS.built=Object.assign({id:item.id, d:ARS.d}, arPredBuild(item, ARS.d));
    const b=ARS.built, pk=ARS.picked;
    body='<pre class="ar-code">'+hl(ARS.d==='sqlite'?item.sql:DX.forward(item.sql,ARS.d))+'</pre><p style="margin:0"><b>Bu sorgu hangi değeri döndürür?</b></p><div class="ar-opts">'+b.opts.map((o,i)=>'<button class="ar-opt'+(pk!==null?(o===b.ans?' ok':i===pk?' no':''):'')+'" data-ar="pred-pick" data-i="'+i+'"'+(pk!==null?' disabled':'')+'>'+esc(o)+'</button>').join('')+'</div>'+
      (pk!==null?'<div class="msg '+(b.opts[pk]===b.ans?'ok':'err')+'"><b>'+(b.opts[pk]===b.ans?'Doğru':'Doğru cevap: '+esc(b.ans))+'</b>'+esc(item.why)+'</div><div class="row"><button class="btn pri" data-ar="pred-next">'+(ARS.cur+1<ARS.order.length?'Sonraki soru':'Sonucu gör')+'</button></div>':''); }
  return '<div class="wrap" style="gap:14px;max-width:880px">'+arBack()+'<div class="ar-hud"><span class="chip">Soru '+(ARS.cur+1)+' / '+ARS.order.length+'</span><span class="chip">Doğru: '+ARS.ok+'</span><span style="flex:1"></span>'+arDialSel(ARS.d)+'</div><section class="panel ar-q"><span class="eyebrow">'+esc(item.title)+'</span>'+body+'</section><p class="muted" style="margin:0;font-size:.82rem">Seçenekler, bu sorgunun ve tipik hatalı varyantlarının seçili programda gerçekten çalıştırılmasıyla üretilir. Anadolu Market, Anadolu Bank ve Kanat Havayolları tabloları kullanılır.</p></div>';
}

/* --- Sorgu bulmacası --- */
function arPzView(){
  const a=arP();
  if(!ARS||ARS.mode!=='bulmaca'){ const first=AR.pz.findIndex(z=>!a.pz[z.id]); ARS={mode:'bulmaca', i:first<0?0:first}; }
  const z=AR.pz[ARS.i];
  if(!ARS.pool||ARS.zid!==z.id){ ARS.zid=z.id; ARS.pool=shuffle(z.lines.map((t,i)=>({t, k:'l'+i})).concat(z.extra.map((t,i)=>({t, k:'x'+i})))); ARS.ans=[]; ARS.fb=''; }
  const left=ARS.pool.filter(x=>!ARS.ans.includes(x.k));
  const nav='<div class="ar-flt">'+AR.pz.map((q,i)=>'<button data-ar="pz-go" data-i="'+i+'" aria-pressed="'+(i===ARS.i)+'" title="'+esc(q.title)+'">'+(a.pz[q.id]?'✓ ':'')+(i+1)+'</button>').join('')+'</div>';
  return '<div class="wrap" style="gap:14px">'+arBack()+'<div class="sec-head"><div><span class="eyebrow">Sorgu bulmacası · '+(ARS.i+1)+' / '+AR.pz.length+'</span><h1 style="margin:2px 0 0">'+esc(z.title)+'</h1></div>'+nav+'</div><section class="panel ar-q"><p style="margin:0"><b>Görev:</b> '+esc(z.task)+'</p><p class="muted" style="margin:0;font-size:.85rem">Satırlara tıklayarak sorguyu sırayla kur; yanlış eklediğin satıra tekrar tıklayınca geri döner. Bazı satırlar tuzaktır, kullanılmamaları gerekir. Bulmacalar SQLite yazımındadır. İlk çözüm 15 puan.</p></section><div class="pz-area"><section class="panel pz-box"><span class="eyebrow">Kullanılabilir satırlar</span>'+(left.length?left.map(x=>'<button class="pz-line" data-ar="pz-add" data-k="'+x.k+'">'+esc(x.t)+'</button>').join(''):'<div class="empty">Tüm satırları kullandın.</div>')+'</section><section class="panel pz-box pz-ans"><span class="eyebrow">Senin sorgun</span>'+(ARS.ans.length?ARS.ans.map((k,i)=>{ const x=ARS.pool.find(y=>y.k===k); return '<button class="pz-line" data-ar="pz-del" data-k="'+k+'"><b>'+(i+1)+'</b>'+esc(x.t)+'</button>'; }).join(''):'<div class="empty">Soldan satır seç.</div>')+'</section></div><div class="row" style="gap:8px"><button class="btn pri" data-ar="pz-check" data-needs-engine '+(engineReady()?'':'disabled')+'>Kontrol et</button><button class="btn" data-ar="pz-reset">Sıfırla</button>'+(ARS.i<AR.pz.length-1?'<button class="btn ghost" data-ar="pz-go" data-i="'+(ARS.i+1)+'">Sonraki bulmaca</button>':'')+'</div><div id="arFb">'+(ARS.fb||'')+'</div><div class="panel result" id="res" '+(ARS.res?'':'hidden')+'>'+(ARS.res||'')+'</div></div>';
}
function arPzCheck(){
  if(!engineReady()) return; const z=AR.pz[ARS.i]; const sql=ARS.ans.map(k=>ARS.pool.find(y=>y.k===k).t).join('\n');
  if(!sql.trim()){ ARS.fb='<div class="msg err"><b>Önce satır seç</b>Sorgun boş.</div>'; render(); return; }
  const db=fresh(); const r=run(db,sql,'sqlite'); const sr=run(db,z.lines.join('\n'),'sqlite'); db.close();
  ARS.res=resultHTML(r);
  if(r.error){ ARS.fb='<div class="msg err"><b>Sorgu çalışmadı</b>'+esc(r.error)+'</div>'; render(); return; }
  const usedX=ARS.ans.some(k=>k[0]==='x'); const cm=compare(lastSet(r), lastSet(sr), /ORDER\s+BY/i.test(z.lines.join(' ')));
  if(cm.ok && !usedX){ const a=arP(); const first=!a.pz[z.id]; a.pz[z.id]=1; save(); if(first) arGain(15,'Bulmaca'); ARS.fb='<div class="msg ok"><b>Doğru!</b>Sorgu doğru sırada ve beklenen sonucu veriyor.</div>'; }
  else ARS.fb='<div class="msg err"><b>Henüz değil</b>'+(cm.ok&&usedX?'Sonuç doğru görünüyor ama tuzak bir satır kullandın; onu çıkar.':esc(cm.why))+'</div>';
  render();
}

/* --- SQL Dedektif --- */
const detNorm=v=>String(v===null||v===undefined?'':v).toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
function arDetDb(){ if(!ARS.db){ ARS.db=fresh(); ARS.db.exec(AR.detSeed); } return ARS.db; }
function arDetAns(c,i){ ARS.ans=ARS.ans||{}; if(ARS.ans[i]===undefined){ const db=fresh(); db.exec(AR.detSeed); const r=run(db,c.steps[i].sol,'sqlite'); db.close(); const s=lastSet(r); ARS.ans[i]= s&&s.values.length? s.values[0][0] : null; } return ARS.ans[i]; }
function arDetView(c){
  const a=arP(), done=a.det[c.id]||0, d=(ARS&&ARS.mode==='det'&&ARS.id===c.id)?ARS.d:P.dialect;
  const steps='<div class="det-steps">'+c.steps.map((st,i)=>'<div class="det-step'+(i<done?' done':i===done?' cur':' lock')+'"><span class="eyebrow">Adım '+(i+1)+(i<done?' · çözüldü':'')+'</span><div>'+(i<=done?st.q:'Önceki adımı çöz.')+'</div>'+(i<done&&ARS&&ARS.ans&&ARS.ans[i]!==undefined?'<div class="muted" style="font-size:.85rem;margin-top:4px">Cevap: <b>'+esc(ARS.ans[i])+'</b></div>':'')+(i===done?'<div class="det-ans"><input class="input" id="detIn" placeholder="Cevabın" autocomplete="off"><button class="btn pri" data-ar="det-check">Kontrol et</button></div><div class="row" style="gap:8px;margin-top:6px"><button class="linkbtn" data-ar="det-hint">İpucu</button></div><div id="detFb"></div>':'')+'</div>').join('')+'</div>';
  const fin=done>=c.steps.length;
  return '<div class="wrap" style="gap:14px">'+arBack()+'<div class="sec-head"><div><span class="eyebrow">SQL Dedektif · '+esc(c.lv)+'</span><h1 style="margin:2px 0 0">'+esc(c.title)+'</h1></div><span class="chip">'+Math.min(done,c.steps.length)+' / '+c.steps.length+' adım</span></div><section class="panel ar-desc">'+c.intro+'</section>'+(fin?'<section class="panel ar-desc" style="border-left:4px solid var(--ok)">'+c.outro+'<div class="row"><button class="btn sm" data-ar="det-restart">Vakayı baştan oyna</button></div></section>':'')+
    '<div class="ar-prob"><div style="display:flex;flex-direction:column;gap:12px">'+steps+'<section class="panel" style="padding:12px"><div class="eyebrow" style="padding:4px 4px 10px">Vaka tabloları</div><div id="detSchema"><div class="empty">Hazırlanıyor…</div></div></section></div><div class="work"><div class="row" style="justify-content:space-between;gap:8px"><span id="detReset" class="confirm"><button class="btn sm ghost" data-ar="det-reset">Vaka veritabanını sıfırla</button></span>'+arDialSel(d)+'</div>'+arEditorHTML(d,'<button class="btn pri" data-ar="det-run" data-needs-engine '+(engineReady()?'':'disabled')+'>Çalıştır</button>')+'<div class="panel result" id="res"><div class="empty">Sorgunu yaz ve çalıştır; bulduğun cevabı soldaki kutuya gir.</div></div></div></div></div>';
}
function arDetMount(c){
  if(!ARS||ARS.mode!=='det'||ARS.id!==c.id){ if(ARS&&ARS.db) try{ ARS.db.close(); }catch(e){} ARS={mode:'det', id:c.id, d:P.dialect, db:null, ans:{}}; }
  const dk='__det:'+c.id+':'+ARS.d;
  ED=makeEditor($('#ed'), P.drafts[dk]!==undefined?P.drafts[dk]:"SELECT *\nFROM det_shipments\nLIMIT 10;", arDetRun, ARS.d, ['det_staff','det_badge_log','det_trucks','det_shipments','det_gate_cam','det_witness'], true);
  ED.onChange=v=>{ P.drafts[dk]=v; save(); };
  onEngine(()=>{ const db=arDetDb(); const el=$('#detSchema'); if(el) el.innerHTML=schemaHTML(db, ARS.d); const done=arP().det[c.id]||0; for(let i=0;i<Math.min(done,c.steps.length);i++) arDetAns(c,i); if(done){ document.querySelectorAll('.det-step.done').forEach((el,i)=>{ if(!el.querySelector('.muted')) el.insertAdjacentHTML('beforeend','<div class="muted" style="font-size:.85rem;margin-top:4px">Cevap: <b>'+esc(ARS.ans[i])+'</b></div>'); }); } });
  const inp=$('#detIn'); if(inp) inp.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); arDetCheck(); } });
}
function arDetRun(){ if(!engineReady()||!ED) return; const code=ED.get(); if(!code.trim()) return; const r=run(arDetDb(),code,ARS.d); $('#res').innerHTML=resultHTML(r); }
function arDetCheck(){
  const c=ARDET[ARS.id]; const a=arP(); const i=a.det[c.id]||0; if(i>=c.steps.length) return; const inp=$('#detIn'); const v=inp?inp.value:''; if(!v.trim()) return;
  const exp=arDetAns(c,i); const ok = typeof exp==='number' ? Math.abs(Number(String(v).replace(',','.'))-exp)<0.01 : detNorm(v)===detNorm(exp);
  if(ok){ a.det[c.id]=i+1; save(); arGain(20,'Dedektif adım '+(i+1)); if(i+1===c.steps.length) setTimeout(()=>arGain(50,'Vaka çözüldü'),400); render(); }
  else { const fb=$('#detFb'); if(fb) fb.innerHTML='<div class="msg err" style="margin-top:8px"><b>Bu değil</b>Sorgunu ve koşullarını tekrar kontrol et. Büyük/küçük harf önemli değil.</div>'; }
}

document.addEventListener('click', ev=>{
  const t=ev.target.closest('[data-ar]'); if(!t) return; const k=t.dataset.ar, a=arP();
  if(k==='hub'){ arStop(); if(ARS&&ARS.db) try{ ARS.db.close(); }catch(e){} ARS=null; go('play'); }
  else if(k==='mode'){ const m=t.dataset.id; if(m==='ch-list'){ const el=$('#arList'); if(el) el.scrollIntoView({behavior:'smooth'}); } else if(m==='mulakat') startExam('kod-mulakat'); else if(m==='serbest') go('serbest'); else { ARS=null; go('play', m); } }
  else if(k==='flt'){ const key=t.dataset.k; arFlt[key]= key==='d'? +t.dataset.v : t.dataset.v; render(); const el=$('#arList'); if(el) el.scrollIntoView(); }
  else if(k==='ch'){ ARS=null; go('play','ch-'+t.dataset.id); }
  else if(k==='run') arChRun();
  else if(k==='submit') arChSubmit();
  else if(k==='hint'){ const c=ARCH[ARS.id]; const st=a.ch[c.id]=a.ch[c.id]||{}; st.h=1; save(); $('#arHint').innerHTML='<div class="tip" style="margin:0"><b>İpucu</b>'+esc(c.hint)+'</div>'; }
  else if(k==='schema'){ const box=$('#arSchema'); box.hidden=!box.hidden; if(!box.hidden&&engineReady()){ const c=ARCH[ARS.id]; const db=fresh(); const tb=tablesIn(c.sol); box.innerHTML='<div class="schema">'+tb.map(n=>'<details open><summary>'+esc(n)+'</summary>'+(window.SQLP_SCHEMA_NOTES[n]?'<p>'+esc(window.SQLP_SCHEMA_NOTES[n])+'</p>':'')+'<ul>'+(COLMETA[n]||[]).map(cn=>'<li><span>'+esc(cn[0])+'</span><i>'+esc(window.SQLP_TYPE(cn[1],ARS.d))+'</i></li>').join('')+'</ul></details>').join('')+'</div>'; db.close(); } }
  else if(k==='showsol'){ const c=ARCH[ARS.id]; const st=a.ch[c.id]=a.ch[c.id]||{}; if(!st.s) st.v=1; save(); const txt=ARS.d==='sqlite'?c.sol:(DX.forward(c.sol,ARS.d)||c.sol); $('#arSol').innerHTML='<span class="eyebrow">Örnek çözüm · '+esc(DNAME[ARS.d])+'</span><pre class="ar-code" style="margin-top:6px">'+hl(fmtSQL?fmtSQL(txt):txt)+'</pre>'; }
  else if(k==='speed-start') arSpeedStart();
  else if(k==='speed-submit') arSpeedSubmit();
  else if(k==='speed-skip') arSpeedNext(false);
  else if(k==='speed-end') arSpeedEnd();
  else if(k==='pred-pick'){ const b=ARS.built; ARS.picked=+t.dataset.i; const ok=b.opts[ARS.picked]===b.ans; if(ok){ ARS.ok++; if(!a.pred.seen[b.id]){ a.pred.seen[b.id]=1; save(); arGain(5,'Doğru tahmin'); } } render(); }
  else if(k==='pred-next'){ ARS.cur++; ARS.picked=null; ARS.built=null; render(); }
  else if(k==='pred-again'){ ARS=null; render(); }
  else if(k==='pz-add'){ ARS.ans.push(t.dataset.k); ARS.fb=''; render(); }
  else if(k==='pz-del'){ ARS.ans=ARS.ans.filter(x=>x!==t.dataset.k); ARS.fb=''; render(); }
  else if(k==='pz-reset'){ ARS.ans=[]; ARS.fb=''; ARS.res=''; render(); }
  else if(k==='pz-go'){ ARS.i=+t.dataset.i; ARS.pool=null; ARS.res=''; render(); }
  else if(k==='pz-check') arPzCheck();
  else if(k==='det-run') arDetRun();
  else if(k==='det-check') arDetCheck();
  else if(k==='det-hint'){ const c=ARDET[ARS.id]; const i=a.det[c.id]||0; const fb=$('#detFb'); if(fb&&c.steps[i]) fb.innerHTML='<div class="tip" style="margin-top:8px"><b>İpucu</b>'+esc(c.steps[i].hint)+'</div>'; }
  else if(k==='det-reset'){ if(ARS.db){ try{ ARS.db.close(); }catch(e){} ARS.db=null; } const db=arDetDb(); const el=$('#detSchema'); if(el) el.innerHTML=schemaHTML(db, ARS.d); toast('Vaka veritabanı sıfırlandı'); }
  else if(k==='det-restart'){ const c=ARDET[ARS.id]; a.det[c.id]=0; save(); render(); }
});
document.addEventListener('change', ev=>{
  if(ev.target.id!=='arD' || S.view!=='play') return; const d=ev.target.value; if(!DIDS.includes(d)) return;
  if(!ARS){ P.dialect=d; save(); return; }
  if(ARS.mode==='hiz' && ARS.state!=='run'){ return; }
  ARS.d=d; if(ARS.mode==='tahmin'){ ARS.built=null; ARS.picked=null; } render();
});
