"use client";

import { useState } from "react";

import { Alan, Buton, Girdi, MetinAlani, Pencere } from "@/components/ui";
import { useSorgu } from "@/lib/sorgu";
import { ac, hataMetni, supabase } from "@/lib/supabase";

const BASLIK_SINIRI = 50;
const MESAJ_SINIRI = 180;

/**
 * Kampanya bildirimini yalnızca kampanya izni veren müşterilere gönderir (KVKK / ticari ileti izni).
 * Gönderim veritabanında yapılır (kampanya_bildirimi_gonder), bu pencere yalnızca metni alır.
 */
export function KampanyaBildirimi({
  baslangic,
  kapat,
}: {
  baslangic?: { baslik: string; govde: string; kampanyaId?: string };
  kapat: () => void;
}) {
  const alicilar = useSorgu(async () => {
    const satir = ac(await supabase.rpc("kampanya_alici_sayisi")) as { izinli: number; cihazli: number }[];
    return satir[0] ?? { izinli: 0, cihazli: 0 };
  });
  const [baslik, setBaslik] = useState(baslangic?.baslik ?? "");
  const [govde, setGovde] = useState(baslangic?.govde ?? "");
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ tur: "tamam" | "hata"; metin: string } | null>(null);

  async function gonder() {
    setGonderiliyor(true);
    setSonuc(null);
    const { data, error } = await supabase.rpc("kampanya_bildirimi_gonder", {
      p_baslik: baslik,
      p_govde: govde,
      p_kampanya_id: baslangic?.kampanyaId ?? null,
    });
    setGonderiliyor(false);
    setOnay(false);
    if (error) return setSonuc({ tur: "hata", metin: hataMetni(error) });
    setSonuc({ tur: "tamam", metin: `${data} müşteri için bildirim kuyruğa alındı. Birkaç saniye içinde telefonlara ulaşır.` });
  }

  const a = alicilar.veri;
  const hazir = baslik.trim() && govde.trim();

  return (
    <Pencere baslik="Kampanya Bildirimi Gönder" kapat={kapat}>
      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-krem p-4">
          {a ? (
            <>
              <p>
                Kampanya izni veren <b>{a.izinli}</b> müşteri var. Bunlardan <b>{a.cihazli}</b> tanesinin telefonu bildirime kayıtlı.
              </p>
              <p className="mt-1 text-xs text-taupe">İzin vermeyen müşterilere kampanya bildirimi gönderilmez.</p>
            </>
          ) : (
            <p className="text-taupe">Alıcılar hesaplanıyor…</p>
          )}
        </div>
        <Alan etiket={`Başlık (${baslik.length}/${BASLIK_SINIRI})`}>
          <Girdi maxLength={BASLIK_SINIRI} value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Ör. Sonbahara özel bakım fırsatı" />
        </Alan>
        <Alan etiket={`Mesaj (${govde.length}/${MESAJ_SINIRI})`} yardim="Kısa ve net olsun; bildirimde ilk 1-2 satır görünür.">
          <MetinAlani maxLength={MESAJ_SINIRI} value={govde} onChange={(e) => setGovde(e.target.value)} placeholder="Ör. Keratin + Fön paketi 30 Eylül'e kadar 1.900 ₺" />
        </Alan>

        {/* Telefonda nasıl görüneceği */}
        {hazir && (
          <div className="rounded-2xl bg-koyu/90 p-3 text-white">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Örnek Salon · şimdi</p>
            <p className="font-semibold">{baslik}</p>
            <p className="text-white/90">{govde}</p>
          </div>
        )}

        {sonuc && <p className={sonuc.tur === "hata" ? "text-tugla" : "text-yesil"}>{sonuc.metin}</p>}

        <div className="flex justify-end gap-2">
          <Buton tur="metin" onClick={kapat}>
            {sonuc?.tur === "tamam" ? "Kapat" : "Vazgeç"}
          </Buton>
          {sonuc?.tur !== "tamam" &&
            (onay ? (
              <Buton yukleniyor={gonderiliyor} onClick={gonder}>
                Evet, {a?.izinli ?? 0} kişiye gönder
              </Buton>
            ) : (
              <Buton disabled={!hazir || !a?.izinli} onClick={() => setOnay(true)}>
                Gönder
              </Buton>
            ))}
        </div>
      </div>
    </Pencere>
  );
}
