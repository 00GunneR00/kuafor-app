-- Hesabımı Sil (App Store, hesap açılabilen uygulamalarda uygulama içinden silmeyi zorunlu tutar)
-- Kullanıcı yalnızca KENDİ hesabını silebilir. auth.users silinince profil, randevular ve puanlar
-- ON DELETE CASCADE ile birlikte silinir.
create or replace function public.hesabimi_sil()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_kullanici uuid := (select auth.uid());
begin
  if v_kullanici is null then
    raise exception 'Giriş yapmalısın';
  end if;
  delete from auth.users where id = v_kullanici;
end;
$$;

revoke execute on function public.hesabimi_sil() from public, anon;
grant execute on function public.hesabimi_sil() to authenticated;
