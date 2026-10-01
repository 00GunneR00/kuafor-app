-- Web'den hızlı randevu (Instagram biyografisindeki bağlantı)
-- 1) Salon ayarları: web randevu açık/kapalı, mağaza bağlantıları
-- 2) Randevu kaynağı 'web' + uygulamaya aktarma kodu
-- 3) Ortak kontrol: hizmet, çalışma saati, uygun uzman
-- 4) Boş saatler (hesapsız ziyaretçi görür, kimin randevusu olduğu gösterilmez)
-- 5) Web randevusu oluşturma (hesapsız: ad + telefon; uzman seçilemez, "Farketmez")
-- 6) Web randevusunu uygulamadaki hesaba aktarma (kod + aynı telefon). Tamamlanmışsa puanı da yazılır.

-------------------------------------------------------------------------------
-- 1) Salon ayarları
-------------------------------------------------------------------------------
alter table public.salon_ayarlari add column web_randevu_acik boolean not null default true;
alter table public.salon_ayarlari add column magaza_ios text;
alter table public.salon_ayarlari add column magaza_android text;

-------------------------------------------------------------------------------
-- 2) Randevu kaynağı ve aktarma kodu
-------------------------------------------------------------------------------
do $$
declare v_ad text;
begin
  select conname into v_ad from pg_constraint
  where conrelid = 'public.randevular'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%olusturan%';
  execute format('alter table public.randevular drop constraint %I', v_ad);
end $$;
alter table public.randevular add constraint randevular_olusturan_check
  check (olusturan in ('musteri', 'salon', 'web'));

alter table public.randevular add column aktarma_kodu text;
create unique index randevular_aktarma_kodu_idx on public.randevular (aktarma_kodu) where aktarma_kodu is not null;
create index randevular_telefon_idx on public.randevular (musteri_telefon) where musteri_telefon is not null;

-- Telefonu tek biçime çevirir: "0532 123 45 67", "+90 532...", "5321234567" -> "05321234567". Cep değilse null.
create or replace function public.telefon_duzelt(p_telefon text)
returns text
language sql immutable set search_path = ''
as $$
  select case when r ~ '^5[0-9]{9}$' then '0' || r end
  from (select regexp_replace(regexp_replace(coalesce(p_telefon, ''), '[^0-9]', '', 'g'), '^(90|0)', '') as r) t;
$$;

-------------------------------------------------------------------------------
-- 3) Ortak kontrol (yalnızca diğer fonksiyonlar kullanır, API'den çağrılamaz)
-- randevu_olustur ile aynı kurallar: aktif hizmetler, kapalı gün, çalışma saati, hizmetlerin hepsini veren boş uzman
-------------------------------------------------------------------------------
create or replace function public.randevu_uzman_bul(p_baslangic timestamptz, p_hizmet_ids uuid[], p_uzman_id uuid default null)
returns table (uzman_id uuid, bitis timestamptz, fiyat numeric, sure_dk int)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_adet  int;
  v_sure  int;
  v_fiyat numeric(10,2);
  v_bitis timestamptz;
  v_tz    text;
  v_yerel timestamp;
  v_gun   public.calisma_saatleri;
  v_uzman uuid;
begin
  if p_baslangic <= now() then
    raise exception 'Geçmiş bir saate randevu alınamaz';
  end if;
  if coalesce(cardinality(p_hizmet_ids), 0) = 0 then
    raise exception 'Hizmet seçin';
  end if;

  select count(*), sum(h.sure_dk), sum(h.fiyat) into v_adet, v_sure, v_fiyat
  from public.hizmetler h where h.id = any (p_hizmet_ids) and h.aktif;
  if v_adet <> cardinality(p_hizmet_ids) then
    raise exception 'Seçilen hizmetlerden biri artık sunulmuyor';
  end if;
  v_bitis := p_baslangic + make_interval(mins => v_sure);

  select s.saat_dilimi into v_tz from public.salon_ayarlari s where s.id = 1;
  v_yerel := p_baslangic at time zone v_tz;
  select * into v_gun from public.calisma_saatleri c where c.gun = extract(isodow from v_yerel);
  if v_gun is null or v_gun.kapali
     or exists (select 1 from public.kapali_gunler k where k.tarih = v_yerel::date) then
    raise exception 'Salon bu gün kapalı';
  end if;
  if v_yerel::time < v_gun.acilis or (v_bitis at time zone v_tz)::time > v_gun.kapanis then
    raise exception 'Seçilen saat çalışma saatleri dışında';
  end if;

  select u.id into v_uzman
  from public.uzmanlar u
  where u.aktif
    and (p_uzman_id is null or u.id = p_uzman_id)
    and (select count(*) from public.uzman_hizmetleri uh
         where uh.uzman_id = u.id and uh.hizmet_id = any (p_hizmet_ids)) = cardinality(p_hizmet_ids)
    and not exists (
      select 1 from public.randevular r
      where r.uzman_id = u.id and r.durum = 'onaylandi'
        and tstzrange(r.baslangic, r.bitis) && tstzrange(p_baslangic, v_bitis))
  order by u.sira
  limit 1;

  if v_uzman is null then
    raise exception 'Bu saat dolu, lütfen başka bir saat seç';
  end if;

  return query select v_uzman, v_bitis, v_fiyat, v_sure;
end;
$$;

-------------------------------------------------------------------------------
-- 4) Boş saatler: seçilen hizmetler için o gün alınabilecek başlangıç saatleri ("14:30")
-- Uygulamadaki slotlar.ts ile aynı mantık: açılıştan itibaren 30 dakikada bir
-------------------------------------------------------------------------------
create or replace function public.web_bos_saatler(p_tarih date, p_hizmet_ids uuid[])
returns setof text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz   text;
  v_gun  public.calisma_saatleri;
  v_adet int;
  v_sure int;
