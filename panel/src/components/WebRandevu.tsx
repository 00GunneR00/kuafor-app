"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useSorgu } from "@/lib/sorgu";
import { ac, hataMetni, supabase } from "@/lib/supabase";
import { anOlustur, AYLAR, fiyatYaz, gunEkle, isoGun, saatYaz, tarihAnahtari, uzunTarih } from "@/lib/tarih";
import type { CalismaSaati } from "@/lib/tipler";

// Hesapsız hızlı randevu: Hizmet -> Tarih & Saat -> Bilgiler -> Başarılı.
// Uzman seçimi, puan, hatırlatma ve iptal yalnızca uygulamada; sayfa boyunca bunlar uygulamaya davet olarak gösterilir.
// Kurallar sunucuda (web_bos_saatler, web_randevu_olustur) kontrol edilir.

const GUN_SAYISI = 30;
const KISA_GUN = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

type WebHizmet = {
  id: string;
  kategori_id: string;
  ad: string;
  aciklama: string | null;
  sure_dk: number;
  fiyat: number;
  fiyat_baslangic: boolean;
};

type WebAyar = {
  ad: string;
  adres: string | null;
  telefon: string | null;
  enlem: number | null;
  boylam: number | null;
  puan_basina: number;
  odul_puani: number;
  odul_hizmet_id: string | null;
  web_randevu_acik: boolean;
  magaza_ios: string | null;
  magaza_android: string | null;
};

type WebUzman = { id: string; ad: string; foto_url: string | null };

type Sonuc = { kod: string; uzman: string | null; baslangic: string; telefon: string };

async function veriGetir() {
  const [ayar, kategoriler, hizmetler, iliskiler, uzmanlar, saatler, kapali] = await Promise.all([
    supabase
      .from("salon_ayarlari")
      .select("ad, adres, telefon, enlem, boylam, puan_basina, odul_puani, odul_hizmet_id, web_randevu_acik, magaza_ios, magaza_android")
      .single()
      .then(ac),
    supabase.from("kategoriler").select("id, ad").order("sira").then(ac),
    supabase.from("hizmetler").select("id, kategori_id, ad, aciklama, sure_dk, fiyat, fiyat_baslangic").eq("aktif", true).order("sira").then(ac),
    supabase.from("uzman_hizmetleri").select("uzman_id, hizmet_id").then(ac),
    supabase.from("uzmanlar").select("id, ad, foto_url").eq("aktif", true).order("sira").then(ac),
    supabase.from("calisma_saatleri").select("gun, kapali, acilis, kapanis").then(ac),
    supabase.from("kapali_gunler").select("tarih").gte("tarih", tarihAnahtari()).then(ac),
  ]);
  const uzmanIds = new Set((uzmanlar as WebUzman[]).map((u) => u.id));
  const aktifIliskiler = (iliskiler as { uzman_id: string; hizmet_id: string }[]).filter((i) => uzmanIds.has(i.uzman_id));
  return {
    ayar: ayar as WebAyar,
    kategoriler: kategoriler as { id: string; ad: string }[],
    // Hiçbir aktif uzmanın vermediği hizmet listelenmez
    hizmetler: (hizmetler as WebHizmet[]).filter((h) => aktifIliskiler.some((i) => i.hizmet_id === h.id)),
    iliskiler: aktifIliskiler,
    uzmanlar: uzmanlar as WebUzman[],
    saatler: saatler as CalismaSaati[],
    kapaliGunler: (kapali as { tarih: string }[]).map((k) => k.tarih),
  };
}

/** "0532 123 45 67" biçimine çevirir; cep numarası değilse null (sunucudaki telefon_duzelt ile aynı kural) */
function telefonDuzelt(metin: string): string | null {
  const r = metin.replace(/\D/g, "").replace(/^(90|0)/, "");
  return /^5\d{9}$/.test(r) ? `0${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6, 8)} ${r.slice(8)}` : null;
}

