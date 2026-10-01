"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "./supabase";

type Durum =
  | { tur: "yukleniyor" }
  | { tur: "cikis" }
  | { tur: "yetkisiz"; eposta: string }
  | { tur: "yonetici"; oturum: Session; ad: string };

const Baglam = createContext<Durum>({ tur: "yukleniyor" });

async function durumBul(oturum: Session | null): Promise<Durum> {
  if (!oturum) return { tur: "cikis" };
  const { data } = await supabase.from("profiller").select("ad_soyad, rol").eq("id", oturum.user.id).maybeSingle();
  if (data?.rol !== "yonetici") return { tur: "yetkisiz", eposta: oturum.user.email ?? "" };
  return { tur: "yonetici", oturum, ad: data.ad_soyad };
}

export function YoneticiSaglayici({ children }: { children: ReactNode }) {
  const [durum, setDurum] = useState<Durum>({ tur: "yukleniyor" });

  useEffect(() => {
    let iptal = false;
    supabase.auth.getSession().then(async ({ data }) => {
      const d = await durumBul(data.session);
      if (!iptal) setDurum(d);
    });
    const { data } = supabase.auth.onAuthStateChange((_olay, oturum) => {
      // Dinleyici içinde başka bir Supabase çağrısını beklemek önerilmiyor
      setTimeout(async () => {
        const d = await durumBul(oturum);
        if (!iptal) setDurum(d);
      }, 0);
    });
    return () => {
      iptal = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return <Baglam.Provider value={durum}>{children}</Baglam.Provider>;
}

export function useYonetici() {
  return useContext(Baglam);
}
