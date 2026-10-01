-- UZMAN SİLME TESTİ (0009) - sonunda bilerek hata fırlatır, her şey geri alınır
do $test$
declare
  yon uuid := gen_random_uuid();
  mus uuid := gen_random_uuid();
  x uuid;
  merve uuid := (select id from public.uzmanlar where ad = 'Merve');
  fon uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  gecmis uuid; gelecek uuid;
  sonuc text := '';
  v text;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (yon, 'y@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Yonetici"}'),
    (mus, 'm@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Musteri"}');
  update public.profiller set rol = 'yonetici' where id = yon;
  insert into public.uzmanlar (ad, unvan) values ('Ayrilan Uzman', 'Kuafor') returning id into x;
  insert into public.uzman_hizmetleri values (x, fon);

  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  gecmis := public.randevu_olustur_yonetici((pzt + time '10:00') at time zone 'Europe/Istanbul', array[fon], x, mus, null, null, null);
  update public.randevular set baslangic = now() - interval '10 days', bitis = now() - interval '10 days' + interval '45 minutes', durum = 'tamamlandi' where id = gecmis;
  gelecek := public.randevu_olustur_yonetici((pzt + time '11:00') at time zone 'Europe/Istanbul', array[fon], x, mus, null, null, null);
  select uzman_ad into v from public.randevular where id = gecmis;
  sonuc := sonuc || E'\n1) Randevuda uzman adi saklandi: ' || coalesce(v, 'YOK');

  -- 2) Müşteri silemez
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  begin
    perform public.uzman_sil(x);
    sonuc := sonuc || E'\n2) YETKI: musteri uzman silebildi!';
  exception when others then sonuc := sonuc || E'\n2) Musteri silemez: ' || sqlerrm; end;

  -- 3) İleri tarihli randevusu varken silinemez
  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  begin
    perform public.uzman_sil(x);
    sonuc := sonuc || E'\n3) HATA: ileri randevusu olan uzman silindi!';
  exception when others then sonuc := sonuc || E'\n3) Engellendi: ' || sqlerrm; end;

  -- 4) Randevu başka uzmana alınınca ad da güncellenir, sonra silinebilir
  update public.randevular set uzman_id = merve where id = gelecek;
  select uzman_ad into v from public.randevular where id = gelecek;
  sonuc := sonuc || E'\n4) Baska uzmana alindi, yeni ad: ' || v;
  perform public.uzman_sil(x);
  sonuc := sonuc || E'\n5) Silindi, uzman kaydi: ' || (select count(*) from public.uzmanlar where id = x)
    || ', hizmet atamasi: ' || (select count(*) from public.uzman_hizmetleri where uzman_id = x);

  -- 6) Geçmiş randevu duruyor, adı korunuyor, puanı duruyor
  select coalesce(uzman_id::text, 'bos') || ' / ' || uzman_ad || ' / ' || durum into v from public.randevular where id = gecmis;
  sonuc := sonuc || E'\n6) Gecmis randevu (uzman_id / ad / durum): ' || v
    || ', musteri puani: ' || (select coalesce(sum(miktar), 0) from public.puan_hareketleri where musteri_id = mus);

  raise exception 'UZMAN SILME TESTI BITTI (her sey geri alindi):%', sonuc;
end
$test$;
