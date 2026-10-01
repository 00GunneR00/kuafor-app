-- BİLDİRİM KURALLARI TESTİ (0008)
-- SQL Editor'de çalıştırılır. Sonunda bilerek hata fırlatır: her şey geri alınır.
-- Not: pg_net istekleri de işlemle birlikte geri alınır, yani Expo'ya gerçek istek GİTMEZ.
do $test$
declare
  mus uuid := gen_random_uuid();
  cihazsiz uuid := gen_random_uuid();
  yon uuid := gen_random_uuid();
  fon uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  elif uuid := (select id from public.uzmanlar where ad = 'Elif');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  r1 uuid; r2 uuid;
  sonuc text := '';
  v text;
  n int;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (mus, 'm@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Bildirim Musteri","kampanya_izni":true}'),
    (cihazsiz, 'c@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Cihazsiz","kampanya_izni":true}'),
    (yon, 'y@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Yonetici"}');
  update public.profiller set rol = 'yonetici' where id = yon;

  -- 1) Cihaz kaydı: geçerli token kabul, geçersiz red
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  perform public.cihaz_kaydet('ExponentPushToken[test-123]', 'android');
  begin
    perform public.cihaz_kaydet('sahte-token', 'android');
    sonuc := sonuc || E'\n1) GECERSIZ TOKEN KABUL EDILDI!';
  exception when others then
    select count(*)::text into v from public.cihazlar where musteri_id = mus;
    sonuc := sonuc || E'\n1) Cihaz kaydi: ' || v || ' cihaz, gecersiz token reddedildi';
  end;

  -- 2) Hatırlatma: randevu 2 gün önce alınmış, 23 saat kalmış -> "1 gün önce" hatırlatması oluşur, "2 saat" henüz değil
  r1 := public.randevu_olustur((pzt + time '10:00') at time zone 'Europe/Istanbul', array[fon], elif, null);
  update public.randevular set baslangic = now() + interval '23 hours', bitis = now() + interval '23 hours 45 minutes',
         olusturuldu = now() - interval '2 days' where id = r1;
  n := public.hatirlatmalari_olustur();
  select govde into v from public.bildirimler where randevu_id = r1 and tur = 'hatirlatma';
  sonuc := sonuc || E'\n2) Hatirlatma: ' || n || ' adet -> "' || coalesce(v, 'YOK') || '"';
  n := public.hatirlatmalari_olustur();
  sonuc := sonuc || E'\n3) Ikinci calisma tekrar uretmez: ' || n;

  -- 4) Geç alınan randevuya eski hatırlatma gitmez (1 saat önce alınmış, 23 saat kalmış)
  r2 := public.randevu_olustur((pzt + time '12:00') at time zone 'Europe/Istanbul', array[fon], elif, null);
  update public.randevular set baslangic = now() + interval '23 hours', bitis = now() + interval '23 hours 45 minutes',
         olusturuldu = now() - interval '1 hour', uzman_id = (select id from public.uzmanlar where ad = 'Merve') where id = r2;
  perform public.hatirlatmalari_olustur();
  select count(*)::text into v from public.bildirimler where randevu_id = r2;
  sonuc := sonuc || E'\n4) Gec alinan randevuya hatirlatma: ' || v;

  -- 5) Hatırlatmayı kapatan müşteriye gitmez
  update public.profiller set hatirlatma_bildirim = false where id = mus;
  update public.randevular set olusturuldu = now() - interval '2 days' where id = r2;
  perform public.hatirlatmalari_olustur();
  select count(*)::text into v from public.bildirimler where randevu_id = r2;
  sonuc := sonuc || E'\n5) Hatirlatmasi kapali musteriye: ' || v;

  -- 6) Gönderim: kuyruk Expo'ya iletilir (istek kaydı oluşur)
  n := public.bildirimleri_gonder();
  select durum into v from public.bildirimler where randevu_id = r1 and tur = 'hatirlatma';
  sonuc := sonuc || E'\n6) Gonderilen mesaj: ' || n || ', durum: ' || v || ', istek kaydi: '
    || (select count(*) from public.bildirim_gonderimleri where 'ExponentPushToken[test-123]' = any (tokenlar));

  -- 7) Salon iptal edince müşteriye bildirim
  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  update public.randevular set durum = 'iptal', iptal_eden = 'salon', iptal_nedeni = 'Uzman hastalandi' where id = r1;
  select govde into v from public.bildirimler where randevu_id = r1 and tur = 'randevu_iptal';
  sonuc := sonuc || E'\n7) Salon iptali: "' || coalesce(v, 'YOK') || '"';

  -- 8) Kampanya: yalnızca izin verenlere; cihazı olmayan "cihaz_yok" olur
  select izinli || ' izinli / ' || cihazli || ' cihazli' into v from public.kampanya_alici_sayisi();
  n := public.kampanya_bildirimi_gonder('Sonbahar firsati', 'Keratin bakiminda %20 indirim', null);
  sonuc := sonuc || E'\n8) Kampanya: ' || v || ' -> ' || n || ' bildirim; cihazsiz: '
    || (select durum from public.bildirimler where musteri_id = cihazsiz and tur = 'kampanya');

  -- 9) Müşteri kampanya gönderemez
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  begin
    perform public.kampanya_bildirimi_gonder('x', 'y', null);
    sonuc := sonuc || E'\n9) YETKI: musteri kampanya gonderebildi!';
  exception when others then sonuc := sonuc || E'\n9) Musteri kampanya gonderemez: ' || sqlerrm; end;

  -- 10) Zamanlayıcı kayıtlı
  select schedule || ' / ' || active into v from cron.job where jobname = 'bildirimler';
  sonuc := sonuc || E'\n10) Zamanlayici: ' || coalesce(v, 'YOK');

  raise exception 'BILDIRIM TESTI BITTI (her sey geri alindi):%', sonuc;
end
$test$;
