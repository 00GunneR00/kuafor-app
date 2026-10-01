-- Genel video çekimi, 3. adım: salon bilgilerini Örnek Salon'a geri al
update public.salon_ayarlari set ad = 'Örnek Salon', adres = 'Merkez / Şehir' where id = 1;
select ad, adres from public.salon_ayarlari where id = 1;
