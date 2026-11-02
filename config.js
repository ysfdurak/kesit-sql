/* Kesit SQL yapılandırması — yayından önce yalnızca bu dosyayı düzenlemen yeterli (YAYIN.md). */
window.KESIT_CONFIG = {
  /* Sitenin adresi (belgede ve LinkedIn paylaşımında kullanılır). Boşsa sayfanın kendi adresi kullanılır. */
  siteUrl: 'https://ysfdurak.github.io/kesit-sql/',

  /* Hakkında sayfasında görünür. Boş bırakılan alan gösterilmez. */
  author: {
    name: 'Yusuf Durak',
    title: 'Süreç ve Sistem Yalınlaştırma Yöneticisi · Operasyon Geliştirme Yöneticisi',
    bio: 'Süreçleri ve sistemleri yalınlaştırıyor, operasyonları veriyle geliştiriyorum. İsrafı azaltan, ekipleri hızlandıran basit çözümler kurmaya odaklanıyorum.',
    linkedin: 'https://www.linkedin.com/in/yusuf-durak',
    github: 'https://github.com/ysfdurak',
    repo: 'https://github.com/ysfdurak/kesit-sql'
  },
  /* Hakkında → "Nasıl yapıldı". Boş bırakırsan bölüm görünmez. */
  story: 'Süreç yalınlaştırma ve operasyon geliştirme işinde en sık gördüğüm israflardan biri, ekiplerin basit bir veri sorusu için başkasını beklemesi. SQL bu bekleyişi ortadan kaldıran en güçlü araçlardan biri; ama Türkçe, kurulum gerektirmeyen ve yaparak öğreten bir kaynak bulmak zor. Kesit SQL\'i bu boşluğu doldurmak için tasarladım. Ürün sahibi gibi çalıştım: hedef kitleyi, seviye yapısını, 18 kariyer patikasını ve İK analitiği, bisiklet paylaşımı gibi gerçekçi veri setlerini ben kurguladım; kodu ve içeriği yapay zekâ (Claude) ile geliştirdim. Kaliteyi otomatik denetimler ve bağımsız kullanıcı testleriyle sağladım: her alıştırma altı SQL programında test edildi, bulunan hatalar düzeltilip her sürüm yeniden denetlendi. Sürekli iyileştirme bu projede de işin merkezinde.',
  license: '',           // boşsa: içerik CC BY-NC 4.0, kod MIT

  /* Geri bildirim formu (Google Forms ya da Tally). Adreste {ders} yazan yere ders adı otomatik gelir.
     Google Forms: formda "Ders" adlı kısa yanıt sorusu aç → ⋮ → "Önceden doldurulmuş bağlantı al" → Ders alanına {ders} yaz → bağlantıyı kopyala.
     Tally: formun adresinin sonuna ?ders={ders} ekle ve formda "ders" adlı gizli alan tanımla. */
  feedbackFormUrl: '',

  /* Ders yorumları (Giscus, GitHub Discussions). Değerleri https://giscus.app sayfasından al (YAYIN.md, adım 4). */
  giscus: { repo: 'ysfdurak/kesit-sql', repoId: '', category: 'Dersler', categoryId: '' },   // repoId ve categoryId: YAYIN.md, adım 5

  /* Ziyaret sayacı (GoatCounter, çerezsiz). goatcounter.com'da açtığın kod: örn. 'kesitsql' → https://kesitsql.goatcounter.com
     Boş kalırsa sayaç yüklenmez. */
  goatcounter: '',

  /* İsteğe bağlı hesap sistemi (Supabase). Portföy sürümünde BOŞ kalsın: hesap olmaz, kişisel veri toplanmaz. */
  supabaseUrl: '',
  supabaseAnonKey: '',
  google: false,
  privacyUrl: 'gizlilik.html'
};
