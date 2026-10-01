"use client";

import { useState } from "react";

import { Alan, Buton, Girdi, Pencere, Rozet, Secim } from "@/components/ui";
import { hataMetni, supabase } from "@/lib/supabase";
import { fiyatYaz, saatYaz, uzunTarih } from "@/lib/tarih";
import { DURUM_ADI, musteriAdi, type PanelRandevu, type RandevuDurum, type Uzman } from "@/lib/tipler";

export const DURUM_RENGI: Record<RandevuDurum, "ana" | "yesil" | "tugla" | "taupe"> = {
  onaylandi: "ana",
  tamamlandi: "yesil",
  iptal: "taupe",
  gelmedi: "tugla",
};

/** Randevu detayı + durum değiştirme (tamamlandı → puan otomatik eklenir) */
export function RandevuDetay({
  r,
  uzmanlar,
  puanBasina,
  kapat,
  degisti,
}: {
  r: PanelRandevu;
  uzmanlar: Uzman[];
  puanBasina: number;
  kapat: () => void;
  degisti: () => void;
}) {
  const uzman = uzmanlar.find((u) => u.id === r.uzman_id);
  const [yeniUzman, setYeniUzman] = useState(r.uzman_id ?? "");
  const [iptalModu, setIptalModu] = useState(false);
  // Tahsil edilen tutar: "Tamamlandı" yapılırken sorulur (liste fiyatıyla dolu gelir), sonradan düzeltilebilir
  const [tamamlaModu, setTamamlaModu] = useState(false);
  const [tahsilDuzenle, setTahsilDuzenle] = useState(false);
  const [tahsil, setTahsil] = useState(String(Math.round(Number(r.tahsil_edilen ?? r.toplam_fiyat))));
  const [neden, setNeden] = useState("");
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function tahsilTutari(): number | null {
    // "4.200" / "4.200,50" (binlik nokta) ya da "4200" / "4200,5" / "4200.5"
    const s = tahsil.trim().replace(/s|₺/g, "");
    const n = Number(/^d{1,3}(.d{3})+(,d+)?$/.test(s) ? s.replace(/./g, "").replace(",", ".") : s.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function durumYap(durum: RandevuDurum) {
    const tutar = durum === "tamamlandi" ? tahsilTutari() : null;
    if (durum === "tamamlandi" && tutar === null) return setHata("Tahsil edilen tutarı geçerli bir sayı olarak yazın.");
    setYukleniyor(durum);
    setHata(null);
    const degisiklik =
      durum === "iptal"
        ? { durum, iptal_eden: "salon", iptal_nedeni: neden.trim() || null, iptal_tarihi: new Date().toISOString() }
        : { durum, iptal_eden: null, iptal_nedeni: null, iptal_tarihi: null, ...(durum === "tamamlandi" ? { tahsil_edilen: tutar } : {}) };
    const { error } = await supabase.from("randevular").update(degisiklik).eq("id", r.id);
    setYukleniyor(null);
    if (error) return setHata(hataMetni(error));
    degisti();
    kapat();
  }

  async function tahsilKaydet() {
    const tutar = tahsilTutari();
    if (tutar === null) return setHata("Tahsil edilen tutarı geçerli bir sayı olarak yazın.");
    setYukleniyor("tahsil");
    setHata(null);
    const { error } = await supabase.from("randevular").update({ tahsil_edilen: tutar }).eq("id", r.id);
    setYukleniyor(null);
    if (error) return setHata(hataMetni(error));
    degisti();
    kapat();
  }

  // Randevuyu başka uzmana al (ör. uzman izne çıktı ya da işten ayrılıyor). Çakışmayı veritabanı engeller.
  async function uzmaniDegistir() {
    setYukleniyor("uzman");
    setHata(null);
    const { error } = await supabase.from("randevular").update({ uzman_id: yeniUzman }).eq("id", r.id);
    setYukleniyor(null);
    if (error) {
      return setHata(error.message.includes("uzman_cakisma_yok") ? "Seçilen uzmanın bu saatte başka bir randevusu var." : hataMetni(error));
    }
    degisti();
    kapat();
  }

  const hesapli = !!r.musteri_id;

  return (
    <Pencere baslik={musteriAdi(r)} kapat={kapat}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Rozet renk={DURUM_RENGI[r.durum]}>{DURUM_ADI[r.durum]}</Rozet>
          {r.olusturan === "salon" && <Rozet renk="taupe">Salondan girildi</Rozet>}
          {r.olusturan === "web" && <Rozet renk="mercan">Web&apos;den alındı</Rozet>}
          {!hesapli && <Rozet renk="taupe">Uygulama hesabı yok</Rozet>}
        </div>

        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2">
          <dt className="text-taupe">Tarih</dt>
          <dd>
            {uzunTarih(r.baslangic)}, {saatYaz(r.baslangic)}–{saatYaz(r.bitis)}
          </dd>
          <dt className="text-taupe">Hizmet</dt>
          <dd>
            {r.hizmetler.map((h) => h.ad).join(", ")} · {r.toplam_sure_dk} dk
          </dd>
          <dt className="text-taupe">Uzman</dt>
          <dd>
            {r.durum === "onaylandi" ? (
              <span className="flex flex-wrap items-center gap-2">
                <Secim value={yeniUzman} onChange={(e) => setYeniUzman(e.target.value)} className="py-1">
                  {!r.uzman_id && <option value="">{r.uzman_ad ?? "—"} (silinmiş)</option>}
                  {r.uzman_id && !uzman && <option value={r.uzman_id}>{r.uzman_ad} (pasif)</option>}
                  {uzmanlar.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.ad}
                    </option>
                  ))}
                </Secim>
                {yeniUzman && yeniUzman !== r.uzman_id && (
                  <Buton tur="cizgili" className="py-1" yukleniyor={yukleniyor === "uzman"} onClick={uzmaniDegistir}>
                    Uzmanı değiştir
                  </Buton>
                )}
              </span>
            ) : (
              (uzman?.ad ?? r.uzman_ad ?? "—")
            )}
          </dd>
          <dt className="text-taupe">Tutar</dt>
          <dd>
            {fiyatYaz(r.toplam_fiyat)} <span className="text-taupe">(liste fiyatı) · Ödeme salonda</span>
          </dd>
          {r.durum === "tamamlandi" && (
            <>
              <dt className="text-taupe">Tahsil edilen</dt>
              <dd>
                {tahsilDuzenle ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Girdi inputMode="decimal" className="w-28 py-1" value={tahsil} onChange={(e) => setTahsil(e.target.value)} autoFocus />
                    <span>₺</span>
                    <Buton className="py-1" yukleniyor={yukleniyor === "tahsil"} onClick={tahsilKaydet}>
                      Kaydet
                    </Buton>
                    <Buton tur="metin" onClick={() => setTahsilDuzenle(false)}>
                      Vazgeç
                    </Buton>
                  </span>
                ) : (
                  <span className="flex flex-wrap items-center gap-2">
                    <b>{fiyatYaz(r.tahsil_edilen ?? r.toplam_fiyat)}</b>
                    {r.tahsil_edilen === null && <span className="text-xs text-taupe">(girilmedi, liste fiyatı sayılır)</span>}
                    {r.tahsil_edilen !== null && Number(r.tahsil_edilen) !== Number(r.toplam_fiyat) && (
                      <span className="text-xs text-taupe">
                        ({Number(r.tahsil_edilen) > Number(r.toplam_fiyat) ? "+" : "−"}
                        {fiyatYaz(Math.abs(Number(r.tahsil_edilen) - Number(r.toplam_fiyat)))} fark)
                      </span>
                    )}
                    <Buton tur="metin" onClick={() => setTahsilDuzenle(true)}>
                      Düzenle
                    </Buton>
                  </span>
                )}
              </dd>
            </>
          )}
          <dt className="text-taupe">Telefon</dt>
          <dd>{r.musteri?.telefon || r.musteri_telefon || "—"}</dd>
          {r.musteri?.eposta && (
            <>
              <dt className="text-taupe">E-posta</dt>
              <dd>{r.musteri.eposta}</dd>
            </>
          )}
          {r.musteri_notu && (
            <>
              <dt className="text-taupe">Müşteri notu</dt>
              <dd className="italic">“{r.musteri_notu}”</dd>
            </>
          )}
          {r.durum === "iptal" && (
            <>
              <dt className="text-taupe">İptal</dt>
              <dd>
                {r.iptal_eden === "salon" ? "Salon iptal etti" : "Müşteri iptal etti"}
                {r.iptal_nedeni ? ` · ${r.iptal_nedeni}` : ""}
              </dd>
            </>
          )}
        </dl>

        {hata && <p className="text-tugla">{hata}</p>}

        {tamamlaModu ? (
          <div className="space-y-3 rounded-xl bg-krem p-4">
            <Alan etiket="Tahsil edilen tutar (₺)" yardim={`Liste fiyatı ${fiyatYaz(r.toplam_fiyat)}. Farklı ücret aldıysanız düzeltin.`}>
              <Girdi inputMode="decimal" className="w-40" value={tahsil} onChange={(e) => setTahsil(e.target.value)} autoFocus />
            </Alan>
            <div className="flex gap-2">
              <Buton yukleniyor={yukleniyor === "tamamlandi"} onClick={() => durumYap("tamamlandi")}>
                Tamamla{hesapli ? ` (+${puanBasina} puan)` : ""}
              </Buton>
              <Buton tur="metin" onClick={() => setTamamlaModu(false)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        ) : iptalModu ? (
          <div className="space-y-3 rounded-xl bg-krem p-4">
            <Alan etiket="İptal nedeni (isteğe bağlı)">
              <Girdi value={neden} onChange={(e) => setNeden(e.target.value)} placeholder="Ör. Uzman hastalandı" />
            </Alan>
            <div className="flex gap-2">
              <Buton tur="tehlike" yukleniyor={yukleniyor === "iptal"} onClick={() => durumYap("iptal")}>
                Randevuyu İptal Et
              </Buton>
              <Buton tur="metin" onClick={() => setIptalModu(false)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 border-t border-cizgi pt-4">
            {r.durum !== "tamamlandi" && (
              <Buton onClick={() => setTamamlaModu(true)}>Tamamlandı{hesapli ? ` (+${puanBasina} puan)` : ""}</Buton>
            )}
            {r.durum !== "gelmedi" && (
              <Buton tur="cizgili" yukleniyor={yukleniyor === "gelmedi"} onClick={() => durumYap("gelmedi")}>
                Gelmedi
              </Buton>
            )}
            {r.durum !== "onaylandi" && (
              <Buton tur="cizgili" yukleniyor={yukleniyor === "onaylandi"} onClick={() => durumYap("onaylandi")}>
                Onaylandı&apos;ya geri al
              </Buton>
            )}
            {r.durum !== "iptal" && (
              <Buton tur="metin" className="text-tugla" onClick={() => setIptalModu(true)}>
                İptal Et
              </Buton>
            )}
          </div>
        )}
        {r.durum === "tamamlandi" && hesapli && (
          <p className="text-xs text-taupe">Müşteriye {puanBasina} puan eklendi. Randevuyu başka bir duruma alırsanız bu puan geri alınır.</p>
        )}
      </div>
    </Pencere>
  );
}
