/* Kesit SQL yapılandırması: yayın ayarları tek dosyada. */
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
  story: 'Süreç yalınlaştırma ve operasyon geliştirme işinde en sık gördüğüm israflardan biri, ekiplerin basit bir veri sorusu için başkasını beklemesi. SQL bu bekleyişi kısaltan araçların başında geliyor; ama Türkçe, kurulum gerektirmeyen ve yaparak öğreten bir kaynak bulmak zor. Kesit SQL\'i bu boşluğu doldurmak için tasarladım. Ürün sahibi gibi çalıştım: hedef kitleyi, seviye yapısını, öğrenme yollarını ve veri setlerinin senaryolarını ben kurguladım; kodu ve içeriği yapay zekâ (Claude) ile geliştirdim. Kaliteyi otomatik denetimlerle sınadım: her alıştırma çözümü SQLite tabanlı taklit katmanında altı SQL türünde, PostgreSQL için ayrıca gerçek motorda (PGlite) çalıştırıldı; bulunan hatalar düzeltilip yeniden denetlendi. Bu denetim betikleri deponun kaynak dalında.',
  /* Kesit ailesi: menünün altında ve Hakkında sayfasında görünür. Tam adres, kendi uygulaması gösterilmez. */
  homeUrl: 'https://ysfdurak.github.io/',
  sqlUrl: 'https://ysfdurak.github.io/kesit-sql/',
  pbiUrl: 'https://ysfdurak.github.io/kesit-powerbi/',
  pythonUrl: 'https://ysfdurak.github.io/kesit-python/',
  statUrl: 'https://ysfdurak.github.io/kesit-istatistik/',
  license: '',           // boşsa: içerik CC BY-NC 4.0, kod MIT

  /* Geri bildirim: boşsa bağlantılar GitHub Issues'u açar (author.repo). Google Forms ya da Tally kullanılacaksa adresi buraya yaz; {ders} yerine ders adı gelir. */
  feedbackFormUrl: '',

  /* Ders yorumları (Giscus). Boş kaldıkça yorum alanı görünmez ve dış istek olmaz. Değerler: https://giscus.app */
  giscus: { repo: 'ysfdurak/kesit-sql', repoId: '', category: 'Dersler', categoryId: '' },

  /* Ziyaret sayacı (GoatCounter, çerezsiz). goatcounter.com'da açtığın kod: örn. 'kesitsql' → https://kesitsql.goatcounter.com
     Boş kalırsa sayaç yüklenmez. */
  goatcounter: ''
};