export function WebRandevu() {
  const v = useSorgu(veriGetir);

  if (v.hata)
    return (
      <Cerceve>
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-tugla">
          Sayfa yüklenemedi. İnternet bağlantını kontrol edip{" "}
          <button className="font-semibold underline" onClick={v.yenile}>
            tekrar dene
          </button>
          .
        </p>
      </Cerceve>
    );
  if (!v.veri)
    return (
      <Cerceve>
        <p className="py-16 text-center text-sm text-taupe">Yükleniyor…</p>
      </Cerceve>
    );

  const d = v.veri;
  if (!d.ayar.web_randevu_acik)
    return (
      <Cerceve ad={d.ayar.ad}>
        <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
          <p className="font-serif text-xl">Online randevu şu an kapalı</p>
          <p className="text-sm text-taupe">Randevu için bizi arayabilirsin.</p>
          {d.ayar.telefon && <AraButonu telefon={d.ayar.telefon} />}
        </div>
        <UygulamaKarti ayar={d.ayar} odulAdi={odulAdi(d)} uzmanlar={d.uzmanlar} />
      </Cerceve>
    );

  return <Akis d={d} />;
}

function odulAdi(d: Awaited<ReturnType<typeof veriGetir>>): string | null {
  return d.hizmetler.find((h) => h.id === d.ayar.odul_hizmet_id)?.ad ?? null;
}

