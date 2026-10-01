"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Buton, Yukleniyor } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useYonetici } from "@/lib/yonetici";
import { LOGO_ALT, LOGO_UST } from "@/lib/marka";

const MENU = [
  { yol: "/", ad: "Randevular" },
  { yol: "/ciro", ad: "Ciro Raporu" },
  { yol: "/musteriler", ad: "Müşteriler" },
  { yol: "/hizmetler", ad: "Hizmetler" },
  { yol: "/uzmanlar", ad: "Uzmanlar" },
  { yol: "/kampanyalar", ad: "Kampanyalar" },
  { yol: "/galeri", ad: "Galeri" },
  { yol: "/ayarlar", ad: "Ayarlar" },
] as const;

// Panelin tüm sayfaları yalnızca yönetici hesabıyla açılır
export default function PanelDuzeni({ children }: LayoutProps<"/">) {
  const durum = useYonetici();
  const yol = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (durum.tur === "cikis") router.replace("/giris");
  }, [durum.tur, router]);

  if (durum.tur === "yukleniyor" || durum.tur === "cikis") return <Yukleniyor />;

  if (durum.tur === "yetkisiz") {
    return (
      <main className="mx-auto mt-24 max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="font-serif text-2xl">Yetkiniz yok</h1>
        <p className="text-sm text-taupe">
          <b>{durum.eposta}</b> hesabı salon yöneticisi değil. Panel yalnızca yönetici hesaplarıyla kullanılabilir.
        </p>
        <Buton tur="cizgili" onClick={() => supabase.auth.signOut()}>
          Çıkış Yap
        </Buton>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-cizgi bg-white px-4 py-6">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl font-semibold tracking-[0.3em]">{LOGO_UST}</p>
          <p className="font-serif text-xs italic tracking-[0.12em] text-taupe">{LOGO_ALT}</p>
          <p className="mt-2 text-xs text-soluk">Salon Paneli</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {MENU.map((m) => {
            const aktif = m.yol === "/" ? yol === "/" : yol.startsWith(m.yol);
            return (
              <Link
                key={m.yol}
                href={m.yol}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${aktif ? "bg-ana text-white" : "text-koyu hover:bg-krem"}`}>
                {m.ad}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-cizgi pt-4 text-sm">
          <p className="truncate font-medium">{durum.ad || "Yönetici"}</p>
          <p className="truncate text-xs text-taupe">{durum.oturum.user.email}</p>
          <button className="mt-2 text-xs font-semibold text-ana hover:underline" onClick={() => supabase.auth.signOut()}>
            Çıkış Yap
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
