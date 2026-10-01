-- Videodaki müşterinin yaklaşan randevusunu, videodaki randevu akışıyla aynı yapar
-- (29 Eylül 14:00, Elif, Fön & Bakım). olustur.mjs'in yeni sürümü bunu zaten böyle üretir.
begin;
update public.randevular set
  uzman_id = 'edb5b2d9-09b3-46db-bd0b-7e4ca83c26fa', uzman_ad = 'Elif',
  baslangic = '2026-09-29 14:00:00+03', bitis = '2026-09-29 14:45:00+03',
  toplam_fiyat = 450, toplam_sure_dk = 45
where id = 'de300000-0000-4000-8200-000000000081';
update public.randevu_hizmetleri set
  hizmet_id = '82b4fe46-21a3-49eb-b920-e8597a911728', ad = 'Fön & Bakım', fiyat = 450, sure_dk = 45
where randevu_id = 'de300000-0000-4000-8200-000000000081';
commit;
select uzman_ad, baslangic at time zone 'Europe/Istanbul' as baslangic, toplam_fiyat, durum
from public.randevular where id = 'de300000-0000-4000-8200-000000000081';
