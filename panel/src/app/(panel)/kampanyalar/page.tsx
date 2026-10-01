"use client";

import { useState } from "react";

import { KampanyaBildirimi } from "@/components/KampanyaBildirimi";
import { Alan, Bos, Buton, GorselSecici, Girdi, HataKutusu, Kart, MetinAlani, Onay, Pencere, Rozet, SayfaBasligi, Secim, Yukleniyor } from "@/components/ui";
import { useSimdi, useSorgu } from "@/lib/sorgu";
import { ac, hataMetni, supabase } from "@/lib/supabase";
import { kisaTarih, tarihAnahtari } from "@/lib/tarih";
import type { Hizmet, Kampanya } from "@/lib/tipler";
import { hizmetler } from "@/lib/veri";

type Taslak = Omit<Kampanya, "id"> & { id?: string };

// Aktif ve bitiş tarihi geçmemiş kampanyalar uygulamada Keşfet ekranında görünür.
export default function Kampanyalar() {
  const simdi = useSimdi();
  const veri = useSorgu(async () => {
    const [k, h] = await Promise.all([
      supabase.from("kampanyalar").select("id, baslik, aciklama, etiket, gorsel_url, hizmet_id, baslangic, bitis, aktif, sira").order("sira").then(ac),
      hizmetler(),
    ]);
    return { kampanyalar: k as Kampanya[], hizmetler: h };
  });
  const [duzenlenen, setDuzenlenen] = useState<Taslak | null>(null);
  const [bildirim, setBildirim] = useState<{ baslik: string; govde: string; kampanyaId?: string } | null>(null);

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;
  const bugun = tarihAnahtari(new Date(simdi));

  return (
    <>
      <SayfaBasligi
        baslik="Kampanyalar"
        aciklama="Uygulamanın Keşfet ekranında görünür. Bitiş tarihi geçen kampanya otomatik gizlenir."
        sag={
          <>
            <Buton tur="cizgili" onClick={() => setBildirim({ baslik: "", govde: "" })}>
              Bildirim Gönder
            </Buton>
            <Buton
              onClick={() =>
                setDuzenlenen({ baslik: "", aciklama: "", etiket: "", gorsel_url: null, hizmet_id: null, baslangic: null, bitis: null, aktif: true, sira: veri.veri!.kampanyalar.length + 1 })
              }>
              + Yeni Kampanya
            </Buton>
          </>
        }
      />
      {veri.veri.kampanyalar.length === 0 ? (
        <Bos>Henüz kampanya yok. İlk kampanyanızı ekleyin.</Bos>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {veri.veri.kampanyalar.map((k) => {
            const bitti = !!k.bitis && k.bitis < bugun;
            const yayinda = k.aktif && !bitti;
            return (
              <Kart key={k.id} className="overflow-hidden p-0">
                {k.gorsel_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={k.gorsel_url} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="grid h-36 place-items-center bg-krem-koyu text-sm text-taupe">Görsel yok (varsayılan görsel kullanılır)</div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap gap-2">
                    {yayinda ? <Rozet renk="yesil">Yayında</Rozet> : <Rozet renk="taupe">{bitti ? "Süresi doldu" : "Pasif"}</Rozet>}
                    {k.etiket && <Rozet>{k.etiket}</Rozet>}
                  </div>
                  <p className="font-serif text-lg">{k.baslik}</p>
                  {k.aciklama && <p className="text-sm text-taupe">{k.aciklama}</p>}
                  <p className="text-xs text-taupe">
                    {k.baslangic ? kisaTarih(`${k.baslangic}T12:00:00+03:00`) : "Hemen"} – {k.bitis ? kisaTarih(`${k.bitis}T12:00:00+03:00`) : "Süresiz"}
                  </p>
                  <div className="flex gap-2">
                    <Buton tur="metin" onClick={() => setDuzenlenen({ ...k })}>
                      Düzenle
                    </Buton>
                    {yayinda && (
                      <Buton tur="metin" onClick={() => setBildirim({ baslik: k.baslik, govde: k.aciklama ?? "", kampanyaId: k.id })}>
                        Bildirim gönder
                      </Buton>
                    )}
                  </div>
                </div>
              </Kart>
            );
          })}
        </div>
      )}
      {bildirim && <KampanyaBildirimi baslangic={bildirim} kapat={() => setBildirim(null)} />}
      {duzenlenen && <KampanyaFormu t={duzenlenen} hizmetler={veri.veri.hizmetler} kapat={() => setDuzenlenen(null)} degisti={veri.yenile} />}
    </>
  );
}

function KampanyaFormu({ t, hizmetler: hiz, kapat, degisti }: { t: Taslak; hizmetler: Hizmet[]; kapat: () => void; degisti: () => void }) {
  const [f, setF] = useState(t);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [silOnayi, setSilOnayi] = useState(false);
  const d = (x: Partial<Taslak>) => setF({ ...f, ...x });

  async function kaydet() {
    if (!f.baslik.trim()) return setHata("Kampanya başlığını yazın.");
    if (f.baslangic && f.bitis && f.bitis < f.baslangic) return setHata("Bitiş tarihi başlangıçtan önce olamaz.");
    setKaydediliyor(true);
    const satir = {
      baslik: f.baslik.trim(),
      aciklama: f.aciklama?.trim() || null,
      etiket: f.etiket?.trim() || null,
      gorsel_url: f.gorsel_url,
      hizmet_id: f.hizmet_id || null,
      baslangic: f.baslangic || null,
      bitis: f.bitis || null,
      aktif: f.aktif,
      sira: f.sira,
    };
    const { error } = f.id ? await supabase.from("kampanyalar").update(satir).eq("id", f.id) : await supabase.from("kampanyalar").insert(satir);
    setKaydediliyor(false);
    if (error) return setHata(hataMetni(error));
    degisti();
    kapat();
  }

  async function sil() {
    const { error } = await supabase.from("kampanyalar").delete().eq("id", f.id!);
    if (error) return setHata(hataMetni(error));
    degisti();
    kapat();
  }

  return (
    <Pencere baslik={f.id ? "Kampanyayı Düzenle" : "Yeni Kampanya"} kapat={kapat} genis>
      <div className="grid gap-4 md:grid-cols-2">
        <Alan etiket="Başlık">
          <Girdi value={f.baslik} onChange={(e) => d({ baslik: e.target.value })} placeholder="Ör. Keratin + Fön Paketi" />
        </Alan>
        <Alan etiket="Etiket" yardim="Kartın köşesinde görünür. Ör. “Yeni”, “30 Eylül'e kadar”">
          <Girdi value={f.etiket ?? ""} onChange={(e) => d({ etiket: e.target.value })} />
        </Alan>
        <Alan etiket="Açıklama">
          <MetinAlani value={f.aciklama ?? ""} onChange={(e) => d({ aciklama: e.target.value })} placeholder="Ör. 2.200 ₺ yerine 1.900 ₺" />
        </Alan>
        <Alan etiket="İlgili hizmet (isteğe bağlı)" yardim="Seçilirse “Randevu Al” bu hizmet seçili olarak açılır.">
          <Secim value={f.hizmet_id ?? ""} onChange={(e) => d({ hizmet_id: e.target.value || null })}>
            <option value="">— Yok —</option>
            {hiz.filter((h) => h.aktif).map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Başlangıç tarihi">
          <Girdi type="date" value={f.baslangic ?? ""} onChange={(e) => d({ baslangic: e.target.value || null })} />
        </Alan>
        <Alan etiket="Bitiş tarihi" yardim="Boş bırakılırsa süresiz.">
          <Girdi type="date" value={f.bitis ?? ""} onChange={(e) => d({ bitis: e.target.value || null })} />
        </Alan>
        <Alan etiket="Görsel">
          <GorselSecici klasor="kampanyalar" deger={f.gorsel_url} onDegis={(u) => d({ gorsel_url: u })} />
        </Alan>
        <div className="flex flex-col justify-end gap-3">
          <Alan etiket="Sıra">
            <Girdi type="number" value={f.sira} onChange={(e) => d({ sira: Number(e.target.value) })} />
          </Alan>
          <Onay secili={f.aktif} onDegis={(x) => d({ aktif: x })}>
            Aktif
          </Onay>
        </div>
      </div>
      {hata && <p className="mt-4 text-sm text-tugla">{hata}</p>}
      <div className="mt-6 flex items-center justify-between gap-2">
        <div>
          {f.id &&
            (silOnayi ? (
              <span className="flex items-center gap-2 text-sm">
                Silinsin mi?
                <Buton tur="tehlike" onClick={sil}>
                  Evet, sil
                </Buton>
                <Buton tur="metin" onClick={() => setSilOnayi(false)}>
                  Hayır
                </Buton>
              </span>
            ) : (
              <Buton tur="metin" className="text-tugla" onClick={() => setSilOnayi(true)}>
                Sil
              </Buton>
            ))}
        </div>
        <div className="flex gap-2">
          <Buton tur="metin" onClick={kapat}>
            Vazgeç
          </Buton>
          <Buton yukleniyor={kaydediliyor} onClick={kaydet}>
            Kaydet
          </Buton>
        </div>
      </div>
    </Pencere>
  );
}
