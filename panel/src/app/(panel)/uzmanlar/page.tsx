"use client";

import { useState } from "react";

import { Alan, Buton, GorselSecici, Girdi, HataKutusu, Kart, Onay, Pencere, Rozet, SayfaBasligi, Yukleniyor } from "@/components/ui";
import { useSorgu } from "@/lib/sorgu";
import { hataMetni, supabase } from "@/lib/supabase";
import type { Hizmet, Kategori, Uzman } from "@/lib/tipler";
import { hizmetler, kategoriler, uzmanHizmetleri, uzmanlar } from "@/lib/veri";

type Taslak = Omit<Uzman, "id"> & { id?: string; hizmetIds: string[] };

// Uzman geçici olarak pasif yapılabilir ya da kalıcı silinebilir (geçmiş randevularda adı korunur, 0009_uzman_silme.sql).
export default function Uzmanlar() {
  const veri = useSorgu(async () => {
    const [u, h, k, i] = await Promise.all([uzmanlar(), hizmetler(), kategoriler(), uzmanHizmetleri()]);
    return { uzmanlar: u, hizmetler: h, kategoriler: k, iliskiler: i };
  });
  const [duzenlenen, setDuzenlenen] = useState<Taslak | null>(null);

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;
  const v = veri.veri;

  return (
    <>
      <SayfaBasligi
        baslik="Uzmanlar"
        aciklama="Uzmanın verdiği hizmetler, müşterinin randevu alırken hangi uzmanları göreceğini belirler. İzindeki uzmanı pasif yapın; işten ayrılan uzmanı silebilirsiniz."
        sag={
          <Buton
            onClick={() =>
              setDuzenlenen({ ad: "", unvan: "", uzmanlik: "", foto_url: null, aktif: true, sira: v.uzmanlar.length + 1, hizmetIds: [] })
            }>
            + Yeni Uzman
          </Buton>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {v.uzmanlar.map((u) => {
          const verdigi = v.hizmetler.filter((h) => v.iliskiler.some((i) => i.uzman_id === u.id && i.hizmet_id === h.id));
          return (
            <Kart key={u.id} className={u.aktif ? "" : "opacity-60"}>
              <div className="flex items-center gap-4">
                {u.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.foto_url} alt="" className="size-16 rounded-full object-cover" />
                ) : (
                  <div className="grid size-16 place-items-center rounded-full bg-ana font-serif text-2xl text-white">{u.ad.charAt(0)}</div>
                )}
                <div className="flex-1">
                  <p className="font-serif text-xl">{u.ad}</p>
                  <p className="text-sm text-taupe">{u.unvan}</p>
                  {!u.aktif && <Rozet renk="taupe">Pasif</Rozet>}
                </div>
                <Buton
                  tur="metin"
                  onClick={() =>
                    setDuzenlenen({ ...u, unvan: u.unvan ?? "", uzmanlik: u.uzmanlik ?? "", hizmetIds: verdigi.map((h) => h.id) })
                  }>
                  Düzenle
                </Buton>
              </div>
              <p className="mt-3 text-xs text-taupe">{verdigi.length ? verdigi.map((h) => h.ad).join(", ") : "Atanmış hizmet yok"}</p>
            </Kart>
          );
        })}
      </div>
      {duzenlenen && (
        <UzmanFormu t={duzenlenen} hizmetler={v.hizmetler} kategoriler={v.kategoriler} kapat={() => setDuzenlenen(null)} kaydedildi={veri.yenile} />
      )}
    </>
  );
}

