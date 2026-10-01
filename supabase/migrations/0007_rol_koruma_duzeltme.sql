-- Düzeltme: rol koruması SQL Editor'den (veritabanı sahibi) yönetici atamayı da engelliyordu.
-- Artık yalnızca uygulama üzerinden gelen istekler (giriş yapmış kullanıcı, auth.uid() dolu) denetlenir.
-- Giriş yapmamış (anon) istekler RLS nedeniyle profil zaten güncelleyemez.
create or replace function public.rol_koru()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol
     and (select auth.uid()) is not null
     and not public.yonetici_mi() then
    raise exception 'Rol değiştirme yetkiniz yok';
  end if;
  return new;
end;
$$;

-- Salon sahibini yönetici yapmak için (SQL Editor'de, e-postayı değiştirerek):
--   update public.profiller set rol = 'yonetici' where eposta = 'salon@ornek.com';
