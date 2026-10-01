-- Security Advisor uyarıları için yetki sıkılaştırma
-- 1) Tetikleyici fonksiyonları API üzerinden hiç kimse çağıramasın
revoke execute on function public.yeni_kullanici(), public.rol_koru(), public.tamamlaninca_puan_ver()
  from public, anon, authenticated;

-- 2) Dolu saatleri yalnızca giriş yapmış kullanıcılar görsün (randevu için giriş zorunlu)
revoke execute on function public.dolu_araliklar(date) from public, anon;
grant execute on function public.dolu_araliklar(date) to authenticated;

-- Bilerek açık bırakılanlar (kendi içlerinde yetki kontrolü yapar, testlerle doğrulandı):
--   randevu_olustur, randevu_iptal_et, odul_kullandir  -> authenticated
--   yonetici_mi -> RLS politikalarında kullanıldığı için anon + authenticated
