/* Kesit SQL hesap ve eşitleme katmanı (Supabase)
   - Yapılandırma yoksa hiçbir şey yapmaz; uygulama hesapsız çalışır.
   - İlerleme her zaman önce tarayıcıda saklanır; girişliyken birkaç saniye içinde hesaba yazılır.
   - Cihazlar arası birleştirme kaybetmez: biten dersler ve alıştırmalar birleşir, sayılarda büyük olan kalır. */
(function () {
  const CFG = window.KESIT_CONFIG || {};
  const ON = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const st = { user: null, phase: ON ? 'loading' : 'off', last: null, err: null, pushT: null, busy: false, pulledAt: 0, sentTo: '' };
  let sb = null;
  const app = () => window.KESIT_APP;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rer = () => { try { app().render(); } catch (e) { } };

  /* ---------- birleştirme ---------- */
  function hasProgress(p) { return !!p && ((p.xp || 0) > 0 || Object.keys(p.done || {}).length > 0 || Object.keys(p.ex || {}).length > 0); }
  function merge(a, b) {               // a: öncelikli taraf (metin ve tercihlerde a kazanır)
    if (a === undefined || a === null) return b;
    if (b === undefined || b === null) return a;
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && (!Array.isArray(b) || a.length >= b.length) ? a : b;
    if (typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) o[k] = merge(a[k], b[k]); return o; }
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (typeof a === 'boolean' || typeof b === 'boolean') return !!(a || b);
    return a;
  }
  function mergeProgress(local, remote) {
    if (!remote) return local;
    if (!hasProgress(local)) return merge(remote, local);   // yeni cihaz: tercihleri hesaptan al
    return merge(local, remote);
  }

  /* ---------- Supabase ---------- */
  function loadSdk() {
    return new Promise((res, rej) => {
      if (window.supabase && window.supabase.createClient) return res();
      const s = document.createElement('script'); s.src = SDK; s.async = true;
      s.onload = () => res(); s.onerror = () => rej(new Error('Hesap servisi yüklenemedi'));
      document.head.appendChild(s);
    });
  }
  const redirectTo = () => location.origin + location.pathname;

  async function pull() {
    if (!sb || !st.user) return;
    const { data, error } = await sb.from('progress').select('data, updated_at').eq('user_id', st.user.id).maybeSingle();
    if (error) throw error;
    const local = app().getP();
    const merged = mergeProgress(local, data ? data.data : null);
    if (JSON.stringify(merged) !== JSON.stringify(local)) app().replaceP(merged);
    st.pulledAt = Date.now();
    await push(true);
  }
  async function push(force) {
    if (!sb || !st.user) return;
    clearTimeout(st.pushT); st.pushT = null;
    if (st.busy && !force) { schedule(); return; }
    st.busy = true;
    try {
      const { error } = await sb.from('progress').upsert({ user_id: st.user.id, data: app().getP(), updated_at: new Date().toISOString() });
      if (error) throw error;
      st.last = new Date(); st.err = null; st.phase = 'in';
    } catch (e) { st.err = 'Eşitlenemedi: ' + (e.message || e); }
    finally { st.busy = false; paintSide(); }
  }
  function schedule() { if (!st.user) return; clearTimeout(st.pushT); st.pushT = setTimeout(() => push(), 2500); }

  async function onUser(user) {
    st.user = user || null; st.phase = user ? 'in' : 'out';
    if (user) { try { await pull(); } catch (e) { st.err = 'Hesaptaki ilerleme alınamadı: ' + (e.message || e); } }
    rer();
  }

  async function init() {
    if (!ON) return;
    try {
      await loadSdk();
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'kesit.auth' } });
      sb.auth.onAuthStateChange((ev, session) => {
        if (ev === 'SIGNED_IN' && (!st.user || st.user.id !== session.user.id)) { closeModal(); onUser(session.user); if (app()) app().toast('Giriş yapıldı; ilerlemen hesabınla eşitleniyor'); }
        else if (ev === 'SIGNED_OUT') { st.user = null; st.phase = 'out'; rer(); }
      });
      const { data } = await sb.auth.getSession();
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
      await onUser(data && data.session ? data.session.user : null);
    } catch (e) { st.phase = 'error'; st.err = e.message || String(e); rer(); }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && st.pushT) push();
      if (document.visibilityState === 'visible' && st.user && Date.now() - st.pulledAt > 60000) pull().catch(() => { });
    });
  }

  /* ---------- arayüz ---------- */
  const when = d => d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
  function statusText() {
    if (st.phase === 'loading') return 'Hesap servisi hazırlanıyor…';
    if (st.phase === 'error') return 'Hesap servisine ulaşılamadı; ilerlemen bu tarayıcıda saklanıyor.';
    if (!st.user) return 'Giriş yapmadın; ilerlemen yalnızca bu tarayıcıda.';
    if (st.err) return st.err;
    return st.last ? 'Hesabınla eşitlendi · ' + when(st.last) : 'Hesabınla eşitleniyor…';
  }
  function sideHTML() {
    if (!ON) return '';
    return '<div class="acct-side" id="acctSide" style="grid-column:1/-1">' + sideInner() + '</div>';
  }
  function sideInner() {
    if (st.user) return '<button class="btn sm" data-go="profile" style="width:100%;justify-content:flex-start;gap:8px"><span class="acct-dot' + (st.err ? ' bad' : '') + '"></span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">' + esc(st.user.email || 'Hesabım') + '</span></button>';
    return '<button class="btn sm pri" data-acct="open" style="width:100%">Giriş yap · ilerlemeni sakla</button>';
  }
  function paintSide() { const el = document.getElementById('acctSide'); if (el) el.innerHTML = sideInner(); const pn = document.getElementById('acctStatus'); if (pn) pn.textContent = statusText(); }
  function homeHTML() {
    if (st.user) return '<span class="muted" style="font-size:.8rem">' + esc(statusText()) + '</span>';
    return '<div class="continue" style="border-style:solid"><div class="grow"><b>İlerlemen bu tarayıcıda</b><span class="muted" style="font-size:.85rem">Ücretsiz hesapla telefonda ve bilgisayarda kaldığın yerden devam et.</span></div><button class="btn sm pri" data-acct="open">Giriş yap</button></div>';
  }
  function panelHTML() {
    if (!ON) return '';
    let h = '<section class="panel acct-panel"><div class="sec-head"><h3>Hesap</h3>' + (st.user ? '<span class="chip okc">Girişli</span>' : '') + '</div>';
    if (st.user) {
      h += '<p style="margin:0"><b>' + esc(st.user.email || '') + '</b></p><p class="muted" id="acctStatus" style="margin:0;font-size:.88rem">' + esc(statusText()) + '</p>';
      h += '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-acct="sync">Şimdi eşitle</button><button class="btn sm" data-acct="export">Verilerimi indir</button><button class="btn sm" data-acct="logout">Çıkış yap</button><span style="flex:1"></span><button class="btn sm ghost" data-acct="delete" style="color:var(--bad,#C62828)">Hesabımı sil</button></div>';
    } else {
      h += '<p class="muted" style="margin:0">' + esc(statusText()) + ' Ücretsiz bir hesapla ilerlemen cihazlar arasında taşınır ve tarayıcı verisi silinse de kaybolmaz.</p><div class="row"><button class="btn pri" data-acct="open">Giriş yap ya da hesap oluştur</button></div>';
    }
    return h + '</section>';
  }

  /* ---------- giriş penceresi ---------- */
  function modal(inner) {
    closeModal();
    const w = document.createElement('div'); w.className = 'acct-modal'; w.id = 'acctModal';
    w.innerHTML = '<div class="acct-box" role="dialog" aria-modal="true" aria-labelledby="acctTitle">' + inner + '</div>';
    w.addEventListener('click', e => { if (e.target === w) closeModal(); });
    document.body.appendChild(w);
    const f = w.querySelector('input'); if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { const m = document.getElementById('acctModal'); if (m) m.remove(); }
  const privacy = () => '<p class="muted" style="font-size:.78rem;margin:0">Devam ederek <a href="' + esc(CFG.privacyUrl || 'gizlilik.html') + '" target="_blank" rel="noopener">aydınlatma metnini</a> okuduğunu kabul edersin. Yalnızca e-posta adresini ve öğrenme ilerlemeni saklarız.</p>';
  function loginModal(msg) {
    modal('<div class="sec-head"><h3 id="acctTitle" style="margin:0">Giriş yap</h3><button class="btn ghost sm" data-acct="close" aria-label="Kapat">✕</button></div>' +
      '<p class="muted" style="margin:0">Şifre yok. E-posta adresine bir giriş bağlantısı ve 6 haneli kod göndeririz. Hesabın yoksa ilk girişte oluşur.</p>' +
      (CFG.google ? '<button class="btn" data-acct="google" style="width:100%">Google ile devam et</button><div class="acct-or"><span>ya da</span></div>' : '') +
      '<form data-acct-form="email" style="display:flex;flex-direction:column;gap:8px"><input class="input" type="email" name="email" required autocomplete="email" placeholder="ornek@eposta.com" value="' + esc(st.sentTo) + '"><button class="btn pri" type="submit">Giriş bağlantısı gönder</button></form>' +
      (msg ? '<div class="msg err">' + esc(msg) + '</div>' : '') + privacy());
  }
  function codeModal(email, msg) {
    modal('<div class="sec-head"><h3 id="acctTitle" style="margin:0">E-postanı kontrol et</h3><button class="btn ghost sm" data-acct="close" aria-label="Kapat">✕</button></div>' +
      '<p style="margin:0"><b>' + esc(email) + '</b> adresine bir giriş bağlantısı gönderdik. Bağlantıya bu cihazda tıklayabilir ya da e-postadaki 6 haneli kodu buraya yazabilirsin.</p>' +
      '<form data-acct-form="code" style="display:flex;gap:8px"><input class="input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456" style="flex:1"><button class="btn pri" type="submit">Doğrula</button></form>' +
      (msg ? '<div class="msg err">' + esc(msg) + '</div>' : '') +
      '<p class="muted" style="font-size:.82rem;margin:0">E-posta gelmediyse istenmeyen klasörüne bak. <button class="btn ghost sm" style="padding:0" data-acct="open">Başka adres dene</button></p>');
  }
  function deleteModal(msg) {
    modal('<div class="sec-head"><h3 id="acctTitle" style="margin:0">Hesabını sil</h3><button class="btn ghost sm" data-acct="close" aria-label="Kapat">✕</button></div>' +
      '<p style="margin:0">Hesabın ve hesaptaki tüm ilerlemen kalıcı olarak silinir. Bu işlem geri alınamaz. İstersen önce <button class="btn ghost sm" style="padding:0" data-acct="export">verilerini indir</button>.</p>' +
      '<form data-acct-form="delete" style="display:flex;flex-direction:column;gap:8px"><label class="muted" style="font-size:.88rem">Onaylamak için <b>SİL</b> yaz</label><input class="input" name="ok" autocomplete="off"><button class="btn" type="submit" style="background:var(--bad,#C62828);color:#fff;border-color:transparent">Hesabımı kalıcı olarak sil</button></form>' +
      (msg ? '<div class="msg err">' + esc(msg) + '</div>' : ''));
  }
  function trErr(e) {
    const m = (e && (e.message || e.error_description)) || String(e);
    if (/rate|too many|security purposes/i.test(m)) return 'Çok sık deneme yapıldı. Bir dakika bekleyip tekrar dene.';
    if (/expired|invalid|otp/i.test(m)) return 'Kod geçersiz ya da süresi dolmuş. Yeni bağlantı iste.';
    if (/fetch|network/i.test(m)) return 'Bağlantı kurulamadı. İnternetini kontrol et.';
    return m;
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ hesap: st.user ? st.user.email : null, indirildi: new Date().toISOString(), ilerleme: app().getP() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kesit-sql-verilerim.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  document.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-acct]'); if (!t) return;
    ev.preventDefault(); ev.stopPropagation();
    const a = t.dataset.acct;
    if (a === 'close') return closeModal();
    if (a === 'open') return loginModal();
    if (a === 'export') return exportData();
    if (!sb) { loginModal('Hesap servisi henüz hazır değil. Biraz sonra tekrar dene.'); return; }
    if (a === 'google') { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } }); if (error) loginModal(trErr(error)); return; }
    if (a === 'sync') { st.err = null; paintSide(); try { await pull(); app().toast('Eşitlendi'); } catch (e) { st.err = trErr(e); } rer(); return; }
    if (a === 'logout') {
      if (st.pushT) await push();
      await sb.auth.signOut(); st.user = null; st.phase = 'out'; st.last = null;
      app().replaceP(app().fresh()); app().toast('Çıkış yapıldı. İlerlemen hesabında duruyor.'); return;
    }
    if (a === 'delete') return deleteModal();
  }, true);

  document.addEventListener('submit', async ev => {
    const f = ev.target.closest('[data-acct-form]'); if (!f) return;
    ev.preventDefault();
    const kind = f.dataset.acctForm, btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    try {
      if (kind === 'email') {
        const email = f.email.value.trim(); st.sentTo = email;
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
        if (error) throw error; codeModal(email);
      } else if (kind === 'code') {
        const token = f.code.value.replace(/\s/g, '');
        const { data, error } = await sb.auth.verifyOtp({ email: st.sentTo, token, type: 'email' });
        if (error) throw error; closeModal(); if (data && data.user && (!st.user || st.user.id !== data.user.id)) await onUser(data.user);
      } else if (kind === 'delete') {
        if (f.ok.value.trim().toLocaleUpperCase('tr') !== 'SİL') { deleteModal('Onay için SİL yazmalısın.'); return; }
        const { error } = await sb.rpc('delete_my_account'); if (error) throw error;
        await sb.auth.signOut(); st.user = null; st.phase = 'out'; closeModal();
        app().replaceP(app().fresh()); app().toast('Hesabın ve ilerlemen silindi');
      }
    } catch (e) {
      if (kind === 'email') loginModal(trErr(e)); else if (kind === 'code') codeModal(st.sentTo, trErr(e)); else deleteModal(trErr(e));
    } finally { if (btn && btn.isConnected) btn.disabled = false; }
  }, true);

  window.KESIT_SYNC = { enabled: () => ON, init, dirty: schedule, sideHTML, panelHTML, homeHTML, _merge: mergeProgress, _state: st };
})();
