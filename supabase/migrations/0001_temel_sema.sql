-- Örnek Salon: temel veritabanı şeması
-- Tablolar, iş kuralları (fonksiyonlar/tetikleyiciler) ve RLS güvenlik politikaları.
-- Kurallar PLAN.md > "İş Kuralları" bölümünden gelir; değerler salon_ayarlari tablosundan okunur.

create extension if not exists btree_gist with schema extensions;

-------------------------------------------------------------------------------
-- 1. SALON AYARLARI (tek satır)
-------------------------------------------------------------------------------
create table public.salon_ayarlari (
  id                   smallint primary key default 1 check (id = 1),
  ad                   text not null default 'Örnek Salon',
  adres                text,
  telefon              text,
  enlem                double precision,
  boylam               double precision,
  saat_dilimi          text not null default 'Europe/Istanbul',
  puan_basina          int  not null default 50  check (puan_basina >= 0),
  odul_puani           int  not null default 500 check (odul_puani > 0),
  odul_hizmet_id       uuid,                        -- "ücretsiz bakım" hangi hizmet (salonla netleşecek)
  ucretsiz_iptal_saat  int  not null default 2   check (ucretsiz_iptal_saat >= 0),
  hatirlatma_saatleri  int[] not null default '{24,2}', -- randevudan kaç saat önce bildirim
  guncellendi          timestamptz not null default now()
);
insert into public.salon_ayarlari (id) values (1);

-- Haftalık çalışma saatleri (gun: 1=Pazartesi ... 7=Pazar, ISO)
create table public.calisma_saatleri (
  gun      smallint primary key check (gun between 1 and 7),
  kapali   boolean not null default false,
  acilis   time,
  kapanis  time,
  check (kapali or (acilis is not null and kapanis is not null and acilis < kapanis))
);

-- Tatil / özel kapalı günler
create table public.kapali_gunler (
  tarih     date primary key,
  aciklama  text
);

-------------------------------------------------------------------------------
-- 2. KULLANICILAR (auth.users ile birebir)
-------------------------------------------------------------------------------
create table public.profiller (
  id                  uuid primary key references auth.users(id) on delete cascade,
  ad_soyad            text not null,
  telefon             text,
  rol                 text not null default 'musteri' check (rol in ('musteri', 'yonetici')),
  kvkk_onay_tarihi    timestamptz,
  kampanya_izni       boolean not null default false,
  hatirlatma_bildirim boolean not null default true,
  push_token          text,
  olusturuldu         timestamptz not null default now()
);

-- Yönetici mi? (RLS politikalarında kullanılır)
create or replace function public.yonetici_mi()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiller where id = (select auth.uid()) and rol = 'yonetici'
  );
$$;

-- Kayıt olunca profil otomatik oluşur (ad, telefon, onaylar kayıt formundan gelir)
create or replace function public.yeni_kullanici()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiller (id, ad_soyad, telefon, kvkk_onay_tarihi, kampanya_izni)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', ''),
    new.raw_user_meta_data ->> 'telefon',
    case when (new.raw_user_meta_data ->> 'kvkk_onay')::boolean then now() end,
    coalesce((new.raw_user_meta_data ->> 'kampanya_izni')::boolean, false)
  );
  return new;
end;
$$;

create trigger kullanici_olusunca
  after insert on auth.users
  for each row execute function public.yeni_kullanici();

-- Müşteri kendi rolünü değiştiremez
create or replace function public.rol_koru()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol and not public.yonetici_mi() then
    raise exception 'Rol değiştirme yetkiniz yok';
  end if;
  return new;
end;
$$;

create trigger profil_rol_koru
  before update on public.profiller
  for each row execute function public.rol_koru();

-------------------------------------------------------------------------------
-- 3. KATALOG: kategoriler, hizmetler, uzmanlar
-------------------------------------------------------------------------------
create table public.kategoriler (
  id    uuid primary key default gen_random_uuid(),
  ad    text not null unique,
  sira  int  not null default 0
);

