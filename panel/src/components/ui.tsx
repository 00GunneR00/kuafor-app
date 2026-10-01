"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { gorselYukle, hataMetni } from "@/lib/supabase";

const birlestir = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(" ");

// --- Buton ---

type ButonTur = "dolu" | "cizgili" | "metin" | "tehlike";

export function Buton({
  tur = "dolu",
  yukleniyor,
  className,
  children,
  ...p
}: { tur?: ButonTur; yukleniyor?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={p.disabled || yukleniyor}
      className={birlestir(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50",
        tur === "dolu" && "bg-ana text-white hover:bg-ana-koyu",
        tur === "tehlike" && "bg-tugla text-white hover:opacity-90",
        tur === "cizgili" && "border border-ana bg-white text-ana hover:bg-krem",
        tur === "metin" && "px-2 text-ana hover:underline",
        className,
      )}
      {...p}>
      {yukleniyor ? "…" : children}
    </button>
  );
}

// --- Kart / başlıklar ---

export function Kart({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={birlestir("rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(43,33,28,0.06)]", className)}>{children}</div>;
}

export function SayfaBasligi({ baslik, aciklama, sag }: { baslik: string; aciklama?: string; sag?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl">{baslik}</h1>
        {aciklama && <p className="mt-1 text-sm text-taupe">{aciklama}</p>}
      </div>
      {sag && <div className="flex flex-wrap items-center gap-2">{sag}</div>}
    </div>
  );
}

export function Rozet({ children, renk = "ana" }: { children: ReactNode; renk?: "ana" | "yesil" | "tugla" | "taupe" | "mercan" }) {
  const stil = {
    ana: "bg-ana/15 text-ana-koyu",
    yesil: "bg-yesil/15 text-yesil",
    tugla: "bg-tugla/15 text-tugla",
    taupe: "bg-krem-koyu text-taupe",
    mercan: "bg-mercan/15 text-mercan",
  }[renk];
  return <span className={birlestir("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", stil)}>{children}</span>;
}

// --- Durumlar ---

export function Yukleniyor() {
  return <p className="py-10 text-center text-sm text-taupe">Yükleniyor…</p>;
}

export function HataKutusu({ mesaj, tekrar }: { mesaj: string; tekrar?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-tugla/10 px-4 py-3 text-sm text-tugla">
      <span>{mesaj}</span>
      {tekrar && (
        <button className="font-semibold underline" onClick={tekrar}>
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function Bos({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-cizgi px-4 py-8 text-center text-sm text-taupe">{children}</p>;
}

// --- Form ---

export function Alan({ etiket, yardim, children }: { etiket: string; yardim?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{etiket}</span>
      {children}
      {yardim && <span className="text-xs text-taupe">{yardim}</span>}
    </label>
  );
}

const girdiStili = "rounded-xl border border-cizgi bg-white px-3 py-2 text-sm outline-none focus:border-ana";

export function Girdi(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={birlestir(girdiStili, p.className)} />;
}

export function MetinAlani(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...p} className={birlestir(girdiStili, p.className)} />;
}

export function Secim(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={birlestir(girdiStili, p.className)} />;
}

export function Onay({ secili, onDegis, children }: { secili: boolean; onDegis: (d: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={secili} onChange={(e) => onDegis(e.target.checked)} className="size-4 accent-[#b98b73]" />
      {children}
    </label>
  );
}

/** Görsel seçip "gorseller" deposuna yükler */
export function GorselSecici({ klasor, deger, onDegis }: { klasor: string; deger: string | null; onDegis: (url: string | null) => void }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {deger ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={deger} alt="" className="size-16 rounded-xl object-cover" />
      ) : (
        <div className="grid size-16 place-items-center rounded-xl bg-krem text-xs text-taupe">Yok</div>
      )}
      <div className="flex flex-col gap-1 text-sm">
        <label className="cursor-pointer font-semibold text-ana hover:underline">
          {yukleniyor ? "Yükleniyor…" : deger ? "Değiştir" : "Görsel yükle"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const dosya = e.target.files?.[0];
              if (!dosya) return;
              setYukleniyor(true);
              setHata(null);
              try {
                onDegis(await gorselYukle(klasor, dosya));
              } catch (err) {
                setHata(hataMetni(err));
              } finally {
                setYukleniyor(false);
              }
            }}
          />
        </label>
        {deger && (
          <button type="button" className="text-left text-xs text-taupe hover:underline" onClick={() => onDegis(null)}>
            Kaldır
          </button>
        )}
        {hata && <span className="text-xs text-tugla">{hata}</span>}
        <span className="text-xs text-soluk">JPG, PNG ya da WEBP, en fazla 5 MB</span>
      </div>
    </div>
  );
}

// --- Pencere ---

export function Pencere({ baslik, kapat, children, genis }: { baslik: string; kapat: () => void; children: ReactNode; genis?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-koyu/45 p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        className={birlestir("max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl", genis ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl">{baslik}</h2>
          <button aria-label="Kapat" className="text-2xl leading-none text-taupe hover:text-koyu" onClick={kapat}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
