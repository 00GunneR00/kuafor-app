# Örnek Salon: Mobil Uygulama Planı

> Onay tarihi: 24 Eylül 2026

## Genel Bakış
- **Salon:** Örnek Salon, kadın kuaförü, **tek salon**
- **Amaç:** Salona özel, kendi adıyla App Store ve Google Play'de yayınlanan bir uygulama. Hedef, mevcut müşteriyi elde tutmak ve tekrar gelmesini sağlamak.
- **İki parça:** Müşteri mobil uygulaması ve salon sahibi web paneli

## Tasarım (referans görseldeki telefon ekranı gibi)
- **Hava:** Sıcak, sade, lüks ve kadınsı
- **Renkler (yaklaşık):**
  - Arka plan: krem / açık bej `#F8F3EE`
  - Ana renk (butonlar): gül kurusu / toprak tonu kahve `#B98B73`
  - Koyu metin: kahve-siyah `#2B211C`
  - Vurgu (alt menüde seçili sekme): turuncu-mercan `#E8643C`
  - Kartlar: beyaz, yumuşak gölgeli, yuvarlatılmış köşeli
- **Yazı tipi:** Logo ve başlıklarda zarif serif, metinlerde sade sans-serif
- **Logo:** Şimdilik metin logo: büyük "ÖRNEK", altında küçük harflerle "SALON"
- **Görseller:** Kadın saç modeli fotoğrafları, bakım ürünleri

## Müşteri Uygulaması (iOS + Android)
- **Giriş:** E-posta ile kayıt ve giriş
- **Ana sayfa:** Büyük görsel ve slogan ("Daha güzel bir sen"), "Randevu Al" butonu, kısayollar (Hizmetler, Randevu Al, Puanlarım, Hesabım), sadakat kulübü kartı, "Sana Özel" kampanyalar
- **Hizmetler:** Kategoriler (kesim, boya, bakım, fön…) ile her hizmetin fiyatı ve süresi
- **Randevu:** Hizmet, personel, tarih ve boş saat seçimi; iptal, yaklaşan ve geçmiş randevular
- **Sadakat kulübü:** Ziyaret başına puan, puan geçmişi, puanla alınabilecek ödüller
- **Kampanyalar:** Salonun yayınladığı teklifler
- **Bildirimler:** Randevu hatırlatma, kampanya duyurusu, "Sizi özledik" mesajı
- **Hesabım:** Profil bilgileri, geçmiş, çıkış
- **Alt menü:** Ana Sayfa · Randevu · Keşfet · Hesabım

## Salon Web Paneli
- **Randevular:** Takvim görünümü; onaylama, iptal ve manuel randevu ekleme
- **Ayarlar:** Çalışma saatleri, tatil ve kapalı günler
- **Hizmet ve personel yönetimi:** Fiyat ve süreler, hangi personelin hangi hizmeti yaptığı
- **Müşteri listesi ve analiz:** Sık gelenler ve uzun süredir gelmeyenler (örneğin 45 günden fazla)
- **Kampanya ve bildirim:** Seçilen müşteri grubuna bildirim gönderme
- **Puan yönetimi:** Ziyaret sonrası puan ekleme ve ödül kullandırma

## Teknik Altyapı
- **Mobil:** React Native + Expo
- **Web paneli:** Next.js
- **Backend:** Supabase (veritabanı, e-posta girişi, dosya depolama, güvenlik kuralları). MCP `.mcp.json` içinde ayarlı.
- **Bildirimler:** Expo Push Notifications
- **Tasarım:** Ekranlar önce Stitch'te tasarlanacak. MCP `.mcp.json` içinde ayarlı.

## Kapsam Kararları
- **Ödeme:** Salonda yapılacak, uygulamada online ödeme **yok**
- **Giriş:** Şimdilik yalnızca **e-posta**

## İş Kuralları (salon panelinden değiştirilebilir, varsayılanlar aşağıda)
- **Puan:** Tamamlanan her randevu için **50 puan**. **500 puan = 1 ücretsiz bakım.** Puan randevu "tamamlandı" işaretlenince eklenir, rezervasyon anında değil.
- **Ücretsiz iptal:** Randevudan **2 saat öncesine kadar** uygulamadan (Randevularım) iptal edilebilir. Sonrasında iptal için salon aranır.
- **Hatırlatma bildirimi:** Randevudan **1 gün** ve **2 saat** önce
- **Pazar:** Kapalı (çalışma günleri panelden ayarlanır)

