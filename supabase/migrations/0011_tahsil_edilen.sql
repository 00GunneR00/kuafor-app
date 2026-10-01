-- Tahsil edilen tutar: salonda gerçekten alınan ücret ("...'den başlayan" hizmetlerde liste fiyatından farklı olabilir).
-- Yalnızca "tamamlandı" randevularda anlamlıdır; randevu tamamlandı durumundan çıkarsa silinir.
-- Boşsa raporlar liste fiyatını (toplam_fiyat) kullanır.

alter table public.randevular add column tahsil_edilen numeric(10,2) check (tahsil_edilen >= 0);

create or replace function public.tahsilat_temizle()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.durum <> 'tamamlandi' then
    new.tahsil_edilen := null;
  end if;
  return new;
end;
$$;

create trigger randevu_tahsilat_temizle
  before update of durum, tahsil_edilen on public.randevular
  for each row execute function public.tahsilat_temizle();

revoke execute on function public.tahsilat_temizle from public, anon, authenticated;