create table public.hizmetler (
  id               uuid primary key default gen_random_uuid(),
  kategori_id      uuid not null references public.kategoriler(id),
  ad               text not null,
  aciklama         text,                   -- listede görünen kısa açıklama
  detay            text,                   -- detay ekranındaki "Hizmet Hakkında"
  dahil            text[] not null default '{}', -- "Neler Dahil?"
  sure_dk          int  not null check (sure_dk > 0),
  fiyat            numeric(10,2) not null check (fiyat >= 0),
  fiyat_baslangic  boolean not null default false, -- true ise "…'den başlayan"
  gorsel_url       text,
  aktif            boolean not null default true,
  sira             int  not null default 0
);

alter table public.salon_ayarlari
  add constraint odul_hizmeti_fk foreign key (odul_hizmet_id) references public.hizmetler(id);

create table public.uzmanlar (
  id         uuid primary key default gen_random_uuid(),
  ad         text not null,
  unvan      text,
  uzmanlik   text,
  foto_url   text,
  aktif      boolean not null default true,
  sira       int  not null default 0
);

-- Hangi uzman hangi hizmeti veriyor
create table public.uzman_hizmetleri (
  uzman_id   uuid references public.uzmanlar(id)  on delete cascade,
  hizmet_id  uuid references public.hizmetler(id) on delete cascade,
  primary key (uzman_id, hizmet_id)
);

-------------------------------------------------------------------------------
-- 4. RANDEVULAR
-------------------------------------------------------------------------------
create table public.randevular (
  id             uuid primary key default gen_random_uuid(),
  musteri_id     uuid not null references public.profiller(id) on delete cascade,
  uzman_id       uuid not null references public.uzmanlar(id),
  baslangic      timestamptz not null,
  bitis          timestamptz not null,
  durum          text not null default 'onaylandi'
                 check (durum in ('onaylandi', 'tamamlandi', 'iptal', 'gelmedi')),
  toplam_fiyat   numeric(10,2) not null,
  toplam_sure_dk int not null,
  musteri_notu   text check (char_length(musteri_notu) <= 150),
  iptal_nedeni   text,
  iptal_eden     text check (iptal_eden in ('musteri', 'salon')),
  iptal_tarihi   timestamptz,
  olusturuldu    timestamptz not null default now(),
  check (bitis > baslangic),
  -- Aynı uzmana çakışan iki aktif randevu verilemez
  constraint uzman_cakisma_yok exclude using gist (
    uzman_id with =,
    tstzrange(baslangic, bitis) with &&
  ) where (durum in ('onaylandi', 'tamamlandi'))
);
create index randevular_musteri_idx on public.randevular (musteri_id, baslangic desc);
create index randevular_tarih_idx   on public.randevular (baslangic);

-- Randevudaki hizmetler (o anki fiyat/süre saklanır; fiyat sonradan değişse de geçmiş bozulmaz)
create table public.randevu_hizmetleri (
  randevu_id  uuid references public.randevular(id) on delete cascade,
  hizmet_id   uuid references public.hizmetler(id),
  ad          text not null,
  fiyat       numeric(10,2) not null,
  sure_dk     int not null,
  primary key (randevu_id, hizmet_id)
);

-------------------------------------------------------------------------------
-- 5. SADAKAT PUANLARI (bakiye = hareketlerin toplamı)
-------------------------------------------------------------------------------
create table public.puan_hareketleri (
  id           uuid primary key default gen_random_uuid(),
  musteri_id   uuid not null references public.profiller(id) on delete cascade,
  randevu_id   uuid references public.randevular(id) on delete set null,
  miktar       int  not null,             -- +50 kazanım, -500 ödül
  tur          text not null check (tur in ('kazanim', 'odul', 'duzeltme')),
  aciklama     text,
  olusturuldu  timestamptz not null default now()
);
create index puan_musteri_idx on public.puan_hareketleri (musteri_id, olusturuldu desc);
-- Bir randevu en fazla bir kez puan kazandırır
create unique index puan_randevu_tek on public.puan_hareketleri (randevu_id) where tur = 'kazanim';