function Akis({ d }: { d: Awaited<ReturnType<typeof veriGetir>> }) {
  const [adim, setAdim] = useState<1 | 2 | 3>(1);
  const [secili, setSecili] = useState<string[]>([]);
  const [kategori, setKategori] = useState<string | null>(null);
  const [tarih, setTarih] = useState<string | null>(null);
  const [saat, setSaat] = useState<string | null>(null);
  const [form, setForm] = useState({ ad: "", telefon: "", not: "" });
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);

  const seciliHizmetler = d.hizmetler.filter((h) => secili.includes(h.id));
  const toplam = seciliHizmetler.reduce((t, h) => t + Number(h.fiyat), 0);
  const baslangicFiyat = seciliHizmetler.some((h) => h.fiyat_baslangic);
  const sure = seciliHizmetler.reduce((t, h) => t + h.sure_dk, 0);
  const odul = odulAdi(d);

  // Seçilen hizmetlerin hepsini aynı uzman yapabiliyor mu?
  const tekUzmanVar =
    secili.length === 0 || d.uzmanlar.some((u) => secili.every((h) => d.iliskiler.some((i) => i.uzman_id === u.id && i.hizmet_id === h)));

  const gunler = useMemo(() => {
    const bugun = tarihAnahtari();
    return Array.from({ length: GUN_SAYISI }, (_, i) => {
      const t = gunEkle(bugun, i);
      const g = d.saatler.find((s) => s.gun === isoGun(t));
      return { tarih: t, acik: !!g && !g.kapali && !!g.acilis && !d.kapaliGunler.includes(t) };
    });
  }, [d.saatler, d.kapaliGunler]);

  const bosSaatler = useSorgu(
    async () =>
      tarih && secili.length
        ? ((await supabase.rpc("web_bos_saatler", { p_tarih: tarih, p_hizmet_ids: secili }).then(ac)) as string[])
        : [],
    [tarih, secili],
  );

  function hizmetDegistir(id: string) {
    setSecili((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setSaat(null);
  }

  const telefon = telefonDuzelt(form.telefon);
  const adGecerli = form.ad.trim().replace(/\s+/g, " ").length >= 3;

  async function onayla() {
    if (!tarih || !saat || !telefon || !adGecerli) return;
    setGonderiliyor(true);
    setHata(null);
    const baslangic = anOlustur(tarih, saat);
    const { data, error } = await supabase.rpc("web_randevu_olustur", {
      p_baslangic: baslangic,
      p_hizmet_ids: secili,
      p_ad: form.ad,
      p_telefon: telefon,
      p_not: form.not.trim() || null,
    });
    setGonderiliyor(false);
    if (error) {
      const mesaj = hataMetni(error);
      setHata(mesaj);
      if (/dolu|doldu/.test(mesaj)) {
        setSaat(null);
        bosSaatler.yenile();
        setAdim(2);
      }
      return;
    }
    const r = data as { kod: string; uzman: string | null };
    setSonuc({ kod: r.kod, uzman: r.uzman, baslangic, telefon });
    window.scrollTo({ top: 0 });
  }

  if (sonuc)
    return (
      <Cerceve ad={d.ayar.ad}>
        <Basarili sonuc={sonuc} hizmetler={seciliHizmetler} toplam={toplam} baslangicFiyat={baslangicFiyat} ayar={d.ayar} />
        <UygulamaKarti ayar={d.ayar} odulAdi={odul} uzmanlar={d.uzmanlar} kod={sonuc.kod} telefon={sonuc.telefon} />
      </Cerceve>
    );

  const devamEdebilir = adim === 1 ? secili.length > 0 && tekUzmanVar : adim === 2 ? !!tarih && !!saat : !!telefon && adGecerli;

  return (
    <Cerceve ad={d.ayar.ad} altBosluk>
      <Adimlar adim={adim} git={(a) => a < adim && setAdim(a)} />

      {adim === 1 && (
        <>
          <PuanSeridi ayar={d.ayar} odulAdi={odul} />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {[{ id: null, ad: "Tümü" }, ...d.kategoriler.filter((k) => d.hizmetler.some((h) => h.kategori_id === k.id))].map((k) => (
              <button
                key={k.id ?? "tumu"}
                onClick={() => setKategori(k.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${kategori === k.id ? "bg-koyu text-white" : "bg-white text-taupe"}`}>
                {k.ad}
              </button>
            ))}
          </div>
          <div className="space-y-5">
            {d.kategoriler
              .filter((k) => !kategori || k.id === kategori)
              .map((k) => {
                const liste = d.hizmetler.filter((h) => h.kategori_id === k.id);
                if (!liste.length) return null;
                return (
                  <section key={k.id}>
                    <h2 className="mb-2 font-serif text-lg">{k.ad}</h2>
                    <div className="divide-y divide-cizgi overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
                      {liste.map((h) => {
                        const s = secili.includes(h.id);
                        return (
                          <button key={h.id} onClick={() => hizmetDegistir(h.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                            <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${s ? "border-ana bg-ana text-white" : "border-cizgi"}`}>
                              {s && <Tik />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{h.ad}</span>
                              <span className="block text-xs text-taupe">
                                {h.sure_dk} dk{h.aciklama ? ` · ${h.aciklama}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold">{fiyatYaz(Number(h.fiyat), h.fiyat_baslangic)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
          </div>
          {!tekUzmanVar && (
            <p className="rounded-xl bg-tugla/10 px-4 py-3 text-sm text-tugla">
              Seçtiğin hizmetlerin hepsini aynı uzman yapmıyor. Ayrı ayrı randevu alabilir ya da salonu arayabilirsin.
            </p>
          )}
        </>
      )}

      {adim === 2 && (
        <>
          <UzmanDavet uzmanlar={d.uzmanlar} />
          <section>
            <h2 className="mb-2 font-serif text-lg">Tarih</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {gunler.map((g) => {
                const dt = new Date(`${g.tarih}T12:00:00+03:00`);
                const s = g.tarih === tarih;
                return (
                  <button
                    key={g.tarih}
                    disabled={!g.acik}
                    onClick={() => {
                      setTarih(g.tarih);
                      setSaat(null);
                    }}
                    className={`flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 text-xs transition disabled:opacity-35 ${
                      s ? "bg-ana text-white" : "bg-white text-koyu"
                    }`}>
                    <span className={s ? "text-white/80" : "text-taupe"}>{KISA_GUN[dt.getUTCDay()]}</span>
                    <span className="text-lg font-semibold">{g.tarih.slice(8)}</span>
                    <span className={s ? "text-white/80" : "text-taupe"}>{AYLAR[Number(g.tarih.slice(5, 7)) - 1].slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </section>
          {tarih && (
            <section>
              <h2 className="mb-2 font-serif text-lg">Saat</h2>
              {bosSaatler.yukleniyor ? (
                <p className="text-sm text-taupe">Boş saatler yükleniyor…</p>
              ) : bosSaatler.hata ? (
                <p className="text-sm text-tugla">{bosSaatler.hata}</p>
              ) : !bosSaatler.veri?.length ? (
                <p className="rounded-xl border border-dashed border-cizgi px-4 py-6 text-center text-sm text-taupe">
                  Bu gün için boş saat kalmadı. Başka bir gün seçebilirsin.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {bosSaatler.veri.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSaat(s)}
                      className={`rounded-xl py-2.5 text-sm font-semibold ${saat === s ? "bg-ana text-white" : "bg-white text-koyu"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {adim === 3 && tarih && saat && (
        <>
          <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
            <Satir etiket="Tarih">
              {uzunTarih(tarih)}, {saat}
            </Satir>
            <Satir etiket="Hizmet">{seciliHizmetler.map((h) => h.ad).join(", ")}</Satir>
            <Satir etiket="Uzman">Salon uygun uzmanı atar</Satir>
            <Satir etiket="Toplam">
              <b>{fiyatYaz(toplam, baslangicFiyat)}</b> · ödeme salonda
            </Satir>
          </div>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Ad Soyad</span>
              <input
                value={form.ad}
                onChange={(e) => setForm({ ...form, ad: e.target.value })}
                autoComplete="name"
                maxLength={60}
                className="w-full rounded-xl border border-cizgi bg-white px-3 py-3 outline-none focus:border-ana"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Cep telefonu</span>
              <input
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="05xx xxx xx xx"
                className="w-full rounded-xl border border-cizgi bg-white px-3 py-3 outline-none focus:border-ana"
              />
              {form.telefon && !telefon && <span className="mt-1 block text-xs text-tugla">Geçerli bir cep telefonu numarası yaz.</span>}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Not <span className="font-normal text-taupe">(isteğe bağlı)</span>
              </span>
              <textarea
                value={form.not}
                onChange={(e) => setForm({ ...form, not: e.target.value })}
                maxLength={150}
                rows={2}
                className="w-full rounded-xl border border-cizgi bg-white px-3 py-2 outline-none focus:border-ana"
              />
            </label>
            <p className="text-xs text-taupe">
              Adın ve telefonun yalnızca randevunu yönetmek ve gerekirse sana ulaşmak için {d.ayar.ad} tarafından kullanılır.
            </p>
          </div>
          <KacanPuan ayar={d.ayar} />
        </>
      )}

      {hata && <p className="rounded-xl bg-tugla/10 px-4 py-3 text-sm text-tugla">{hata}</p>}

      <UygulamaKarti ayar={d.ayar} odulAdi={odul} uzmanlar={d.uzmanlar} />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-cizgi bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {adim > 1 ? (
            <button onClick={() => setAdim((adim - 1) as 1 | 2)} className="rounded-full border border-cizgi px-4 py-3 text-sm font-semibold text-taupe">
              Geri
            </button>
          ) : (
            <div className="min-w-0 flex-1 text-sm">
              {secili.length ? (
                <>
                  <p className="font-semibold">{fiyatYaz(toplam, baslangicFiyat)}</p>
                  <p className="text-xs text-taupe">
                    {secili.length} hizmet · {sure} dk
                  </p>
                </>
              ) : (
                <p className="text-taupe">Hizmet seç</p>
              )}
            </div>
          )}
          <button
            disabled={!devamEdebilir || gonderiliyor}
            onClick={() => {
              setHata(null);
              if (adim === 3) onayla();
              else {
                setAdim((adim + 1) as 2 | 3);
                window.scrollTo({ top: 0 });
              }
            }}
            className="flex-1 rounded-full bg-ana px-5 py-3 text-sm font-semibold text-white transition hover:bg-ana-koyu disabled:opacity-40">
            {adim === 3 ? (gonderiliyor ? "Onaylanıyor…" : "Randevuyu Onayla") : "Devam Et"}
          </button>
        </div>
      </div>
    </Cerceve>
  );
}

// --- Parçalar ---

function Cerceve({ ad, altBosluk, children }: { ad?: string; altBosluk?: boolean; children: ReactNode }) {
  return (
    <main className={`mx-auto min-h-screen max-w-md space-y-5 px-4 pt-6 ${altBosluk ? "pb-28" : "pb-10"}`}>
      <header className="text-center">
        {ad ? (
          <p className="font-serif text-2xl font-semibold tracking-[0.12em]">{ad}</p>
        ) : (
          <p className="font-serif text-2xl font-semibold tracking-[0.2em]">&nbsp;</p>
        )}
        <p className="mt-1 text-xs tracking-[0.3em] text-taupe uppercase">Hızlı Randevu</p>
      </header>
      {children}
    </main>
  );
}

function Adimlar({ adim, git }: { adim: number; git: (a: 1 | 2 | 3) => void }) {
  const adlar = ["Hizmet", "Tarih & Saat", "Bilgiler"];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {adlar.map((a, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        return (
          <li key={a} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => git(n)}
              disabled={n >= adim}
              className={`grid size-6 shrink-0 place-items-center rounded-full font-semibold ${n <= adim ? "bg-ana text-white" : "bg-krem-koyu text-taupe"}`}>
              {n < adim ? <Tik /> : n}
            </button>
            <span className={n === adim ? "font-semibold" : "text-taupe"}>{a}</span>
            {i < adlar.length - 1 && <span className="h-px flex-1 bg-cizgi" />}
          </li>
        );
      })}
    </ol>
  );
}

function Satir({ etiket, children }: { etiket: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2">
      <span className="text-taupe">{etiket}</span>
      <span>{children}</span>
    </div>
  );
}

function Tik() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function AraButonu({ telefon }: { telefon: string }) {
  return (
    <a href={`tel:${telefon.replace(/\s/g, "")}`} className="inline-block rounded-full border border-ana px-5 py-2.5 text-sm font-semibold text-ana">
      Salonu Ara · {telefon}
    </a>
  );
}

function odulMetni(ayar: WebAyar, odulAdi: string | null) {
  return `Her randevuda ${ayar.puan_basina} puan, ${ayar.odul_puani} puanda ${odulAdi ?? "bir bakım"} ücretsiz`;
}

/** 1. adımın üstünde: uygulamadaki sadakat programı */
function PuanSeridi({ ayar, odulAdi }: { ayar: WebAyar; odulAdi: string | null }) {
  const kacRandevu = ayar.puan_basina > 0 ? Math.ceil(ayar.odul_puani / ayar.puan_basina) : null;
  return (
    <a href="#uygulama" className="flex items-center gap-3 rounded-2xl bg-koyu px-4 py-3 text-white">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ana font-serif text-lg">★</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold">{kacRandevu ? `${kacRandevu}. randevun bizden!` : "Uygulamaya özel ödüller"}</span>
        <span className="block text-xs text-white/75">{odulMetni(ayar, odulAdi)}. Uygulamada.</span>
      </span>
      <span className="text-xs font-semibold text-ana">Nasıl?</span>
    </a>
  );
}

/** 2. adım: uzman seçimi yalnızca uygulamada */
function UzmanDavet({ uzmanlar }: { uzmanlar: WebUzman[] }) {
  return (
    <a href="#uygulama" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
      <span className="flex shrink-0 -space-x-2">
        {uzmanlar.slice(0, 4).map((u) =>
          u.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u.id} src={u.foto_url} alt={u.ad} className="size-9 rounded-full border-2 border-white object-cover" />
          ) : (
            <span key={u.id} className="grid size-9 place-items-center rounded-full border-2 border-white bg-krem-koyu text-xs font-semibold text-taupe">
              {u.ad.slice(0, 1)}
            </span>
          ),
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold">Uzmanını sen seç</span>
        <span className="block text-xs text-taupe">Web&apos;de uygun uzman atanır. İstediğin uzmana randevu almak için uygulamayı kullan.</span>
      </span>
    </a>
  );
}

/** 3. adım: bu randevudan kazanılamayan puan */
function KacanPuan({ ayar }: { ayar: WebAyar }) {
  if (!ayar.puan_basina) return null;
  return (
    <div className="rounded-2xl border border-dashed border-ana bg-ana/10 px-4 py-3 text-sm">
      <p className="font-semibold text-ana-koyu">Bu randevudan +{ayar.puan_basina} puan kazanabilirsin</p>
      <p className="mt-0.5 text-xs text-taupe">Onaydan sonra sana bir kod vereceğiz. Uygulamayı indirip kodu girersen puanın hesabına yazılır.</p>
    </div>
  );
}

function Basarili({
  sonuc,
  hizmetler,
  toplam,
  baslangicFiyat,
  ayar,
}: {
  sonuc: Sonuc;
  hizmetler: WebHizmet[];
  toplam: number;
  baslangicFiyat: boolean;
  ayar: WebAyar;
}) {
  const saat = saatYaz(sonuc.baslangic);
  const harita = ayar.enlem && ayar.boylam ? `https://www.google.com/maps/dir/?api=1&destination=${ayar.enlem},${ayar.boylam}` : null;
  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 text-center shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-yesil text-white">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div>
        <h1 className="font-serif text-2xl">Randevun alındı!</h1>
        <p className="mt-1 text-sm text-taupe">Seni bekliyoruz.</p>
      </div>
      <div className="space-y-2 rounded-xl bg-krem p-4 text-left text-sm">
        <Satir etiket="Tarih">
          {uzunTarih(sonuc.baslangic)}, {saat}
        </Satir>
        <Satir etiket="Hizmet">{hizmetler.map((h) => h.ad).join(", ")}</Satir>
        {sonuc.uzman && <Satir etiket="Uzman">{sonuc.uzman}</Satir>}
        <Satir etiket="Toplam">{fiyatYaz(toplam, baslangicFiyat)} · ödeme salonda</Satir>
        {ayar.adres && <Satir etiket="Adres">{ayar.adres}</Satir>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {harita && (
          <a href={harita} target="_blank" rel="noreferrer" className="rounded-full border border-ana px-5 py-2.5 text-sm font-semibold text-ana">
            Yol Tarifi
          </a>
        )}
        {ayar.telefon && <AraButonu telefon={ayar.telefon} />}
      </div>
      <p className="text-xs text-taupe">İptal ya da değişiklik için salonu arayabilirsin.</p>
    </div>
  );
}

/** Uygulamaya davet: avantajlar, (varsa) aktarma kodu ve mağaza bağlantıları */
function UygulamaKarti({
  ayar,
  odulAdi,
  uzmanlar,
  kod,
  telefon,
}: {
  ayar: WebAyar;
  odulAdi: string | null;
  uzmanlar: WebUzman[];
  kod?: string;
  telefon?: string;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const avantajlar = [
    ayar.puan_basina > 0 && odulMetni(ayar, odulAdi),
    uzmanlar.length > 1 && "İstediğin uzmana randevu al",
    "Randevundan önce hatırlatma bildirimi",
    "Randevunu kendin iptal et ya da saatini değiştir",
    "Sana özel kampanyalardan ilk sen haberdar ol",
  ].filter(Boolean) as string[];

  return (
    <section id="uygulama" className="scroll-mt-4 space-y-4 rounded-2xl bg-koyu p-5 text-white">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] text-ana">{ayar.ad} uygulaması</p>
        <h2 className="mt-1 font-serif text-2xl">{kod ? "Puanını kaybetme!" : "Uygulamada daha fazlası"}</h2>
      </div>

      {kod && (
        <div className="space-y-3 rounded-xl bg-white/10 p-4">
          <p className="text-sm text-white/85">
            Bu randevudan <b className="text-white">+{ayar.puan_basina} puan</b> kazanmak ve hatırlatma almak için:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-white/85">
            <li>Uygulamayı indir</li>
            <li>
              <b className="text-white">{telefon}</b> numarasıyla kayıt ol
            </li>
            <li>Randevularım &gt; “Web randevusu ekle”ye dokunup bu kodu gir</li>
          </ol>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(kod);
                setKopyalandi(true);
              } catch {
                // Kopyalanamazsa kod ekranda zaten görünüyor
              }
            }}
            className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-koyu">
            <span className="font-mono text-2xl font-bold tracking-[0.3em]">{kod}</span>
            <span className="text-xs font-semibold text-ana">{kopyalandi ? "Kopyalandı" : "Kopyala"}</span>
          </button>
          <p className="text-xs text-white/60">Kodu kaybetmemek için ekran görüntüsü alabilirsin.</p>
        </div>
      )}

      <ul className="space-y-2 text-sm">
        {avantajlar.map((a) => (
          <li key={a} className="flex items-start gap-2">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ana text-white">
              <Tik />
            </span>
            {a}
          </li>
        ))}
      </ul>

      {ayar.magaza_ios || ayar.magaza_android ? (
        <div className="grid grid-cols-2 gap-2">
          {ayar.magaza_ios && (
            <a href={ayar.magaza_ios} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2.5 text-center text-koyu">
              <span className="block text-[10px] text-taupe">İndir</span>
              <span className="block text-sm font-semibold">App Store</span>
            </a>
          )}
          {ayar.magaza_android && (
            <a href={ayar.magaza_android} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2.5 text-center text-koyu">
              <span className="block text-[10px] text-taupe">İndir</span>
              <span className="block text-sm font-semibold">Google Play</span>
            </a>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-white/85">Çok yakında App Store ve Google Play&apos;de</p>
      )}
    </section>
  );
}
