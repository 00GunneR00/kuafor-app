"use client";

import { useState } from "react";

import { Alan, Buton, GorselSecici, Girdi, HataKutusu, Kart, MetinAlani, Onay, Pencere, Rozet, SayfaBasligi, Secim, Yukleniyor } from "@/components/ui";
import { useSorgu } from "@/lib/sorgu";
import { hataMetni, supabase } from "@/lib/supabase";
import { fiyatYaz } from "@/lib/tarih";
import type { Hizmet, Kategori } from "@/lib/tipler";
import { hizmetler, kategoriler } from "@/lib/veri";

type Taslak = Omit<Hizmet, "id"> & { id?: string };

// Hizmet geçici olarak pasif yapılabilir ya da kalıcı silinebilir (randevular adını/fiyatını saklar, 0010_hizmet_silme.sql).
export default function Hizmetler() {
  const veri = useSorgu(async () => {
    const [k, h] = await Promise.all([kategoriler(), hizmetler()]);
    return { kategoriler: k, hizmetler: h };
  });
  const [duzenlenen, setDuzenlenen] = useState<Taslak | null>(null);
  const [kategoriPenceresi, setKategoriPenceresi] = useState(false);

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;
  const { kategoriler: kat, hizmetler: hiz } = veri.veri;

  const yeniTaslak = (kategoriId: string): Taslak => ({
    kategori_id: kategoriId,
    ad: "",
    aciklama: "",
    detay: "",
    dahil: [],
    sure_dk: 30,
    fiyat: 0,
    fiyat_baslangic: false,
    gorsel_url: null,
    aktif: true,
    sira: hiz.filter((h) => h.kategori_id === kategoriId).length + 1,
  });

  return (
    <>
      <SayfaBasligi
        baslik="Hizmetler"
        aciklama="Fiyat listesi uygulamada anında güncellenir. Geçici olarak kaldırmak için pasif yapın, artık sunulmayan hizmeti silebilirsiniz."
        sag={
          <>
            <Buton tur="cizgili" onClick={() => setKategoriPenceresi(true)}>
              Kategoriler
            </Buton>
            <Buton onClick={() => kat[0] && setDuzenlenen(yeniTaslak(kat[0].id))} disabled={kat.length === 0}>
              + Yeni Hizmet
            </Buton>
          </>
        }
      />

      <div className="space-y-6">
        {kat.map((k) => (
          <section key={k.id}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-xl">{k.ad}</h2>
              <Buton tur="metin" onClick={() => setDuzenlenen(yeniTaslak(k.id))}>
                + Bu kategoriye ekle
              </Buton>
            </div>
            <Kart className="p-0">
              {hiz.filter((h) => h.kategori_id === k.id).length === 0 ? (
                <p className="px-4 py-4 text-sm text-taupe">Bu kategoride hizmet yok.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {hiz
                      .filter((h) => h.kategori_id === k.id)
                      .map((h) => (
                        <tr key={h.id} className={`border-b border-krem-koyu last:border-0 ${h.aktif ? "" : "opacity-50"}`}>
                          <td className="px-4 py-3">
                            <span className="font-medium">{h.ad}</span>
                            <span className="block text-xs text-taupe">{h.aciklama}</span>
                          </td>
                          <td className="px-4 py-3">{h.sure_dk} dk</td>
                          <td className="px-4 py-3">{fiyatYaz(h.fiyat, h.fiyat_baslangic)}</td>
                          <td className="px-4 py-3">{h.aktif ? <Rozet renk="yesil">Aktif</Rozet> : <Rozet renk="taupe">Pasif</Rozet>}</td>
                          <td className="px-4 py-3 text-right">
                            <Buton tur="metin" onClick={() => setDuzenlenen({ ...h, aciklama: h.aciklama ?? "", detay: h.detay ?? "" })}>
                              Düzenle
                            </Buton>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </Kart>
          </section>
        ))}
      </div>

      {duzenlenen && <HizmetFormu t={duzenlenen} kategoriler={kat} kapat={() => setDuzenlenen(null)} kaydedildi={veri.yenile} />}
      {kategoriPenceresi && <KategoriPenceresi kategoriler={kat} kapat={() => setKategoriPenceresi(false)} degisti={veri.yenile} />}
    </>
  );
}

function HizmetFormu({ t, kategoriler, kapat, kaydedildi }: { t: Taslak; kategoriler: Kategori[]; kapat: () => void; kaydedildi: () => void }) {
  const [f, setF] = useState(t);
  const [dahilMetni, setDahilMetni] = useState(t.dahil.join("\n"));
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const d = (x: Partial<Taslak>) => setF({ ...f, ...x });

  async function kaydet() {
    if (!f.ad.trim()) return setHata("Hizmet adını yazın.");
    if (f.sure_dk <= 0) return setHata("Süre 0'dan büyük olmalı.");
    setKaydediliyor(true);
    const satir = {
      kategori_id: f.kategori_id,
      ad: f.ad.trim(),
      aciklama: f.aciklama?.trim() || null,
      detay: f.detay?.trim() || null,
      dahil: dahilMetni.split("\n").map((x) => x.trim()).filter(Boolean),
      sure_dk: f.sure_dk,
      fiyat: f.fiyat,
      fiyat_baslangic: f.fiyat_baslangic,
      gorsel_url: f.gorsel_url,
      aktif: f.aktif,
      sira: f.sira,
    };
    const { error } = f.id ? await supabase.from("hizmetler").update(satir).eq("id", f.id) : await supabase.from("hizmetler").insert(satir);
    setKaydediliyor(false);
    if (error) return setHata(hataMetni(error));
    kaydedildi();
    kapat();
  }

  // Kalıcı silme: randevular hizmetin adını/fiyatını sakladığı için geçmiş bozulmaz (0010_hizmet_silme.sql)
  const [etki, setEtki] = useState<{ ileri_randevu: number; kampanya: number; odul_hizmeti: boolean } | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);
  async function silmeyiSor() {
    setHata(null);
    const { data, error } = await supabase.rpc("hizmet_silme_etkisi", { p_hizmet_id: f.id! });
    if (error) return setHata(hataMetni(error));
    setEtki((data as (typeof etki)[])[0] ?? { ileri_randevu: 0, kampanya: 0, odul_hizmeti: false });
  }
  async function sil() {
    setSiliniyor(true);
    const { error } = await supabase.rpc("hizmet_sil", { p_hizmet_id: f.id! });
    setSiliniyor(false);
    if (error) {
      setEtki(null);
      return setHata(hataMetni(error));
    }
    const yol = t.gorsel_url?.split("/gorseller/")[1];
    if (yol) await supabase.storage.from("gorseller").remove([decodeURIComponent(yol)]);
    kaydedildi();
    kapat();
  }

  return (
    <Pencere baslik={f.id ? "Hizmeti Düzenle" : "Yeni Hizmet"} kapat={kapat} genis>
      <div className="grid gap-4 md:grid-cols-2">
        <Alan etiket="Hizmet adı">
          <Girdi value={f.ad} onChange={(e) => d({ ad: e.target.value })} />
        </Alan>
        <Alan etiket="Kategori">
          <Secim value={f.kategori_id} onChange={(e) => d({ kategori_id: e.target.value })}>
            {kategoriler.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Süre (dakika)" yardim="Randevu takviminde bu kadar yer kaplar.">
          <Girdi type="number" min={5} step={5} value={f.sure_dk} onChange={(e) => d({ sure_dk: Number(e.target.value) })} />
        </Alan>
        <Alan etiket="Fiyat (₺)">
          <Girdi type="number" min={0} step={10} value={f.fiyat} onChange={(e) => d({ fiyat: Number(e.target.value) })} />
        </Alan>
        <div className="md:col-span-2">
          <Onay secili={f.fiyat_baslangic} onDegis={(x) => d({ fiyat_baslangic: x })}>
            Fiyat saça göre değişir, “…’den başlayan” diye göster
          </Onay>
        </div>
        <Alan etiket="Kısa açıklama" yardim="Listede hizmet adının altında görünür.">
          <Girdi value={f.aciklama ?? ""} onChange={(e) => d({ aciklama: e.target.value })} />
        </Alan>
        <Alan etiket="Sıra" yardim="Kategori içindeki sıralama (küçük olan üstte).">
          <Girdi type="number" value={f.sira} onChange={(e) => d({ sira: Number(e.target.value) })} />
        </Alan>
        <Alan etiket="Hizmet hakkında (detay ekranı)">
          <MetinAlani rows={4} value={f.detay ?? ""} onChange={(e) => d({ detay: e.target.value })} />
        </Alan>
        <Alan etiket="Neler dahil?" yardim="Her satıra bir madde.">
          <MetinAlani rows={4} value={dahilMetni} onChange={(e) => setDahilMetni(e.target.value)} />
        </Alan>
        <Alan etiket="Görsel (detay ekranı)">
          <GorselSecici klasor="hizmetler" deger={f.gorsel_url} onDegis={(u) => d({ gorsel_url: u })} />
        </Alan>
        <div className="flex items-end">
          <Onay secili={f.aktif} onDegis={(x) => d({ aktif: x })}>
            Aktif (uygulamada görünsün ve randevu alınabilsin)
          </Onay>
        </div>
      </div>
      {hata && <p className="mt-4 text-sm text-tugla">{hata}</p>}
      {etki && (
        <div className="mt-4 space-y-2 rounded-xl bg-tugla/10 p-4 text-sm">
          <p>
            <b>{t.ad}</b> kalıcı olarak silinsin mi? Geçmiş randevularda adı ve fiyatı görünmeye devam eder. Sadece listeden kaldırmak için “Aktif” işaretini kaldırmanız yeterli.
          </p>
          {(etki.ileri_randevu > 0 || etki.kampanya > 0 || etki.odul_hizmeti) && (
            <ul className="list-disc pl-5 text-taupe">
              {etki.ileri_randevu > 0 && <li>{etki.ileri_randevu} ileri tarihli randevuda bu hizmet var; randevular geçerli kalır.</li>}
              {etki.kampanya > 0 && <li>{etki.kampanya} kampanyanın bu hizmetle bağlantısı kalkar (kampanya silinmez).</li>}
              {etki.odul_hizmeti && <li>Bu hizmet sadakat ödülü olarak seçili; Ayarlar’dan yeni ödül hizmeti seçmelisiniz.</li>}
            </ul>
          )}
          <div className="flex gap-2">
            <Buton tur="tehlike" yukleniyor={siliniyor} onClick={sil}>
              Evet, sil
            </Buton>
            <Buton tur="metin" onClick={() => setEtki(null)}>
              Vazgeç
            </Buton>
          </div>
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-2">
        <div>
          {f.id && !etki && (
            <Buton tur="metin" className="text-tugla" onClick={silmeyiSor}>
              Hizmeti sil
            </Buton>
          )}
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

function KategoriPenceresi({ kategoriler, kapat, degisti }: { kategoriler: Kategori[]; kapat: () => void; degisti: () => void }) {
  const [liste, setListe] = useState(kategoriler);
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  async function calistir(islem: PromiseLike<{ error: { message: string } | null }>) {
    setHata(null);
    const { error } = await islem;
    if (error) {
      setHata(error.message.includes("foreign key") ? "Bu kategoride hizmet var; önce hizmetleri başka kategoriye taşıyın." : hataMetni(error));
      return false;
    }
    degisti();
    return true;
  }

  return (
    <Pencere baslik="Kategoriler" kapat={kapat}>
      <div className="space-y-2">
        {liste.map((k, i) => (
          <div key={k.id} className="flex items-center gap-2">
            <Girdi className="flex-1" value={k.ad} onChange={(e) => setListe(liste.map((x) => (x.id === k.id ? { ...x, ad: e.target.value } : x)))} />
            <Girdi type="number" className="w-16" value={k.sira} onChange={(e) => setListe(liste.map((x) => (x.id === k.id ? { ...x, sira: Number(e.target.value) } : x)))} />
            <Buton tur="metin" onClick={() => calistir(supabase.from("kategoriler").update({ ad: liste[i].ad.trim(), sira: liste[i].sira }).eq("id", k.id))}>
              Kaydet
            </Buton>
            <Buton
              tur="metin"
              className="text-tugla"
              onClick={async () => {
                if (await calistir(supabase.from("kategoriler").delete().eq("id", k.id))) setListe(liste.filter((x) => x.id !== k.id));
              }}>
              Sil
            </Buton>
          </div>
        ))}
        <div className="flex gap-2 border-t border-cizgi pt-3">
          <Girdi className="flex-1" placeholder="Yeni kategori adı" value={yeni} onChange={(e) => setYeni(e.target.value)} />
          <Buton
            onClick={async () => {
              if (!yeni.trim()) return;
              if (await calistir(supabase.from("kategoriler").insert({ ad: yeni.trim(), sira: liste.length + 1 }))) {
                setYeni("");
                kapat();
              }
            }}>
            Ekle
          </Buton>
        </div>
        {hata && <p className="text-sm text-tugla">{hata}</p>}
      </div>
    </Pencere>
  );
}
