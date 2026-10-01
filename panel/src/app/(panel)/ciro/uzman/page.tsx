"use client";

// Ciro Raporu > Uzmana göre > bir uzmanın seçili dönemde yaptığı işler ve tahsil edilen tutar

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { DonemSecici, donemBasligi, Kutu, RENK, useDonem } from "@/components/Ciro";
import { DURUM_RENGI } from "@/components/RandevuDetay";
import { Bos, HataKutusu, Kart, Rozet, SayfaBasligi, Yukleniyor } from "@/components/ui";
import { hizmetDokumu, ozetle, tahsilat } from "@/lib/ciro";
import { useSimdi, useSorgu } from "@/lib/sorgu";
import { fiyatYaz, saatYaz, tarihAnahtari, uzunTarih } from "@/lib/tarih";
import { DURUM_ADI, musteriAdi } from "@/lib/tipler";
import { araliktakiRandevular } from "@/lib/veri";

export default function UzmanCirosu() {
  // Uzman ve dönem adres çubuğundan okunur (useSearchParams) -> Suspense gerekli
  return (
    <Suspense fallback={<Yukleniyor />}>
      <Rapor />
    </Suspense>
  );
}

function Rapor() {
  const simdi = useSimdi();
  const bugun = tarihAnahtari(new Date(simdi));
  const ad = useSearchParams().get("ad") ?? "";
  const donem = useDonem(bugun);
  const { bas, bit } = donem;

  const veri = useSorgu(() => araliktakiRandevular(bas, bit), [bas, bit]);

  const hesap = useMemo(() => {
    if (!veri.veri) return null;
    const randevular = veri.veri.filter((r) => r.uzman_ad === ad);
    return {
      randevular,
      ozet: ozetle(randevular, simdi),
      salon: ozetle(veri.veri, simdi),
      hizmetler: hizmetDokumu(randevular),
    };
  }, [veri.veri, ad, simdi]);

  const geri = `/ciro${donem.donemSorgusu ? `?${donem.donemSorgusu}` : ""}`;

  return (
    <>
      <Link href={geri} className="mb-2 inline-block text-sm font-semibold text-ana-koyu hover:underline">
        ‹ Ciro Raporu
      </Link>
      <SayfaBasligi baslik={ad || "Uzman"} aciklama={`Yaptığı işler · ${donemBasligi(donem)}`} sag={<DonemSecici donem={donem} bugun={bugun} />} />

      {veri.hata && <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />}
      {!hesap ? (
        <Yukleniyor />
      ) : hesap.randevular.length === 0 ? (
        <Bos>Bu dönemde {ad} için randevu yok.</Bos>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kutu
              ad="Tahsil edilen"
              deger={fiyatYaz(hesap.ozet.gerceklesen)}
              alt={
                `${hesap.ozet.tamamlanan} tamamlanan randevu` +
                (Math.round(hesap.ozet.tahsilFarki) !== 0
                  ? ` · liste fiyatına göre ${hesap.ozet.tahsilFarki > 0 ? "+" : "−"}${fiyatYaz(Math.abs(hesap.ozet.tahsilFarki))}`
                  : "")
              }
              renk={RENK.gerceklesen}
            />
            <Kutu
              ad="Bekleyen"
              deger={fiyatYaz(hesap.ozet.bekleyen)}
              alt={`${hesap.ozet.randevu - hesap.ozet.tamamlanan - hesap.ozet.gelmedi} onaylı randevu`}
              renk={RENK.bekleyen}
            />
            <Kutu
              ad="Beklenen ciro"
              deger={fiyatYaz(hesap.ozet.beklenen)}
              alt={hesap.salon.beklenen > 0 ? `Salondaki payı: %${Math.round((hesap.ozet.beklenen / hesap.salon.beklenen) * 100)}` : undefined}
            />
            <Kutu ad="İptal / gelmedi" deger={`${hesap.ozet.iptal} / ${hesap.ozet.gelmedi}`} alt={`${fiyatYaz(hesap.ozet.kayip)} kayıp`} />
          </div>

          <Kart>
            <h2 className="mb-1 font-serif text-xl">Yaptığı işler</h2>
            <p className="mb-4 text-xs text-taupe">Hizmet bazında; iptal edilen ve gelinmeyen randevular hariç</p>
            {hesap.hizmetler.length === 0 ? (
              <p className="text-sm text-taupe">Tamamlanan ya da bekleyen iş yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-taupe">
                      <th className="py-2 pr-4 font-semibold">Hizmet</th>
                      <th className="px-3 py-2 text-right font-semibold">Yapılan</th>
                      <th className="px-3 py-2 text-right font-semibold">Tahsil edilen</th>
                      <th className="py-2 pl-3 text-right font-semibold">Bekleyen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hesap.hizmetler.map((h) => (
                      <tr key={h.ad} className="border-b border-cizgi/60">
                        <td className="py-2.5 pr-4">{h.ad}</td>
                        <td className="px-3 py-2.5 text-right">{h.yapilan}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{fiyatYaz(h.tahsil)}</td>
                        <td className="py-2.5 pl-3 text-right text-taupe">{h.bekleyenAdet > 0 ? `${h.bekleyenAdet} · ${fiyatYaz(h.bekleyen)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="py-3 pr-4">Toplam</td>
                      <td className="px-3 py-3 text-right">{hesap.hizmetler.reduce((t, h) => t + h.yapilan, 0)}</td>
                      <td className="px-3 py-3 text-right">{fiyatYaz(hesap.ozet.gerceklesen)}</td>
                      <td className="py-3 pl-3 text-right">{fiyatYaz(hesap.ozet.bekleyen)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Kart>

          <Kart>
            <h2 className="mb-4 font-serif text-xl">Randevular</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-taupe">
                    <th className="py-2 pr-4 font-semibold">Tarih</th>
                    <th className="py-2 pr-4 font-semibold">Müşteri</th>
                    <th className="py-2 pr-4 font-semibold">Hizmetler</th>
                    <th className="py-2 pr-4 text-right font-semibold">Liste fiyatı</th>
                    <th className="py-2 pr-4 text-right font-semibold">Tahsil edilen</th>
                    <th className="py-2 text-right font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {hesap.randevular.map((r) => (
                    <tr key={r.id} className={`border-b border-cizgi/60 ${r.durum === "iptal" ? "text-taupe" : ""}`}>
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        {uzunTarih(r.baslangic)}
                        <span className="block text-xs text-taupe">
                          {saatYaz(r.baslangic)}–{saatYaz(r.bitis)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{musteriAdi(r)}</td>
                      <td className="py-2.5 pr-4">{r.hizmetler.map((h) => h.ad).join(", ")}</td>
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">{fiyatYaz(r.toplam_fiyat)}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold whitespace-nowrap">
                        {r.durum === "tamamlandi" ? (
                          <>
                            {fiyatYaz(tahsilat(r))}
                            {r.tahsil_edilen == null && <span className="block text-xs font-normal text-taupe">girilmedi, liste fiyatı</span>}
                          </>
                        ) : (
                          <span className="font-normal text-taupe">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <Rozet renk={DURUM_RENGI[r.durum]}>{DURUM_ADI[r.durum]}</Rozet>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>

          <p className="text-xs text-taupe">
            Tahsil edilen, randevu tamamlanırken girilen tutardır (girilmemişse liste fiyatı sayılır). Çok hizmetli randevularda tahsilat hizmetlere liste fiyatı
            oranında dağıtılır. Uzmanı sonradan silinmiş randevular eski uzman adıyla görünmeye devam eder.
          </p>
        </div>
      )}
    </>
  );
}
