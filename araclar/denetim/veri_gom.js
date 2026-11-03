// veri_atama_hv.py ve veri_atama_bk.py çıktısını hv.js ve bk.js içindeki ATAMA bloklarına gömer.
// Kullanım: node veri_gom.js hv_atama.json bk_atama.json
const fs=require('fs');const R=require('./yol.js').ROOT+'';
const [hvf,bkf]=process.argv.slice(2);const hv=JSON.parse(fs.readFileSync(hvf,'utf8')),bk=JSON.parse(fs.readFileSync(bkf,'utf8'));
const blok=(s,a,b,y)=>{const i=s.indexOf(a),j=s.indexOf(b);if(i<0||j<0)throw new Error(a);return s.slice(0,i+a.length)+y+s.slice(j);};
let s=fs.readFileSync(R+'hv.js','utf8');
s=blok(s,'/*ATAMA_HV*/','/*ATAMA_HV_SON*/','const ATAMA = '+JSON.stringify({tails:hv.tails,ferries:hv.ferries,relabel:hv.relabel})+';');
fs.writeFileSync(R+'hv.js',s);
const T0=Date.UTC(2024,5,1),dk=t=>Math.round((Date.parse(t.replace(' ','T')+'Z')-T0)/60000);
const kod=['batarya','fren','lastik','zincir','kilit','temizlik'];
const g=new Map();for(const[b,f,t,m]of bk.rebal){const k=dk(m)+'|'+f+'|'+t;if(!g.has(k))g.set(k,[dk(m),f,t,[]]);g.get(k)[3].push(b);}
s=fs.readFileSync(R+'bk.js','utf8');
s=blok(s,'/*ATAMA_BK*/','/*ATAMA_BK_SON*/','const BKA = '+JSON.stringify({atama:bk.atama,dengeleme:[...g.values()],bakim:bk.maint.map(m=>[m[0],dk(m[1]),m[2]?dk(m[2]):null,kod.indexOf(m[3])])})+';');
fs.writeFileSync(R+'bk.js',s);
console.log('hv',hv.tails.length,hv.ferries.length,hv.relabel.length,'bk',bk.rebal.length,g.size,bk.maint.length);
