const c=require('./load.js'); const L=c.SQLP_LESSONS, P=c.SQLP_PATHS, PR=c.SQLP_PRACTICE, EX=c.SQLP_EXAMS, G=c.SQLP_GLOSSARY, PL=c.SQLP_PLACEMENT;
const iss=[]; const add=(k,m)=>iss.push(k+' | '+m);
const ids={}; L.forEach(l=>{ if(ids[l.id]) add('yinelenenDersId',l.id); ids[l.id]=l; });
const titles={}; L.forEach(l=>{ const t=l.title.toLowerCase(); if(titles[t]) add('yinelenenBaslik',l.id+' = '+titles[t]); titles[t]=l.id; });
const strip=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
L.forEach(l=>{
  if(!l.ex.length) add('alistirmasizDers',l.id);
  if(strip(l.body).length<600) add('kisaAnlatim',l.id+' ('+strip(l.body).length+' kr)');
  if(!['A1','A2','B1','B2','C1','C2'].includes(l.lv)) add('bilinmeyenSeviye',l.id+' '+l.lv);
  l.ex.forEach((e,i)=>{ const k=l.id+'#'+(i+1);
    if(e.t==='mc'){ if(!Array.isArray(e.o)||e.a<0||e.a>=e.o.length) add('mcCevapAraligi',k); if(new Set(e.o.map(x=>strip(x).toLowerCase())).size!==e.o.length) add('mcAyniSecenek',k); if(!e.why) add('mcAciklamaYok',k); }
    else if(!e.hint) {}
  });
  // data-lesson refs in body
  (l.body.match(/data-lesson="([^"]+)"/g)||[]).forEach(m=>{ const id=m.slice(13,-1); if(!ids[id]) add('kirikDersBaglantisi',l.id+' -> '+id); });
});
const inPath=new Set(); P.forEach(p=>{ const seen=new Set(); p.lessons.forEach(id=>{ if(!ids[id]) add('patikadaOlmayanDers',p.id+' -> '+id); if(seen.has(id)) add('patikadaTekrar',p.id+' '+id); seen.add(id); inPath.add(id); }); (p.comp||[]).forEach(cp=>(cp.l||[]).forEach(id=>{ if(!ids[id]) add('yetkinlikKirikDers',p.id+' -> '+id); if(!p.lessons.includes(id)) add('yetkinlikPatikadaYok',p.id+' -> '+id); })); });
L.forEach(l=>{ if(!inPath.has(l.id)) add('hicbirPatikadaDegil',l.id+' ('+l.lv+', '+l.mod+')'); });
// level order inside paths
const lvN={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
P.forEach(p=>{ let back=0; for(let i=1;i<p.lessons.length;i++){ const a=ids[p.lessons[i-1]],b=ids[p.lessons[i]]; if(a&&b&&lvN[b.lv]<lvN[a.lv]-1) back++; } if(back) add('patikaSeviyeGeriDonus',p.id+': '+back+' yerde 2+ seviye geri'); });
const pids={}; PR.forEach(p=>{ if(pids[p.id]) add('yinelenenPratikId',p.id); pids[p.id]=1; });
const pq={}; PR.forEach(p=>{ const k=strip(p.sol).toLowerCase(); if(pq[k]) add('ayniCozumluPratik',p.id+' = '+pq[k]); pq[k]=p.id; });
EX.forEach(e=>{ (e.qs||[]).forEach((q,i)=>{ if(q.a<0||q.a>=q.o.length) add('sinavCevapAraligi',e.id+'#'+i); if(new Set(q.o.map(x=>strip(x).toLowerCase())).size!==q.o.length) add('sinavAyniSecenek',e.id+'#'+i); }); if(e.qs&&e.qs.length<e.n) add('sinavHavuzYetersiz',e.id); const qq={}; (e.qs||[]).forEach((q,i)=>{ const k=strip(q.q).toLowerCase(); if(qq[k]!==undefined) add('sinavYinelenenSoru',e.id+'#'+i); qq[k]=i; }); });
// answer position bias
const pos=[0,0,0,0,0]; L.forEach(l=>l.ex.forEach(e=>{ if(e.t==='mc') pos[e.a]++; })); EX.forEach(e=>(e.qs||[]).forEach(q=>pos[q.a]++)); console.log('dogru sik konum dagilimi (A..E):',pos);
// longest-option bias
let longest=0,tot=0; L.forEach(l=>l.ex.forEach(e=>{ if(e.t==='mc'){ tot++; const lens=e.o.map(x=>strip(x).length); if(lens[e.a]===Math.max(...lens) && lens.filter(x=>x===lens[e.a]).length===1) longest++; } })); EX.forEach(e=>(e.qs||[]).forEach(q=>{ tot++; const lens=q.o.map(x=>strip(x).length); if(lens[q.a]===Math.max(...lens)&&lens.filter(x=>x===lens[q.a]).length===1) longest++; })); console.log('dogru sik en uzun olan:',longest,'/',tot);
const gt={}; G.forEach(g=>{ const k=String(g.t||g.term||g.k||JSON.stringify(g).slice(0,30)).toLowerCase(); if(gt[k]) add('sozlukTekrar',k); gt[k]=1; });
PL.forEach((q,i)=>{ if(q.a<0||q.a>=(q.o||[]).length) add('seviyeTestiCevap',i); });
const by={}; iss.forEach(s=>{ const k=s.split(' | ')[0]; by[k]=(by[k]||0)+1; }); console.log(by); require('fs').writeFileSync('static.txt',iss.join('\n'));
