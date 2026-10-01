-- Push bildirimleri (Expo Push Service)
-- Akış: bildirimler tablosu bir "giden kutusu"dur. pg_cron her dakika:
--   1) hatirlatmalari_olustur()      -> zamanı gelen randevu hatırlatmalarını kuyruğa ekler
--   2) bildirim_sonuclarini_isle()   -> Expo'nun cevaplarını okur, geçersiz cihazları siler
--   3) bildirimleri_gonder()         -> kuyruktakileri pg_net ile Expo'ya gönderir
-- Ayrıca: salon randevu iptal edince / müşteri adına randevu girince bildirim kuyruğa eklenir,
-- panelden kampanya bildirimi (yalnızca kampanya izni verenlere) gönderilebilir.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Eski tek alanlı token yerine cihaz tablosu (bir müşterinin birden fazla telefonu olabilir)
alter table public.profiller drop column if exists push_token;

-------------------------------------------------------------------------------
-- Cihazlar
-------------------------------------------------------------------------------
create table public.cihazlar (
  token        text primary key,               -- ExponentPushToken[...]
  musteri_id   uuid not null references public.profiller(id) on delete cascade,
  platform     text check (platform in ('ios', 'android', 'web')),
  guncellendi  timestamptz not null default now()
);
create index cihazlar_musteri_idx on public.cihazlar (musteri_id);
alter table public.cihazlar enable row level security;
create policy "kendi cihazlarini okur" on public.cihazlar for select using (musteri_id = (select auth.uid()));
create policy "yonetici okur" on public.cihazlar for select using ((select public.yonetici_mi()));

-- Cihaz kaydı: aynı telefon başka hesaba geçtiyse token yeni hesaba taşınır
create or replace function public.cihaz_kaydet(p_token text, p_platform text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Giriş yapmalısın';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Geçersiz bildirim adresi';
  end if;
  insert into public.cihazlar (token, musteri_id, platform)
  values (p_token, (select auth.uid()), p_platform)
  on conflict (token) do update set musteri_id = excluded.musteri_id, platform = excluded.platform, guncellendi = now();
end;
$$;

-- Çıkış yaparken: bu telefona artık bu hesabın bildirimleri gitmesin
create or replace function public.cihaz_sil(p_token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.cihazlar where token = p_token and musteri_id = (select auth.uid());
$$;

-------------------------------------------------------------------------------
-- Bildirimler (giden kutusu + geçmiş)
-------------------------------------------------------------------------------
create table public.bildirimler (
  id           uuid primary key default gen_random_uuid(),
  musteri_id   uuid not null references public.profiller(id) on delete cascade,
  tur          text not null check (tur in ('hatirlatma', 'randevu_iptal', 'randevu_olusturuldu', 'kampanya')),
  baslik       text not null,
  govde        text not null,
  veri         jsonb not null default '{}',     -- uygulamada dokununca açılacak ekran vb.
  randevu_id   uuid references public.randevular(id) on delete cascade,
  anahtar      text unique,                     -- aynı bildirimin iki kez oluşmasını engeller
  durum        text not null default 'bekliyor' check (durum in ('bekliyor', 'gonderildi', 'cihaz_yok', 'hata')),
  hata         text,
  olusturuldu  timestamptz not null default now(),
  gonderildi   timestamptz
);
create index bildirimler_bekleyen_idx on public.bildirimler (olusturuldu) where durum = 'bekliyor';
alter table public.bildirimler enable row level security;
create policy "kendi bildirimlerini okur" on public.bildirimler for select using (musteri_id = (select auth.uid()));
create policy "yonetici okur" on public.bildirimler for select using ((select public.yonetici_mi()));

-- Expo'ya yapılan her istek: cevaptaki sonuçlar (ticket) mesaj sırasıyla eşleştirilir
create table public.bildirim_gonderimleri (
  istek_id      bigint primary key,             -- net.http_post dönüş değeri
  bildirim_ids  uuid[] not null,
  tokenlar      text[] not null,
  islendi       boolean not null default false,
  olusturuldu   timestamptz not null default now()
);
alter table public.bildirim_gonderimleri enable row level security; -- yalnızca veritabanı içi kullanım

-------------------------------------------------------------------------------
-- Yardımcı: randevu saatini okunur yaz ("Yarın 14:30", "Bugün 16:00", "3 Ekim 10:00")
-------------------------------------------------------------------------------
create or replace function public.randevu_zamani_metni(p_an timestamptz)
returns text
language sql stable set search_path = ''
as $$
  select case (p_an at time zone 'Europe/Istanbul')::date - (now() at time zone 'Europe/Istanbul')::date
           when 0 then 'Bugün'
           when 1 then 'Yarın'
           else to_char(p_an at time zone 'Europe/Istanbul', 'DD.MM.YYYY')
         end || ' saat ' || to_char(p_an at time zone 'Europe/Istanbul', 'HH24:MI');
$$;

create or replace function public.randevu_hizmet_metni(p_randevu uuid)
returns text
language sql stable set search_path = ''
as $$
  select coalesce(string_agg(ad, ', '), 'randevun') from public.randevu_hizmetleri where randevu_id = p_randevu;
$$;

-------------------------------------------------------------------------------
-- 1) Hatırlatmalar
-- Randevu, hatırlatma zamanından ÖNCE alındıysa gönderilir (ör. 1 saat kala alınan randevuya
-- "1 gün kaldı" bildirimi gitmez). Müşteri Hesabım'dan hatırlatmaları kapattıysa gönderilmez.
-------------------------------------------------------------------------------
create or replace function public.hatirlatmalari_olustur()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_sayi int;
begin
  insert into public.bildirimler (musteri_id, tur, baslik, govde, veri, randevu_id, anahtar)
  select r.musteri_id,
         'hatirlatma',
         'Randevun yaklaşıyor',
         public.randevu_zamani_metni(r.baslangic) || ' ' || public.randevu_hizmet_metni(r.id)
           || ' randevun var. Uzman: ' || u.ad || '. Görüşmek üzere!',
         jsonb_build_object('ekran', 'randevularim', 'randevu_id', r.id),
         r.id,
         'hatirlatma:' || r.id || ':' || h
  from public.randevular r
  join public.profiller p on p.id = r.musteri_id
  join public.uzmanlar u on u.id = r.uzman_id
  cross join public.salon_ayarlari s
  cross join lateral unnest(s.hatirlatma_saatleri) as h
  where s.id = 1
    and r.durum = 'onaylandi'
    and p.hatirlatma_bildirim
    and r.baslangic > now()
    and now() >= r.baslangic - make_interval(hours => h)
    and r.olusturuldu < r.baslangic - make_interval(hours => h)
  on conflict (anahtar) do nothing;
  get diagnostics v_sayi = row_count;
  return v_sayi;
end;
$$;

-------------------------------------------------------------------------------
-- 2) Salon kaynaklı randevu değişikliklerinde müşteriye bildirim
-------------------------------------------------------------------------------
create or replace function public.randevu_bildirimi()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.musteri_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' and new.olusturan = 'salon' then
    insert into public.bildirimler (musteri_id, tur, baslik, govde, veri, randevu_id, anahtar)
    values (new.musteri_id, 'randevu_olusturuldu', 'Randevun oluşturuldu',
            public.randevu_zamani_metni(new.baslangic) || ' ' || public.randevu_hizmet_metni(new.id) || ' randevun salon tarafından oluşturuldu.',
            jsonb_build_object('ekran', 'randevularim', 'randevu_id', new.id), new.id, 'olusturuldu:' || new.id)
    on conflict (anahtar) do nothing;
  elsif tg_op = 'UPDATE' and new.durum = 'iptal' and old.durum is distinct from 'iptal' and new.iptal_eden = 'salon' then
    insert into public.bildirimler (musteri_id, tur, baslik, govde, veri, randevu_id, anahtar)
    values (new.musteri_id, 'randevu_iptal', 'Randevun iptal edildi',
            public.randevu_zamani_metni(new.baslangic) || ' ' || public.randevu_hizmet_metni(new.id)
              || ' randevun salon tarafından iptal edildi.' || coalesce(' Neden: ' || new.iptal_nedeni || '.', '')
              || ' Yeni bir saat seçmek için uygulamayı açabilirsin.',
            jsonb_build_object('ekran', 'randevularim', 'randevu_id', new.id), new.id, 'iptal:' || new.id || ':' || now())
    on conflict (anahtar) do nothing;
  end if;
  return new;