function UzmanFormu({
  t,
  hizmetler: hiz,
  kategoriler: kat,
  kapat,
  kaydedildi,
}: {
  t: Taslak;
  hizmetler: Hizmet[];
  kategoriler: Kategori[];
  kapat: () => void;
  kaydedildi: () => void;
}) {
  const [f, setF] = useState(t);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const d = (x: Partial<Taslak>) => setF({ ...f, ...x });

  async function kaydet() {
    if (!f.ad.trim()) return setHata("Uzmanın adını yazın.");
    setKaydediliyor(true);
    setHata(null);
    try {
      const satir = { ad: f.ad.trim(), unvan: f.unvan?.trim() || null, uzmanlik: f.uzmanlik?.trim() || null, foto_url: f.foto_url, aktif: f.aktif, sira: f.sira };
      let id = f.id;
      if (id) {
        const { error } = await supabase.from("uzmanlar").update(satir).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("uzmanlar").insert(satir).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      // Hizmet atamalarını seçime eşitle
      const { error: silHata } = await supabase.from("uzman_hizmetleri").delete().eq("uzman_id", id!);
      if (silHata) throw silHata;
      if (f.hizmetIds.length) {
        const { error } = await supabase.from("uzman_hizmetleri").insert(f.hizmetIds.map((h) => ({ uzman_id: id!, hizmet_id: h })));
        if (error) throw error;
      }
      kaydedildi();
      kapat();
    } catch (e) {
      setHata(hataMetni(e));
    } finally {
      setKaydediliyor(false);
    }
  }

  // Kalıcı silme: geçmiş randevularda uzmanın adı korunur; ileri tarihli randevusu varsa veritabanı engeller
  const [silOnayi, setSilOnayi] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);
  async function sil() {
    setSiliniyor(true);
    setHata(null);
    const { error } = await supabase.rpc("uzman_sil", { p_uzman_id: f.id! });
    setSiliniyor(false);
    if (error) {
      setSilOnayi(false);
      return setHata(hataMetni(error));
    }
    const yol = t.foto_url?.split("/gorseller/")[1];
    if (yol) await supabase.storage.from("gorseller").remove([decodeURIComponent(yol)]);
    kaydedildi();
    kapat();
  }

  return (
    <Pencere baslik={f.id ? "Uzmanı Düzenle" : "Yeni Uzman"} kapat={kapat} genis>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Alan etiket="Ad">
            <Girdi value={f.ad} onChange={(e) => d({ ad: e.target.value })} />
          </Alan>
          <Alan etiket="Unvan" yardim="Ör. Baş Kuaför, Renk Uzmanı">
            <Girdi value={f.unvan ?? ""} onChange={(e) => d({ unvan: e.target.value })} />
          </Alan>
          <Alan etiket="Uzmanlık" yardim="Randevu alırken uzman kartında görünür.">
            <Girdi value={f.uzmanlik ?? ""} onChange={(e) => d({ uzmanlik: e.target.value })} />
          </Alan>
          <Alan etiket="Fotoğraf">
            <GorselSecici klasor="uzmanlar" deger={f.foto_url} onDegis={(u) => d({ foto_url: u })} />
          </Alan>
          <Alan etiket="Sıra">
            <Girdi type="number" value={f.sira} onChange={(e) => d({ sira: Number(e.target.value) })} />
          </Alan>
          <Onay secili={f.aktif} onDegis={(x) => d({ aktif: x })}>
            Aktif (müşteriler bu uzmandan randevu alabilsin)
          </Onay>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Verdiği hizmetler</p>
          <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-cizgi p-3">
            {kat.map((k) => (
              <div key={k.id}>
                <p className="mb-1 text-xs font-semibold uppercase text-taupe">{k.ad}</p>
                {hiz
                  .filter((h) => h.kategori_id === k.id)
                  .map((h) => (
                    <Onay
                      key={h.id}
                      secili={f.hizmetIds.includes(h.id)}
                      onDegis={(x) => d({ hizmetIds: x ? [...f.hizmetIds, h.id] : f.hizmetIds.filter((y) => y !== h.id) })}>
                      {h.ad}
                      {!h.aktif && <span className="text-xs text-taupe">(pasif)</span>}
                    </Onay>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {hata && <p className="mt-4 text-sm text-tugla">{hata}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          {f.id &&
            (silOnayi ? (
              <div className="max-w-md space-y-2 rounded-xl bg-tugla/10 p-3 text-sm">
                <p>
                  <b>{t.ad}</b> kalıcı olarak silinsin mi? Geçmiş randevularda adı görünmeye devam eder. Geçici ayrılıklar (izin vb.) için “Aktif” işaretini kaldırmanız yeterli.
                </p>
                <div className="flex gap-2">
                  <Buton tur="tehlike" yukleniyor={siliniyor} onClick={sil}>
                    Evet, sil
                  </Buton>
                  <Buton tur="metin" onClick={() => setSilOnayi(false)}>
                    Vazgeç
                  </Buton>
                </div>
              </div>
            ) : (
              <Buton tur="metin" className="text-tugla" onClick={() => setSilOnayi(true)}>
                Uzmanı sil
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
