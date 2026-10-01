"use client";

// Ciro Raporu ve uzman alt sayfasının ortak parçaları

import { usePathname, useSearchParams } from "next/navigation";

import { aralik, kaydir, periyotBasligi, type Periyot } from "@/lib/ciro";

import { Buton, Kart } from "./ui";

// Grafik renkleri: salon kahve ailesinden, dataviz doğrulayıcısından geçti
// (açık tonun kontrastı düşük -> lejant + tablo her zaman var)
export const RENK = { gerceklesen: "#8F4A2B", bekleyen: "#DA9468" } as const;

/**
 * Seçili dönem adres çubuğunda tutulur (?p=ay&t=2026-09-25), böylece uzman sayfasına gidip
 * geri dönünce aynı hafta/ay açık kalır. Parametre yoksa bu hafta.
 */
export function useDonem(bugun: string) {
  const sp = useSearchParams();
  const yol = usePathname();
  const periyot: Periyot = sp.get("p") === "ay" ? "ay" : "hafta";
  const t = sp.get("t");
  const secili = t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : bugun;

  function degistir(p: Periyot, tarih: string) {
    const q = new URLSearchParams(sp.toString());
    if (p === "ay") q.set("p", "ay");
    else q.delete("p");
    if (tarih === bugun) q.delete("t");
    else q.set("t", tarih);
    const s = q.toString();
    window.history.replaceState(null, "", s ? `${yol}?${s}` : yol);
  }

  /** Aynı dönemi başka sayfaya taşımak için sorgu metni */
  const donemSorgusu = [periyot === "ay" ? "p=ay" : "", secili !== bugun ? `t=${secili}` : ""].filter(Boolean).join("&");

  return { periyot, secili, degistir, donemSorgusu, ...aralik(periyot, secili) };
}

export function DonemSecici({ donem, bugun, onDegis }: { donem: ReturnType<typeof useDonem>; bugun: string; onDegis?: () => void }) {
  const { periyot, secili, degistir } = donem;
  const donemAdi = periyot === "hafta" ? "hafta" : "ay";
  const git = (p: Periyot, t: string) => {
    degistir(p, t);
    onDegis?.();
  };
  return (
    <>
      <div className="flex rounded-full bg-krem-koyu p-1">
        {(["hafta", "ay"] as const).map((p) => (
          <button
            key={p}
            onClick={() => git(p, secili)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${periyot === p ? "bg-ana text-white" : "text-taupe"}`}>
            {p === "hafta" ? "Haftalık" : "Aylık"}
          </button>
        ))}
      </div>
      <Buton tur="cizgili" aria-label={`Önceki ${donemAdi}`} onClick={() => git(periyot, kaydir(periyot, secili, -1))}>
        ‹
      </Buton>
      <Buton tur="cizgili" onClick={() => git(periyot, bugun)}>
        Bu {donemAdi}
      </Buton>
      <Buton tur="cizgili" aria-label={`Sonraki ${donemAdi}`} onClick={() => git(periyot, kaydir(periyot, secili, 1))}>
        ›
      </Buton>
    </>
  );
}

export function donemBasligi(donem: ReturnType<typeof useDonem>): string {
  return periyotBasligi(donem.periyot, donem.bas, donem.bit);
}

export function Kutu({ ad, deger, alt, renk }: { ad: string; deger: string; alt?: string; renk?: string }) {
  return (
    <Kart>
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-taupe">
        {renk && <span className="inline-block size-2.5 rounded-sm" style={{ background: renk }} />}
        {ad}
      </p>
      <p className="mt-1 font-serif text-2xl">{deger}</p>
      {alt && <p className="text-xs text-taupe">{alt}</p>}
    </Kart>
  );
}
