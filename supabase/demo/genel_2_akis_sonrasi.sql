-- Genel video çekimi, 2. adım: akış çekildi, video randevusunu geri onayla
update public.randevular set durum = 'onaylandi' where id = 'de300000-0000-4000-8200-000000000081';
select durum from public.randevular where id = 'de300000-0000-4000-8200-000000000081';