end;
$$;

-- Hizmet satırları randevudan hemen sonra eklendiği için INSERT bildirimi işlem sonunda (deferred) çalışır
create constraint trigger randevu_bildirimi_ekle
  after insert on public.randevular
  deferrable initially deferred
  for each row execute function public.randevu_bildirimi();
create trigger randevu_bildirimi_guncelle
  after update of durum on public.randevular
  for each row execute function public.randevu_bildirimi();

-------------------------------------------------------------------------------
-- 3) Gönderim (pg_net ile Expo Push API'ye; istek başına en fazla 100 mesaj)
-------------------------------------------------------------------------------
create or replace function public.bildirimleri_gonder()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_parti   record;
  v_istek   bigint;
  v_toplam  int := 0;
begin
  -- Cihazı olmayan müşterilerin bildirimleri gönderilemez
  update public.bildirimler b set durum = 'cihaz_yok'
  where b.durum = 'bekliyor'
    and not exists (select 1 from public.cihazlar c where c.musteri_id = b.musteri_id);

  for i in 1..10 loop  -- dakikada en fazla 1000 mesaj
    select array_agg(m.bildirim_id order by m.sira) as ids,
           array_agg(m.token order by m.sira) as tokenlar,
           jsonb_agg(m.mesaj order by m.sira) as mesajlar
      into v_parti
    from (
      select b.id as bildirim_id, c.token,
             row_number() over (order by b.olusturuldu, b.id, c.token) as sira,
             jsonb_build_object('to', c.token, 'title', b.baslik, 'body', b.govde, 'data', b.veri,
                                'sound', 'default', 'channelId', 'default', 'priority', 'high') as mesaj
      from public.bildirimler b
      join public.cihazlar c on c.musteri_id = b.musteri_id
      where b.durum = 'bekliyor'
      order by b.olusturuldu, b.id, c.token
      limit 100
    ) m;

    exit when v_parti.ids is null;

    select net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_parti.mesajlar,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      timeout_milliseconds := 10000
    ) into v_istek;

    insert into public.bildirim_gonderimleri (istek_id, bildirim_ids, tokenlar)
    values (v_istek, v_parti.ids, v_parti.tokenlar);

    update public.bildirimler set durum = 'gonderildi', gonderildi = now()
    where id = any (v_parti.ids);

    v_toplam := v_toplam + cardinality(v_parti.ids);
  end loop;
  return v_toplam;
