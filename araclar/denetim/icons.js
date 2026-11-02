const KESIT_BASE=process.env.KESIT_BASE||'http://localhost:8765';
const { chromium } = require('playwright'); const fs=require('fs');
const D=require('./yol.js').ROOT+''; const svg=fs.readFileSync(D+'favicon.svg','utf8');
const font="@font-face{font-family:'BG';src:url(vendor/fonts/bricolage-grotesque-latin-wght-normal.woff2) format('woff2');font-weight:200 800}@font-face{font-family:'BG';src:url(vendor/fonts/bricolage-grotesque-latin-ext-wght-normal.woff2) format('woff2');font-weight:200 800;unicode-range:U+0100-02BA}@font-face{font-family:'PX';src:url(vendor/fonts/ibm-plex-sans-latin-400-normal.woff2)}@font-face{font-family:'PX';src:url(vendor/fonts/ibm-plex-sans-latin-ext-400-normal.woff2);unicode-range:U+0100-02BA}";
(async()=>{ const b=await chromium.launch();
 const shot=async(w,h,html,out)=>{ const p=await b.newPage({viewport:{width:w,height:h}}); fs.writeFileSync(D+'_tmp_shot.html','<html><head><meta charset=utf-8><style>'+font+'html,body{margin:0;width:'+w+'px;height:'+h+'px;overflow:hidden}</style></head><body>'+html+'</body></html>'); await p.goto('http://localhost:8765/_tmp_shot.html'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({path:D+out}); await p.close(); };
 const ic=(s,pad,bg)=>'<div style="width:'+s+'px;height:'+s+'px;display:grid;place-items:center;background:'+bg+'"><div style="width:'+(s-2*pad)+'px;height:'+(s-2*pad)+'px">'+svg.replace('<svg ','<svg width="100%" height="100%" ')+'</div></div>';
 await shot(192,192,ic(192,0,'transparent'),'icon-192.png');
 await shot(512,512,ic(512,0,'transparent'),'icon-512.png');
 await shot(512,512,ic(512,96,'#D3352C'),'icon-512-maskable.png');
 await shot(180,180,ic(180,14,'#FBFAF7'),'apple-touch-icon.png');
 const og='<div style="width:1200px;height:630px;background:#FBFAF7;position:relative;font-family:PX;color:#141C27;overflow:hidden">'+
  '<div style="position:absolute;right:0;top:0;width:0;height:0;border-top:420px solid rgba(211,53,44,.08);border-left:420px solid transparent"></div>'+
  '<div style="position:absolute;right:0;top:0;width:0;height:0;border-top:240px solid rgba(211,53,44,.14);border-left:240px solid transparent"></div>'+
  '<div style="position:absolute;left:0;top:0;bottom:0;width:14px;background:#D3352C"></div>'+
  '<div style="position:absolute;left:84px;top:72px;display:flex;align-items:center;gap:18px"><div style="width:64px;height:64px">'+svg.replace('<svg ','<svg width="64" height="64" ')+'</div><div style="font:800 46px BG">Kesit <span style="color:#D3352C">SQL</span></div></div>'+
  '<div style="position:absolute;left:84px;top:200px;font:800 70px/1.05 BG;letter-spacing:-.02em;max-width:900px">Sıfırdan ileri seviyeye<br><span style="color:#D3352C">Türkçe SQL</span></div>'+
  '<div style="position:absolute;left:84px;top:378px;font:400 28px PX;color:#5A6576">Kurulum yok, hesap yok. Tarayıcında gerçek bir veritabanı.</div>'+
  '<div style="position:absolute;left:84px;top:450px;display:flex;gap:16px">'+[['247','ders'],['1.496','alıştırma'],['6','SQL türü'],['6','veri seti']].map(([a,b])=>'<div style="background:#F1F3F6;border-radius:14px;padding:16px 22px"><div style="font:800 34px BG;color:#3866D1">'+a+'</div><div style="font:400 20px PX;color:#5A6576">'+b+'</div></div>').join('')+'</div>'+
  '<div style="position:absolute;right:84px;bottom:56px;font:400 20px PX;color:#8A94A3">Ücretsiz · açık kaynak</div></div>';
 await shot(1200,630,og,'og.png');
 fs.unlinkSync(D+'_tmp_shot.html'); await b.close(); })();
