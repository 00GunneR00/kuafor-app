-- Salon paneli için eklemeler
-- 1) Telefonla/salonda alınan randevular: uygulama hesabı olmayan müşteri (ad + telefon)
-- 2) Müşteri e-postası profilde (panelde gösterilir)
-- 3) Müşteri özeti görünümü (sık gelen / uzun süredir gelmeyen)
-- 4) Yönetici randevu oluşturma fonksiyonu
-- 5) Görseller için depolama alanı

-------------------------------------------------------------------------------
-- 1) Hesapsız müşteri randevusu
-------------------------------------------------------------------------------
alter table public.randevular alter column musteri_id drop not null;
alter table public.randevular add column musteri_ad text;
alter table public.randevular add column musteri_telefon text;
alter table public.randevular add column olusturan text not null default 'musteri'
  check (olusturan in ('musteri', 'salon'));
alter table public.randevular add constraint musteri_belli
  check (musteri_id is not null or musteri_ad is not null);

-- Hesapsız müşteriye puan yazılamaz: yalnızca hesabı olanlar puan kazanır
create or replace function public.tamamlaninca_puan_ver()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_puan int;
begin
  if new.musteri_id is not null
     and new.durum = 'tamamlandi' and old.durum is distinct from 'tamamlandi' then
    select puan_basina into v_puan from public.salon_ayarlari where id = 1;
    insert into public.puan_hareketleri (musteri_id, randevu_id, miktar, tur, aciklama)
    values (new.musteri_id, new.id, v_puan, 'kazanim',
            (select string_agg(ad, ', ') from public.randevu_hizmetleri where randevu_id = new.id))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- 2) E-posta profilde
-------------------------------------------------------------------------------
alter table public.profiller add column eposta text;
update public.profiller p set eposta = u.email from auth.users u where u.id = p.id;

create or replace function public.yeni_kullanici()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiller (id, ad_soyad, telefon, eposta, kvkk_onay_tarihi, kampanya_izni)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', ''),
    new.raw_user_meta_data ->> 'telefon',
    new.email,
    case when (new.raw_user_meta_data ->> 'kvkk_onay')::boolean then now() end,
    coalesce((new.raw_user_meta_data ->> 'kampanya_izni')::boolean, false)
  );
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- 3) Müşteri özeti (RLS profiller'den gelir: yönetici hepsini, müşteri kendini görür)
-------------------------------------------------------------------------------
create or replace view public.musteri_ozeti
with (security_invoker = true) as
  select
    p.id,
    p.ad_soyad,
    p.telefon,
    p.eposta,
    p.kampanya_izni,
    p.olusturuldu,
    count(r.id) filter (where r.durum = 'tamamlandi')::int as tamamlanan,
    count(r.id) filter (where r.durum = 'gelmedi')::int   as gelmedi,
    count(r.id) filter (where r.durum = 'iptal')::int     as iptal,
    max(r.baslangic) filter (where r.durum = 'tamamlandi') as son_ziyaret,
    min(r.baslangic) filter (where r.durum = 'onaylandi' and r.baslangic > now()) as siradaki_randevu,
    coalesce((select sum(miktar) from public.puan_hareketleri ph where ph.musteri_id = p.id), 0)::int as puan
  from public.profiller p
  left join public.randevular r on r.musteri_id = p.id
  where p.rol = 'musteri'
  group by p.id;

-------------------------------------------------------------------------------
-- 4) Yönetici randevu oluşturma (telefonla gelen randevular)
-- Çalışma saati kontrolü yapılmaz (salon kendi kararını verir), çakışma yine engellenir.
-------------------------------------------------------------------------------
create or replace function public.randevu_olustur_yonetici(
  p_baslangic        timestamptz,
  p_hizmet_ids       uuid[],
  p_uzman_id         uuid,
  p_musteri_id       uuid default null,
  p_musteri_ad       text default null,
  p_musteri_telefon  text default null,
  p_not              text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_sure    int;
  v_fiyat   numeric(10,2);
  v_adet    int;
  v_randevu uuid;
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  if p_musteri_id is null and nullif(trim(p_musteri_ad), '') is null then
    raise exception 'Müşteri seçin ya da müşterinin adını yazın';
  end if;

  select count(*), sum(sure_dk), sum(fiyat) into v_adet, v_sure, v_fiyat
  from public.hizmetler where id = any (p_hizmet_ids);
  if v_adet = 0 or v_adet <> cardinality(p_hizmet_ids) then
    raise exception 'Hizmet seçin';
  end if;

  insert into public.randevular
    (musteri_id, musteri_ad, musteri_telefon, uzman_id, baslangic, bitis,
     toplam_fiyat, toplam_sure_dk, musteri_notu, olusturan)
  values
    (p_musteri_id, nullif(trim(p_musteri_ad), ''), nullif(trim(p_musteri_telefon), ''), p_uzman_id,
     p_baslangic, p_baslangic + make_interval(mins => v_sure),
     v_fiyat, v_sure, nullif(trim(p_not), ''), 'salon')
  returning id into v_randevu;

  insert into public.randevu_hizmetleri (randevu_id, hizmet_id, ad, fiyat, sure_dk)
  select v_randevu, h.id, h.ad, h.fiyat, h.sure_dk
  from public.hizmetler h where h.id = any (p_hizmet_ids);

  return v_randevu;
exception
  when exclusion_violation then
    raise exception 'Bu uzmanın o saatte başka bir randevusu var';
end;
$$;

revoke execute on function public.randevu_olustur_yonetici from public, anon;
grant execute on function public.randevu_olustur_yonetici to authenticated;

-------------------------------------------------------------------------------
-- 5) Görseller (uzman fotoğrafı, galeri, kampanya, hizmet görseli)
-- Herkes görüntüler (herkese açık bucket), yalnızca yönetici yükler/siler.
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gorseller', 'gorseller', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "gorseller: yonetici yukler" on storage.objects
  for insert to authenticated with check (bucket_id = 'gorseller' and (select public.yonetici_mi()));
create policy "gorseller: yonetici gunceller" on storage.objects
  for update to authenticated using (bucket_id = 'gorseller' and (select public.yonetici_mi()));
create policy "gorseller: yonetici siler" on storage.objects
  for delete to authenticated using (bucket_id = 'gorseller' and (select public.yonetici_mi()));
