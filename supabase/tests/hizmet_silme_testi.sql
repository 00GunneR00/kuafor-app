-- HİZMET SİLME TESTİ (0010) - sonunda bilerek hata fırlatır, her şey geri alınır
do $test$
declare
  yon uuid := gen_random_uuid();
  mus uuid := gen_random_uuid();
  h uuid;
  kmp uuid;
  elif uuid := (select id from public.uzmanlar where ad = 'Elif');
  fon uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  gecmis uuid; gelecek uuid; yeni uuid;
  sonuc text := '';
  v text;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (yon, 'y@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Yonetici"}'),
    (mus, 'm@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Musteri"}');
  update public.profiller set rol = 'yonetici' where id = yon;
  insert into public.hizmetler (kategori_id, ad, sure_dk, fiyat)
    values ((select id from public.kategoriler order by sira limit 1), 'Kaldirilacak Hizmet', 30, 999) returning id into h;
  insert into public.uzman_hizmetleri values (elif, h);
  insert into public.kampanyalar (baslik, hizmet_id) values ('Test kampanya', h) returning id into kmp;
  update public.salon_ayarlari set odul_hizmet_id = h where id = 1;

  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  gecmis := public.randevu_olustur_yonetici((pzt + time '10:00') at time zone 'Europe/Istanbul', array[h, fon], elif, mus, null, null, null);
  update public.randevular set baslangic = now() - interval '5 days', bitis = now() - interval '5 days' + interval '75 minutes', durum = 'tamamlandi' where id = gecmis;
  gelecek := public.randevu_olustur_yonetici((pzt + time '12:00') at time zone 'Europe/Istanbul', array[h], elif, mus, null, null, null);

  select ileri_randevu || ' ileri randevu, ' || kampanya || ' kampanya, odul: ' || odul_hizmeti into v from public.hizmet_silme_etkisi(h);
  sonuc := sonuc || E'\n1) Silme etkisi: ' || v;

  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  begin
    perform public.hizmet_sil(h);
    sonuc := sonuc || E'\n2) YETKI: musteri hizmet silebildi!';
  exception when others then sonuc := sonuc || E'\n2) Musteri silemez: ' || sqlerrm; end;

  perform set_config('request.jwt.claims', json_build_object('sub', yon)::text, true);
  perform public.hizmet_sil(h);
  sonuc := sonuc || E'\n3) Silindi, hizmet: ' || (select count(*) from public.hizmetler where id = h)
    || ', uzman atamasi: ' || (select count(*) from public.uzman_hizmetleri where hizmet_id = h);

  select string_agg(coalesce(hizmet_id::text, 'bos') || ' ' || ad || ' ' || fiyat, ' + ' order by ad) into v
  from public.randevu_hizmetleri where randevu_id = gecmis;
  sonuc := sonuc || E'\n4) Gecmis randevu hizmetleri: ' || v
    || ' (toplam ' || (select toplam_fiyat from public.randevular where id = gecmis) || ')';

  select durum || ', hizmet adi: ' || (select ad from public.randevu_hizmetleri where randevu_id = gelecek) into v from public.randevular where id = gelecek;
  sonuc := sonuc || E'\n5) Ileri randevu: ' || v;

  sonuc := sonuc || E'\n6) Kampanya duruyor: ' || (select count(*) from public.kampanyalar where id = kmp)
    || ', hizmet baglantisi: ' || coalesce((select hizmet_id::text from public.kampanyalar where id = kmp), 'bos')
    || ', odul hizmeti: ' || coalesce((select odul_hizmet_id::text from public.salon_ayarlari where id = 1), 'bos');

  -- 7) Birincil anahtar değişti: müşteri hâlâ randevu alabiliyor mu?
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  yeni := public.randevu_olustur((pzt + time '15:00') at time zone 'Europe/Istanbul', array[fon], null, null);
  sonuc := sonuc || E'\n7) Musteri randevu alabiliyor: ' || (select count(*) from public.randevu_hizmetleri where randevu_id = yeni) || ' hizmet satiri';

  raise exception 'HIZMET SILME TESTI BITTI (her sey geri alindi):%', sonuc;
end
$test$;