create or replace view public.puan_bakiyeleri
with (security_invoker = true) as
  select musteri_id, coalesce(sum(miktar), 0)::int as bakiye
  from public.puan_hareketleri
  group by musteri_id;

-- Randevu "tamamlandı" olunca puan eklenir
create or replace function public.tamamlaninca_puan_ver()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_puan int;
begin
  if new.durum = 'tamamlandi' and old.durum is distinct from 'tamamlandi' then
    select puan_basina into v_puan from public.salon_ayarlari where id = 1;
    insert into public.puan_hareketleri (musteri_id, randevu_id, miktar, tur, aciklama)
    values (new.musteri_id, new.id, v_puan, 'kazanim',
            (select string_agg(ad, ', ') from public.randevu_hizmetleri where randevu_id = new.id))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger randevu_tamamlaninca
  after update of durum on public.randevular
  for each row execute function public.tamamlaninca_puan_ver();

-------------------------------------------------------------------------------
-- 6. KEŞFET: kampanyalar ve galeri
-------------------------------------------------------------------------------
create table public.kampanyalar (
  id           uuid primary key default gen_random_uuid(),
  baslik       text not null,
  aciklama     text,
  etiket       text,                         -- "Yeni", "30 Eylül'e kadar" gibi
  gorsel_url   text,
  hizmet_id    uuid references public.hizmetler(id),
  baslangic    date,
  bitis        date,
  aktif        boolean not null default true,
  sira         int not null default 0,
  olusturuldu  timestamptz not null default now()
);

