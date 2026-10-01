// Tasarım prototipi için ekranlar arası gezinme.
// Her sayfa <script>window.ADIM = n</script> ile hangi ekran olduğunu belirtir
// (SAYFALAR dizisindeki sırası).
(function () {
  var SAYFALAR = [
    'ana-sayfa.html',             // 0
    'randevu-1-hizmet.html',      // 1
    'randevu-2-uzman.html',       // 2
    'randevu-3-tarih-saat.html',  // 3
    'randevu-4-onay.html',        // 4
    'randevu-5-basarili.html',    // 5
    'randevularim-yaklasan.html', // 6
    'randevularim-gecmis.html',   // 7
    'randevularim-iptal.html',    // 8
    'hizmetler.html',             // 9
    'hizmet-detay.html',          // 10
    'puanlarim.html',             // 11
    'giris.html',                 // 12
    'kayit.html',                 // 13
    'hesabim.html',               // 14
    'kesfet.html'                 // 15
  ];
  var GIRIS = 12, KAYIT = 13, HESABIM = 14, KESFET = 15;
  var ANA = 0, AKIS_BASI = 1, UZMAN_ADIMI = 2, BASARILI = 5, YAKLASAN = 6, GECMIS = 7, IPTAL = 8,
      HIZMETLER = 9, HIZMET_DETAY = 10, PUANLARIM = 11;
  // Hizmetler listesindeki satırlar (prototipte hepsi örnek detay ekranını açar)
  var HIZMET_ADLARI = ['Kesim & Fön', 'Fön', 'Fön & Bakım', 'Perma Fön / Dalga', 'Dip Boya', 'Tüm Boya',
    'Ombre / Balyaj', 'Keratin Bakımı', 'Saç Botoksu', 'Topuz', 'Gelin Saçı'];
  var adim = window.ADIM || 0;

  function git(i) {
    if (i >= 0 && i < SAYFALAR.length) location.href = SAYFALAR[i];
  }

  function normalle(s) {
    return s.replace(/\s+/g, ' ').trim().replace(/^\+ /, '');
  }

  // Metni tam eşleşen yaprak metin düğümlerini bulur ve tıklanabilir öğeye bağlar.
  function bagla(metinler, hedef) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var sira = 0;
    var node;
    while ((node = walker.nextNode())) {
      if (metinler.indexOf(normalle(node.textContent)) === -1) continue;
      var el = node.parentElement.closest('button, a') || node.parentElement;
      var i = typeof hedef === 'function' ? hedef(sira++) : hedef;
      if (i === null) continue;
      el.style.cursor = 'pointer';
      el.addEventListener('click', (function (i) {
        return function (e) { e.preventDefault(); git(i); };
      })(i));
    }
  }

  // Alt menü (her ekranda)
  bagla(['Ana Sayfa'], ANA);
  bagla(['Randevu'], YAKLASAN);
  bagla(['Hesabım'], HESABIM);
  bagla(['Keşfet'], KESFET);

  if (adim === KESFET) {
    bagla(['Randevu Al'], AKIS_BASI); // kampanya kartları ve salon kartı
    return;
  }

  if (adim === GIRIS) {
    bagla(['Giriş Yap'], ANA);
    bagla(['Kayıt Ol'], KAYIT);
    bagla(['Giriş yapmadan göz at'], HIZMETLER);
    return;
  }

  if (adim === KAYIT) {
    bagla(['arrow_back', 'Giriş Yap'], GIRIS);
    bagla(['Kayıt Ol'], ANA);
    return;
  }

  if (adim === HESABIM) {
    bagla(['Randevularım'], YAKLASAN);
    bagla(['Puanlarım'], PUANLARIM);
    bagla(['Çıkış Yap'], GIRIS);
    return;
  }

  if (adim === ANA) {
    bagla(['Randevu Al'], AKIS_BASI);
    bagla(['Hizmetler'], HIZMETLER);
    bagla(['Puanlarım', 'Sadakat Kulübü'], PUANLARIM);
    return;
  }

  if (adim === PUANLARIM) {
    bagla(['arrow_back'], ANA);
    bagla(['Randevu Al, Puan Kazan'], AKIS_BASI);
    bagla(['Tümü'], GECMIS); // Puan geçmişinin tamamı = geçmiş randevular
    return;
  }

  if (adim === HIZMETLER) {
    bagla(['arrow_back'], ANA);
    bagla(HIZMET_ADLARI, HIZMET_DETAY);
    return;
  }

  if (adim === HIZMET_DETAY) {
    bagla(['arrow_back'], HIZMETLER);
    // Hizmet zaten seçili olduğu için akış uzman adımından başlar
    bagla(['Bu Hizmetle Randevu Al'], UZMAN_ADIMI);
    return;
  }

  if (adim >= 1 && adim <= 4) {
    bagla(['Randevuyu Onayla'], BASARILI);
    bagla(['arrow_back', 'Geri', '← Geri'], adim - 1);
    bagla(['Devam Et'], adim + 1);
    bagla(['Değiştir'], 1);
    bagla(['Düzenle'], function (n) { return n + 1; }); // Onay ekranı: Hizmet, Uzman, Tarih & Saat
    // Tamamlanmış adımlara dokununca o adıma dön
    [['Hizmet', 1], ['Uzman', 2], ['Tarih & Saat', 3]].forEach(function (s) {
      if (s[1] < adim) bagla([s[0]], s[1]);
    });
    return;
  }

  if (adim === BASARILI) {
    // Geri dönülmez; ana sayfaya ya da randevu listesine gidilir
    bagla(['close', 'Ana Sayfaya Dön'], ANA);
    bagla(['Randevularımı Gör'], YAKLASAN);
    return;
  }

  // Randevularım ekranları
  bagla(['Yeni Randevu Al', 'Tekrar Randevu Al'], AKIS_BASI);
  bagla(['Yaklaşan', 'Yaklaşan (2)'], YAKLASAN);
  bagla(['Geçmiş'], GECMIS);
  bagla(['Randevuyu İptal Et'], IPTAL);
  if (adim === IPTAL) {
    bagla(['Vazgeç', 'Evet, İptal Et'], YAKLASAN);
    bagla(['Bunun yerine başka bir saate al'], 3);
  }
})();
