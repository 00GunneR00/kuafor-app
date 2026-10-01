-- Uzman silme (işten ayrılan uzman sistemden kaldırılabilir)
-- Geçmiş bozulmasın diye randevu, uzmanın adını kendi üzerinde saklar (hizmet adları gibi).
-- Uzman silinince geçmiş randevularda uzman_id boşalır ama uzman_ad kalır.
-- İleri tarihli onaylı randevusu olan uzman silinemez (önce başka uzmana alınmalı ya da iptal edilmeli).

alter table public.randevular add column uzman_ad text;
update public.randevular r set uzman_ad = u.ad from public.uzmanlar u where u.id = r.uzman_id;

-- Yeni randevularda uzman adı otomatik yazılır; uzman değişirse güncellenir
create or replace function public.randevu_uzman_adi()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.uzman_id is not null and (tg_op = 'INSERT' or new.uzman_id is distinct from old.uzman_id) then
    select ad into new.uzman_ad from public.uzmanlar where id = new.uzman_id;
  end if;
  return new;
end;
$$;

create trigger randevu_uzman_adi
  before insert or update of uzman_id on public.randevular
  for each row execute function public.randevu_uzman_adi();

-- Uzman silinince randevudaki bağlantı boşalır (ad korunur)
alter table public.randevular alter column uzman_id drop not null;
alter table public.randevular drop constraint randevular_uzman_id_fkey;
alter table public.randevular add constraint randevular_uzman_id_fkey
  foreign key (uzman_id) references public.uzmanlar(id) on delete set null;

-- Güvenli silme: yalnızca yönetici, ileri tarihli onaylı randevusu yoksa
create or replace function public.uzman_sil(p_uzman_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sayi int;
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  select count(*) into v_sayi from public.randevular
  where uzman_id = p_uzman_id and durum = 'onaylandi' and bitis > now();
  if v_sayi > 0 then
    raise exception 'Bu uzmanın % ileri tarihli randevusu var. Önce bu randevuları başka bir uzmana alın ya da iptal edin.', v_sayi;
  end if;
  delete from public.uzmanlar where id = p_uzman_id;
end;
$$;

revoke execute on function public.uzman_sil, public.randevu_uzman_adi from public, anon, authenticated;
grant execute on function public.uzman_sil to authenticated;
