-- Salon bir randevuyu yanlışlıkla "tamamlandı" yapıp geri alırsa verilen puan da geri alınır.
-- (Tekrar tamamlanırsa puan yeniden verilir; bir randevu en fazla bir kez puan kazandırır.)
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
  elsif old.durum = 'tamamlandi' and new.durum is distinct from 'tamamlandi' then
    delete from public.puan_hareketleri where randevu_id = new.id and tur = 'kazanim';
  end if;
  return new;
end;
$$;
