// Kesit: ders içeriklerinden arama motorlarının okuyabildiği statik sayfalar ve site haritaları üretir.
// Kullanım: BASE=http://localhost:PORT node statik.js <stage-klasörü>   (stage aynı anda BASE'den sunuluyor olmalı)
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const ST=process.argv[2],BASE=process.env.BASE,SITE='https://ysfdurak.github.io';
const APPS=[
 {dir:'kesit-sql',ad:'Kesit SQL',konu:'SQL',bekle:6000,ex:'window.SQLP_LESSONS',hash:i=>'#ders-'+i,exHash:i=>'#ders-'+i+'/1',duzelt:[[/Bu sayfanın içinde gerçek bir veritabanı çalışıyor\./g,'Uygulamada, tarayıcında gerçek bir veritabanı çalışıyor.'],[/Kod kutularındaki\s*(<[^>]+>)?\s*Çalıştır\s*(<\/[^>]+>)?\s*düğmesi/g,'Uygulamadaki kod kutularının Çalıştır düğmesi'],[/Aşağıdaki kutunun üstündeki SQL türü sekmelerine tıklayarak farkı gör:/g,'Uygulamada kutunun üstündeki SQL türü sekmelerinden farkı görebilirsin:']]},
 {dir:'kesit-powerbi',ad:'Kesit Power BI',konu:'Power BI',bekle:3000,ex:'window.PBI_LESSONS||window.KESIT_LESSONS',hash:i=>'#ders-'+i,exHash:i=>'#ders-'+i+'/1'},
 {dir:'kesit-python',ad:'Kesit Python',konu:'Python',bekle:3000,ex:'window.PY_LESSONS',hash:i=>'#/lesson/'+i,exHash:i=>'#/lesson/'+i+'/alistirma'},
];
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const duz=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const kes=(s,n)=>{ if(s.length<=n) return s; const k=s.slice(0,n); return k.slice(0,k.lastIndexOf(' '))+'…'; };
const ld=o=>JSON.stringify(o).replace(/</g,'\\u003c');
const LV={A1:'Temel',A2:'Temel',B1:'Orta',B2:'Orta',C1:'İleri',C2:'İleri',temel:'Temel',orta:'Orta',ileri:'İleri'};
const LVS=['Temel','Orta','İleri'];
function govde(b,app,idler){
 let s=String(b||'');
 (app.duzelt||[]).forEach(([re,y])=>{ s=s.replace(re,y); });
 // Uygulama içi bağlantılar: başka bir dersse statik sayfasına, değilse uygulamaya
 s=s.replace(/<a\b([^>]*?)href="#\/lesson\/([\w-]+)[^"]*"([^>]*)>/g,(m,a,id)=>idler.has(id)?`<a href="../${id}/">`:'<a href="../../">');
 s=s.replace(/<button\b([^>]*?)>([\s\S]*?)<\/button>/g,(m,a,ic)=>{ const l=/data-lesson="([\w-]+)"/.exec(a); if(l&&idler.has(l[1])) return `<a href="../${l[1]}/">${ic}</a>`; const g=/data-go="([\w-]+)"/.exec(a); const d=/data-id="([\w-]+)"/.exec(a); if(g&&d&&idler.has(d[1])) return `<a href="../${d[1]}/">${ic}</a>`; return `<a href="../../">${ic}</a>`; });
 s=s.replace(/<a\b[^>]*?href="\/(?!kesit-|vaka|projeler)[^"]*"[^>]*>([\s\S]*?)<\/a>/g,'$1');
 s=s.replace(/\son[a-z]+="[^"]*"/gi,'');
 return s;
}
function sayfa(app,l,i,L,idler,css){
 const lv=LV[l.lv]||LV[l.lvl]||'';
 const url=`${SITE}/${app.dir}/ders/${l.id}/`, ac=`../../${app.hash(l.id)}`;
 const ozet=kes(duz(l.sum)||duz(l.body),155);
 const ex=(l.ex||[]).filter(Boolean).length;
 const on=L[i-1],son=L[i+1];
 const J={'@context':'https://schema.org','@type':'LearningResource',name:l.title,description:ozet,inLanguage:'tr',isAccessibleForFree:true,learningResourceType:'Ders',educationalLevel:lv,url,isPartOf:{'@type':'Course',name:app.ad,url:`${SITE}/${app.dir}/`,provider:{'@type':'Person',name:'Yusuf Durak'}}};
 return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(l.title)} | ${esc(app.ad)}</title><meta name="description" content="${esc(ozet)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="${esc(app.ad)}"><meta property="og:title" content="${esc(l.title)}"><meta property="og:description" content="${esc(ozet)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/${app.dir}/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/vendor/fonts.css"><link rel="stylesheet" href="../statik.css"><script type="application/ld+json">${ld(J)}</script></head>
<body class="st"><a class="st-skip" href="#icerik">Ana içeriğe geç</a><header class="st-h"><a class="st-b" href="../../">${esc(app.ad)}</a><nav aria-label="Konum"><a href="../">Tüm dersler</a></nav></header>
<main id="icerik" class="st-m"><span class="st-e">${esc([lv,l.mod].filter(Boolean).join(' · '))}</span><h1>${esc(l.title)}</h1>${l.sum?`<p class="st-l">${l.sum}</p>`:''}
<div class="st-c"><a class="st-p" href="${ac}">${ex?`Uygulamada aç, ${ex} alıştırmayı çöz`:'Uygulamada aç'}</a><span>Ücretsiz, hesap gerekmez, kurulum yok.</span></div>
<p class="st-not">Bu sayfa dersin okuma sürümüdür. Metin bir kutuyu çalıştırmanı ya da adıma geçmeni söylüyorsa dersi uygulamada aç.</p>
<article class="panel theory">${govde(l.body,app,idler)}</article>
<div class="st-c"><a class="st-p" href="${ex&&app.exHash?`../../${app.exHash(l.id)}`:ac}">${ex?`Alıştırmalara geç (${ex})`:'Uygulamada devam et'}</a></div>
<nav class="st-n" aria-label="Ders sırası">${on?`<a href="../${on.id}/">← ${esc(on.title)}</a>`:'<span></span>'}${son?`<a href="../${son.id}/">${esc(son.title)} →</a>`:'<span></span>'}</nav></main>
<footer class="st-f">Kesit ücretsiz bir eğitim ve portföy projesidir. Veri setleri hayalidir. <a href="/">Kesit ana sayfası</a> · <a href="/vaka/">Nasıl yapıldı</a></footer></body></html>`;
}
function dizin(app,L){
 const url=`${SITE}/${app.dir}/ders/`, baslik=`${app.konu} dersleri`;
 const blok=LVS.map(v=>{const g=L.filter(l=>(LV[l.lv]||LV[l.lvl])===v); if(!g.length) return ''; const md={}; g.forEach(l=>(md[l.mod||'Diğer']=md[l.mod||'Diğer']||[]).push(l)); return `<h2>${v}</h2>`+Object.entries(md).map(([m,ls])=>`<h3>${esc(m)}</h3><ul>${ls.map(l=>`<li><a href="${l.id}/">${esc(l.title)}</a></li>`).join('')}</ul>`).join('');}).join('');
 const ek=L.filter(l=>!LVS.includes(LV[l.lv]||LV[l.lvl]));
 return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${baslik} | ${esc(app.ad)}</title><meta name="description" content="${L.length} ücretsiz Türkçe ${esc(app.konu)} dersi. Kurulum ve hesap gerekmez; tarayıcıda yazarak öğren."><link rel="canonical" href="${url}"><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/vendor/fonts.css"><link rel="stylesheet" href="statik.css"></head>
<body class="st"><a class="st-skip" href="#icerik">Ana içeriğe geç</a><header class="st-h"><a class="st-b" href="../">${esc(app.ad)}</a></header><main id="icerik" class="st-m"><h1>${baslik}</h1><p class="st-l">${L.length} ücretsiz Türkçe ders. Metni burada oku, alıştırmaları uygulamada çöz.</p><div class="st-c"><a class="st-p" href="../">Uygulamayı aç</a></div><div class="st-d">${blok}${ek.length?`<h2>Diğer</h2><ul>${ek.map(l=>`<li><a href="${l.id}/">${esc(l.title)}</a></li>`).join('')}</ul>`:''}</div></main><footer class="st-f"><a href="/">Kesit ana sayfası</a></footer></body></html>`;
}
const CSS_EK=`
html,body.st{height:auto;overflow:auto}body.st{display:block;margin:0;background:var(--bg);color:var(--ink);padding:0}
.st-skip{position:absolute;left:-999px}.st-skip:focus{left:12px;top:12px;background:var(--surface);padding:8px 12px;z-index:9;border-radius:6px}
.st-h,.st-m,.st-f{max-width:820px;margin:0 auto;padding-left:24px;padding-right:24px}.st-h{display:flex;justify-content:space-between;align-items:center;padding-top:20px;padding-bottom:6px}.st-b{font-weight:800;color:inherit;text-decoration:none;font-size:1.1rem}
.st-m{padding-top:22px;padding-bottom:30px;display:block}.st-e{font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.st-m h1{font-size:clamp(1.8rem,4.6vw,2.6rem);line-height:1.12;margin:8px 0 10px}.st-l{color:var(--muted);font-size:1.05rem;margin:0 0 14px}
.st-c{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0 18px;font-size:.88rem;color:var(--muted)}.st-p{display:inline-block;background:var(--ink);color:var(--bg)!important;padding:10px 16px;border-radius:8px;font-weight:600;text-decoration:none;font-size:.95rem}
.st-not{font-size:.88rem;color:var(--muted);margin:0 0 12px}.st-n{display:flex;justify-content:space-between;gap:16px;margin-top:20px;font-size:.92rem}.st-f{padding-top:14px;padding-bottom:30px;border-top:1px solid var(--line);font-size:.85rem;color:var(--muted)}
.st-d ul{padding-left:18px;margin:6px 0 12px}.st-d li{margin-bottom:5px}.st-d h3{margin:16px 0 4px;font-size:1rem}.st-d h2{margin:26px 0 4px}
article.theory{padding:22px;overflow-wrap:anywhere}article.theory pre{white-space:pre-wrap;overflow-x:auto}article.theory .tbl-wrap{overflow-x:auto}
@media (max-width:640px){.st-h,.st-m,.st-f{padding-left:16px;padding-right:16px}article.theory{padding:14px}}
`;
(async()=>{const b=await chromium.launch();const c=await b.newContext({serviceWorkers:'block'});await c.route(/jsdelivr/,r=>r.abort());const p=await c.newPage();const hat=[];
for(const app of APPS){
 await p.goto(`${BASE}/${app.dir}/`);await p.waitForTimeout(app.bekle);
 const v=await p.evaluate(ex=>{const L=eval(ex);if(!L)return null;const css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('\n');return {css,L:L.map(l=>({id:l.id,title:l.title,sum:l.sum,body:l.body,lv:l.lv,lvl:l.lvl,mod:l.mod,ex:(l.ex||[]).filter(Boolean).map(()=>1)}))}},app.ex);
 if(!v) throw new Error('ders verisi yok: '+app.dir);
 let css=v.css; for(const m of (fs.readFileSync(`${ST}/${app.dir}/index.html`,'utf8').match(/<link[^>]+stylesheet[^>]+>/g)||[])){const h=/href="([^"]+)"/.exec(m);if(h&&!/fonts|^http|^\//.test(h[1])&&fs.existsSync(`${ST}/${app.dir}/${h[1]}`)) css+='\n'+fs.readFileSync(`${ST}/${app.dir}/${h[1]}`,'utf8');}
 const D=`${ST}/${app.dir}/ders`;fs.rmSync(D,{recursive:true,force:true});fs.mkdirSync(D,{recursive:true});fs.writeFileSync(`${D}/statik.css`,css+CSS_EK);
 const idler=new Set(v.L.map(l=>l.id));
 v.L.forEach((l,i)=>{fs.mkdirSync(`${D}/${l.id}`,{recursive:true});fs.writeFileSync(`${D}/${l.id}/index.html`,sayfa(app,l,i,v.L,idler));});
 fs.writeFileSync(`${D}/index.html`,dizin(app,v.L));
 const urls=[`${SITE}/${app.dir}/`,`${SITE}/${app.dir}/ders/`,...v.L.map(l=>`${SITE}/${app.dir}/ders/${l.id}/`)];
 fs.writeFileSync(`${ST}/${app.dir}/sitemap.xml`,`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
 hat.push(`${app.dir}/sitemap.xml`);console.log(app.dir,v.L.length,'ders',Math.round(fs.readdirSync(D).length));
}
fs.writeFileSync(`${ST}/sitemap-ana.xml`,`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/','/vaka/','/projeler/teslimat/'].map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
const dil=fs.existsSync(`${ST}/dilkusu/sitemap.xml`)?['dilkusu/sitemap.xml']:[];
fs.writeFileSync(`${ST}/sitemap.xml`,`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-ana.xml',...hat,...dil].map(u=>`<sitemap><loc>${SITE}/${u}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
