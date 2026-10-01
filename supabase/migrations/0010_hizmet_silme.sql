-- Hizmet silme
-- Randevu hizmetin adını/fiyatını/süresini zaten kendi üzerinde saklıyor (randevu_hizmetleri),
-- bu yüzden hizmet silinince geçmiş bozulmaz; yalnızca bağlantı (hizmet_id) boşalır.

-- randevu_hizmetleri: birincil anahtar hizmet_id'yi içeriyordu (boş olamaz) -> kendi kimliği olsun
alter table public.randevu_hizmetleri drop constraint if exists randevu_hizmetleri_pkey;
alter table public.randevu_hizmetleri add column id uuid not null default gen_random_uuid() primary key;
alter table public.randevu_hizmetleri alter column hizmet_id drop not null;
create unique index randevu_hizmetleri_tek on public.randevu_hizmetleri (randevu_id, hizmet_id) where hizmet_id is not null;
alter table public.randevu_hizmetleri drop constraint if exists randevu_hizmetleri_hizmet_id_fkey;
alter table public.randevu_hizmetleri add constraint randevu_hizmetleri_hizmet_id_fkey
  foreign key (hizmet_id) references public.hizmetler(id) on delete set null;

-- Kampanya ve ödül bağlantısı boşalır (kampanyanın kendisi durur)
alter table public.kampanyalar drop constraint if exists kampanyalar_hizmet_id_fkey;
alter table public.kampanyalar add constraint kampanyalar_hizmet_id_fkey
  foreign key (hizmet_id) references public.hizmetler(id) on delete set null;
alter table public.salon_ayarlari drop constraint if exists odul_hizmeti_fk;
alter table public.salon_ayarlari add constraint odul_hizmeti_fk
  foreign key (odul_hizmet_id) references public.hizmetler(id) on delete set null;
-- (uzman_hizmetleri zaten "on delete cascade")

-- Silmeden önce panelde gösterilecek etki özeti
create or replace function public.hizmet_silme_etkisi(p_hizmet_id uuid)
returns table (ileri_randevu int, kampanya int, odul_hizmeti boolean)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(distinct r.id)::int from public.randevu_hizmetleri rh join public.randevular r on r.id = rh.randevu_id
      where rh.hizmet_id = p_hizmet_id and r.durum = 'onaylandi' and r.bitis > now()),
    (select count(*)::int from public.kampanyalar where hizmet_id = p_hizmet_id),
    exists (select 1 from public.salon_ayarlari where odul_hizmet_id = p_hizmet_id)
  where public.yonetici_mi();
$$;

create or replace function public.hizmet_sil(p_hizmet_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  delete from public.hizmetler where id = p_hizmet_id;
end;
$$;

revoke execute on function public.hizmet_silme_etkisi, public.hizmet_sil from public, anon, authenticated;
grant execute on function public.hizmet_silme_etkisi, public.hizmet_sil to authenticated;