## Sonra Eklenecekler
- [ ] SMS ile giriş (Netgsm, İleti Merkezi ya da Twilio; mesaj başına ücretli)
- [ ] Online ödeme (gerekirse)

## Yol Haritası
1. [ ] Ekran tasarımları (Stitch). Proje: "Örnek Salon". İndirilenler `tasarimlar/` klasöründe.
   - [x] Ana sayfa (`tasarimlar/ana-sayfa.html` + `.png`). Alt menü: Ana Sayfa · Randevu · Keşfet · Hesabım. Üyelik seviyesi yok.
     - Not: Stitch'teki kayıtlı ekran hâlâ eski halinde (düzenlemeler oraya yansımadı). Güncel sürüm yereldeki HTML.
   - [x] Randevu alma akışı **4 adıma bölündü** (karar: mobilde daha kolay kullanılır). Adımlar arasında ileri ve geri gidilebilmeli:
     1. `randevu-1-hizmet.html`: Hizmet seç (birden fazla seçilebilir, kategori filtresi)
     2. `randevu-2-uzman.html`: Uzman seç ("Farketmez" seçeneği var)
     3. `randevu-3-tarih-saat.html`: Tarih ve saat seç (dolu saatler üstü çizili, kapalı günler pasif)
     4. `randevu-4-onay.html`: Özet, her satırda "Düzenle" (ilgili adıma döner), not alanı, toplam, "+50 puan", "Ödeme salonda"
     - Gezinme: "Geri" / "Devam Et", tamamlanmış adım göstergesine dokunma, "Değiştir" / "Düzenle" linkleri. Prototipte `tasarimlar/akis.js` ile bağlı; `ana-sayfa.html` dosyasından tıklanarak gezilebilir.
     5. `randevu-5-basarili.html`: "Randevun alındı!" ekranı. Özet, adres ve yol tarifi, +50 puan bilgisi, hatırlatma bilgisi, "Takvime Ekle", "Randevularımı Gör", "Ana Sayfaya Dön". Geri dönüş yok, X ve "Ana Sayfaya Dön" ana sayfaya gider.
     - Eski tek sayfalık taslak silindi.
   - [x] Randevularım (alt menüdeki **"Randevu" sekmesi bu ekranı açar**; yeni randevu için üstte "Yeni Randevu Al" butonu var. Ana sayfadaki "Randevu Al" doğrudan akışı açar.)
     - `randevularim-yaklasan.html`: Yaklaşan randevular. İptal süresi dolmuşsa (2 saatten az kaldıysa) iptal butonu yerine "Salonu Ara" gösterilir, aksi halde "Randevuyu İptal Et" ve "Yol Tarifi".
     - `randevularim-gecmis.html`: Aylara göre gruplu geçmiş. "Tamamlandı" (+50 puan) / "İptal Edildi" durumları, her kartta "Tekrar Randevu Al".
     - `randevularim-iptal.html`: İptal onay penceresi. İsteğe bağlı iptal nedeni, "Evet, İptal Et" / "Vazgeç", "Bunun yerine başka bir saate al" (tarih-saat adımına gider).
   - [x] Hizmetler (ana sayfadaki "Hizmetler" kısayolundan açılır; alt menüde "Ana Sayfa" seçili kalır)
     - `hizmetler.html`: Fiyat listesi. Arama, kategori filtresi, kategorilere göre gruplu satırlar (ad, açıklama, süre, fiyat). Değişken fiyatlar "…'den başlayan" olarak gösterilir. Altta "Fiyatlar saç uzunluğuna göre değişebilir" notu var.
     - `hizmet-detay.html`: Hizmet detayı (örnek: Fön & Bakım). Görsel, süre, fiyat, +50 puan, açıklama, "Neler Dahil?", bu hizmeti veren uzmanlar. "Bu Hizmetle Randevu Al" akışı **uzman adımından** başlatır (hizmet zaten seçili).
     - Prototipte listedeki bütün satırlar aynı örnek detay ekranını açıyor. Gerçek uygulamada her hizmetin kendi detayı veritabanından gelecek.
   - [x] Puanlarım (`puanlarim.html`; ana sayfadaki "Puanlarım" kısayolu ve Sadakat Kulübü kartından açılır, alt menüde "Ana Sayfa" seçili)
     - Puan kartı (250 / 500 ilerleme), tek ödül "1 Ücretsiz Bakım" (500 puana ulaşana kadar kilitli), "Nasıl puan kazanırım?" (3 adım + "İptal edilen randevular puan kazandırmaz"), puan geçmişi ("Tümü" geçmiş randevulara gider), "Randevu Al, Puan Kazan".
     - Seviye, indirim, son kullanma tarihi ya da davet programı **yok** (bilinçli karar).
     - Ödül salonda kullandırılır: müşteri randevu alırken uzmanına söyler, salon panelden puanı düşer.
   - [x] Giriş / Kayıt (alt menü yok)
     - `giris.html`: E-posta ve şifre, "Şifremi unuttum", "Kayıt Ol" linki, "Giriş yapmadan göz at" (misafir hizmetleri gezebilir; randevu için giriş gerekir). Sosyal giriş **yok**.
     - `kayit.html`: Ad Soyad, E-posta, **Telefon** (salon randevuyla ilgili ulaşabilsin diye, zorunlu), Şifre (en az 8 karakter). **KVKK Aydınlatma Metni onayı** zorunlu ama **önceden işaretli değil** (onay kullanıcıdan gelmeli). **Kampanya bildirimi izni** ayrı ve isteğe bağlı.
   - [x] Hesabım (`hesabim.html`; alt menüde "Hesabım" seçili)
     - Profil kartı ("Düzenle"), puan ve tamamlanan randevu sayısı. Menü grupları:
       - Hesap: Profil Bilgilerim, Randevularım, Puanlarım, Şifre Değiştir
       - Bildirimler: randevu hatırlatma açık/kapalı, kampanya bildirimleri açık/kapalı
       - Salon: adres ve yol tarifi, çalışma saatleri, salonu ara
       - Yasal: KVKK, Gizlilik Politikası
     - "Çıkış Yap" ve **"Hesabımı Sil"** (App Store, hesap açılabilen uygulamalarda hesap silmeyi zorunlu tutuyor).
     - Seviye, kayıtlı kart, dil ya da karanlık mod ayarı **yok**.
   - [x] Keşfet (`kesfet.html`; alt menüde "Keşfet" seçili). İçerik kararı:
     - **Kampanyalar:** Salon panelden yayınlar. Tasarımdakiler örnek: "Keratin + Fön Paketi", "İlk Balyajına Ücretsiz Bakım".
     - **Çalışmalarımız:** Salonda yapılan saçlardan galeri, kategori filtreli, her fotoğrafta hizmet ve uzman etiketi. Fotoğrafları salon panelden yükler.
     - **Uzmanlarımız** ve **Salonumuz** (harita, adres, çalışma saatleri, ara, yol tarifi, randevu al)
     - Yorum, puanlama, sosyal akış ve mağaza **yok**.
   - **Tüm ana ekranların tasarımı tamamlandı.** Prototip `tasarimlar/giris.html` ya da `tasarimlar/ana-sayfa.html` dosyasından tıklanarak gezilebilir.
   - [ ] Küçük ekranlar (gerekirse): Şifremi Unuttum, Profil Bilgilerini Düzenle, Şifre Değiştir, Hesabı Sil onayı
