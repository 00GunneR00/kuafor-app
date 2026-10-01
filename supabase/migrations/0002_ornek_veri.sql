-- Örnek Salon: başlangıç (örnek) verisi
-- Tasarımlardaki değerlerdir. Gerçek hizmet listesi, fiyatlar, uzmanlar ve çalışma saatleri
-- salondan alınınca salon panelinden güncellenecek.

-- Çalışma saatleri: Pzt–Cmt 09:30–19:00, Pazar kapalı (örnek)
insert into public.calisma_saatleri (gun, kapali, acilis, kapanis) values
  (1, false, '09:30', '19:00'),
  (2, false, '09:30', '19:00'),
  (3, false, '09:30', '19:00'),
  (4, false, '09:30', '19:00'),
  (5, false, '09:30', '19:00'),
  (6, false, '09:30', '19:00'),
  (7, true,  null,    null);

update public.salon_ayarlari set adres = 'Merkez / Şehir' where id = 1;

-- Kategoriler
insert into public.kategoriler (ad, sira) values
  ('Kesim & Fön', 1), ('Boya', 2), ('Bakım', 3), ('Topuz & Gelin', 4);

-- Hizmetler
insert into public.hizmetler (kategori_id, ad, aciklama, sure_dk, fiyat, fiyat_baslangic, sira, detay, dahil)
select k.id, v.ad, v.aciklama, v.sure_dk, v.fiyat, v.baslangic, v.sira, v.detay, v.dahil
from (values
  ('Kesim & Fön',   'Kesim & Fön',       'Yıkama, kesim ve fön',              60,  600, false, 1, null, '{}'::text[]),
  ('Kesim & Fön',   'Fön',               'Yıkama ve fön',                     30,  300, false, 2, null, '{}'),
  ('Kesim & Fön',   'Fön & Bakım',       'Nem bakımı ve fön',                 45,  450, false, 3,
     'Saçına yoğun nem veren bakım maskesinin ardından, saç tipine uygun fön ile hacimli ve parlak bir görünüm. Kuru ve yıpranmış saçlar için idealdir.',
     '{"Saç analizi","Yıkama ve nem maskesi","Isı koruyucu uygulama","Fön ve şekillendirme"}'),
  ('Kesim & Fön',   'Perma Fön / Dalga', 'Kalıcı görünümlü dalgalar',         45,  500, false, 4, null, '{}'),
  ('Boya',          'Dip Boya',          'Tek renk dip boya',                 90, 1200, false, 1, null, '{}'),
  ('Boya',          'Tüm Boya',          'Saçın tamamı tek renk',            120, 1800, true,  2, null, '{}'),
  ('Boya',          'Ombre / Balyaj',    'Doğal geçişli renklendirme',       180, 3500, true,  3, null, '{}'),
  ('Bakım',         'Keratin Bakımı',    'Yıpranmış saçlar için yoğun bakım', 120, 2000, false, 1, null, '{}'),
  ('Bakım',         'Saç Botoksu',       'Dolgunluk ve parlaklık',            90, 1500, false, 2, null, '{}'),
  ('Topuz & Gelin', 'Topuz',             'Özel gün topuzu',                   45,  750, false, 1, null, '{}'),
  ('Topuz & Gelin', 'Gelin Saçı',        'Prova dahil',                      120, 3000, false, 2, null, '{}')
) as v(kategori, ad, aciklama, sure_dk, fiyat, baslangic, sira, detay, dahil)
join public.kategoriler k on k.ad = v.kategori;

-- Uzmanlar
insert into public.uzmanlar (ad, unvan, uzmanlik, sira) values
  ('Elif',   'Baş Kuaför',   'Özel kesim & modern fön uzmanı',     1),
  ('Zeynep', 'Renk Uzmanı',  'Ombre, balyaj ve dip boya ustası',   2),
  ('Merve',  'Kuaför',       'Özel gün saç tasarımı ve dalgalı fön', 3),
  ('Ayşe',   'Bakım Uzmanı', 'Keratin, nem terapisi ve botoks',    4);

-- Kim hangi hizmeti veriyor (örnek dağılım)
insert into public.uzman_hizmetleri (uzman_id, hizmet_id)
select u.id, h.id
from public.uzmanlar u
join public.hizmetler h on
  (u.ad = 'Elif'   and h.ad in ('Kesim & Fön','Fön','Fön & Bakım','Perma Fön / Dalga','Topuz')) or
  (u.ad = 'Zeynep' and h.ad in ('Dip Boya','Tüm Boya','Ombre / Balyaj','Kesim & Fön','Fön')) or
  (u.ad = 'Merve'  and h.ad in ('Kesim & Fön','Fön','Fön & Bakım','Perma Fön / Dalga','Topuz','Gelin Saçı')) or
  (u.ad = 'Ayşe'   and h.ad in ('Fön','Fön & Bakım','Keratin Bakımı','Saç Botoksu'));

-- "Ücretsiz bakım" ödülü şimdilik Fön & Bakım (salonla netleşecek)
update public.salon_ayarlari
set odul_hizmet_id = (select id from public.hizmetler where ad = 'Fön & Bakım')
where id = 1;
