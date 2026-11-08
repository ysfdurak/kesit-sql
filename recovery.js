window.KESIT_RECOVERY_KEYS={"sqlpatika.v1": {"app": "kesit-sql", "maps": ["done", "ex", "days", "drafts", "seen", "rv", "dl"]}};
/* İlerleme kurtarma: bozuk kayıt kullanıcı kararına kadar değiştirilemez. */
(function () {
'use strict';
if(typeof document === 'undefined') return;
let native; try { native = window.localStorage; } catch(e) { native = {getItem:()=>null,setItem(){throw Error('Depolama kapalı.');},removeItem(){throw Error('Depolama kapalı.');}}; }
const specs = window.KESIT_RECOVERY_KEYS || {}, blocked = new Map();
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function validate(key, raw) {
  const v = JSON.parse(raw), spec = specs[key];
  if (spec.array ? !Array.isArray(v) : !object(v)) throw Error('Kayıt biçimi geçersiz.');
  const walk = x => { if (!x || typeof x !== 'object') return; Object.keys(x).forEach(k => { if (['__proto__','prototype','constructor'].includes(k)) throw Error('Güvenli olmayan alan.'); walk(x[k]); }); }; walk(v);
  (spec.maps || []).forEach(k => { if (v[k] !== undefined && !object(v[k])) throw Error(k + ' alanı okunamıyor.'); });
  if (v.xp !== undefined && (typeof v.xp !== 'number' || !Number.isFinite(v.xp) || v.xp < 0)) throw Error('XP alanı okunamıyor.');
  return v;
}
Object.keys(specs).forEach(k => { try { const raw = native.getItem(k); if (raw !== null) { try { validate(k, raw); } catch (e) { blocked.set(k, raw); try { const bk=k+'.recovery.raw'; if(native.getItem(bk)===null)native.setItem(bk,raw); else if(native.getItem(bk)!==raw)native.setItem(k+'.recovery.'+Date.now(),raw); } catch(_) {} } } } catch (e) {} });
const api = window.KESIT_STORAGE = {
  getItem(k) { return blocked.has(k) ? null : native.getItem(k); },
  setItem(k,v) { if (blocked.has(k)) return false; if (specs[k]) validate(k,String(v)); native.setItem(k,v); return true; },
  removeItem(k) { if (blocked.has(k)) return false; native.removeItem(k); return true; },
  isBlocked(k) { return k ? blocked.has(k) : blocked.size > 0; }
};
function show() {
  if (!blocked.size) return;
  const box = document.createElement('section'); box.id='kesit-recovery'; box.setAttribute('role','alert'); box.setAttribute('aria-label','İlerleme kaydı kurtarma');
  box.style.cssText='position:relative;z-index:2147483646;background:#fff4d6;color:#302100;border:3px solid #9a6200;padding:18px;margin:12px;font:16px/1.5 system-ui;border-radius:12px';
  const title=document.createElement('h2');title.textContent='Kayıtlarını önce koruyalım.';title.style.fontSize='20px';box.append(title);
  const p=document.createElement('p');p.textContent='Bir veya daha fazla ilerleme kaydı okunamıyor. Bozuk kayıtların üzerine yazılmıyor ve bulut eşitlemesi durduruldu. Bu oturumdaki yeni çalışmalar kaydedilmeyecek. Önce ham kaydı indir; sonra geçerli yedeği yükle veya yalnız okunamayan kaydı sıfırla.';box.append(p);
  const status=document.createElement('p');status.setAttribute('role','status');
  function button(text,fn) { const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='min-height:44px;padding:10px;margin:4px;background:#382800;color:white;border:0;border-radius:6px;font:inherit';b.onclick=fn;box.append(b);return b; }
  let exported=false;
  const reset=button('Yalnız okunamayan kayıtları sıfırla',()=>{
    if (!exported) return;
    try { for(const [k,raw] of blocked) if(native.getItem(k)!==raw) throw Error('Kayıt başka sekmede değişti.'); for (const k of blocked.keys()) native.removeItem(k); location.reload(); } catch(e) { status.textContent='Kayıt değişmiş veya depolama kapalı; sıfırlama durduruldu. Sayfayı yeniden aç.'; }
  });reset.disabled=true;
  button('Ham kayıtları indir',()=>{try {
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({app:'kesit-ham-kurtarma',date:new Date().toISOString(),records:Object.fromEntries(blocked)},null,2)],{type:'application/json'}));
    a.href=url;a.download='ilerleme-ham-kurtarma.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);exported=true;reset.disabled=false;status.textContent='Ham kayıt indirme başlatıldı. Dosyayı sakla; otomatik yedek değildir.';
  }catch(e){status.textContent='Dosya indirilemedi. Kayıt korunmaya devam ediyor.';}});
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;box.append(input);
  button('Geçerli yedek yükle',()=>input.click());
  input.onchange=async()=>{try {
    if(!input.files[0])return;
    const pack=JSON.parse(await input.files[0].text()), writes=[];
    for(const k of blocked.keys()) {
      const spec=specs[k];if(pack.app!==spec.app)throw Error('Bu yedek bu uygulamaya ait değil.');
      const raw=spec.ls ? pack.ls && pack.ls[k] : JSON.stringify(pack.ilerleme || pack.data);
      if(typeof raw!=='string')throw Error('Yedekte gerekli ilerleme kaydı yok.');
      const v=validate(k,raw);if(!spec.array && (typeof v.xp!=='number' || (spec.ls ? !object(v.sr)||!object(v.sc) : !object(v.done))))throw Error('Yedekte zorunlu ilerleme alanları eksik.');if(!spec.array && !Object.keys(v).length)throw Error('Boş kayıt yedek olarak yüklenemez.');
      writes.push([k,raw]);
    }
    // Yazma hatasında önceden değiştirilen anahtarları geri koy.
    for(const [k,raw] of blocked)if(native.getItem(k)!==raw)throw Error('Kayıt başka sekmede değişti. Önce sayfayı yeniden aç.');
    const before=writes.map(([k])=>[k,native.getItem(k)]);
    try {writes.forEach(([k,v])=>native.setItem(k,v));}catch(e){before.forEach(([k,v])=>{try{native.setItem(k,v);}catch(_){}});throw e;}
    location.reload();
  }catch(e){status.textContent='Yedek yüklenmedi: '+e.message;input.value='';}};
  box.append(status);document.body.prepend(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