begin
  if not (select s.web_randevu_acik from public.salon_ayarlari s where s.id = 1)
     or coalesce(cardinality(p_hizmet_ids), 0) not between 1 and 10
     or p_tarih > current_date + 90 then
    return;
  end if;

  select count(*), sum(h.sure_dk) into v_adet, v_sure
  from public.hizmetler h where h.id = any (p_hizmet_ids) and h.aktif;
  if v_adet <> cardinality(p_hizmet_ids) then
    return;
  end if;

  select s.saat_dilimi into v_tz from public.salon_ayarlari s where s.id = 1;
  select * into v_gun from public.calisma_saatleri c where c.gun = extract(isodow from p_tarih);
  if v_gun is null or v_gun.kapali or v_gun.acilis is null or v_gun.kapanis is null
     or exists (select 1 from public.kapali_gunler k where k.tarih = p_tarih) then
    return;
  end if;

  return query
  select to_char(y, 'HH24:MI')
  from generate_series(p_tarih + v_gun.acilis, p_tarih + v_gun.kapanis - make_interval(mins => v_sure), interval '30 minutes') y
  where (y at time zone v_tz) > now()
    and exists (
      select 1 from public.uzmanlar u
      where u.aktif
        and (select count(*) from public.uzman_hizmetleri uh
             where uh.uzman_id = u.id and uh.hizmet_id = any (p_hizmet_ids)) = cardinality(p_hizmet_ids)
        and not exists (
          select 1 from public.randevular r
          where r.uzman_id = u.id and r.durum = 'onaylandi'
            and tstzrange(r.baslangic, r.bitis)
                && tstzrange(y at time zone v_tz, (y at time zone v_tz) + make_interval(mins => v_sure))))
  order by y;
end;
$$;

-------------------------------------------------------------------------------
-- 5) Web randevusu (hesapsız)
-- Kötüye kullanıma karşı: aynı numarayla en fazla 2 yaklaşan web randevusu, saatte en fazla 30 web randevusu
-------------------------------------------------------------------------------
create or replace function public.web_randevu_olustur(
  p_baslangic  timestamptz,
  p_hizmet_ids uuid[],
  p_ad         text,
  p_telefon    text,
  p_not        text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_ad      text := nullif(regexp_replace(trim(coalesce(p_ad, '')), '\s+', ' ', 'g'), '');
  v_tel     text := public.telefon_duzelt(p_telefon);
  v_bul     record;
  v_kod     text;
  v_randevu uuid;
begin
  if not (select s.web_randevu_acik from public.salon_ayarlari s where s.id = 1) then
    raise exception 'Online randevu şu an kapalı, lütfen salonu arayın';
  end if;
  if v_ad is null or char_length(v_ad) < 3 or char_length(v_ad) > 60 then
    raise exception 'Adını ve soyadını yaz';
  end if;
  if v_tel is null then
    raise exception 'Geçerli bir cep telefonu numarası yaz (05xx xxx xx xx)';
  end if;
  if coalesce(cardinality(p_hizmet_ids), 0) > 10 then
    raise exception 'En fazla 10 hizmet seçebilirsin';
  end if;
  if p_baslangic > now() + interval '90 days' then
    raise exception 'En fazla 90 gün sonrasına randevu alınabilir';
  end if;
  if char_length(p_not) > 150 then
    raise exception 'Not en fazla 150 karakter olabilir';
  end if;

  if (select count(*) from public.randevular r
      where r.musteri_telefon = v_tel and r.olusturan = 'web'
        and r.durum = 'onaylandi' and r.baslangic > now()) >= 2 then
    raise exception 'Bu numarayla zaten 2 yaklaşan randevun var. Değişiklik için salonu arayabilirsin.';
  end if;
  if (select count(*) from public.randevular r
      where r.olusturan = 'web' and r.olusturuldu > now() - interval '1 hour') >= 30 then
    raise exception 'Şu an çok fazla istek var, lütfen biraz sonra tekrar dene ya da salonu ara';
  end if;

  select * into v_bul from public.randevu_uzman_bul(p_baslangic, p_hizmet_ids, null);

  -- 6 karakterlik aktarma kodu (karışan harfler yok: 0/O, 1/I/L)
  loop
    v_kod := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '')
              from generate_series(1, 6));
    exit when not exists (select 1 from public.randevular r where r.aktarma_kodu = v_kod);
  end loop;

  insert into public.randevular
    (musteri_ad, musteri_telefon, uzman_id, baslangic, bitis, toplam_fiyat, toplam_sure_dk,
     musteri_notu, olusturan, aktarma_kodu)
  values
    (v_ad, v_tel, v_bul.uzman_id, p_baslangic, v_bul.bitis, v_bul.fiyat, v_bul.sure_dk,
     nullif(trim(p_not), ''), 'web', v_kod)
  returning id into v_randevu;

  insert into public.randevu_hizmetleri (randevu_id, hizmet_id, ad, fiyat, sure_dk)
  select v_randevu, h.id, h.ad, h.fiyat, h.sure_dk
  from public.hizmetler h where h.id = any (p_hizmet_ids);

  return jsonb_build_object(
    'id', v_randevu,
    'kod', v_kod,
    'uzman', (select u.ad from public.uzmanlar u where u.id = v_bul.uzman_id),
    'bitis', v_bul.bitis,
    'fiyat', v_bul.fiyat);
