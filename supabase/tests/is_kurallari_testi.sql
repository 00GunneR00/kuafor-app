-- İŞ KURALLARI TESTİ
-- Supabase SQL Editor'de çalıştırılır. Sonunda bilerek hata fırlatır:
-- tüm test verisi geri alınır (veritabanında iz kalmaz). Sonuçlar hata mesajının içindedir.
-- Not: 0003 sonrasında tetikleyici fonksiyonlarının yetkileri kapalı; test postgres rolüyle çalıştığı için etkilenmez.
do $test$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  fon_bakim uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  keratin   uuid := (select id from public.hizmetler where ad = 'Keratin Bakımı');
  elif      uuid := (select id from public.uzmanlar where ad = 'Elif');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  pzt10 timestamptz := (pzt + time '10:00') at time zone 'Europe/Istanbul';
  r1 uuid; r2 uuid; r3 uuid;
  sonuc text := '';
  v text;
begin
  -- 1) Kayıt olunca profil oluşuyor mu?
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (u1, 'test1@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Test Bir","telefon":"05320000000","kvkk_onay":true}'),
         (u2, 'test2@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Test Iki","kvkk_onay":true}');
  select ad_soyad || ' / KVKK ' || (kvkk_onay_tarihi is not null) into v from public.profiller where id = u1;
  sonuc := sonuc || E'\n1) Profil otomatik: ' || coalesce(v, 'YOK!');

  -- 2) Müşteri 1 randevu alır (Elif, Pzt 10:00, Fön & Bakım)
  perform set_config('request.jwt.claims', json_build_object('sub', u1)::text, true);
  r1 := public.randevu_olustur(pzt10, array[fon_bakim], elif);
  select toplam_fiyat || ' TL, ' || toplam_sure_dk || ' dk, bitis ' || to_char(bitis at time zone 'Europe/Istanbul', 'HH24:MI')
    into v from public.randevular where id = r1;
  sonuc := sonuc || E'\n2) Randevu alindi: ' || v;

  -- 3) Müşteri 2 aynı saate Elif'i ister -> reddedilmeli
  perform set_config('request.jwt.claims', json_build_object('sub', u2)::text, true);
  begin
    perform public.randevu_olustur(pzt10 + interval '15 minutes', array[fon_bakim], elif);
    sonuc := sonuc || E'\n3) CAKISMA KONTROLU: HATA - kabul edildi!';
  exception when others then
    sonuc := sonuc || E'\n3) Cakisma reddedildi: ' || sqlerrm;
  end;

  -- 4) Müşteri 2 aynı saate "Farketmez" -> başka uygun uzman atanmalı
  r2 := public.randevu_olustur(pzt10, array[fon_bakim], null);
  select u.ad into v from public.randevular r join public.uzmanlar u on u.id = r.uzman_id where r.id = r2;
  sonuc := sonuc || E'\n4) Farketmez -> atanan uzman: ' || v;

  -- 5) Pazar günü -> reddedilmeli
  begin
    perform public.randevu_olustur(pzt10 - interval '1 day', array[fon_bakim], null);
    sonuc := sonuc || E'\n5) PAZAR: HATA - kabul edildi!';
  exception when others then
    sonuc := sonuc || E'\n5) Pazar reddedildi: ' || sqlerrm;
  end;

  -- 6) Kapanışı aşan randevu (18:30 + 120 dk Keratin) -> reddedilmeli
  begin
    perform public.randevu_olustur((pzt + time '18:30') at time zone 'Europe/Istanbul', array[keratin], null);
    sonuc := sonuc || E'\n6) MESAI DISI: HATA - kabul edildi!';
  exception when others then
    sonuc := sonuc || E'\n6) Mesai disi reddedildi: ' || sqlerrm;
  end;

  -- 7) Müşteri 1, 2 saatten fazla var -> iptal edebilmeli
  perform set_config('request.jwt.claims', json_build_object('sub', u1)::text, true);
  perform public.randevu_iptal_et(r1, 'Planım değişti');
  select durum into v from public.randevular where id = r1;
  sonuc := sonuc || E'\n7) Iptal (suresi icinde): ' || v;

  -- 8) Randevuya 1 saat kaldıysa iptal reddedilmeli
  r3 := public.randevu_olustur(pzt10 + interval '2 hours', array[fon_bakim], elif);
  update public.randevular set baslangic = now() + interval '1 hour', bitis = now() + interval '105 minutes' where id = r3;
  begin
    perform public.randevu_iptal_et(r3, null);
    sonuc := sonuc || E'\n8) GEC IPTAL: HATA - kabul edildi!';
  exception when others then
    sonuc := sonuc || E'\n8) Gec iptal reddedildi: ' || sqlerrm;
  end;

  -- 9) Salon randevuyu "tamamlandı" yapınca +50 puan, ikinci kez puan yok
  update public.randevular set durum = 'tamamlandi' where id = r2;
  update public.randevular set durum = 'onaylandi' where id = r2;
  update public.randevular set durum = 'tamamlandi' where id = r2;
  select sum(miktar)::text || ' puan (' || count(*) || ' hareket)' into v from public.puan_hareketleri where musteri_id = u2;
  sonuc := sonuc || E'\n9) Tamamlaninca puan: ' || v;

  -- 10) Müşteri ödül kullandıramaz
  begin
    perform public.odul_kullandir(u2);
    sonuc := sonuc || E'\n10) ODUL YETKISI: HATA - musteri kullandirabildi!';
  exception when others then
    sonuc := sonuc || E'\n10) Musteri odul kullandiramaz: ' || sqlerrm;
  end;

  -- 11) Müşteri kendini yönetici yapamaz
  begin
    update public.profiller set rol = 'yonetici' where id = u1;
    sonuc := sonuc || E'\n11) ROL KORUMA: HATA - rol degisti!';
  exception when others then
    sonuc := sonuc || E'\n11) Rol degistirilemez: ' || sqlerrm;
  end;

  raise exception 'TEST BITTI (her sey geri alindi):%', sonuc;
end
$test$;
