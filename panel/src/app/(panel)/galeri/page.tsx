"use client";

import { useState } from "react";

import { Alan, Bos, Buton, Girdi, HataKutusu, Onay, Pencere, SayfaBasligi, Secim, Yukleniyor } from "@/components/ui";
import { useSorgu } from "@/lib/sorgu";
import { ac, gorselYukle, hataMetni, supabase } from "@/lib/supabase";
import type { GaleriOgesi, Kategori, Uzman } from "@/lib/tipler";
import { kategoriler, uzmanlar } from "@/lib/veri";

/** Herkese açık adresten depo içi yolu çıkarır (silerken dosyayı da kaldırmak için) */
function depoYolu(url: string): string | null {
  const i = url.indexOf("/gorseller/");
  return i === -1 ? null : decodeURIComponent(url.slice(i + "/gorseller/".length));
}

// Uygulamanın Keşfet > Çalışmalarımız bölümü. Yalnızca salonda yapılmış gerçek çalışmalar yüklenmeli.
export default function Galeri() {
  const veri = useSorgu(async () => {
    const [g, k, u] = await Promise.all([
      supabase.from("galeri").select("id, gorsel_url, kategori_id, hizmet_adi, uzman_id, aktif, sira").order("sira").then(ac),
      kategoriler(),
      uzmanlar(),
    ]);
    return { galeri: g as GaleriOgesi[], kategoriler: k, uzmanlar: u };
  });
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<GaleriOgesi | null>(null);

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;
  const v = veri.veri;

  async function yukle(dosyalar: FileList) {
    setYukleniyor(true);
    setHata(null);
    try {
      let sira = v.galeri.length;
      for (const dosya of Array.from(dosyalar)) {
        const url = await gorselYukle("galeri", dosya);
        const { error } = await supabase.from("galeri").insert({ gorsel_url: url, sira: ++sira });
        if (error) throw error;
      }
      await veri.yenile();
    } catch (e) {
      setHata(hataMetni(e));
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <>
      <SayfaBasligi
        baslik="Galeri"
        aciklama="Uygulamada Keşfet > Çalışmalarımız bölümünde görünür. Yükledikten sonra fotoğrafa tıklayıp hizmet ve uzman etiketi ekleyin."
        sag={
          <label className={`inline-flex cursor-pointer items-center rounded-full bg-ana px-5 py-2.5 text-sm font-semibold text-white hover:bg-ana-koyu ${yukleniyor ? "opacity-50" : ""}`}>
            {yukleniyor ? "Yükleniyor…" : "+ Fotoğraf Yükle"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" disabled={yukleniyor} onChange={(e) => e.target.files && yukle(e.target.files)} />
          </label>
        }
      />
      {hata && <HataKutusu mesaj={hata} />}
      {v.galeri.length === 0 ? (
        <Bos>Galeri boş. Salonda yapılan saç modellerinin fotoğraflarını yükleyin (müşterinin izniyle).</Bos>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {v.galeri.map((g) => (
            <button key={g.id} onClick={() => setDuzenlenen(g)} className={`group relative aspect-[4/5] overflow-hidden rounded-2xl ${g.aktif ? "" : "opacity-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.gorsel_url} alt="" className="size-full object-cover transition group-hover:scale-105" />
              <span className="absolute inset-x-2 bottom-2 truncate rounded-md bg-black/45 px-2 py-0.5 text-left text-xs text-white">
                {[g.hizmet_adi, v.uzmanlar.find((u) => u.id === g.uzman_id)?.ad].filter(Boolean).join(" · ") || "Etiket ekle"}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-taupe">Fotoğrafların salonda yapılmış gerçek çalışmalar olması ve müşterinin paylaşıma izin vermiş olması gerekir.</p>
      {duzenlenen && (
        <GaleriFormu g={duzenlenen} kategoriler={v.kategoriler} uzmanlar={v.uzmanlar} kapat={() => setDuzenlenen(null)} degisti={veri.yenile} />
      )}
    </>
  );
}

function GaleriFormu({ g, kategoriler: kat, uzmanlar: uzm, kapat, degisti }: { g: GaleriOgesi; kategoriler: Kategori[]; uzmanlar: Uzman[]; kapat: () => void; degisti: () => void }) {
  const [f, setF] = useState(g);
  const [hata, setHata] = useState<string | null>(null);
  const [silOnayi, setSilOnayi] = useState(false);

  async function kaydet() {
    const { error } = await supabase
      .from("galeri")
      .update({ kategori_id: f.kategori_id || null, hizmet_adi: f.hizmet_adi?.trim() || null, uzman_id: f.uzman_id || null, aktif: f.aktif, sira: f.sira })
      .eq("id", f.id);
    if (error) return setHata(hataMetni(error));
    degisti();
    kapat();
  }

  async function sil() {
    const { error } = await supabase.from("galeri").delete().eq("id", f.id);
    if (error) return setHata(hataMetni(error));
    const yol = depoYolu(f.gorsel_url);
    if (yol) await supabase.storage.from("gorseller").remove([yol]);
    degisti();
    kapat();
  }

  return (
    <Pencere baslik="Fotoğraf" kapat={kapat}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.gorsel_url} alt="" className="mb-4 max-h-64 w-full rounded-xl object-cover" />
      <div className="grid gap-4 md:grid-cols-2">
        <Alan etiket="Kategori" yardim="Uygulamadaki filtre için.">
          <Secim value={f.kategori_id ?? ""} onChange={(e) => setF({ ...f, kategori_id: e.target.value || null })}>
            <option value="">— Yok —</option>
            {kat.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Hizmet adı" yardim="Ör. Balyaj">
          <Girdi value={f.hizmet_adi ?? ""} onChange={(e) => setF({ ...f, hizmet_adi: e.target.value })} />
        </Alan>
        <Alan etiket="Uzman">
          <Secim value={f.uzman_id ?? ""} onChange={(e) => setF({ ...f, uzman_id: e.target.value || null })}>
            <option value="">— Yok —</option>
            {uzm.map((u) => (
              <option key={u.id} value={u.id}>
                {u.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Sıra">
          <Girdi type="number" value={f.sira} onChange={(e) => setF({ ...f, sira: Number(e.target.value) })} />
        </Alan>
        <Onay secili={f.aktif} onDegis={(x) => setF({ ...f, aktif: x })}>
          Uygulamada göster
        </Onay>
      </div>
      {hata && <p className="mt-4 text-sm text-tugla">{hata}</p>}
      <div className="mt-6 flex items-center justify-between">
        {silOnayi ? (
          <span className="flex items-center gap-2 text-sm">
            Fotoğraf silinsin mi?
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
        )}
        <Buton onClick={kaydet}>Kaydet</Buton>
      </div>
    </Pencere>
  );
}

