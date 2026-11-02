// İpucu üretici: ipucu olmayan alıştırma ve pratik görevleri için çözümün yapısından yol gösteren bir ipucu yazar.
// Sabit değerleri ve tam ifadeyi vermez; hangi tablolar, hangi anahtar, hangi yapı sorusuna cevap verir.
// Elle yazılan ipuçları ipucu_elle.json dosyasındadır, üretilenin önüne geçer.
// Çalıştırma: node ipucu_uret.js   (kökte ipuclari.js dosyasını yazar). Kapsam denetimi: node ipucu_uret.js --denetle
const fs=require('fs'); const c=require('./load.js'); const ROOT=require('./yol.js').ROOT; const DX=c.SQLP_DIALECT;
const TABLES=new Set(Object.keys(c.SQLP_COLMETA));
const code=s=>'<code>'+s+'</code>'; const liste=a=>a.length<=1?a.join(''):a.slice(0,-1).join(', ')+' ve '+a[a.length-1];
function analyse(sol){
  const T=DX.tokenize(sol).filter(t=>t.k!=='ws'&&t.k!=='com'); const has=(...w)=>T.some(t=>t.k==='w'&&w.includes(t.u)); const text=T.filter(t=>t.k!=='s').map(t=>t.v).join(' ');
  const tabs=[]; T.forEach(t=>{ if((t.k==='w')&&TABLES.has(t.v.toLowerCase())&&!tabs.includes(t.v.toLowerCase())) tabs.push(t.v.toLowerCase()); });
  const keys=[]; for(const m of text.matchAll(/\bON\s+(?:\w+\s*\.\s*)?(\w+)\s*=\s*(?:\w+\s*\.\s*)?(\w+)/gi)){ const k=m[1]===m[2]?m[1]:m[1]+' = '+m[2]; if(!keys.includes(k)) keys.push(k); }
  for(const m of text.matchAll(/\bUSING\s*\(\s*(\w+)/gi)) if(!keys.includes(m[1])) keys.push(m[1]);
  const after=(w1,w2)=>{ const i=T.findIndex((t,j)=>t.u===w1&&T[j+1]&&T[j+1].u===w2); if(i<0) return []; const out=[]; let dp=0; for(let j=i+2;j<T.length;j++){ const t=T[j]; if(t.v==='(')dp++; if(t.v===')'){ if(!dp)break; dp--; } if(!dp&&t.k==='w'&&['ORDER','HAVING','LIMIT','UNION','SELECT','FROM','WHERE','OFFSET','FETCH','EXCEPT','INTERSECT','WINDOW'].includes(t.u)) break; if(t.v===';')break; if(!dp&&t.k==='w'&&!(T[j+1]&&(T[j+1].v==='(' || T[j+1].v==='.'))) out.push(t.v); } return [...new Set(out)]; };
  const grpRaw=after('GROUP','BY'); const grpCase=grpRaw.some(x=>/^CASE$/i.test(x)); const grp=grpCase?[]:grpRaw.filter(x=>!/^(ROLLUP|CUBE|GROUPING|SETS|CASE|WHEN|THEN|ELSE|END|AND|OR|NULL|IS|NOT|AS|IN|LIKE|BETWEEN|TEXT|INTEGER|DATE)$/i.test(x)).slice(0,3); const hasGroup=T.some((t,j)=>t.u==='GROUP'&&T[j+1]&&T[j+1].u==='BY');
  const part=(()=>{ const i=T.findIndex((t,j)=>t.u==='PARTITION'&&T[j+1]&&T[j+1].u==='BY'); if(i<0) return null; const n=T[i+2]; const n2=T[i+3]; return n2&&n2.v==='.'&&T[i+4]?T[i+4].v:n&&n.v; })();
  const aggs=['COUNT','SUM','AVG','MIN','MAX'].filter(f=>T.some((t,j)=>t.u===f&&T[j+1]&&T[j+1].v==='('&&!(()=>{ let d=0; for(let k=j+1;k<T.length;k++){ if(T[k].v==='(')d++; if(T[k].v===')'){d--; if(!d) return T[k+1]&&T[k+1].u==='OVER'; } } return false; })()));
  const win=['ROW_NUMBER','RANK','DENSE_RANK','NTILE','LAG','LEAD','FIRST_VALUE','LAST_VALUE','NTH_VALUE','PERCENT_RANK','CUME_DIST','SUM','AVG','COUNT','MIN','MAX'].filter(f=>T.some((t,j)=>{ if(t.u!==f||!T[j+1]||T[j+1].v!=='(') return false; let d=0; for(let k=j+1;k<T.length;k++){ if(T[k].v==='(')d++; if(T[k].v===')'){d--; if(!d) return T[k+1]&&T[k+1].u==='OVER'; } } return false; }));
  const ctes=T.filter((t,j)=>t.u==='AS'&&T[j+1]&&T[j+1].v==='('&&T[j+2]&&(T[j+2].u==='SELECT'||T[j+2].u==='WITH')).length;
  const rnd=(()=>{ const m=text.match(/\bROUND\s*\(/i); const all=[...text.matchAll(/,\s*(\d)\s*\)/g)]; return !!m; })();
  return {T,has,text,tabs,keys,grp,grpCase,hasGroup,part,aggs,win,ctes,rnd};
}
const NOQ=q=>String(q||'').replace(/<[^>]+>/g,' ');
function hintFor(e){
  const sol=e.sol; const A=analyse(sol); const {has,text,tabs,keys,grp,grpCase,hasGroup,part,aggs,win,ctes}=A; const qt=NOQ(e.q); const s=[];
  const stmt=(A.T.find(t=>t.k==='w')||{}).u;
  const inQ=t=>qt.includes(t);
  /* veri değiştiren ve tanım ifadeleri */
  if(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|MERGE|BEGIN|TRUNCATE|DECLARE|EXEC)$/.test(stmt||'')&&!has('SELECT','WITH')||/^(CREATE|ALTER|INSERT|UPDATE|DELETE|MERGE|BEGIN|DROP|TRUNCATE)$/.test(stmt||'')){
    const steps=[];
    if(has('BEGIN')||has('START')) steps.push('değişiklikleri '+code('BEGIN')+' ile başlayan bir işleme al');
    if(has('SAVEPOINT')) steps.push('ara noktayı '+code('SAVEPOINT')+' ile işaretle');
    if(has('CREATE')&&has('TABLE')){ if(has('AS')&&has('SELECT')) steps.push('tabloyu bir '+code('SELECT')+' sonucundan oluştur'); else { const k=[]; if(has('PRIMARY'))k.push('birincil anahtar'); if(has('REFERENCES','FOREIGN'))k.push('yabancı anahtar'); if(has('CHECK'))k.push('CHECK'); if(has('UNIQUE'))k.push('UNIQUE'); if(has('DEFAULT'))k.push('DEFAULT'); steps.push('sütunları ve tiplerini tek tek yaz'+(k.length?'; '+liste(k)+' kısıtlarını unutma':'')); } }
    if(has('CREATE')&&has('VIEW')) steps.push('sorguyu '+code('CREATE VIEW ... AS')+' içine al');
    if(has('CREATE')&&has('INDEX')) steps.push('indeks sütun sırasını sorgunun filtresine göre seç');
    if(has('CREATE')&&has('TRIGGER')) steps.push('trigger gövdesini '+code('BEGIN ... END')+' içine yaz');
    if(has('ALTER')) steps.push(code('ALTER TABLE')+' ile yapıyı değiştir');
    if(has('DROP')) steps.push('kaldırma için '+code('DROP')+' yeterli');
    if(has('INSERT')) steps.push(has('SELECT')?'eklenecek satırları '+code('INSERT INTO ... SELECT')+' ile sorgudan al':code('INSERT INTO')+' ile sütun listesini ve değerleri yaz');
    if(has('CONFLICT')) steps.push('çakışma durumunu '+code('ON CONFLICT')+' ile ele al');
    if(has('MERGE')) steps.push(code('MERGE')+' içinde eşleşen ve eşleşmeyen durumları ayrı yaz');
    if(has('UPDATE')) steps.push(code('UPDATE ... SET')+' yaz; hangi satırların değişeceğini '+code('WHERE')+' belirler');
    if(has('DELETE')) steps.push(code('DELETE')+' için '+code('WHERE')+' koşulunu önce '+code('SELECT')+' ile dene');
    if(has('ROLLBACK')) steps.push(code('ROLLBACK')+' ile geri al');
    if(has('COMMIT')&&!has('ROLLBACK')) steps.push(code('COMMIT')+' ile bitir');
    if(steps.length) return cap(steps.join('; '))+'.';
  }
  /* kaynak ve birleştirme */
  if(has('JOIN')&&tabs.length>1){ const left=has('LEFT')&&has('JOIN'); const anti=left&&/\bIS\s+NULL\b/i.test(text); const tb=liste(tabs.slice(0,4).map(code));
    s.push(tb+' tablolarını '+(keys.length?liste(keys.slice(0,3).map(code))+' üzerinden ':'ortak anahtarla ')+(left?code('LEFT JOIN')+' ile bağla':has('CROSS')?code('CROSS JOIN')+' ile eşleştir':'bağla')+(anti?'; eşi olmayanları '+code('IS NULL')+' ile ayıkla':left?'; eşi olmayan satırlar da kalsın':'')); }
  else if(has('CROSS')&&has('JOIN')) s.push(code('CROSS JOIN')+' ile her birleşimi üret');
  else if(tabs.length===1&&!inQ(tabs[0])) s.push('Tablo: '+code(tabs[0]));
  else if(tabs.length>1&&!inQ(tabs[0])) s.push('Kaynaklar: '+liste(tabs.slice(0,3).map(code)));
  /* yapı */
  if(has('RECURSIVE')||/\bWITH\s+\w+\s*\([^)]*\)\s+AS\b/i.test(text)&&/UNION\s+ALL/i.test(text)&&!tabs.length) s.push('Özyinelemeli CTE kur: başlangıç satırı, '+code('UNION ALL')+', kendine başvuran kol ve durma koşulu');
  else if(ctes>=3) s.push('İşi adımlara böl: her ara sonucu ayrı bir CTE yap, son '+code('SELECT')+' onları birleştirsin');
  else if(ctes===2) s.push('İki CTE ile adım adım ilerle: önce ara sonuç, sonra onun üstüne hesap');
  else if(ctes===1&&has('WITH')) s.push('Ara sonucu önce bir CTE'+"'"+'de hesapla');
  if(/\bNOT\s+EXISTS\b/i.test(text)) s.push(code('NOT EXISTS')+' ile karşılığı olmayanları bul');
  else if(/\bEXISTS\b/i.test(text)) s.push(code('EXISTS')+' ile karşılığı olan satırları süz');
  else if(/\bNOT\s+IN\s*\(\s*SELECT/i.test(text)) s.push(code('NOT IN')+' ile alt sorgu kullan; alt sorguda NULL olmamasına dikkat et');
  else if(/\bIN\s*\(\s*SELECT/i.test(text)) s.push('Değer listesini '+code('IN')+' içindeki alt sorguyla üret');
  else if(/[=<>]\s*\(\s*SELECT/i.test(text)) s.push('Karşılaştıracağın değeri alt sorguyla hesapla');
  else if(/\bFROM\s*\(\s*SELECT/i.test(text)) s.push('Önce iç sorguda ara sonucu hazırla, dış sorguda onu kullan');
  if(has('UNION','INTERSECT','EXCEPT','MINUS')){ const k=has('UNION')?(/UNION\s+ALL/i.test(text)?'UNION ALL':'UNION'):has('INTERSECT')?'INTERSECT':'EXCEPT'; if(!(has('RECURSIVE'))) s.push('İki sonucu '+code(k)+' ile birleştir; sütun sayıları ve sıraları aynı olmalı'); }
  if(/\bPIVOT\b/i.test(text)) s.push(code('PIVOT')+' içinde toplama ve sütun değerlerini belirt');
  if(has('LATERAL','APPLY')) s.push('Satır başına çalışan alt sorgu için '+code(has('APPLY')?'APPLY':'LATERAL'));
  if(has('ROLLUP')) s.push('Ara toplamlar için '+code('ROLLUP'));
  if(has('CUBE')) s.push('Tüm kombinasyon toplamları için '+code('CUBE'));
  if(/\bGROUPING\s+SETS\b/i.test(text)) s.push('Birden çok gruplama için '+code('GROUPING SETS'));
  if(win.length){ const f=win[0]; const p=part?code('PARTITION BY '+part)+' ile':'';
    if(['ROW_NUMBER','RANK','DENSE_RANK'].includes(f)) s.push((p?p+' grupla, ':'')+code(f)+' ile sıra numarası ver'+(/=\s*1\b|<=\s*\d/.test(text)?', sonra dışarıda süz':''));
    else if(['LAG','LEAD'].includes(f)) s.push(code(f)+' ile önceki ya da sonraki satırın değerini al'+(p?'; '+p+' grupla':'')+', sırayı '+code('ORDER BY')+' belirler');
    else if(f==='NTILE') s.push(code('NTILE')+' ile eşit dilimlere böl');
    else if(['FIRST_VALUE','LAST_VALUE','NTH_VALUE'].includes(f)) s.push(code(f)+' kullan; çerçeveye dikkat et');
    else if(['PERCENT_RANK','CUME_DIST'].includes(f)) s.push(code(f)+' yüzdelik konumu verir');
    else s.push(code(f+'(...) OVER')+' ile satırları koruyarak hesapla'+(/\b(ROWS|RANGE)\b/i.test(text)?'; çerçeveyi '+code('ROWS BETWEEN')+' ile belirt':'')); }
  /* filtre, grup: mantıksal sıra WHERE → GROUP BY → HAVING */
  const cok=/\bLEFT\s+JOIN\b/i.test(text)&&/\bIS\s+NULL\b/i.test(text);
  if(has('LIKE','ILIKE')) s.push('Desen için '+code('LIKE')+' ve '+code('%'));
  else if(has('BETWEEN')) s.push('Aralık için '+code('BETWEEN')+' (iki uç dahil)');
  else if(/\bIN\s*\(\s*'/i.test(sol)||/\bIN\s*\(\s*\d/.test(sol)) s.push('Değer listesi için '+code('IN'));
  else if(/\bIS\s+(NOT\s+)?NULL\b/i.test(text)&&!cok) s.push('Boşluk kontrolü için '+code('IS NULL')+' ya da '+code('IS NOT NULL')+'; '+code('= NULL')+' çalışmaz');
  else if(has('WHERE')&&!/\bEXISTS\b/i.test(text)&&!win.length) s.push('Satırları önce '+code('WHERE')+' ile süz');
  if(/\b(SUBSTR|SUBSTRING|REPLACE|TRIM|UPPER|LOWER|INSTR|CHARINDEX|LENGTH|LEN|CONCAT|REGEXP_\w+|TRANSLATE)\s*\(/i.test(text)||/\|\|/.test(sol)) s.push('Metni dönüştürmek için metin fonksiyonlarını kullan');
  if(has('STRFTIME','EXTRACT','YEAR','MONTH','TO_CHAR','FORMAT','DATE_FORMAT','DATE_TRUNC','DATE','DATEADD')) s.push('Tarih parçasını tarih fonksiyonuyla al');
  if(has('JULIANDAY','DATEDIFF')) s.push('Süreyi iki tarihin farkıyla hesapla');
  if(hasGroup&&aggs.length){ if(grp.length) s.push('Her '+liste(grp.map(code))+' için '+liste(aggs.map(code))+' hesapla ('+code('GROUP BY')+')'); else if(grpCase) s.push(code('CASE')+' sonucuna göre grupla, her grupta '+liste(aggs.map(code))+' hesapla; aynı ifadeyi '+code('GROUP BY')+' içinde tekrarla'); else s.push('Gruplayıp '+liste(aggs.map(code))+' hesapla'); }
  else if(aggs.length) s.push('Sonuç tek satır olacak: '+liste(aggs.map(code)));
  if(has('HAVING')) s.push('Grup koşulunu '+code('HAVING')+' ile yaz, '+code('WHERE')+' ile değil');
  if(has('CASE')&&!grpCase) s.push('Koşullu değer için '+code('CASE WHEN')+(/\b(SUM|COUNT|AVG)\s*\(\s*CASE/i.test(text)?' toplama fonksiyonunun içinde':''));
  if(has('COALESCE','IFNULL','ISNULL','NVL')) s.push('Boş değerleri '+code('COALESCE')+' ile karşıla');
  if(has('NULLIF')) s.push('Sıfıra bölmeyi '+code('NULLIF')+' ile önle');
  if(has('DISTINCT')) s.push('Tekrarları '+code('DISTINCT')+' ile at');
  if(/100(\.0+)?\s*\*/.test(text)) s.push('Yüzde için 100.0 ile çarp, tam sayı bölmesi olmasın');
  if(has('LIMIT','TOP','FETCH')) s.push('Sırala, sonra ilk satırları al');
  else if(has('ORDER')&&e.ord&&s.length<4) s.push('Sıra önemli: '+code('ORDER BY')+' ekle');
  if(!s.length) s.push('İstenen sütunları '+code('SELECT')+' ile sırayla yaz');
  if(s.length===1&&/^Tablo:/.test(s[0])) s.push('İstenen sütunları '+code('SELECT')+' ile sırayla yaz');
  /* en önemli dört adım */
  const pick=s.slice(0,5);
  return pick.map(cap).join('. ')+'.';
}
const cap=t=>t.startsWith('<')?t:t[0].toLocaleUpperCase('tr')+t.slice(1);
const elle=fs.existsSync('ipucu_elle.json')?JSON.parse(fs.readFileSync('ipucu_elle.json','utf8')):{};
const out={ders:{},pratik:{}}; let gen=0,man=0,missing=[];
c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(e.t==='mc'||!e.sol) return; const k=l.id+'#'+i; if(e.hint&&!e.hint_uretildi&&!elle[k]) return; const h=elle[k]||hintFor(e); if(elle[k]) man++; else gen++; (out.ders[l.id]=out.ders[l.id]||{})[i]=h; }));
c.SQLP_PRACTICE.forEach(p=>{ if(!p.sol||p.t==='mc') return; const k='P:'+p.id; if(p.hint&&!p.hint_uretildi&&!elle[k]) return; const h=elle[k]||hintFor(p); if(elle[k]) man++; else gen++; out.pratik[p.id]=h; });
if(process.argv.includes('--ornek')){ const a=[]; c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ const x=out.ders[l.id]&&out.ders[l.id][i]; if(x) a.push(l.id+'#'+i+' | '+x.replace(/<\/?code>/g,'`')); })); const n=+process.argv[process.argv.indexOf('--ornek')+1]||40; for(let i=0;i<n;i++) console.log(a[Math.floor(i*a.length/n)]); process.exit(0); }
const js='/* Üretilen dosya: araclar/denetim/ipucu_uret.js. Elle düzeltme için ipucu_elle.json. */\n(function(){\nconst H='+JSON.stringify(out)+';\nconst L={}; (window.SQLP_LESSONS||[]).forEach(l=>L[l.id]=l);\nfor(const id in H.ders){ const l=L[id]; if(!l||!l.ex) continue; for(const i in H.ders[id]){ const e=l.ex[+i]; if(e&&(!e.hint||H.elle)) { e.hint=H.ders[id][i]; e.hint_uretildi=1; } } }\nconst P={}; (window.SQLP_PRACTICE||[]).forEach(p=>P[p.id]=p);\nfor(const id in H.pratik){ const e=P[id]; if(e&&!e.hint){ e.hint=H.pratik[id]; e.hint_uretildi=1; } }\n})();\n';
if(!process.argv.includes('--denetle')) fs.writeFileSync(ROOT+'ipuclari.js',js);
console.log('uretilen',gen,'elle',man);