2. [x] Supabase veritabanı ve güvenlik kuralları (25 Eylül 2026)
   - **Proje:** organizasyon "Örnek Salon" (Free), proje `ornek-salon`, ID `<proje-id>`, bölge Frankfurt (eu-central-1), URL `https://<proje-id>.supabase.co`. "Automatic RLS" açık. Veritabanı şifresini Supabase üretti; gerekirse Settings > Database'den sıfırlanır.
   - **SQL dosyaları** (`supabase/migrations/`, SQL Editor'de bu sırayla çalıştırıldı):
     - `0001_temel_sema.sql`: 13 tablo, iş kuralı fonksiyonları, RLS
     - `0002_ornek_veri.sql`: 11 hizmet, 4 uzman, çalışma saatleri (örnek)
     - `0003_fonksiyon_yetkileri.sql`: Security Advisor düzeltmeleri
   - **Uygulamanın kullanacağı fonksiyonlar:** `randevu_olustur(baslangic, hizmet_ids[], uzman_id|null, not)`, `randevu_iptal_et(id, neden)`, `dolu_araliklar(tarih)`; panel için `odul_kullandir(musteri_id)`. Puan bakiyesi `puan_bakiyeleri` görünümünde.
   - **Kayıt olurken** `supabase.auth.signUp` içindeki `options.data` alanına `ad_soyad`, `telefon`, `kvkk_onay`, `kampanya_izni` gönderilmeli. Profil otomatik oluşur.
   - **Test:** `supabase/tests/is_kurallari_testi.sql`, 11/11 geçti (profil, fiyat/süre, çakışma, Farketmez, Pazar, mesai dışı, iptal, geç iptal, puan, ödül yetkisi, rol koruma).
   - **Security Advisor:** 0 hata. 8 uyarı bilerek bırakıldı: randevu/iptal/ödül fonksiyonları ve `yonetici_mi` kendi içinde yetki kontrolü yapıyor; `rls_auto_enable` Supabase'in kendi fonksiyonu.
   - **Sonra:** Yönetici hesabı (salon sahibi kayıt olunca `profiller.rol = 'yonetici'` yapılacak), görseller için Storage bucket, push bildirim tablosu/cron.
3. [x] Müşteri uygulaması, ilk sürüm (25 Eylül 2026). Klasör: `mobil/`
   - **Teknoloji:** Expo SDK 57, Expo Router, TypeScript, `@supabase/supabase-js`. Oturum telefonda `expo-sqlite`, web'de tarayıcı deposunda. Fontlar Playfair Display ve DM Sans, ikonlar MaterialIcons.
   - **Supabase bağlantısı:** `mobil/.env` (URL + publishable anahtar; herkese açık anahtar, güvenliği RLS sağlıyor).
   - **Ekranlar** (`mobil/src/app/`):
     - `(tabs)/(ana)/`: Ana Sayfa, `hizmetler/`, `hizmetler/[id]`, `puanlarim`. Alt menüde "Ana Sayfa" seçili kalır.
     - `(tabs)/randevularim`: Yaklaşan/Geçmiş, iptal penceresi, yeniden planlama
     - `(tabs)/kesfet`, `(tabs)/hesabim` (profil düzenle, şifre değiştir, bildirim tercihleri, hesabı sil)
     - `randevu/`: hizmet → uzman → tarih-saat → onay → basarili. Giriş gerekir, adımlar arası ileri-geri gidilebilir.
     - `giris`, `kayit`
   - **Ortak kod:** `src/lib/` (tema, supabase, oturum, veri, tarih, slotlar, randevuTaslak, randevuKatalog, salon), `src/components/`
   - **Yeniden planlama:** "Bunun yerine başka bir saate al" aynı hizmet ve uzmanla tarih-saat adımını açar. Yeni randevu onaylanınca eski randevu otomatik iptal edilir.
   - **Veritabanı eki:** `0004_hesap_silme.sql` (`hesabimi_sil()`), SQL Editor'de çalıştırıldı.
   - **Kontroller:** `tsc` temiz, `expo lint` 0 sorun. Web'de açıldı; Ana Sayfa, Hizmetler, Keşfet veritabanından yükleniyor, giriş yapmadan "Randevu Al" giriş ekranına yönlendiriyor, konsolda hata yok.
   - **Henüz test edilmedi:** Giriş yapmış kullanıcıyla uçtan uca akış (kayıt, randevu alma, iptal) telefonda gerçek bir hesapla denenmeli.
   - **Eksikler / sonra:**
     - Push bildirimleri (hatırlatma): development build ve sunucu tarafı zamanlayıcı gerekiyor
     - "Takvime Ekle"
     - KVKK ve Gizlilik metinleri
     - Gerçek logo ve uygulama ikonu
     - Gerçek fotoğraflar (şu an yapay zekâ görselleri)
     - Şifre sıfırlama e-postasındaki bağlantının uygulamaya dönmesi (deep link)
     - Supabase Auth > URL Configuration'daki Site URL ayarı
4. [x] Salon web paneli, ilk sürüm (25 Eylül 2026). Klasör: `panel/`
   - **Teknoloji:** Next.js 16 (App Router, tamamen istemci tarafı), Tailwind 4, `@supabase/supabase-js`. Yetki RLS ile: yalnızca `profiller.rol = 'yonetici'` olan hesaplar yönetebilir. Diğer hesaplar "Yetkiniz yok" görür.
   - **Çalıştırma:** `cd panel`, `npm run dev`, http://localhost:3000. Ayarlar `panel/.env.local` dosyasında.
   - **Sayfalar:**
     - **Randevular (/):** Günlük takvim (uzman sütunları, "şimdi" çizgisi), günün listesi ve özet. Randevu detayında Tamamlandı (+puan) / Gelmedi / İptal (nedenli) / geri al. "+ Yeni Randevu" ile kayıtlı ya da **hesapsız (telefonla gelen) müşteriye** randevu girilir.
     - **Ciro Raporu (/ciro):** Haftalık (Pzt–Paz) ya da aylık, dönemler arası geçiş.
       - **Tanımlar:** Gerçekleşen = tamamlanan; bekleyen = onaylı; **beklenen = gerçekleşen + bekleyen**; kayıp = iptal + gelmedi.
       - **Özet:** Önceki döneme göre % değişim, randevu sayısı, ortalama tutar, gelmeme oranı.
       - **Uyarı:** Saati geçip "onaylı" kalan randevu varsa gösterilir.
       - **Günlük grafik:** Yığılmış çubuk, üzerine gelince tutarlar görünür, tıklayınca gün detayı açılır.
       - **Günlük tablo:** Güne tıklayınca o gün yapılan işler listelenir.
       - **Kırılım:** Hizmete ve uzmana göre.
       - **Uzman sayfası (/ciro/uzman?ad=…):** "Uzmana göre" listesinde isme tıklanınca açılır, aynı dönemi gösterir. İçinde: tahsil edilen, bekleyen, beklenen ciro (salondaki payıyla), iptal/gelmedi; "Yaptığı işler" (hizmet başına yapılan adet, tahsil edilen, bekleyen); dönemin randevu listesi (liste fiyatı ve tahsil edilen). Dönem adres çubuğunda tutulur (`?p=ay&t=…`), geri dönünce aynı hafta/ay açık kalır.
       - Renkler dataviz doğrulayıcısından geçti. Tarih hesapları 12/12 kontrolle doğrulandı (ay sonu, artık yıl, yıl geçişi, gece yarısı).
       - **Tahsil edilen tutar** (`0011_tahsil_edilen.sql`): "Tamamlandı" denirken salonda alınan ücret girilir (liste fiyatı hazır gelir, "4.200" / "4200,50" yazımları kabul edilir). Sonradan randevu detayından "Düzenle" ile değiştirilebilir. Randevu tamamlandı durumundan çıkarsa tutar silinir.
       - Gerçekleşen ciro tahsil edilen tutarı kullanır (girilmemişse liste fiyatı). Liste fiyatına göre fark "Gerçekleşen" kutusunda, gün detayında ise farklı olan randevularda üstü çizili liste fiyatıyla gösterilir. Hizmet kırılımında tahsilat hizmetlere liste fiyatı oranında dağıtılır. Bekleyen ve kayıp liste fiyatıyla hesaplanır.
     - **Müşteriler:** Filtreler: sık gelenler (5+), uzun süredir gelmeyenler (gün eşiği ayarlanabilir, varsayılan 45), hiç gelmemiş, kampanya izni verenler. Detayda geçmiş, puan ve **Ödül Kullandır**.
     - **Hizmetler:** Kategori ve hizmet ekleme/düzenleme. Geçici kaldırmak için "pasif", artık sunulmayan için **"Hizmeti sil"** (`0010_hizmet_silme.sql`, test 7/7):
       - Randevular hizmetin adını, fiyatını ve süresini sakladığı için geçmiş ve ileri tarihli randevular bozulmaz.
       - Silmeden önce etki gösterilir (ileri randevu sayısı, bağlı kampanya, ödül hizmeti mi). Kampanya bağlantısı ve ödül hizmeti boşalır.
       - Uygulamada "Tekrar Randevu Al" silinmiş hizmeti atlar.
     - **Uzmanlar:** Ekleme/düzenleme, fotoğraf, **verdiği hizmetleri atama**. Geçici ayrılık için "pasif", işten ayrılan için **"Uzmanı sil"** (`0009_uzman_silme.sql`, test 6/6):
       - Randevu uzmanın adını kendi üzerinde saklar (`uzman_ad`). Silinince geçmiş randevularda ad, puanlar ve geçmiş korunur.
       - İleri tarihli onaylı randevusu olan uzman silinemez. Önce randevu detayındaki **"Uzmanı değiştir"** ile başka uzmana alınmalı ya da iptal edilmeli.
     - **Kampanyalar:** Başlangıç/bitiş tarihli, bitince uygulamada otomatik gizlenir.
     - **Galeri:** Fotoğraf yükleme, kategori/hizmet/uzman etiketi.
     - **Ayarlar:** Salon bilgileri (adres, telefon, konum), iş kuralları (puan, ödül, ödül hizmeti, iptal saati, hatırlatma), çalışma saatleri, tatil günleri.
   - **Veritabanı ekleri** (SQL Editor'de çalıştırıldı):
     - `0005_salon_paneli.sql`: hesapsız müşteri randevusu, profilde e-posta, `musteri_ozeti` görünümü, `randevu_olustur_yonetici`, `gorseller` depolama alanı
     - `0006_puan_geri_alma.sql`: "Tamamlandı" geri alınırsa puan da geri alınır
     - `0007_rol_koruma_duzeltme.sql`: rol koruması SQL Editor'den yönetici atamayı da engelliyordu, düzeltildi
   - **Test:** `supabase/tests/panel_testi.sql` 8/8 geçti. Rol koruma ayrıca doğrulandı. `tsc`, `eslint`, `next build` temiz.
   - **Yönetici hesabı açma:** Salon sahibi uygulamadan (ya da Supabase > Authentication > Add user) hesap açar. Sonra SQL Editor'de şu çalıştırılır: `update public.profiller set rol = 'yonetici' where eposta = '...';`
   - **Henüz yok:** Kampanya/bildirim gönderme (push altyapısı gerekiyor), panelin internette yayınlanması (ör. Vercel), randevuyu sürükleyerek taşıma.
5. [~] Sadakat puanı ve bildirimler (26 Eylül 2026). Puan tamam. Bildirim kodu tamam, **harici hesaplar bekleniyor.**
   - **Mimari:** Ayrı sunucu yok. `0008_bildirimler.sql` ile her şey veritabanında: `pg_cron` her dakika (1) hatırlatmaları üretir, (2) Expo cevaplarını işler (geçersiz cihazları siler), (3) kuyruğu `pg_net` ile Expo Push API'ye yollar.
   - **Tablolar:** `cihazlar` (müşteri başına birden fazla telefon), `bildirimler` (giden kutusu + geçmiş, `anahtar` ile tekrar engeli), `bildirim_gonderimleri` (Expo istekleri).
   - **Bildirim türleri:**
     - **Hatırlatma:** Varsayılan randevudan 24 ve 2 saat önce, Ayarlar'dan değişir. Müşteri Hesabım'dan kapatabilir. Hatırlatma zamanından sonra alınan randevuya eski hatırlatma gitmez.
     - **Salon iptali:** Neden de yazılır.
     - **Salonun müşteri adına randevu girmesi**
     - **Kampanya:** Panel > Kampanyalar > "Bildirim Gönder". Yalnızca kampanya izni verenlere gider, göndermeden önce alıcı sayısı gösterilir.
   - **Mobil:** `src/lib/bildirim.ts`. Girişte izin istenir ve cihaz kaydedilir (`cihaz_kaydet`), çıkışta kaldırılır (`cihaz_sil`). Bildirime dokununca Randevularım ya da Keşfet açılır. Web'de ve simülatörde kayıt atlanır.
   - **Test:** `supabase/tests/bildirim_testi.sql` 10/10 geçti. Veritabanı → Expo bağlantısı sahte token ile doğrulandı (HTTP 200, beklenen "error" cevabı).
   - **Kalan (hesap gerektiren) adımlar:**
     1. Expo hesabı açılacak. `cd mobil`, ardından `npx eas-cli login` ve `npx eas-cli init` (projectId `app.json`'a yazılır).
     2. **Android:** Firebase projesi açılacak, FCM V1 servis hesabı anahtarı EAS'a yüklenecek (`npx eas-cli credentials`).
     3. **iOS:** Apple Developer hesabı (99 $/yıl).
     4. Development build: `npx eas-cli build --profile development`. Expo Go uzaktan push desteklemiyor.
     5. Telefonda giriş yapıp https://expo.dev/notifications ile ya da bir randevuyla deneme.
6. [ ] Test (26 Eylül 2026'da başladı: panel + telefonda Expo Go)
   - **Geçici ayar:** Supabase > Authentication > Sign In / Providers > **"Confirm email" KAPATILDI**. Supabase'in dahili e-posta servisi saatte birkaç e-postayla sınırlı ("email rate limit"). **Yayından önce:** kendi e-posta servisi (SMTP, ör. Resend) bağlanacak ve "Confirm email" yeniden açılacak.
   - **Expo Go notu:** Android'de Expo Go push bildirimlerini desteklemiyor. `bildirim.ts` bu ortamda bildirim modülünü hiç yüklemiyor (yüklenirse uygulama çöküyordu, düzeltildi).
7. [ ] App Store ve Google Play yayını
8. [~] Web'den hızlı randevu sayfası (25 Eylül 2026). Instagram biyografisine konacak bağlantı. **Amaç:** randevuiste benzeri hesapsız randevu, ama müşteriyi uygulamaya yönlendirmek.
   - **Adres:** panelde `/randevu` (herkese açık, panel girişi gerekmez). Kod: `panel/src/app/randevu/page.tsx`, `panel/src/components/WebRandevu.tsx`.
   - **Akış:** Hizmet → Tarih & Saat → Ad, telefon, not → Başarılı. Hesap gerekmez, ödeme salonda.
   - **Uygulamaya yönlendiren öğeler (bilinçli olarak yalnızca uygulamada):**
     - **Uzman seçimi** web'de yok, salon uygun uzmanı atar. 2. adımda "Uzmanını sen seç" kartı uzman fotoğraflarıyla gösterilir.
     - **Puan:** 1. adımda "10. randevun bizden!" şeridi. 3. adımda "Bu randevudan +50 puan kazanabilirsin".
     - **Aktarma kodu:** Başarılı ekranında 6 haneli kod. Müşteri uygulamayı indirip **aynı telefonla** kayıt olur, Randevularım > "Web'den aldığın randevuyu ekle" ile kodu girer. Randevu hesabına taşınır, hatırlatma alır, tamamlanınca puan kazanır. Randevu önceden tamamlanmışsa puan aktarırken yazılır.
     - "Uygulamada daha fazlası" kartı: puan/ödül, uzman seçimi, hatırlatma, kendin iptal et/değiştir, kampanyalar ve mağaza bağlantıları. Bağlantılar girilmemişse "Çok yakında" yazar.
   - **Panel:** Ayarlar > "Web Randevu Sayfası" bölümünde bağlantı (kopyala/aç), açık/kapalı ayarı ve App Store / Google Play bağlantıları var. Randevu detayında "Web'den alındı" rozeti görünür.
   - **Veritabanı:** `0012_web_randevu.sql` (SQL Editor'de çalıştırıldı). Fonksiyonlar: `web_bos_saatler`, `web_randevu_olustur` (anon), `web_randevu_aktar` (giriş gerekir), `telefon_duzelt`, `randevu_uzman_bul` (dahili, API'den çağrılamaz).
   - **Kötüye kullanıma karşı:** Aynı numarayla en fazla 2 yaklaşan web randevusu alınabilir, saatte en fazla 30 web randevusu kabul edilir. Yalnızca cep numarası geçerli, en fazla 90 gün sonrasına randevu verilir. SMS doğrulaması yok; sahte randevu sorun olursa eklenmeli (ücretli).
   - **Test:** `supabase/tests/web_randevu_testi.sql` 10/10 geçti. Tarayıcıda onay adımına kadar gezildi, konsolda hata yok. `tsc`, `eslint`, `next build` ve mobil `tsc` / `expo lint` temiz.
   - **Eksikler / sonra:**
     - Gerçek bir web randevusunun sonuna kadar alınıp uygulamada kodla eklenmesi elle denenecek.
     - KVKK aydınlatma metni bağlantısı (metin hazır olunca).
     - Panelin yayınlanması (ör. Vercel) ve kalıcı adres.
     - Salonlar için **sosyal medya tanıtım kiti**: uygulamayı duyuran story ve gönderi şablonları, açıklama metinleri, QR kodlu salon kartı.

## Demo: Örnek Salon (26 Eylül 2026)
- Satış görüşmesi için salon adı geçici olarak **"Örnek Salon"**, logo metni **"ÖS"** ve altında "SALONUNUZUN ADI" yapıldı. Renkler ve tasarım aynı kaldı (anlaşma olursa yeniden tasarlanacak).
- Değişen yerler: `mobil/src/components/ui.tsx` (Logo), `mobil/app.json` (name), panelde `app/layout.tsx`, `giris/page.tsx`, `(panel)/layout.tsx`, `(panel)/ayarlar/page.tsx`, `randevu/page.tsx`, `components/KampanyaBildirimi.tsx`.
- Teknik kimlikler (`slug`, `scheme`, `bundleIdentifier`, `package`) değiştirilmedi.
- Veritabanındaki salon adı (`salon_ayarlari.ad`) Panel > Ayarlar'dan değiştirilir.
- **Demo veri** (`supabase/demo/`): `node supabase/demo/olustur.mjs` ile `demo_veri.sql` üretilir, SQL Editor'de çalıştırılır. 80 müşteri, son 60 günün randevuları (bugün 26 Eylül dolu takvim), 3 kampanya. Tüm demo satırlarının id'si `de300000-` ile başlar; `demo_sil.sql` hepsini siler. Video müşterisi **Ayşe Demir** (`ayse@gmail.com`): 450 puan, 29 Eylül 14:00 Elif / Fön & Bakım randevusu.
- **Tanıtım videoları** (`video/`, Remotion, dikey 1080×1920):
  1. `Tanitim` (~32 sn, salon sahibine gönderilecek), 2. `MusteriAkisi` (~46 sn), 3. `SalonPaneli` (~46 sn), 4. `WebRandevu` (~24 sn).
  - Ekran görüntüleri: `node ekran-al.mjs [mobil|panel|web]` (Edge, ayrı profil `video/.tarayici-profil`; ilk seferde `node ekran-al.mjs giris` ile panele ve uygulamaya elle giriş yapılır). Randevu akışı görüntüleri 29 Eylül 14:00 boşken alındı; tekrar alırken `AKIS=0` ile akış atlanır.
  - Önizleme: `npm run studio`; kontrol kareleri: `node kareler.mjs <Video>`; MP4: `npm run render` → `video/out/`.
  - Müzik: `video/public/muzik.mp3` konursa render'a otomatik eklenir. Şu an Pixabay "Elegant" (AtlasAudio) var; parça YouTube Content ID'ye kayıtlı, YouTube'a yüklenirse telif bildirimi gelebilir.
  - **İki sürüm:** Örnek Salon'a özel (`Tanitim` vb. → `out/`) ve tüm salonlara gönderilecek markasız sürüm (`Genel-Tanitim` vb. → `out/genel/`, logo yerinde "LOGO / Salonunuzun Adı", kanca: "Sizin logonuz, sizin isminizle"). `npm run render ozel|genel`. Marka `src/tema.ts > MARKALAR`, genel ekranlar `public/ekran-genel/`.
  - Logo metni artık `.env`'den: mobilde `EXPO_PUBLIC_LOGO_UST/ALT`, panelde `NEXT_PUBLIC_LOGO_UST/ALT` (varsayılan "LOGO"). Genel ekranlar bu değişkenler "LOGO" / "SALONUNUZUN ADI" verilerek çekildi; veritabanı adı `supabase/demo/genel_1..3_*.sql` ile geçici değiştirilip geri alındı.
  - Panel ekranları bugünden farklı bir gün için `SABIT_ZAMAN="2026-09-26T14:15:00+03:00"` ile çekilir (sayfanın saati sabitlenir).
  - Bulunan hata (düzeltildi): web'de giriş/kayıt ekranı doğrudan adresle açılınca giriş sonrası yönlendirme yoktu (`giris.tsx`, `kayit.tsx`).

## Henüz Belli Olmayanlar
- **Personel sayısı ve isimleri:** Panelden sonradan eklenebilecek şekilde yapılacak
- **Hizmet listesi ve fiyatlar:** Salondan alınacak
- **Gerçek logo:** Varsa sonra eklenecek
- **Salon bilgileri:** Açık adres, telefon ve çalışma saatleri (tasarımdaki "Pzt–Cmt 09:30–19:00" örnek). Bunlar panelden girilecek.
- **KVKK Aydınlatma Metni ve Gizlilik Politikası metinleri:** Salon adına hazırlanmalı (tercihen bir hukukçu kontrolünde).
- **"Ücretsiz bakım" hangi hizmet?** Ödülün karşılığı olan hizmet salonla netleşecek (örneğin Fön & Bakım). Panelden seçilebilir olacak.
