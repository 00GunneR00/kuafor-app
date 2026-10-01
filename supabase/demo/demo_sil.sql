-- Satış demosu verisini siler (id'si "de300000-" ile başlayan tüm satırlar).
-- Müşteri silinince profiller, randevuları ve puanları da silinir (ON DELETE CASCADE).
begin;
delete from public.puan_hareketleri where id::text like 'de300000-%';
delete from public.randevular where id::text like 'de300000-%';
delete from public.kampanyalar where id::text like 'de300000-%';
delete from auth.users where id::text like 'de300000-%';
commit;
