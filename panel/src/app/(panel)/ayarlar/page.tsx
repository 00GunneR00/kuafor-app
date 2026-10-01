"use client";

import { useState, type ReactNode } from "react";

import { Alan, Buton, Girdi, HataKutusu, Kart, Onay, SayfaBasligi, Secim, Yukleniyor } from "@/components/ui";
import { useSorgu } from "@/lib/sorgu";
import { ac, hataMetni, supabase } from "@/lib/supabase";
import { tarihAnahtari, uzunTarih } from "@/lib/tarih";
import type { CalismaSaati, Hizmet, SalonAyarlari } from "@/lib/tipler";
import { calismaSaatleri, hizmetler, salonAyarlari } from "@/lib/veri";

const GUN_ADLARI = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function Ayarlar() {
  const veri = useSorgu(async () => {
    const [a, s, k, h] = await Promise.all([
      salonAyarlari(),
      calismaSaatleri(),
      supabase.from("kapali_gunler").select("tarih, aciklama").order("tarih").then(ac),
      hizmetler(),
    ]);
    return { ayarlar: a, saatler: s, kapaliGunler: k as { tarih: string; aciklama: string | null }[], hizmetler: h };
  });

  if (veri.hata) return <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />;
  if (!veri.veri) return <Yukleniyor />;

  return (
    <>
      <SayfaBasligi baslik="Ayarlar" aciklama="Buradaki değişiklikler uygulamaya anında yansır." />
      <div className="grid gap-6 xl:grid-cols-2">
        <SalonBilgileri a={veri.veri.ayarlar} degisti={veri.yenile} />
        <IsKurallari a={veri.veri.ayarlar} hizmetler={veri.veri.hizmetler} degisti={veri.yenile} />
        <WebRandevu a={veri.veri.ayarlar} degisti={veri.yenile} />
        <CalismaSaatleri saatler={veri.veri.saatler} degisti={veri.yenile} />
        <KapaliGunler liste={veri.veri.kapaliGunler} degisti={veri.yenile} />
      </div>
    </>
  );
}

function Bolum({ baslik, aciklama, children }: { baslik: string; aciklama?: string; children: ReactNode }) {
  return (
    <Kart>
      <h2 className="font-serif text-xl">{baslik}</h2>
      {aciklama && <p className="mb-4 mt-1 text-sm text-taupe">{aciklama}</p>}
      <div className={aciklama ? "" : "mt-4"}>{children}</div>
    </Kart>
  );
}

/** Kaydet düğmesi + sonuç mesajı */
function useKaydet(degisti: () => void) {
  const [durum, setDurum] = useState<{ tur: "bos" | "kaydediliyor" | "tamam" } | { tur: "hata"; mesaj: string }>({ tur: "bos" });
  async function kaydet(islem: () => PromiseLike<{ error: { message: string } | null }>) {
    setDurum({ tur: "kaydediliyor" });
    const { error } = await islem();
    if (error) return setDurum({ tur: "hata", mesaj: hataMetni(error) });
    setDurum({ tur: "tamam" });
    degisti();
  }
  const mesaj =
    durum.tur === "tamam" ? <span className="text-sm text-yesil">Kaydedildi</span> : durum.tur === "hata" ? <span className="text-sm text-tugla">{durum.mesaj}</span> : null;
  return { kaydet, kaydediliyor: durum.tur === "kaydediliyor", mesaj };
}

