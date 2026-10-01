"use client";

import Link from "next/link";
import { Fragment, Suspense, useMemo, useState } from "react";

import { DonemSecici, donemBasligi, Kutu, RENK, useDonem } from "@/components/Ciro";
import { DURUM_RENGI } from "@/components/RandevuDetay";
import { HataKutusu, Kart, Rozet, SayfaBasligi, Yukleniyor } from "@/components/ui";
import { aralik, gunEtiketi, gunlereBol, kaydir, kirilim, ozetle, tahsilat, type GunOzeti, type Periyot } from "@/lib/ciro";
import { useSimdi, useSorgu } from "@/lib/sorgu";
import { fiyatYaz, saatYaz, tarihAnahtari, uzunTarih } from "@/lib/tarih";
import { DURUM_ADI, musteriAdi } from "@/lib/tipler";
import { araliktakiRandevular } from "@/lib/veri";

export default function CiroRaporu() {
  // Dönem adres çubuğundan okunur (useSearchParams) -> Suspense gerekli
  return (
    <Suspense fallback={<Yukleniyor />}>
      <Rapor />
    </Suspense>
  );
}

function Rapor() {
  const simdi = useSimdi();
  const bugun = tarihAnahtari(new Date(simdi));
  const donem = useDonem(bugun);
  const { periyot, secili, bas, bit } = donem;
  const [acikGun, setAcikGun] = useState<string | null>(null);

  const onceki = aralik(periyot, kaydir(periyot, secili, -1));

  const veri = useSorgu(async () => {
    const [bu, gecen] = await Promise.all([araliktakiRandevular(bas, bit), araliktakiRandevular(onceki.bas, onceki.bit)]);
    return { bu, gecen };
  }, [bas, bit]);

  const hesap = useMemo(() => {
    if (!veri.veri) return null;
    return {
      ozet: ozetle(veri.veri.bu, simdi),
      oncekiOzet: ozetle(veri.veri.gecen, simdi),
      gunler: gunlereBol(veri.veri.bu, bas, bit, simdi),
      hizmetler: kirilim(veri.veri.bu, "hizmet"),
      uzmanlar: kirilim(veri.veri.bu, "uzman"),
    };
  }, [veri.veri, bas, bit, simdi]);

  const donemAdi = periyot === "hafta" ? "hafta" : "ay";

  return (
    <>
      <SayfaBasligi
        baslik="Ciro Raporu"
        aciklama={donemBasligi(donem)}
        sag={<DonemSecici donem={donem} bugun={bugun} onDegis={() => setAcikGun(null)} />}
      />

      {veri.hata && <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />}
      {!hesap ? (
        <Yukleniyor />
      ) : (
        <div className="space-y-6">
          {/* Özet */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kart className="xl:col-span-1">
              <p className="text-xs uppercase tracking-wide text-taupe">Beklenen ciro</p>
              <p className="mt-1 font-serif text-4xl">{fiyatYaz(hesap.ozet.beklenen)}</p>
              <Degisim simdiki={hesap.ozet.beklenen} onceki={hesap.oncekiOzet.beklenen} donem={donemAdi} />
            </Kart>
            <Kutu ad="Gerçekleşen" deger={fiyatYaz(hesap.ozet.gerceklesen)} alt={
                `${hesap.ozet.tamamlanan} tamamlanan randevu` +
                (Math.round(hesap.ozet.tahsilFarki) !== 0
                  ? ` · liste fiyatına göre ${hesap.ozet.tahsilFarki > 0 ? "+" : "−"}${fiyatYaz(Math.abs(hesap.ozet.tahsilFarki))}`
                  : "")
              }
              renk={RENK.gerceklesen}
            />
            <Kutu ad="Bekleyen" deger={fiyatYaz(hesap.ozet.bekleyen)} alt={`${hesap.ozet.randevu - hesap.ozet.tamamlanan - hesap.ozet.gelmedi} onaylı randevu`} renk={RENK.bekleyen} />
            <Kutu
              ad="Kayıp (iptal + gelmedi)"
              deger={fiyatYaz(hesap.ozet.kayip)}
              alt={`${hesap.ozet.iptal} iptal · ${hesap.ozet.gelmedi} gelmedi`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Kutu ad="Randevu sayısı" deger={String(hesap.ozet.randevu)} alt="İptal edilenler hariç" />
            <Kutu
              ad="Ortalama randevu tutarı"
              deger={hesap.ozet.randevu - hesap.ozet.gelmedi > 0 ? fiyatYaz(hesap.ozet.beklenen / (hesap.ozet.randevu - hesap.ozet.gelmedi)) : "—"}
              alt="Beklenen ciro / randevu"
            />
            <Kutu
              ad="Gelmeme oranı"
              deger={hesap.ozet.randevu > 0 ? `%${Math.round((hesap.ozet.gelmedi / hesap.ozet.randevu) * 100)}` : "—"}
              alt="Gelmedi / randevu"
            />
          </div>

          {hesap.ozet.isaretlenmemis > 0 && (
            <div className="rounded-xl bg-mercan/10 px-4 py-3 text-sm">
              <b>{hesap.ozet.isaretlenmemis} randevunun</b> saati geçmiş ama hâlâ “Onaylandı” görünüyor. Randevular sayfasından “Tamamlandı” ya da “Gelmedi” olarak
              işaretleyin; gerçekleşen ciro ve müşteri puanları buna göre güncellenir.
            </div>
          )}

          {/* Günlük grafik */}
          <Kart>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl">Günlük ciro</h2>
              <div className="flex gap-4 text-sm text-taupe">
                <Lejant renk={RENK.gerceklesen} ad="Gerçekleşen" />
                <Lejant renk={RENK.bekleyen} ad="Bekleyen" />
              </div>
            </div>
            <GunlukGrafik gunler={hesap.gunler} periyot={periyot} bugun={bugun} onSec={(t) => setAcikGun(acikGun === t ? null : t)} />
          </Kart>

          {/* Günlük tablo (grafiğin tablo görünümü) */}
          <Kart className="p-0">
            <h2 className="px-5 pt-5 font-serif text-xl">Gün gün</h2>
            <p className="px-5 pb-3 text-sm text-taupe">Bir güne tıklayın, o gün yapılan işleri görün.</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-taupe">
                <tr className="border-y border-cizgi">
                  <th className="px-5 py-2">Gün</th>
                  <th className="px-3 py-2 text-right">Randevu</th>
                  <th className="px-3 py-2 text-right">Tamamlanan</th>
                  <th className="px-3 py-2 text-right">İptal / Gelmedi</th>
                  <th className="px-3 py-2 text-right">Gerçekleşen</th>
                  <th className="px-3 py-2 text-right">Bekleyen</th>
                  <th className="px-5 py-2 text-right">Beklenen</th>
                </tr>
              </thead>
              <tbody>
                {hesap.gunler
                  .filter((g) => periyot === "hafta" || g.randevular.length > 0 || g.tarih === bugun)
                  .map((g) => (
                    <Fragment key={g.tarih}>
                      <tr
                        onClick={() => setAcikGun(acikGun === g.tarih ? null : g.tarih)}
                        className={`cursor-pointer border-b border-krem-koyu hover:bg-krem ${acikGun === g.tarih ? "bg-krem" : ""} ${g.tarih === bugun ? "font-semibold" : ""}`}>
                        <td className="px-5 py-2.5">
                          {acikGun === g.tarih ? "▾" : "▸"} {uzunTarih(g.tarih)}
                          {g.tarih === bugun && <span className="ml-2 text-xs text-mercan">Bugün</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">{g.randevu}</td>
                        <td className="px-3 py-2.5 text-right">{g.tamamlanan}</td>
                        <td className="px-3 py-2.5 text-right">
                          {g.iptal} / {g.gelmedi}
                        </td>
                        <td className="px-3 py-2.5 text-right">{fiyatYaz(g.gerceklesen)}</td>
                        <td className="px-3 py-2.5 text-right">{fiyatYaz(g.bekleyen)}</td>
                        <td className="px-5 py-2.5 text-right font-semibold">{fiyatYaz(g.beklenen)}</td>
                      </tr>
                      {acikGun === g.tarih && (
                        <tr className="border-b border-krem-koyu bg-krem/60">
                          <td colSpan={7} className="px-5 py-3">
                            <GunDetayi g={g} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="px-5 py-3">Toplam</td>
                  <td className="px-3 py-3 text-right">{hesap.ozet.randevu}</td>
                  <td className="px-3 py-3 text-right">{hesap.ozet.tamamlanan}</td>
                  <td className="px-3 py-3 text-right">
                    {hesap.ozet.iptal} / {hesap.ozet.gelmedi}
                  </td>
                  <td className="px-3 py-3 text-right">{fiyatYaz(hesap.ozet.gerceklesen)}</td>
                  <td className="px-3 py-3 text-right">{fiyatYaz(hesap.ozet.bekleyen)}</td>
                  <td className="px-5 py-3 text-right">{fiyatYaz(hesap.ozet.beklenen)}</td>
                </tr>
              </tfoot>
            </table>
          </Kart>

          {/* Kırılımlar */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Kirilim baslik="Hizmete göre" satirlar={hesap.hizmetler} />
            <Kirilim
              baslik="Uzmana göre"
              satirlar={hesap.uzmanlar}
              baglanti={(ad) => `/ciro/uzman?${new URLSearchParams({ ad, ...Object.fromEntries(new URLSearchParams(donem.donemSorgusu)) })}`}
            />
          </div>

          <p className="text-xs text-taupe">
            Gerçekleşen ciro, randevu tamamlanırken girilen tahsil edilen tutardır (girilmemişse liste fiyatı sayılır). Bekleyen ve kayıp tutarlar randevu alınırken
            hesaplanan liste fiyatlarıdır. Kayıp; iptal edilen ve gelinmeyen randevuların tutarıdır ve beklenen ciroya dahil değildir.
          </p>
        </div>
      )}
    </>
  );
}

function Degisim({ simdiki, onceki, donem }: { simdiki: number; onceki: number; donem: string }) {
  if (onceki === 0) return <p className="mt-1 text-xs text-taupe">Geçen {donem} veri yok</p>;
  const oran = Math.round(((simdiki - onceki) / onceki) * 100);
  const yukari = oran >= 0;
  return (
    <p className="mt-1 text-xs text-taupe">
      <span className={yukari ? "text-yesil" : "text-tugla"}>
        {yukari ? "▲" : "▼"} %{Math.abs(oran)}
      </span>{" "}
      geçen {donem === "hafta" ? "haftaya" : "aya"} göre ({fiyatYaz(onceki)})
    </p>
  );
}

function Lejant({ renk, ad }: { renk: string; ad: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-sm" style={{ background: renk }} />
      {ad}
    </span>
  );
}

/** Y ekseni için "yuvarlak" üst sınır ve ara çizgiler */
function eksen(enBuyuk: number): number[] {
  if (enBuyuk <= 0) return [0];
  const kaba = enBuyuk / 4;
  const us = 10 ** Math.floor(Math.log10(kaba));
  const adim = [1, 2, 2.5, 5, 10].map((k) => k * us).find((a) => a >= kaba)!;
  return Array.from({ length: Math.ceil(enBuyuk / adim) + 1 }, (_, i) => i * adim);
}

const kisaTutar = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} bin` : String(n));

function GunlukGrafik({ gunler, periyot, bugun, onSec }: { gunler: GunOzeti[]; periyot: Periyot; bugun: string; onSec: (t: string) => void }) {
  const [ustunde, setUstunde] = useState<string | null>(null);
  const cizgiler = eksen(Math.max(...gunler.map((g) => g.beklenen), 0));
  const tepe = cizgiler[cizgiler.length - 1] || 1;
  const YUKSEKLIK = 240;

  if (gunler.every((g) => g.beklenen === 0)) {
    return <p className="py-12 text-center text-sm text-taupe">Bu dönemde ciro oluşturan randevu yok.</p>;
  }

  return (
    <div className="flex gap-2 pt-4">
      {/* Y ekseni */}
      <div className="relative w-14 shrink-0 text-right text-xs text-taupe" style={{ height: YUKSEKLIK }}>
        {cizgiler.map((c) => (
          <span key={c} className="absolute right-0 -translate-y-1/2" style={{ bottom: (c / tepe) * YUKSEKLIK }}>
            {kisaTutar(c)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: YUKSEKLIK }}>
          {cizgiler.map((c) => (
            <div key={c} className={`absolute inset-x-0 border-t ${c === 0 ? "border-cizgi" : "border-krem-koyu"}`} style={{ bottom: (c / tepe) * YUKSEKLIK }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {gunler.map((g, i) => {
              // İpucu kutusu kenarlarda taşmasın
              const hiza = i < 2 ? "left-0" : i >= gunler.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2";
              const hG = (g.gerceklesen / tepe) * YUKSEKLIK;
              const hB = (g.bekleyen / tepe) * YUKSEKLIK;
              return (
                <button
                  key={g.tarih}
                  onMouseEnter={() => setUstunde(g.tarih)}
                  onMouseLeave={() => setUstunde(null)}
                  onFocus={() => setUstunde(g.tarih)}
                  onBlur={() => setUstunde(null)}
                  onClick={() => onSec(g.tarih)}
                  aria-label={`${uzunTarih(g.tarih)}: gerçekleşen ${fiyatYaz(g.gerceklesen)}, bekleyen ${fiyatYaz(g.bekleyen)}`}
                  className={`group relative flex h-full flex-1 flex-col items-center justify-end rounded-md ${ustunde === g.tarih ? "bg-krem" : ""}`}>
                  {/* Tooltip */}
                  {ustunde === g.tarih && (
                    <span className={`pointer-events-none absolute top-1 z-10 w-max rounded-lg bg-koyu px-3 py-2 text-left text-xs text-white shadow-lg ${hiza}`}>
                      <b className="block">{uzunTarih(g.tarih)}</b>
                      <span className="block">Gerçekleşen: {fiyatYaz(g.gerceklesen)}</span>
                      <span className="block">Bekleyen: {fiyatYaz(g.bekleyen)}</span>
                      <span className="block font-semibold">Beklenen: {fiyatYaz(g.beklenen)}</span>
                      <span className="block text-white/70">{g.randevu} randevu</span>
                    </span>
                  )}
                  {/* Yığılmış çubuk: üstte bekleyen, altta gerçekleşen; aralarında 2px boşluk, üst uç yuvarlak */}
                  <span className="flex w-full max-w-10 flex-col gap-[2px]">
                    {hB > 0 && <span className="w-full rounded-t-[4px]" style={{ height: hB, background: RENK.bekleyen }} />}
                    {hG > 0 && <span className={`w-full ${hB > 0 ? "" : "rounded-t-[4px]"}`} style={{ height: hG, background: RENK.gerceklesen }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* X ekseni */}
        <div className="mt-2 flex gap-[2px] text-center text-xs text-taupe">
          {gunler.map((g, i) => (
            <span key={g.tarih} className={`flex-1 ${g.tarih === bugun ? "font-semibold text-mercan" : ""}`}>
              {periyot === "hafta" || i % 2 === 0 || g.tarih === bugun ? gunEtiketi(g.tarih, periyot) : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GunDetayi({ g }: { g: GunOzeti }) {
  if (g.randevular.length === 0) return <p className="text-taupe">Bu gün randevu yok.</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {g.randevular.map((r) => (
          <tr key={r.id} className={r.durum === "iptal" ? "text-taupe line-through" : ""}>
            <td className="py-1 pr-4 whitespace-nowrap">
              {saatYaz(r.baslangic)}–{saatYaz(r.bitis)}
            </td>
            <td className="py-1 pr-4">{musteriAdi(r)}</td>
            <td className="py-1 pr-4">{r.hizmetler.map((h) => h.ad).join(", ")}</td>
            <td className="py-1 pr-4">{r.uzman_ad ?? "—"}</td>
            <td className="py-1 pr-4 text-right whitespace-nowrap">
              {r.durum === "tamamlandi" && tahsilat(r) !== Number(r.toplam_fiyat) ? (
                <>
                  {fiyatYaz(tahsilat(r))} <span className="text-xs text-taupe line-through">{fiyatYaz(r.toplam_fiyat)}</span>
                </>
              ) : (
                fiyatYaz(r.toplam_fiyat)
              )}
            </td>
            <td className="py-1 text-right no-underline">
              <Rozet renk={DURUM_RENGI[r.durum]}>{DURUM_ADI[r.durum]}</Rozet>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Kirilim({
  baslik,
  satirlar,
  baglanti,
}: {
  baslik: string;
  satirlar: { ad: string; tutar: number; adet: number }[];
  baglanti?: (ad: string) => string;
}) {
  const enBuyuk = Math.max(...satirlar.map((s) => s.tutar), 1);
  return (
    <Kart>
      <h2 className="mb-1 font-serif text-xl">{baslik}</h2>
      <p className="mb-4 text-xs text-taupe">
        Beklenen ciroya katkı (iptal ve gelmeyenler hariç){baglanti ? ". Ayrıntı için isme tıklayın." : ""}
      </p>
      {satirlar.length === 0 ? (
        <p className="text-sm text-taupe">Veri yok.</p>
      ) : (
        <ul className="space-y-3">
          {satirlar.map((s) => {
            const icerik = (
              <>
                <div className="mb-1 flex justify-between gap-2">
                  <span>
                    {s.ad} <span className="text-taupe">· {s.adet}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    {fiyatYaz(s.tutar)}
                    {baglanti && <span className="text-taupe group-hover:text-ana-koyu">›</span>}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-krem-koyu">
                  <div className="h-2 rounded-full" style={{ width: `${(s.tutar / enBuyuk) * 100}%`, background: RENK.gerceklesen }} />
                </div>
              </>
            );
            return (
              <li key={s.ad} className="text-sm">
                {baglanti && s.ad !== "—" ? (
                  <Link href={baglanti(s.ad)} className="group -mx-2 block rounded-lg px-2 py-1.5 hover:bg-krem" title={`${s.ad}: yaptığı işler`}>
                    {icerik}
                  </Link>
                ) : (
                  icerik
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Kart>
  );
}
