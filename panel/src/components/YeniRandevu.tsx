"use client";

import { useMemo, useState } from "react";

import { Alan, Buton, Girdi, MetinAlani, Onay, Pencere, Secim } from "@/components/ui";
import { hataMetni, supabase } from "@/lib/supabase";
import { anOlustur, fiyatYaz } from "@/lib/tarih";
import type { Hizmet, MusteriOzeti, Uzman, UzmanHizmet } from "@/lib/tipler";

/**
 * Salonun telefonla/yüz yüze aldığı randevuyu girer.
 * Müşteri uygulamaya kayıtlıysa seçilir (puan kazanır), değilse ad + telefon yazılır.
 * Çakışma veritabanında engellenir; çalışma saati dışına salon kendi kararıyla girebilir.
 */
export function YeniRandevu({
  tarih,
  uzmanlar,
  hizmetler,
  iliskiler,
  musteriler,
  kapat,
  eklendi,
}: {
  tarih: string;
  uzmanlar: Uzman[];
  hizmetler: Hizmet[];
  iliskiler: UzmanHizmet[];
  musteriler: MusteriOzeti[];
  kapat: () => void;
  eklendi: () => void;
}) {
  const [musteriTuru, setMusteriTuru] = useState<"kayitli" | "yeni">("kayitli");
  const [arama, setArama] = useState("");
  const [musteriId, setMusteriId] = useState<string | null>(null);
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [uzmanId, setUzmanId] = useState(uzmanlar[0]?.id ?? "");
  const [secili, setSecili] = useState<string[]>([]);
  const [gun, setGun] = useState(tarih);
  const [saat, setSaat] = useState("10:00");
  const [not, setNot] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const bulunanlar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    if (!q) return [];
    return musteriler
      .filter((m) => [m.ad_soyad, m.telefon ?? "", m.eposta ?? ""].some((x) => x.toLocaleLowerCase("tr").includes(q)))
      .slice(0, 6);
  }, [arama, musteriler]);
  const secilenMusteri = musteriler.find((m) => m.id === musteriId);

  // Seçilen uzmanın verdiği hizmetler
  const uzmaninHizmetleri = hizmetler.filter((h) => iliskiler.some((i) => i.uzman_id === uzmanId && i.hizmet_id === h.id));
  const secilenler = hizmetler.filter((h) => secili.includes(h.id));

  async function kaydet() {
    setHata(null);
    if (musteriTuru === "kayitli" && !musteriId) return setHata("Müşteri seçin ya da “Yeni müşteri”ye geçin.");
    if (musteriTuru === "yeni" && !ad.trim()) return setHata("Müşterinin adını yazın.");
    if (secili.length === 0) return setHata("En az bir hizmet seçin.");
    setGonderiliyor(true);
    const { error } = await supabase.rpc("randevu_olustur_yonetici", {
      p_baslangic: anOlustur(gun, saat),
      p_hizmet_ids: secili,
      p_uzman_id: uzmanId,
      p_musteri_id: musteriTuru === "kayitli" ? musteriId : null,
      p_musteri_ad: musteriTuru === "yeni" ? ad : null,
      p_musteri_telefon: musteriTuru === "yeni" ? telefon : null,
      p_not: not,
    });
    setGonderiliyor(false);
    if (error) return setHata(hataMetni(error));
    eklendi();
    kapat();
  }

  return (
    <Pencere baslik="Yeni Randevu" kapat={kapat} genis>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Buton tur={musteriTuru === "kayitli" ? "dolu" : "cizgili"} onClick={() => setMusteriTuru("kayitli")}>
              Kayıtlı müşteri
            </Buton>
            <Buton tur={musteriTuru === "yeni" ? "dolu" : "cizgili"} onClick={() => setMusteriTuru("yeni")}>
              Yeni müşteri
            </Buton>
          </div>

          {musteriTuru === "kayitli" ? (
            <Alan etiket="Müşteri ara" yardim="Uygulamaya kayıtlı müşteriler; bu randevu tamamlanınca puan kazanır.">
              {secilenMusteri ? (
                <div className="flex items-center justify-between rounded-xl bg-krem px-3 py-2">
                  <span>
                    <b>{secilenMusteri.ad_soyad}</b> · {secilenMusteri.telefon}
                  </span>
                  <button className="text-xs font-semibold text-ana" onClick={() => setMusteriId(null)}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <>
                  <Girdi value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ad, telefon ya da e-posta" />
                  {bulunanlar.map((m) => (
                    <button key={m.id} className="rounded-lg px-3 py-1.5 text-left hover:bg-krem" onClick={() => setMusteriId(m.id)}>
                      {m.ad_soyad} <span className="text-taupe">· {m.telefon ?? m.eposta}</span>
                    </button>
                  ))}
                  {arama && bulunanlar.length === 0 && <span className="text-xs text-taupe">Bulunamadı. “Yeni müşteri” ile ekleyebilirsiniz.</span>}
                </>
              )}
            </Alan>
          ) : (
            <>
              <Alan etiket="Ad Soyad">
                <Girdi value={ad} onChange={(e) => setAd(e.target.value)} />
              </Alan>
              <Alan etiket="Telefon" yardim="Uygulama hesabı olmayan müşteriler puan kazanmaz.">
                <Girdi value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05xx xxx xx xx" />
              </Alan>
            </>
          )}

          <Alan etiket="Uzman">
            <Secim
              value={uzmanId}
              onChange={(e) => {
                setUzmanId(e.target.value);
                setSecili([]);
              }}>
              {uzmanlar.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.ad}
                  {u.unvan ? ` · ${u.unvan}` : ""}
                </option>
              ))}
            </Secim>
          </Alan>
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Tarih">
              <Girdi type="date" value={gun} onChange={(e) => setGun(e.target.value)} />
            </Alan>
            <Alan etiket="Saat">
              <Girdi type="time" step={300} value={saat} onChange={(e) => setSaat(e.target.value)} />
            </Alan>
          </div>
          <Alan etiket="Not (isteğe bağlı)">
            <MetinAlani value={not} onChange={(e) => setNot(e.target.value)} maxLength={150} />
          </Alan>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Hizmetler</p>
          {uzmaninHizmetleri.length === 0 && <p className="text-sm text-taupe">Bu uzmana atanmış hizmet yok (Uzmanlar sayfasından atayın).</p>}
          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-cizgi p-3">
            {uzmaninHizmetleri.map((h) => (
              <Onay key={h.id} secili={secili.includes(h.id)} onDegis={(d) => setSecili(d ? [...secili, h.id] : secili.filter((x) => x !== h.id))}>
                <span className="flex-1">{h.ad}</span>
                <span className="text-taupe">
                  {h.sure_dk} dk · {fiyatYaz(h.fiyat)}
                </span>
              </Onay>
            ))}
          </div>
          <p className="text-sm">
            Toplam: <b>{secilenler.reduce((t, h) => t + h.sure_dk, 0)} dk</b> · <b>{fiyatYaz(secilenler.reduce((t, h) => t + h.fiyat, 0))}</b>
          </p>
        </div>
      </div>

      {hata && <p className="mt-4 text-sm text-tugla">{hata}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Buton tur="metin" onClick={kapat}>
          Vazgeç
        </Buton>
        <Buton yukleniyor={gonderiliyor} onClick={kaydet}>
          Randevuyu Kaydet
        </Buton>
      </div>
    </Pencere>
  );
}