function SalonBilgileri({ a, degisti }: { a: SalonAyarlari; degisti: () => void }) {
  const [f, setF] = useState({ ad: a.ad, adres: a.adres ?? "", telefon: a.telefon ?? "", enlem: a.enlem?.toString() ?? "", boylam: a.boylam?.toString() ?? "" });
  const k = useKaydet(degisti);
  return (
    <Bolum baslik="Salon Bilgileri" aciklama="Uygulamada Keşfet, Hesabım ve randevu onayında görünür.">
      <div className="grid gap-4 md:grid-cols-2">
        <Alan etiket="Salon adı">
          <Girdi value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
        </Alan>
        <Alan etiket="Telefon" yardim="“Salonu Ara” bu numarayı arar.">
          <Girdi value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} placeholder="0362 xxx xx xx" />
        </Alan>
        <div className="md:col-span-2">
          <Alan etiket="Açık adres">
            <Girdi value={f.adres} onChange={(e) => setF({ ...f, adres: e.target.value })} />
          </Alan>
        </div>
        <Alan etiket="Enlem" yardim="Google Haritalar'da salona sağ tıklayınca çıkan ilk sayı. Yol tarifi için.">
          <Girdi value={f.enlem} onChange={(e) => setF({ ...f, enlem: e.target.value })} placeholder="41.3..." />
        </Alan>
        <Alan etiket="Boylam" yardim="İkinci sayı.">
          <Girdi value={f.boylam} onChange={(e) => setF({ ...f, boylam: e.target.value })} placeholder="36.2..." />
        </Alan>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Buton
          yukleniyor={k.kaydediliyor}
          onClick={() =>
            k.kaydet(() =>
              supabase
                .from("salon_ayarlari")
                .update({
                  ad: f.ad.trim() || "Örnek Salon",
                  adres: f.adres.trim() || null,
                  telefon: f.telefon.trim() || null,
                  enlem: f.enlem ? Number(f.enlem.replace(",", ".")) : null,
                  boylam: f.boylam ? Number(f.boylam.replace(",", ".")) : null,
                  guncellendi: new Date().toISOString(),
                })
                .eq("id", 1),
            )
          }>
          Kaydet
        </Buton>
        {k.mesaj}
      </div>
    </Bolum>
  );
}

