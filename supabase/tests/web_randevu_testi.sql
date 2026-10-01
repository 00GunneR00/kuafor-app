-- WEB RANDEVU TESTİ (0012) - sonunda bilerek hata fırlatır, her şey geri alınır
do $test$
declare
  mus uuid := gen_random_uuid();
  fon uuid := (select id from public.hizmetler where ad = 'Fön & Bakım');
  pzt date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days')::date;
  paz date := (date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '13 days')::date;
  on_saat timestamptz := (pzt + time '10:00') at time zone 'Europe/Istanbul';
  j jsonb; j2 jsonb;
  r public.randevular;
  sonuc text := '';
  v text;
  n int;
begin
  -- 1) Telefon biçimi
  sonuc := sonuc || E'\n1) Telefon: ' || concat_ws(' | ',
    public.telefon_duzelt('0532 123 45 67'), public.telefon_duzelt('+90 (532) 123-45-67'),
    public.telefon_duzelt('5321234567'), coalesce(public.telefon_duzelt('0212 123 45 67'), 'sabit hat reddedildi'),
    coalesce(public.telefon_duzelt('123'), 'kisa reddedildi'));

  -- 2) Boş saatler: Pazar kapalı, Pazartesi dolu saat listeden düşer
  perform set_config('request.jwt.claims', '', true); -- hesapsız ziyaretçi
  select count(*) into n from public.web_bos_saatler(paz, array[fon]);
  sonuc := sonuc || E'\n2a) Pazar bos saat: ' || n;
  select count(*) into n from public.web_bos_saatler(pzt, array[fon]);
  sonuc := sonuc || E'\n2b) Pazartesi bos saat: ' || n || ', 10:00 var mi: ' ||
    exists (select 1 from public.web_bos_saatler(pzt, array[fon]) s where s = '10:00');
  insert into public.randevular (musteri_ad, uzman_id, baslangic, bitis, toplam_fiyat, toplam_sure_dk, olusturan)
  select 'Dolduran', uh.uzman_id, on_saat, on_saat + interval '30 minutes', 0, 30, 'salon'
  from public.uzman_hizmetleri uh join public.uzmanlar u on u.id = uh.uzman_id and u.aktif where uh.hizmet_id = fon;
  sonuc := sonuc || E'\n2c) Tum uzmanlar doluyken 10:00 var mi: ' ||
    exists (select 1 from public.web_bos_saatler(pzt, array[fon]) s where s = '10:00');
  delete from public.randevular where musteri_ad = 'Dolduran';

  -- 3) Hesapsız web randevusu
  j := public.web_randevu_olustur(on_saat, array[fon], '  Ayşe   Yılmaz ', '0532 123 45 67', 'Web testi');
  select * into r from public.randevular where id = (j ->> 'id')::uuid;
  sonuc := sonuc || E'\n3) Web randevusu: kod ' || (j ->> 'kod') || ', uzman ' || (j ->> 'uzman') ||
    ', olusturan ' || r.olusturan || ', ad "' || r.musteri_ad || '", tel ' || r.musteri_telefon ||
    ', musteri_id bos: ' || (r.musteri_id is null);

  -- 4) Hatalı bilgiler
  begin
    perform public.web_randevu_olustur(on_saat + interval '2 hours', array[fon], 'Ay', '05321234567');
    sonuc := sonuc || E'\n4a) HATA: kisa ad kabul edildi';
  exception when others then sonuc := sonuc || E'\n4a) Kisa ad: ' || sqlerrm; end;
  begin
    perform public.web_randevu_olustur(on_saat + interval '2 hours', array[fon], 'Ayşe Yılmaz', '0212 123 45 67');
    sonuc := sonuc || E'\n4b) HATA: sabit hat kabul edildi';
  exception when others then sonuc := sonuc || E'\n4b) Sabit hat: ' || sqlerrm; end;
  begin
    perform public.web_randevu_olustur((paz + time '12:00') at time zone 'Europe/Istanbul', array[fon], 'Ayşe Yılmaz', '05321234567');
    sonuc := sonuc || E'\n4c) HATA: Pazar kabul edildi';
  exception when others then sonuc := sonuc || E'\n4c) Pazar: ' || sqlerrm; end;

  -- 5) Aynı numarayla en fazla 2 yaklaşan web randevusu
  j2 := public.web_randevu_olustur(on_saat + interval '2 hours', array[fon], 'Ayşe Yılmaz', '+90 532 123 4567');
  begin
    perform public.web_randevu_olustur(on_saat + interval '4 hours', array[fon], 'Ayşe Yılmaz', '05321234567');
    sonuc := sonuc || E'\n5) HATA: 3. randevu kabul edildi';
  exception when others then sonuc := sonuc || E'\n5) 3. randevu: ' || sqlerrm; end;

  -- 6) Hesaba aktarma: telefon farklıysa olmaz
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (mus, 'webtest@ornek.com', 'authenticated', 'authenticated', '{"ad_soyad":"Ayse Yilmaz","telefon":"0555 000 00 00"}');
  perform set_config('request.jwt.claims', json_build_object('sub', mus)::text, true);
  begin
    perform public.web_randevu_aktar(j ->> 'kod');
    sonuc := sonuc || E'\n6) HATA: farkli telefonla aktarildi';
  exception when others then sonuc := sonuc || E'\n6) Farkli telefon: ' || sqlerrm; end;

  -- 7) Aynı telefon: aktarılır, kod bir daha kullanılamaz
  update public.profiller set telefon = '(532) 123 45 67' where id = mus;
  perform public.web_randevu_aktar(lower(j ->> 'kod'));
  select * into r from public.randevular where id = (j ->> 'id')::uuid;
  sonuc := sonuc || E'\n7a) Aktarildi: musteri dogru ' || (r.musteri_id = mus) || ', kod silindi ' || (r.aktarma_kodu is null);
  begin
    perform public.web_randevu_aktar(j ->> 'kod');
    sonuc := sonuc || E'\n7b) HATA: kod iki kez kullanildi';
  exception when others then sonuc := sonuc || E'\n7b) Ikinci kez: ' || sqlerrm; end;

  -- 8) Tamamlanmış web randevusu aktarılınca puan yazılır
  update public.randevular set baslangic = now() - interval '2 days', bitis = now() - interval '2 days' + interval '30 minutes',
    durum = 'tamamlandi' where id = (j2 ->> 'id')::uuid;
  select count(*) into n from public.puan_hareketleri where randevu_id = (j2 ->> 'id')::uuid;
  sonuc := sonuc || E'\n8a) Aktarilmadan once puan satiri: ' || n;
  perform public.web_randevu_aktar(j2 ->> 'kod');
  select coalesce(sum(miktar), 0) into n from public.puan_hareketleri where musteri_id = mus;
  sonuc := sonuc || E'\n8b) Aktarinca puan: ' || n;

  -- 9) Web randevu kapalıysa
  update public.salon_ayarlari set web_randevu_acik = false where id = 1;
  select count(*) into n from public.web_bos_saatler(pzt, array[fon]);
  begin
    perform public.web_randevu_olustur(on_saat + interval '6 hours', array[fon], 'Zeynep Kaya', '05441112233');
    sonuc := sonuc || E'\n9) HATA: kapaliyken randevu alindi';
  exception when others then sonuc := sonuc || E'\n9) Kapali: bos saat ' || n || ', ' || sqlerrm; end;

  -- 10) Yetkiler
  sonuc := sonuc || E'\n10) anon: web_randevu_olustur ' || has_function_privilege('anon', 'public.web_randevu_olustur(timestamptz, uuid[], text, text, text)', 'execute')
    || ', web_bos_saatler ' || has_function_privilege('anon', 'public.web_bos_saatler(date, uuid[])', 'execute')
    || ', web_randevu_aktar ' || has_function_privilege('anon', 'public.web_randevu_aktar(text)', 'execute')
    || ', randevu_uzman_bul ' || has_function_privilege('anon', 'public.randevu_uzman_bul(timestamptz, uuid[], uuid)', 'execute')
    || ', authenticated randevu_uzman_bul ' || has_function_privilege('authenticated', 'public.randevu_uzman_bul(timestamptz, uuid[], uuid)', 'execute');

  raise exception 'TEST SONUCU (geri alindi):%', sonuc;
end;
$test$;
