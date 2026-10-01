"use client";

import { useState } from "react";

import { DURUM_RENGI, RandevuDetay } from "@/components/RandevuDetay";
import { Buton, Girdi, HataKutusu, Kart, Onay, Rozet, SayfaBasligi, Yukleniyor } from "@/components/ui";
import { YeniRandevu } from "@/components/YeniRandevu";
import { useSimdi, useSorgu } from "@/lib/sorgu";
import { dakikadanSaat, dakikaya, fiyatYaz, gunDakikasi, gunEkle, isoGun, saatYaz, tarihAnahtari, uzunTarih } from "@/lib/tarih";
import { DURUM_ADI, musteriAdi, type PanelRandevu } from "@/lib/tipler";
import { calismaSaatleri, gununRandevulari, hizmetler, musteriler, salonAyarlari, uzmanHizmetleri, uzmanlar } from "@/lib/veri";

const DK_PIKSEL = 1.6; // takvimde 1 dakikanın yüksekliği
const VARSAYILAN = { acilis: 9 * 60, kapanis: 20 * 60 };

// Günlük randevu takvimi: her uzman bir sütun
export default function Randevular() {
  const simdi = useSimdi();
  const [tarih, setTarih] = useState(() => tarihAnahtari());
  const [iptalleriGoster, setIptalleriGoster] = useState(false);
  const [secili, setSecili] = useState<PanelRandevu | null>(null);
  const [yeni, setYeni] = useState(false);

  const katalog = useSorgu(async () => {
    const [u, h, i, s, a, m] = await Promise.all([uzmanlar(), hizmetler(), uzmanHizmetleri(), calismaSaatleri(), salonAyarlari(), musteriler()]);
    return { uzmanlar: u.filter((x) => x.aktif), hizmetler: h, iliskiler: i, saatler: s, ayarlar: a, musteriler: m };
  });
  const gun = useSorgu(() => gununRandevulari(tarih), [tarih]);

  if (katalog.hata) return <HataKutusu mesaj={katalog.hata} tekrar={katalog.yenile} />;
  if (!katalog.veri) return <Yukleniyor />;
  const k = katalog.veri;

  // Takvim aralığı: o günün çalışma saatleri (kapalıysa varsayılan), randevular taşarsa genişler
  const gs = k.saatler.find((s) => s.gun === isoGun(tarih));
  const kapali = !gs || gs.kapali;
  const randevular = (gun.veri ?? []).filter((r) => iptalleriGoster || r.durum !== "iptal");
  let bas = !kapali && gs?.acilis ? dakikaya(gs.acilis) : VARSAYILAN.acilis;
  let son = !kapali && gs?.kapanis ? dakikaya(gs.kapanis) : VARSAYILAN.kapanis;
  for (const r of randevular) {
    bas = Math.min(bas, Math.floor(gunDakikasi(r.baslangic) / 60) * 60);
    son = Math.max(son, Math.ceil(gunDakikasi(r.bitis) / 60) * 60);
  }
  const saatler = Array.from({ length: (son - bas) / 60 + 1 }, (_, i) => bas + i * 60);
  const bugun = tarih === tarihAnahtari(new Date(simdi));
  const simdiDk = gunDakikasi(new Date(simdi).toISOString());

  const aktifler = (gun.veri ?? []).filter((r) => r.durum !== "iptal");
  const tamamlanan = aktifler.filter((r) => r.durum === "tamamlandi");

  return (
    <>
      <SayfaBasligi
        baslik="Randevular"
        aciklama={`${uzunTarih(tarih)}${kapali ? " · Salon kapalı" : ""}`}
        sag={
          <>
            <Buton tur="cizgili" onClick={() => setTarih(gunEkle(tarih, -1))} aria-label="Önceki gün">
              ‹
            </Buton>
            <Buton tur="cizgili" onClick={() => setTarih(tarihAnahtari())}>
              Bugün
            </Buton>
            <Buton tur="cizgili" onClick={() => setTarih(gunEkle(tarih, 1))} aria-label="Sonraki gün">
              ›
            </Buton>
            <Girdi type="date" value={tarih} onChange={(e) => e.target.value && setTarih(e.target.value)} />
            <Buton onClick={() => setYeni(true)}>+ Yeni Randevu</Buton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Istatistik ad="Randevu" deger={aktifler.length} />
        <Istatistik ad="Tamamlanan" deger={tamamlanan.length} />
        <Istatistik ad="Beklenen ciro" deger={fiyatYaz(aktifler.filter((r) => r.durum !== "gelmedi").reduce((t, r) => t + Number(r.toplam_fiyat), 0))} />
        <Istatistik ad="İptal / Gelmedi" deger={`${(gun.veri ?? []).filter((r) => r.durum === "iptal").length} / ${aktifler.filter((r) => r.durum === "gelmedi").length}`} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <Onay secili={iptalleriGoster} onDegis={setIptalleriGoster}>
          İptal edilenleri de göster
        </Onay>
        {gun.yukleniyor && <span className="text-xs text-taupe">Güncelleniyor…</span>}
      </div>
      {gun.hata && <HataKutusu mesaj={gun.hata} tekrar={gun.yenile} />}

      <Kart className="overflow-x-auto p-0">
        <div className="flex min-w-fit">
          {/* Saat sütunu */}
          <div className="w-16 shrink-0 border-r border-cizgi">
            <div className="h-12 border-b border-cizgi" />
            <div className="relative" style={{ height: (son - bas) * DK_PIKSEL }}>
              {saatler.map((dk) => (
                <span key={dk} className="absolute right-2 -translate-y-1/2 text-xs text-taupe" style={{ top: (dk - bas) * DK_PIKSEL }}>
                  {dakikadanSaat(dk)}
                </span>
              ))}
            </div>
          </div>

          {k.uzmanlar.map((u) => (
            <div key={u.id} className="w-56 shrink-0 border-r border-cizgi last:border-r-0">
              <div className="flex h-12 items-center justify-center border-b border-cizgi text-sm font-semibold">{u.ad}</div>
              <div className="relative" style={{ height: (son - bas) * DK_PIKSEL }}>
                {saatler.map((dk) => (
                  <div key={dk} className="absolute inset-x-0 border-t border-krem-koyu" style={{ top: (dk - bas) * DK_PIKSEL }} />
                ))}
                {bugun && simdiDk >= bas && simdiDk <= son && (
                  <div className="absolute inset-x-0 z-10 border-t-2 border-mercan" style={{ top: (simdiDk - bas) * DK_PIKSEL }} />
                )}
                {randevular
                  .filter((r) => r.uzman_id === u.id)
                  .map((r) => {
                    const ust = (gunDakikasi(r.baslangic) - bas) * DK_PIKSEL;
                    const yukseklik = Math.max(r.toplam_sure_dk * DK_PIKSEL, 28);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSecili(r)}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition hover:brightness-95 ${
                          r.durum === "tamamlandi"
                            ? "border-yesil bg-yesil/10"
                            : r.durum === "gelmedi"
                              ? "border-tugla bg-tugla/10"
                              : r.durum === "iptal"
                                ? "border-soluk bg-krem-koyu line-through opacity-70"
                                : "border-ana bg-ana/15"
                        }`}
                        style={{ top: ust, height: yukseklik }}>
                        <p className="font-semibold">
                          {saatYaz(r.baslangic)} · {musteriAdi(r)}
                        </p>
                        <p className="truncate text-taupe">{r.hizmetler.map((h) => h.ad).join(", ")}</p>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </Kart>

      {/* Liste görünümü (yazdırma ve hızlı bakış için) */}
      <h2 className="mb-3 mt-8 font-serif text-xl">Günün listesi</h2>
      {randevular.length === 0 ? (
        <p className="text-sm text-taupe">Bu gün için randevu yok.</p>
      ) : (
        <Kart className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-taupe">
              <tr className="border-b border-cizgi">
                <th className="px-4 py-3">Saat</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Hizmet</th>
                <th className="px-4 py-3">Uzman</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {randevular.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-krem-koyu last:border-0 hover:bg-krem" onClick={() => setSecili(r)}>
                  <td className="px-4 py-3 font-medium">
                    {saatYaz(r.baslangic)}–{saatYaz(r.bitis)}
                  </td>
                  <td className="px-4 py-3">
                    {musteriAdi(r)}
                    <span className="block text-xs text-taupe">{r.musteri?.telefon || r.musteri_telefon}</span>
                  </td>
                  <td className="px-4 py-3">{r.hizmetler.map((h) => h.ad).join(", ")}</td>
                  <td className="px-4 py-3">{k.uzmanlar.find((u) => u.id === r.uzman_id)?.ad ?? r.uzman_ad}</td>
                  <td className="px-4 py-3">{fiyatYaz(r.toplam_fiyat)}</td>
                  <td className="px-4 py-3">
                    <Rozet renk={DURUM_RENGI[r.durum]}>{DURUM_ADI[r.durum]}</Rozet>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Kart>
      )}

      {secili && (
        <RandevuDetay
          r={secili}
          uzmanlar={k.uzmanlar}
          puanBasina={k.ayarlar.puan_basina}
          kapat={() => setSecili(null)}
          degisti={gun.yenile}
        />
      )}
      {yeni && (
        <YeniRandevu
          tarih={tarih}
          uzmanlar={k.uzmanlar}
          hizmetler={k.hizmetler.filter((h) => h.aktif)}
          iliskiler={k.iliskiler}
          musteriler={k.musteriler}
          kapat={() => setYeni(false)}
          eklendi={gun.yenile}
        />
      )}
    </>
  );
}

function Istatistik({ ad, deger }: { ad: string; deger: string | number }) {
  return (
    <Kart>
      <p className="text-xs uppercase tracking-wide text-taupe">{ad}</p>
      <p className="mt-1 font-serif text-2xl">{deger}</p>
    </Kart>
  );
}