function IsKurallari({ a, hizmetler: hiz, degisti }: { a: SalonAyarlari; hizmetler: Hizmet[]; degisti: () => void }) {
  const [f, setF] = useState({
    puan: a.puan_basina,
    odul: a.odul_puani,
    odulHizmet: a.odul_hizmet_id ?? "",
    iptal: a.ucretsiz_iptal_saat,
    hatirlatma: a.hatirlatma_saatleri.join(", "),
  });
  const k = useKaydet(degisti);
  return (
    <Bolum baslik="İş Kuralları" aciklama="Sadakat puanı, ücretsiz iptal süresi ve hatırlatmalar.">
      <div className="grid gap-4 md:grid-cols-2">
        <Alan etiket="Tamamlanan randevu başına puan">
          <Girdi type="number" min={0} value={f.puan} onChange={(e) => setF({ ...f, puan: Number(e.target.value) })} />
        </Alan>
        <Alan etiket="Ücretsiz bakım için gereken puan">
          <Girdi type="number" min={1} value={f.odul} onChange={(e) => setF({ ...f, odul: Number(e.target.value) })} />
        </Alan>
        <Alan etiket="Ödül olarak verilen hizmet">
          <Secim value={f.odulHizmet} onChange={(e) => setF({ ...f, odulHizmet: e.target.value })}>
            <option value="">— Seçilmedi —</option>
            {hiz.filter((h) => h.aktif).map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Ücretsiz iptal süresi (saat)" yardim="Randevuya bundan az kalınca müşteri uygulamadan iptal edemez.">
          <Girdi type="number" min={0} value={f.iptal} onChange={(e) => setF({ ...f, iptal: Number(e.target.value) })} />
        </Alan>
        <div className="md:col-span-2">
          <Alan etiket="Hatırlatma zamanları (randevudan kaç saat önce)" yardim="Virgülle ayırın. Ör. “24, 2” = 1 gün ve 2 saat önce. (Bildirim altyapısı kurulunca kullanılacak.)">
            <Girdi value={f.hatirlatma} onChange={(e) => setF({ ...f, hatirlatma: e.target.value })} />
          </Alan>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Buton
          yukleniyor={k.kaydediliyor}
          onClick={() =>
            k.kaydet(() =>
              supabase
                .from("salon_ayarlari")
                .update({
                  puan_basina: f.puan,
                  odul_puani: f.odul,
                  odul_hizmet_id: f.odulHizmet || null,
                  ucretsiz_iptal_saat: f.iptal,
                  hatirlatma_saatleri: f.hatirlatma
                    .split(",")
                    .map((x) => Number(x.trim()))
                    .filter((x) => Number.isFinite(x) && x > 0),
                  guncellendi: new Date().toISOString(),
                })
                .eq("id", 1),
            )
          }>
          Kaydet
        </Buton>
        {k.mesaj}
      </div>
    </Bolum>
  );
}

function WebRandevu({ a, degisti }: { a: SalonAyarlari; degisti: () => void }) {
  const [f, setF] = useState({ acik: a.web_randevu_acik, ios: a.magaza_ios ?? "", android: a.magaza_android ?? "" });
  const [kopyalandi, setKopyalandi] = useState(false);
  const k = useKaydet(degisti);
  const baglanti = typeof window === "undefined" ? "/randevu" : `${window.location.origin}/randevu`;
  return (
    <Bolum
      baslik="Web Randevu Sayfası"
      aciklama="Instagram biyografisine konacak bağlantı. Uygulama hesabı olmadan randevu alınır; uzman seçimi ve puan yalnızca uygulamada.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-krem px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">{baglanti}</span>
          <Buton
            tur="metin"
            onClick={async () => {
              await navigator.clipboard.writeText(baglanti);
              setKopyalandi(true);
            }}>
            {kopyalandi ? "Kopyalandı" : "Kopyala"}
          </Buton>
          <a href="/randevu" target="_blank" className="text-sm font-semibold text-ana hover:underline">
            Aç
          </a>
        </div>
        <Onay secili={f.acik} onDegis={(x) => setF({ ...f, acik: x })}>
          Web&apos;den randevu alınabilsin
        </Onay>
        <div className="grid gap-4 md:grid-cols-2">
          <Alan etiket="App Store bağlantısı" yardim="Uygulama yayınlanınca girin. Boşsa “Yakında” yazar.">
            <Girdi value={f.ios} onChange={(e) => setF({ ...f, ios: e.target.value })} placeholder="https://apps.apple.com/..." />
          </Alan>
          <Alan etiket="Google Play bağlantısı">
            <Girdi value={f.android} onChange={(e) => setF({ ...f, android: e.target.value })} placeholder="https://play.google.com/..." />
          </Alan>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Buton
          yukleniyor={k.kaydediliyor}
          onClick={() =>
            k.kaydet(() =>
              supabase
                .from("salon_ayarlari")
                .update({
                  web_randevu_acik: f.acik,
                  magaza_ios: f.ios.trim() || null,
                  magaza_android: f.android.trim() || null,
                  guncellendi: new Date().toISOString(),
                })
                .eq("id", 1),
            )
          }>
          Kaydet
        </Buton>
        {k.mesaj}
      </div>
    </Bolum>
  );
}

function CalismaSaatleri({ saatler, degisti }: { saatler: CalismaSaati[]; degisti: () => void }) {
  const [liste, setListe] = useState(() =>
    [1, 2, 3, 4, 5, 6, 7].map((g) => {
      const s = saatler.find((x) => x.gun === g);
      return { gun: g, kapali: s?.kapali ?? true, acilis: s?.acilis?.slice(0, 5) ?? "09:30", kapanis: s?.kapanis?.slice(0, 5) ?? "19:00" };
    }),
  );
  const k = useKaydet(degisti);
  const guncelle = (gun: number, x: Partial<(typeof liste)[number]>) => setListe(liste.map((s) => (s.gun === gun ? { ...s, ...x } : s)));
  const hatali = liste.some((s) => !s.kapali && s.acilis >= s.kapanis);

  return (
    <Bolum baslik="Çalışma Saatleri" aciklama="Müşteriler yalnızca bu saatler içinde randevu alabilir.">
      <div className="space-y-2">
        {liste.map((s) => (
          <div key={s.gun} className="grid grid-cols-[110px_90px_1fr] items-center gap-3 text-sm">
            <span className="font-medium">{GUN_ADLARI[s.gun]}</span>
            <Onay secili={!s.kapali} onDegis={(x) => guncelle(s.gun, { kapali: !x })}>
              Açık
            </Onay>
            {s.kapali ? (
              <span className="text-taupe">Kapalı</span>
            ) : (
              <div className="flex items-center gap-2">
                <Girdi type="time" step={900} value={s.acilis} onChange={(e) => guncelle(s.gun, { acilis: e.target.value })} />
                –
                <Girdi type="time" step={900} value={s.kapanis} onChange={(e) => guncelle(s.gun, { kapanis: e.target.value })} />
              </div>
            )}
          </div>
        ))}
      </div>
      {hatali && <p className="mt-2 text-sm text-tugla">Açılış saati kapanıştan önce olmalı.</p>}
      <div className="mt-4 flex items-center gap-3">
        <Buton
          disabled={hatali}
          yukleniyor={k.kaydediliyor}
          onClick={() =>
            k.kaydet(() =>
              supabase.from("calisma_saatleri").upsert(
                liste.map((s) => ({ gun: s.gun, kapali: s.kapali, acilis: s.kapali ? null : s.acilis, kapanis: s.kapali ? null : s.kapanis })),
              ),
            )
          }>
          Kaydet
        </Buton>
        {k.mesaj}
      </div>
    </Bolum>
  );
}

function KapaliGunler({ liste, degisti }: { liste: { tarih: string; aciklama: string | null }[]; degisti: () => void }) {
  const [tarih, setTarih] = useState("");
  const [aciklama, setAciklama] = useState("");
  const k = useKaydet(degisti);
  const bugun = tarihAnahtari();
  const gelecek = liste.filter((g) => g.tarih >= bugun);

  return (
    <Bolum baslik="Tatil ve Kapalı Günler" aciklama="Bu günlerde uygulamadan randevu alınamaz. Mevcut randevular otomatik iptal edilmez; Randevular sayfasından kontrol edin.">
      <div className="flex flex-wrap items-end gap-2">
        <Alan etiket="Tarih">
          <Girdi type="date" min={bugun} value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Alan>
        <div className="flex-1">
          <Alan etiket="Açıklama (isteğe bağlı)">
            <Girdi value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Ör. Kurban Bayramı" />
          </Alan>
        </div>
        <Buton
          disabled={!tarih}
          yukleniyor={k.kaydediliyor}
          onClick={async () => {
            await k.kaydet(() => supabase.from("kapali_gunler").upsert({ tarih, aciklama: aciklama.trim() || null }));
            setTarih("");
            setAciklama("");
          }}>
          Ekle
        </Buton>
      </div>
      <div className="mt-3">{k.mesaj}</div>
      <ul className="mt-3 divide-y divide-krem-koyu text-sm">
        {gelecek.length === 0 && <li className="py-2 text-taupe">Planlanmış kapalı gün yok.</li>}
        {gelecek.map((g) => (
          <li key={g.tarih} className="flex items-center justify-between py-2">
            <span>
              {uzunTarih(g.tarih)}
              {g.aciklama && <span className="text-taupe"> · {g.aciklama}</span>}
            </span>
            <Buton tur="metin" className="text-tugla" onClick={() => k.kaydet(() => supabase.from("kapali_gunler").delete().eq("tarih", g.tarih))}>
              Kaldır
            </Buton>
          </li>
        ))}
      </ul>
    </Bolum>
  );
}