end;
$$;

-------------------------------------------------------------------------------
-- 4) Expo cevaplarını işle: hatalı mesajları işaretle, kaldırılmış cihazları sil
-------------------------------------------------------------------------------
create or replace function public.bildirim_sonuclarini_isle()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  g        record;
  v_cevap  record;
  t        record;
  v_sayi   int := 0;
begin
  for g in select * from public.bildirim_gonderimleri where not islendi order by olusturuldu limit 100 loop
    select status_code, content, error_msg into v_cevap from net._http_response where id = g.istek_id;
    if not found then
      -- Cevap henüz gelmedi; 1 saatten eskiyse vazgeç
      if g.olusturuldu < now() - interval '1 hour' then
        update public.bildirim_gonderimleri set islendi = true where istek_id = g.istek_id;
      end if;
      continue;
    end if;

    if v_cevap.status_code is distinct from 200 then
      update public.bildirimler set durum = 'hata', hata = coalesce(v_cevap.error_msg, 'HTTP ' || v_cevap.status_code)
      where id = any (g.bildirim_ids);
    else
      for t in
        select e.deger, e.sira
        from jsonb_array_elements(v_cevap.content::jsonb -> 'data') with ordinality as e(deger, sira)
      loop
        if t.deger ->> 'status' = 'error' then
          update public.bildirimler set durum = 'hata', hata = coalesce(t.deger -> 'details' ->> 'error', t.deger ->> 'message')
          where id = g.bildirim_ids[t.sira];
          if t.deger -> 'details' ->> 'error' = 'DeviceNotRegistered' then
            delete from public.cihazlar where token = g.tokenlar[t.sira];
          end if;
        end if;
      end loop;
    end if;
    update public.bildirim_gonderimleri set islendi = true where istek_id = g.istek_id;
    v_sayi := v_sayi + 1;
  end loop;
  return v_sayi;
end;
$$;

-------------------------------------------------------------------------------
-- 5) Kampanya bildirimi (panelden, yalnızca yönetici; yalnızca kampanya izni verenlere)
-------------------------------------------------------------------------------
create or replace function public.kampanya_bildirimi_gonder(p_baslik text, p_govde text, p_kampanya_id uuid default null)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_sayi int;
  v_grup text := gen_random_uuid()::text;
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  if nullif(trim(p_baslik), '') is null or nullif(trim(p_govde), '') is null then
    raise exception 'Başlık ve mesaj boş olamaz';
  end if;
  insert into public.bildirimler (musteri_id, tur, baslik, govde, veri, anahtar)
  select p.id, 'kampanya', trim(p_baslik), trim(p_govde),
         jsonb_build_object('ekran', 'kesfet', 'kampanya_id', p_kampanya_id),
         'kampanya:' || v_grup || ':' || p.id
  from public.profiller p
  where p.rol = 'musteri' and p.kampanya_izni;
  get diagnostics v_sayi = row_count;
  perform public.bildirimleri_gonder();
  return v_sayi;
end;
$$;

-- Kaç kişiye ulaşılır? (panelde göndermeden önce gösterilir)
create or replace function public.kampanya_alici_sayisi()
returns table (izinli int, cihazli int)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int,
         count(*) filter (where exists (select 1 from public.cihazlar c where c.musteri_id = p.id))::int
  from public.profiller p
  where p.rol = 'musteri' and p.kampanya_izni and public.yonetici_mi();
$$;

-------------------------------------------------------------------------------
-- Yetkiler
-------------------------------------------------------------------------------
revoke execute on function public.cihaz_kaydet, public.cihaz_sil, public.randevu_zamani_metni, public.randevu_hizmet_metni,
  public.hatirlatmalari_olustur, public.randevu_bildirimi, public.bildirimleri_gonder, public.bildirim_sonuclarini_isle,
  public.kampanya_bildirimi_gonder, public.kampanya_alici_sayisi
  from public, anon, authenticated;
grant execute on function public.cihaz_kaydet, public.cihaz_sil, public.kampanya_bildirimi_gonder, public.kampanya_alici_sayisi
  to authenticated;

-------------------------------------------------------------------------------
-- Zamanlayıcı: her dakika
-------------------------------------------------------------------------------
select cron.schedule(
  'bildirimler',
  '* * * * *',
  $$select public.hatirlatmalari_olustur(); select public.bildirim_sonuclarini_isle(); select public.bildirimleri_gonder();$$
);