exception
  when exclusion_violation then
    raise exception 'Bu saat az önce doldu, lütfen başka bir saat seç';
end;
$$;

-------------------------------------------------------------------------------
-- 6) Web randevusunu uygulamadaki hesaba aktarma
-- Kod + profildeki telefonun randevudaki telefonla aynı olması gerekir (başkasının randevusu alınamasın)
-------------------------------------------------------------------------------
create or replace function public.web_randevu_aktar(p_kod text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_musteri uuid := (select auth.uid());
  v_r       public.randevular;
  v_tel     text;
  v_puan    int;
begin
  if v_musteri is null then
    raise exception 'Önce giriş yapmalısın';
  end if;

  select * into v_r from public.randevular r
  where r.aktarma_kodu = upper(regexp_replace(coalesce(p_kod, ''), '\s', '', 'g')) and r.musteri_id is null
  for update;
  if v_r.id is null then
    raise exception 'Kod bulunamadı ya da daha önce kullanılmış';
  end if;

  select public.telefon_duzelt(p.telefon) into v_tel from public.profiller p where p.id = v_musteri;
  if v_tel is distinct from v_r.musteri_telefon then
    raise exception 'Bu randevu başka bir telefon numarasıyla alınmış. Profilindeki telefon numarası randevuda verdiğin numarayla aynı olmalı.';
  end if;
  if v_r.durum not in ('onaylandi', 'tamamlandi') then
    raise exception 'İptal edilen ya da gelinmeyen randevu eklenemez';
  end if;

  update public.randevular set musteri_id = v_musteri, aktarma_kodu = null where id = v_r.id;

  -- Randevu hesaba aktarılmadan tamamlandıysa puanı şimdi yazılır
  if v_r.durum = 'tamamlandi' then
    select s.puan_basina into v_puan from public.salon_ayarlari s where s.id = 1;
    insert into public.puan_hareketleri (musteri_id, randevu_id, miktar, tur, aciklama)
    values (v_musteri, v_r.id, v_puan, 'kazanim',
            (select string_agg(rh.ad, ', ') from public.randevu_hizmetleri rh where rh.randevu_id = v_r.id))
    on conflict do nothing;
  end if;

  return v_r.id;
end;
$$;

-------------------------------------------------------------------------------
-- Yetkiler
-------------------------------------------------------------------------------
revoke execute on function public.randevu_uzman_bul from public, anon, authenticated;
revoke execute on function public.web_bos_saatler, public.web_randevu_olustur, public.web_randevu_aktar,
  public.telefon_duzelt from public;
-- Supabase yeni fonksiyonları varsayılan olarak anon'a da açar
revoke execute on function public.web_randevu_aktar, public.telefon_duzelt from anon;
grant execute on function public.web_bos_saatler, public.web_randevu_olustur to anon, authenticated;
grant execute on function public.web_randevu_aktar to authenticated;
grant execute on function public.telefon_duzelt to authenticated;