create table public.galeri (
  id           uuid primary key default gen_random_uuid(),
  gorsel_url   text not null,
  kategori_id  uuid references public.kategoriler(id),
  hizmet_adi   text,
  uzman_id     uuid references public.uzmanlar(id) on delete set null,
  aktif        boolean not null default true,
  sira         int not null default 0,
  olusturuldu  timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- 7. MÜŞTERİ İŞLEMLERİ (tüm kurallar sunucuda kontrol edilir)
-------------------------------------------------------------------------------

-- Seçilen günün dolu aralıkları (kimin randevusu olduğu gösterilmez)
create or replace function public.dolu_araliklar(p_tarih date)
returns table (uzman_id uuid, baslangic timestamptz, bitis timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.uzman_id, r.baslangic, r.bitis
  from public.randevular r, public.salon_ayarlari s
  where s.id = 1
    and r.durum = 'onaylandi'
    and (r.baslangic at time zone s.saat_dilimi)::date = p_tarih;
$$;

-- Randevu oluştur. p_uzman_id null ise "Farketmez": uygun ilk uzman seçilir.
create or replace function public.randevu_olustur(
  p_baslangic   timestamptz,
  p_hizmet_ids  uuid[],
  p_uzman_id    uuid default null,
  p_not         text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_musteri   uuid := (select auth.uid());
  v_sure      int;
  v_fiyat     numeric(10,2);
  v_adet      int;
  v_bitis     timestamptz;
  v_tz        text;
  v_yerel     timestamp;
  v_gun       public.calisma_saatleri;
  v_uzman     uuid;
  v_randevu   uuid;
begin
  if v_musteri is null then
    raise exception 'Randevu almak için giriş yapmalısın';
  end if;
  if p_baslangic <= now() then
    raise exception 'Geçmiş bir saate randevu alınamaz';
  end if;

  select count(*), sum(sure_dk), sum(fiyat) into v_adet, v_sure, v_fiyat
  from public.hizmetler where id = any (p_hizmet_ids) and aktif;
  if v_adet = 0 or v_adet <> cardinality(p_hizmet_ids) then
    raise exception 'Seçilen hizmetlerden biri artık sunulmuyor';
  end if;
  v_bitis := p_baslangic + make_interval(mins => v_sure);

  -- Çalışma saatleri ve kapalı günler
  select saat_dilimi into v_tz from public.salon_ayarlari where id = 1;
  v_yerel := p_baslangic at time zone v_tz;
  select * into v_gun from public.calisma_saatleri where gun = extract(isodow from v_yerel);
  if v_gun is null or v_gun.kapali
     or exists (select 1 from public.kapali_gunler where tarih = v_yerel::date) then
    raise exception 'Salon bu gün kapalı';
  end if;
  if v_yerel::time < v_gun.acilis or (v_bitis at time zone v_tz)::time > v_gun.kapanis then
    raise exception 'Seçilen saat çalışma saatleri dışında';
  end if;

  -- Uzman seçimi: hizmetlerin hepsini veren, o saatte boş, aktif uzman
  select u.id into v_uzman
  from public.uzmanlar u
  where u.aktif
    and (p_uzman_id is null or u.id = p_uzman_id)
    and (select count(*) from public.uzman_hizmetleri uh
         where uh.uzman_id = u.id and uh.hizmet_id = any (p_hizmet_ids)) = cardinality(p_hizmet_ids)
    and not exists (
      select 1 from public.randevular r
      where r.uzman_id = u.id and r.durum = 'onaylandi'
        and tstzrange(r.baslangic, r.bitis) && tstzrange(p_baslangic, v_bitis))
  order by u.sira
  limit 1;

  if v_uzman is null then
    raise exception 'Bu saat dolu, lütfen başka bir saat seç';
  end if;

  insert into public.randevular
    (musteri_id, uzman_id, baslangic, bitis, toplam_fiyat, toplam_sure_dk, musteri_notu)
  values (v_musteri, v_uzman, p_baslangic, v_bitis, v_fiyat, v_sure, nullif(trim(p_not), ''))
  returning id into v_randevu;

  insert into public.randevu_hizmetleri (randevu_id, hizmet_id, ad, fiyat, sure_dk)
  select v_randevu, h.id, h.ad, h.fiyat, h.sure_dk
  from public.hizmetler h where h.id = any (p_hizmet_ids);

  return v_randevu;
exception
  when exclusion_violation then
    raise exception 'Bu saat az önce doldu, lütfen başka bir saat seç';
end;
$$;

-- Müşteri iptali: yalnızca ücretsiz iptal süresi dolmadan
create or replace function public.randevu_iptal_et(p_randevu_id uuid, p_neden text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_r     public.randevular;
  v_saat  int;
begin
  select * into v_r from public.randevular
  where id = p_randevu_id and musteri_id = (select auth.uid());
  if v_r is null then
    raise exception 'Randevu bulunamadı';
  end if;
  if v_r.durum <> 'onaylandi' then
    raise exception 'Bu randevu iptal edilemez';
  end if;
  select ucretsiz_iptal_saat into v_saat from public.salon_ayarlari where id = 1;
  if v_r.baslangic - now() < make_interval(hours => v_saat) then
    raise exception 'Ücretsiz iptal süresi doldu, lütfen salonu ara';
  end if;

  update public.randevular
  set durum = 'iptal', iptal_nedeni = p_neden, iptal_eden = 'musteri', iptal_tarihi = now()
  where id = p_randevu_id;
end;
$$;

-- Salon paneli: ödül kullandır (bakiye yeterliyse puan düşer)
create or replace function public.odul_kullandir(p_musteri_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_bakiye int;
  v_odul   int;
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  select odul_puani into v_odul from public.salon_ayarlari where id = 1;
  select coalesce(sum(miktar), 0) into v_bakiye
  from public.puan_hareketleri where musteri_id = p_musteri_id;
  if v_bakiye < v_odul then
    raise exception 'Puan yetersiz (% / %)', v_bakiye, v_odul;
  end if;
  insert into public.puan_hareketleri (musteri_id, miktar, tur, aciklama)
  values (p_musteri_id, -v_odul, 'odul', 'Ücretsiz bakım kullanıldı');
end;
$$;

-- İşlem fonksiyonlarını yalnızca giriş yapmış kullanıcılar çağırabilir
revoke execute on function public.randevu_olustur, public.randevu_iptal_et, public.odul_kullandir
  from public, anon;
grant execute on function public.randevu_olustur, public.randevu_iptal_et, public.odul_kullandir
  to authenticated;
grant execute on function public.dolu_araliklar to anon, authenticated;

-------------------------------------------------------------------------------
-- 8. GÜVENLİK (RLS)
-- Katalog herkese okunur (misafir gezinme). Yazma yalnızca yönetici.
-- Müşteri yalnızca kendi profilini, randevularını ve puanlarını görür.
-- Randevu oluşturma/iptal yalnızca yukarıdaki fonksiyonlarla yapılır.
-------------------------------------------------------------------------------
alter table public.salon_ayarlari     enable row level security;
alter table public.calisma_saatleri   enable row level security;
alter table public.kapali_gunler      enable row level security;
alter table public.profiller          enable row level security;
alter table public.kategoriler        enable row level security;
alter table public.hizmetler          enable row level security;
alter table public.uzmanlar           enable row level security;
alter table public.uzman_hizmetleri   enable row level security;
alter table public.randevular         enable row level security;
alter table public.randevu_hizmetleri enable row level security;
alter table public.puan_hareketleri   enable row level security;
alter table public.kampanyalar        enable row level security;
alter table public.galeri             enable row level security;

-- Herkese açık okuma
create policy "herkes okur" on public.salon_ayarlari    for select using (true);
create policy "herkes okur" on public.calisma_saatleri  for select using (true);
create policy "herkes okur" on public.kapali_gunler     for select using (true);
create policy "herkes okur" on public.kategoriler       for select using (true);
create policy "herkes okur" on public.uzman_hizmetleri  for select using (true);
create policy "aktifleri herkes okur" on public.hizmetler   for select using (aktif or (select public.yonetici_mi()));
create policy "aktifleri herkes okur" on public.uzmanlar    for select using (aktif or (select public.yonetici_mi()));
create policy "aktifleri herkes okur" on public.galeri      for select using (aktif or (select public.yonetici_mi()));
create policy "aktifleri herkes okur" on public.kampanyalar for select using (
  (aktif and (bitis is null or bitis >= current_date)) or (select public.yonetici_mi()));

-- Yönetici her şeyi yönetir
create policy "yonetici yazar" on public.salon_ayarlari     for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.calisma_saatleri   for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.kapali_gunler      for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.kategoriler        for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.hizmetler          for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.uzmanlar           for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.uzman_hizmetleri   for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.kampanyalar        for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.galeri             for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.randevular         for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.randevu_hizmetleri for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici yazar" on public.puan_hareketleri   for all using ((select public.yonetici_mi())) with check ((select public.yonetici_mi()));
create policy "yonetici okur"  on public.profiller          for select using ((select public.yonetici_mi()));

-- Müşteri: kendi verisi
create policy "kendi profilini okur"      on public.profiller for select using (id = (select auth.uid()));
create policy "kendi profilini gunceller" on public.profiller for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "kendi randevularini okur"  on public.randevular for select using (musteri_id = (select auth.uid()));
create policy "kendi randevu hizmetlerini okur" on public.randevu_hizmetleri for select using (
  exists (select 1 from public.randevular r where r.id = randevu_id and r.musteri_id = (select auth.uid())));
create policy "kendi puanlarini okur"     on public.puan_hareketleri for select using (musteri_id = (select auth.uid()));
