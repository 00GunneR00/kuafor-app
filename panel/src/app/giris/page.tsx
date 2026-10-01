"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alan, Buton, Girdi } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useYonetici } from "@/lib/yonetici";
import { LOGO_ALT, LOGO_UST } from "@/lib/marka";

export default function GirisSayfasi() {
  const durum = useYonetici();
  const router = useRouter();
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    if (durum.tur === "yonetici" || durum.tur === "yetkisiz") router.replace("/");
  }, [durum.tur, router]);

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: sifre });
    setGonderiliyor(false);
    if (error) setHata(error.message === "Email not confirmed" ? "E-posta adresi henüz doğrulanmadı." : "E-posta ya da şifre hatalı.");
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={girisYap} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-[0_4px_16px_rgba(43,33,28,0.06)]">
        <div className="text-center">
          <p className="font-serif text-3xl font-semibold tracking-[0.3em]">{LOGO_UST}</p>
          <p className="font-serif text-xs italic tracking-[0.12em] text-taupe">{LOGO_ALT}</p>
          <h1 className="mt-6 font-serif text-2xl">Salon Paneli</h1>
          <p className="text-sm text-taupe">Yönetici hesabınla giriş yap.</p>
        </div>
        <Alan etiket="E-posta">
          <Girdi type="email" autoComplete="email" required value={eposta} onChange={(e) => setEposta(e.target.value)} />
        </Alan>
        <Alan etiket="Şifre">
          <Girdi type="password" autoComplete="current-password" required value={sifre} onChange={(e) => setSifre(e.target.value)} />
        </Alan>
        {hata && <p className="text-sm text-tugla">{hata}</p>}
        <Buton type="submit" yukleniyor={gonderiliyor} className="w-full">
          Giriş Yap
        </Buton>
      </form>
    </main>
  );
}
