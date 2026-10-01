-- SALON PANELİ KURALLARI TESTİ (0005 + 0006)
-- Supabase SQL Editor'de çalıştırılır. Sonunda bilerek hata fırlatır: tüm test verisi geri alınır.
do $test$
declare
  yon uuid := gen_random_uuid();
  mus uuid := gen_random_uuid();
  fon uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  elif uuid := (select id from public.uzmanlar where ad = 'Elif');
  merve uuid := (select id from public.uzmanlar where ad = 'Merve');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  r1 uuid; r2 uuid;
  sonuc text := '';
  v text;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (yon, 'yonetici@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Salon Sahibi"}'),
         (mus, 'musteri@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Test Musteri","kvkk_onay":true}');
  update public.profiller set rol = 'yonetici' where id = yon;
  select eposta into v from public.profiller where id = mus;
  sonuc := sonuc || E'\n1) Profilde e-posta: ' || coalesce(v, 'YOK!');

  -- 2) Müşteri yönetici fonksiyonunu kullanamaz
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  begin
    perform public.randevu_olustur_yonetici((pzt + time '11:00') at time zone 'Europe/Istanbul', array[fon], elif, null, 'Sahte', null, null);
    sonuc := sonuc || E'\n2) YETKI: HATA - musteri randevu girebildi!';
  exception when others then sonuc := sonuc || E'\n2) Musteri yonetici islemi yapamaz: ' || sqlerrm; end;

  -- 3) Yönetici hesapsız (telefonla gelen) müşteriye randevu girer
  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  r1 := public.randevu_olustur_yonetici((pzt + time '11:00') at time zone 'Europe/Istanbul', array[fon], elif, null, 'Ayse Telefon', '05321112233', null);
  select musteri_ad || ' / ' || olusturan || ' / ' || toplam_fiyat into v from public.randevular where id = r1;
  sonuc := sonuc || E'\n3) Telefonla randevu: ' || v;

  -- 4) Aynı uzmana çakışan randevu reddedilir
  begin
    perform public.randevu_olustur_yonetici((pzt + time '11:15') at time zone 'Europe/Istanbul', array[fon], elif, mus, null, null, null);
    sonuc := sonuc || E'\n4) CAKISMA: HATA - kabul edildi!';
  exception when others then sonuc := sonuc || E'\n4) Cakisma reddedildi: ' || sqlerrm; end;

  -- 5) Hesapsız müşteri tamamlanınca puan yazılmaz (hata da vermez)
  update public.randevular set durum = 'tamamlandi' where id = r1;
  select count(*)::text into v from public.puan_hareketleri where randevu_id = r1;
  sonuc := sonuc || E'\n5) Hesapsiz musteri puan hareketi: ' || v;

  -- 6) Kayıtlı müşteriye randevu, tamamlandı -> +50, geri al -> 0, tekrar tamamla -> +50
  r2 := public.randevu_olustur_yonetici((pzt + time '11:00') at time zone 'Europe/Istanbul', array[fon], merve, mus, null, null, null);
  update public.randevular set durum = 'tamamlandi' where id = r2;
  select coalesce(sum(miktar),0)::text into v from public.puan_hareketleri where musteri_id = mus;
  sonuc := sonuc || E'\n6) Tamamlandi: ' || v;
  update public.randevular set durum = 'onaylandi' where id = r2;
  select coalesce(sum(miktar),0)::text into v from public.puan_hareketleri where musteri_id = mus;
  sonuc := sonuc || ' -> geri alindi: ' || v;
  update public.randevular set durum = 'tamamlandi' where id = r2;
  select coalesce(sum(miktar),0)::text into v from public.puan_hareketleri where musteri_id = mus;
  sonuc := sonuc || ' -> tekrar: ' || v;

  -- 7) Müşteri özeti (yönetici görür)
  select ad_soyad || ': ' || tamamlanan || ' ziyaret, ' || puan || ' puan' into v from public.musteri_ozeti where id = mus;
  sonuc := sonuc || E'\n7) Musteri ozeti: ' || coalesce(v, 'YOK!');

  -- 8) Görsel deposu var ve herkese açık
  select public::text into v from storage.buckets where id = 'gorseller';
  sonuc := sonuc || E'\n8) gorseller deposu herkese acik: ' || coalesce(v, 'YOK!');

  raise exception 'PANEL TESTI BITTI (her sey geri alindi):%', sonuc;
end
$test$;
