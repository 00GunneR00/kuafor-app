"use client";

import { useMemo, useState } from "react";

import { DURUM_RENGI } from "@/components/RandevuDetay";
import { Buton, Girdi, HataKutusu, Kart, Pencere, Rozet, SayfaBasligi, Yukleniyor } from "@/components/ui";
import { useSimdi, useSorgu } from "@/lib/sorgu";
import { hataMetni, supabase } from "@/lib/supabase";
import { fiyatYaz, kacGunOnce, kisaTarih, saatYaz } from "@/lib/tarih";
import { DURUM_ADI, type MusteriOzeti } from "@/lib/tipler";
import { musteriler, musterininRandevulari, salonAyarlari } from "@/lib/veri";

type Filtre = "tumu" | "sik" | "uzun" | "hic" | "kampanya";

const SIK_GELEN_ESIGI = 5; // en az bu kadar tamamlanan randevu

export default function Musteriler() {
  const simdi = useSimdi();
  const [filtre, setFiltre] = useState<Filtre>("tumu");
  const [gunEsigi, setGunEsigi] = useState(45);
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<MusteriOzeti | null>(null);

  const veri = useSorgu(async () => {
    const [m, a] = await Promise.all([musteriler(), salonAyarlari()]);
    return { musteriler: m, ayarlar: a };
  });

  const liste = useMemo(() => {
    if (!veri.veri) return [];
    const q = arama.trim().toLocaleLowerCase("tr");
    return veri.veri.musteriler
      .filter((m) => !q || [m.ad_soyad, m.telefon ?? "", m.eposta ?? ""].some((x) => x.toLocaleLowerCase("tr").includes(q)))
      .filter((m) => {
        if (filtre === "sik") return m.tamamlanan >= SIK_GELEN_ESIGI;
        // Son ziyaretinden bu yana eşikten fazla gün geçmiş ve ileri tarihli randevusu olmayanlar
        if (filtre === "uzun") return !!m.son_ziyaret && kacGunOnce(m.son_ziyaret, simdi) > gunEsigi && !m.siradaki_randevu;
        if (filtre === "hic") return m.tamamlanan === 0;
        if (filtre === "kampanya") return m.kampanya_izni;
        return true;
      })
      .sort((a, b) => (filtre === "sik" ? b.tamamlanan - a.tamamlanan : filtre === "uzun" ? (a.son_ziyaret ?? "").localeCompare(b.son_ziyaret ?? "") : 0));
  }, [veri.veri, arama, filtre, gunEsigi, simdi]);

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;

  const FILTRELER: { k: Filtre; ad: string }[] = [
    { k: "tumu", ad: "Tümü" },
    { k: "sik", ad: `Sık gelenler (${SIK_GELEN_ESIGI}+ ziyaret)` },
    { k: "uzun", ad: "Uzun süredir gelmeyenler" },
    { k: "hic", ad: "Hiç gelmemiş" },
    { k: "kampanya", ad: "Kampanya izni verenler" },
  ];

  return (
    <>
      <SayfaBasligi baslik="Müşteriler" aciklama={`Uygulamaya kayıtlı ${veri.veri.musteriler.length} müşteri`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTRELER.map((f) => (
          <Buton key={f.k} tur={filtre === f.k ? "dolu" : "cizgili"} onClick={() => setFiltre(f.k)}>
            {f.ad}
          </Buton>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Girdi className="w-72" placeholder="Ad, telefon ya da e-posta ara" value={arama} onChange={(e) => setArama(e.target.value)} />
        {filtre === "uzun" && (
          <label className="flex items-center gap-2 text-sm">
            Son ziyaretinin üzerinden
            <Girdi type="number" min={7} className="w-20" value={gunEsigi} onChange={(e) => setGunEsigi(Number(e.target.value) || 45)} />
            günden fazla geçmiş, yeni randevusu olmayanlar
          </label>
        )}
      </div>

      <Kart className="p-0">
        {liste.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-taupe">Bu filtreye uyan müşteri yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-taupe">
              <tr className="border-b border-cizgi">
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Ziyaret</th>
                <th className="px-4 py-3">Son ziyaret</th>
                <th className="px-4 py-3">Sıradaki randevu</th>
                <th className="px-4 py-3">Puan</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((m) => (
                <tr key={m.id} className="cursor-pointer border-b border-krem-koyu last:border-0 hover:bg-krem" onClick={() => setSecili(m)}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{m.ad_soyad || "İsimsiz"}</span>
                    <span className="block text-xs text-taupe">{m.eposta}</span>
                  </td>
                  <td className="px-4 py-3">{m.telefon ?? "—"}</td>
                  <td className="px-4 py-3">
                    {m.tamamlanan}
                    {m.gelmedi > 0 && <span className="ml-2 text-xs text-tugla">{m.gelmedi} gelmedi</span>}
                  </td>
                  <td className="px-4 py-3">{m.son_ziyaret ? `${kisaTarih(m.son_ziyaret)} (${kacGunOnce(m.son_ziyaret, simdi)} gün önce)` : "—"}</td>
                  <td className="px-4 py-3">{m.siradaki_randevu ? `${kisaTarih(m.siradaki_randevu)} ${saatYaz(m.siradaki_randevu)}` : "—"}</td>
                  <td className="px-4 py-3">
                    {m.puan}
                    {m.puan >= veri.veri!.ayarlar.odul_puani && (
                      <span className="ml-2">
                        <Rozet renk="yesil">Ödül hakkı</Rozet>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Kart>
      <p className="mt-3 text-xs text-taupe">
        Kampanya bildirimi yalnızca “Kampanya izni verenler”e gönderilebilir. Bildirim gönderme, push bildirim altyapısı kurulunca eklenecek.
      </p>

      {secili && (
        <MusteriDetay
          m={secili}
          odulPuani={veri.veri.ayarlar.odul_puani}
          kapat={() => setSecili(null)}
          degisti={async () => {
            await veri.yenile();
            setSecili(null);
          }}
        />
      )}
    </>
  );
}

function MusteriDetay({ m, odulPuani, kapat, degisti }: { m: MusteriOzeti; odulPuani: number; kapat: () => void; degisti: () => void }) {
  const gecmis = useSorgu(() => musterininRandevulari(m.id), [m.id]);
  const [onay, setOnay] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function odulKullandir() {
    setYukleniyor(true);
    setHata(null);
    const { error } = await supabase.rpc("odul_kullandir", { p_musteri_id: m.id });
    setYukleniyor(false);
    if (error) return setHata(hataMetni(error));
    degisti();
  }

  return (
    <Pencere baslik={m.ad_soyad || "Müşteri"} kapat={kapat} genis>
      <div className="grid gap-4 text-sm md:grid-cols-3">
        <Kart className="bg-krem shadow-none">
          <p className="text-xs uppercase text-taupe">İletişim</p>
          <p className="mt-1">{m.telefon ?? "—"}</p>
          <p className="text-taupe">{m.eposta}</p>
          <p className="mt-2 text-xs text-taupe">Üyelik: {kisaTarih(m.olusturuldu)}</p>
          <p className="text-xs text-taupe">Kampanya izni: {m.kampanya_izni ? "Var" : "Yok"}</p>
        </Kart>
        <Kart className="bg-krem shadow-none">
          <p className="text-xs uppercase text-taupe">Ziyaretler</p>
          <p className="mt-1 font-serif text-2xl">{m.tamamlanan}</p>
          <p className="text-xs text-taupe">
            {m.gelmedi} gelmedi · {m.iptal} iptal
          </p>
        </Kart>
        <Kart className="bg-krem shadow-none">
          <p className="text-xs uppercase text-taupe">Puan</p>
          <p className="mt-1 font-serif text-2xl">
            {m.puan} <span className="text-sm text-taupe">/ {odulPuani}</span>
          </p>
          {m.puan >= odulPuani ? (
            onay ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs">Ücretsiz bakım kullandırılsın mı? {odulPuani} puan düşülecek.</p>
                <div className="flex gap-2">
                  <Buton yukleniyor={yukleniyor} onClick={odulKullandir}>
                    Evet
                  </Buton>
                  <Buton tur="metin" onClick={() => setOnay(false)}>
                    Vazgeç
                  </Buton>
                </div>
              </div>
            ) : (
              <Buton className="mt-2" onClick={() => setOnay(true)}>
                Ödül Kullandır
              </Buton>
            )
          ) : (
            <p className="text-xs text-taupe">Ödüle {odulPuani - m.puan} puan kaldı</p>
          )}
          {hata && <p className="mt-2 text-xs text-tugla">{hata}</p>}
        </Kart>
      </div>

      <h3 className="mb-2 mt-6 font-serif text-lg">Randevu geçmişi</h3>
      {gecmis.yukleniyor && !gecmis.veri ? (
        <Yukleniyor />
      ) : (gecmis.veri ?? []).length === 0 ? (
        <p className="text-sm text-taupe">Henüz randevusu yok.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {gecmis.veri!.map((r) => (
              <tr key={r.id} className="border-b border-krem-koyu last:border-0">
                <td className="py-2 pr-4">
                  {kisaTarih(r.baslangic)} {saatYaz(r.baslangic)}
                </td>
                <td className="py-2 pr-4">{r.hizmetler.map((h) => h.ad).join(", ")}</td>
                <td className="py-2 pr-4">{fiyatYaz(r.toplam_fiyat)}</td>
                <td className="py-2">
                  <Rozet renk={DURUM_RENGI[r.durum]}>{DURUM_ADI[r.durum]}</Rozet>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Pencere>
  );
}
