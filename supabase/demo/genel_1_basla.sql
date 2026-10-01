-- Genel (markasız) video çekimi, 1. adım: salon adını yer tutucu yap,
-- randevu akışı 29 Eylül 14:00 boşken çekilebilsin diye video randevusunu geçici iptal et
begin;
update public.salon_ayarlari set ad = 'Salonunuzun Adı', adres = 'Salonunuzun adresi' where id = 1;
update public.randevular set durum = 'iptal' where id = 'de300000-0000-4000-8200-000000000081';
commit;
select ad, adres, (select durum from public.randevular where id = 'de300000-0000-4000-8200-000000000081') as video_randevusu
from public.salon_ayarlari where id = 1;
