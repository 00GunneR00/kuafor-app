// Satış demosu için örnek veri üretir: node supabase/demo/olustur.mjs
// Çıktı: demo_veri.sql (SQL Editor'de çalıştırılır). Silmek için demo_sil.sql.
// Tüm demo satırlarının id'si "de300000-" ile başlar, böylece tek sorguyla silinir.
import { writeFileSync } from "node:fs";

const BUGUN = "2026-09-26"; // takvimin dolu görüneceği gün (Cumartesi)
const SIMDI_DK = 14 * 60 + 15; // bugün bu saatten öncekiler "tamamlandı"
const GERI_GUN = 60;
const ILERI_GUN = 14;
const ACILIS = 9 * 60 + 30;
const KAPANIS = 19 * 60;
const ZEHRA = "0534eba7-6854-4474-89f1-6a378bad8414"; // videodaki müşteri hesabı (Ayşe Demir, ayse@gmail.com)

// Deterministik rastgele (her çalıştırmada aynı veri)
let tohum = 20260926;
const rnd = () => ((tohum = (tohum * 1664525 + 1013904223) % 4294967296) / 4294967296);
const sec = (dizi) => dizi[Math.floor(rnd() * dizi.length)];
const agirlikli = (dizi) => {
  let t = rnd() * dizi.reduce((a, x) => a + x.w, 0);
  for (const x of dizi) if ((t -= x.w) <= 0) return x;
  return dizi[dizi.length - 1];
};

let sayac = 0;
const yeniId = (tur) => `de300000-0000-4000-8${tur}00-${String(++sayac).padStart(12, "0")}`;

const H = {
  kesim: { id: "f0692af6-5fe4-4887-b0d2-7d2cf6cdf8e7", ad: "Kesim & Fön", fiyat: 600, dk: 60 },
  fon: { id: "a21a7284-caf2-4519-8b36-4acc8facd443", ad: "Fön", fiyat: 300, dk: 30 },
  fonBakim: { id: "82b4fe46-21a3-49eb-b920-e8597a911728", ad: "Fön & Bakım", fiyat: 450, dk: 45 },
  perma: { id: "50a7598f-4154-423f-9a93-76d4c4daa9e7", ad: "Perma Fön / Dalga", fiyat: 500, dk: 45 },
  dip: { id: "28cb76f1-cf65-46ad-a7d8-94f3091a2f97", ad: "Dip Boya", fiyat: 1200, dk: 90 },
  tum: { id: "d5a678b4-6487-4628-965d-424be80eabba", ad: "Tüm Boya", fiyat: 1800, dk: 120 },
  ombre: { id: "9c2c30f3-e550-49fb-a1ba-f8f69af99e1f", ad: "Ombre / Balyaj", fiyat: 3500, dk: 180 },
  keratin: { id: "3b0ffa59-b8e9-498a-8598-0f6b3103b77c", ad: "Keratin Bakımı", fiyat: 2000, dk: 120 },
  botoks: { id: "e417732e-e1c0-49ea-b3ac-808232c367db", ad: "Saç Botoksu", fiyat: 1500, dk: 90 },
  topuz: { id: "a6749e29-649b-484c-bdda-8029856c756a", ad: "Topuz", fiyat: 750, dk: 45 },
  gelin: { id: "bd4330b9-f24b-4037-80ec-12c62847fee9", ad: "Gelin Saçı", fiyat: 3000, dk: 120 },
};

const UZMANLAR = [
  { id: "edb5b2d9-09b3-46db-bd0b-7e4ca83c26fa", ad: "Elif", hizmet: [
    { h: H.kesim, w: 5 }, { h: H.fon, w: 3 }, { h: H.fonBakim, w: 3 }, { h: H.perma, w: 2 }, { h: H.topuz, w: 1 }] },
  { id: "5f0ba41b-e413-453f-a7ab-97fa386b50d7", ad: "Zeynep", hizmet: [
    { h: H.dip, w: 5 }, { h: H.tum, w: 2 }, { h: H.ombre, w: 2 }, { h: H.kesim, w: 2 }, { h: H.fon, w: 1 }] },
  { id: "eab08ad8-bdb6-4ade-8d4b-7a70b094160b", ad: "Merve", hizmet: [
    { h: H.kesim, w: 3 }, { h: H.fon, w: 3 }, { h: H.perma, w: 3 }, { h: H.topuz, w: 2 }, { h: H.fonBakim, w: 2 }, { h: H.gelin, w: 1 }] },
  { id: "273d86d4-c063-4e8a-9845-b2ca0a1c4475", ad: "Ayşe", hizmet: [
    { h: H.fonBakim, w: 4 }, { h: H.keratin, w: 2 }, { h: H.botoks, w: 3 }, { h: H.fon, w: 2 }] },
];
const uzmanAd = (ad) => UZMANLAR.find((u) => u.ad === ad);

const ADLAR = ["Ayşe", "Büşra", "Cansu", "Derya", "Ebru", "Esra", "Fatma", "Gamze", "Hande", "İrem", "Kübra", "Melike", "Merve", "Nur", "Özlem", "Pınar", "Rabia", "Seda", "Sibel", "Tuğba", "Yasemin", "Zeynep", "Elif", "Selin", "Burcu", "Didem", "Emine", "Hatice", "Leyla", "Sevgi"];
const SOYADLAR = ["Kaya", "Demir", "Arslan", "Koç", "Şahin", "Yıldız", "Aydın", "Öztürk", "Çelik", "Doğan", "Kılıç", "Aslan", "Polat", "Erdoğan", "Kurt", "Özdemir", "Yavuz", "Aksoy", "Taş", "Güneş", "Bulut", "Aktaş", "Karaca", "Uçar", "Kara", "Yalçın"];
const ISIMLER = Array.from({ length: 80 }, (_, i) => `${ADLAR[i % ADLAR.length]} ${SOYADLAR[(i * 7) % SOYADLAR.length]}`);
const MISAFIR = ["Aslı Tekin", "Beyza Korkmaz", "Damla Şen", "Ece Altun", "Gizem Yurt", "Hilal Sarı", "Nazlı Duman", "Sena Çınar", "Şeyma Ateş", "Tuba Eren"];
const tel = () => `05${sec(["32", "33", "35", "41", "42", "43", "44", "53", "54", "55"])}${String(Math.floor(rnd() * 1e7)).padStart(7, "0")}`;

// 80 müşteri: son 12'si 45+ gündür gelmeyen
const musteriler = ISIMLER.map((ad, i) => ({
  id: yeniId("1"),
  ad,
  tel: tel(),
  eposta: `demo${i + 1}@ornek.demo`,
  kaybolan: i >= 68,
  sadakat: i < 10 ? 3 : i < 30 ? 2 : 1,
  kayit: -Math.floor(20 + rnd() * 100),
}));

// Tarih yardımcıları (İstanbul saati, +03)
const gunEkle = (tarih, n) => {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const haftaGunu = (tarih) => new Date(`${tarih}T12:00:00Z`).getUTCDay(); // 0 = Pazar
const zaman = (tarih, dk) => `${tarih} ${String(Math.floor(dk / 60)).padStart(2, "0")}:${String(dk % 60).padStart(2, "0")}:00+03`;

const randevular = [];
const doluluk = {}; // `${uzmanId}|${tarih}` -> [[bas, bit]]
const dolu = (u, t, b, e) => (doluluk[`${u}|${t}`] ?? []).some(([x, y]) => b < y && x < e);
const isaretle = (u, t, b, e) => (doluluk[`${u}|${t}`] ??= []).push([b, e]);

// Mevcut (gerçek) test randevuları: çakışmasın
isaretle(uzmanAd("Ayşe").id, "2026-09-25", 11 * 60 + 30, 15 * 60);

function randevuEkle({ tarih, bas, uzman, hizmet, musteri, durum, olusturan }) {
  const bit = bas + hizmet.dk;
  isaretle(uzman.id, tarih, bas, bit);
  const r = { id: yeniId("2"), tarih, bas, bit, uzman, hizmet, musteri, durum, olusturan };
  randevular.push(r);
  return r;
}

// Sabit randevular (videoda gösterilecek)
// Video müşterisinin yaklaşan randevusu (videodaki randevu akışıyla aynı): Salı 29 Eylül 14:00, Elif, Fön & Bakım
randevuEkle({ tarih: "2026-09-29", bas: 14 * 60, uzman: uzmanAd("Elif"), hizmet: H.fonBakim, musteri: { id: ZEHRA }, durum: "onaylandi", olusturan: "musteri" });

function musteriSec(gunFarki) {
  if (rnd() < 0.6) return { ad: sec(MISAFIR), tel: tel(), misafir: true };
  const adaylar = musteriler
    .filter((m) => (m.kaybolan ? gunFarki < -46 : true) && gunFarki >= m.kayit)
    .map((m) => ({ ...m, w: m.sadakat }));
  if (!adaylar.length) return { ad: sec(MISAFIR), tel: tel(), misafir: true };
  const secilen = agirlikli(adaylar).id;
  return musteriler.find((m) => m.id === secilen);
}

for (let g = -GERI_GUN; g <= ILERI_GUN; g++) {
  const tarih = gunEkle(BUGUN, g);
  const hg = haftaGunu(tarih);
  if (hg === 0) continue; // Pazar kapalı
  // Doluluk: geçmişte ~%65, bugün çok dolu, gelecekte giderek azalan
  const oran = g === 0 ? 0.92 : g < 0 ? (hg === 6 ? 0.8 : 0.6) : Math.max(0.15, 0.7 - g * 0.05);
  for (const uzman of UZMANLAR) {
    let dk = ACILIS;
    while (dk < KAPANIS) {
      const hizmet = agirlikli(uzman.hizmet).h;
      const bit = dk + hizmet.dk;
      if (bit > KAPANIS || dolu(uzman.id, tarih, dk, bit) || rnd() > oran) {
        dk += 30;
        continue;
      }
      const musteri = musteriSec(g);
      let durum;
      if (g < 0 || (g === 0 && bit <= SIMDI_DK)) {
        const x = rnd();
        durum = g === 0 ? "tamamlandi" : x < 0.05 ? "gelmedi" : x < 0.11 ? "iptal" : "tamamlandi";
      } else durum = g !== 0 && rnd() < 0.05 ? "iptal" : "onaylandi";
      const olusturan = musteri.misafir ? (rnd() < 0.6 ? "web" : "salon") : rnd() < 0.85 ? "musteri" : "salon";
      randevuEkle({ tarih, bas: dk, uzman, hizmet, musteri, durum, olusturan });
      dk = bit + (rnd() < 0.5 ? 0 : 15);
      dk = Math.ceil(dk / 15) * 15;
    }
  }
}

// Video müşterisi'ya 9 geçmiş ziyaret ver (450 puan, ödüle 1 ziyaret kaldı)
const zehraAdaylari = randevular.filter((r) => r.durum === "tamamlandi" && r.tarih < BUGUN && [H.kesim, H.fonBakim, H.fon, H.dip, H.botoks].includes(r.hizmet));
const adim = Math.floor(zehraAdaylari.length / 9);
for (let i = 0; i < 9; i++) zehraAdaylari[i * adim + 3].musteri = { id: ZEHRA };

// SQL
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const satirlar = [];
satirlar.push("-- Örnek Salon satış demosu: örnek veri. olustur.mjs üretir, elle düzenlemeyin.");
satirlar.push("-- Silmek için: demo_sil.sql");
satirlar.push("begin;");
satirlar.push("");
satirlar.push("-- Demo müşteriler (profiller satırını yeni_kullanici tetikleyicisi oluşturur; giriş yapılamaz, şifre yok)");
satirlar.push("insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values");
satirlar.push(
  musteriler
    .map((m) => {
      const t = zaman(gunEkle(BUGUN, m.kayit), 12 * 60);
      const meta = JSON.stringify({ ad_soyad: m.ad, telefon: m.tel, kvkk_onay: true, kampanya_izni: rnd() < 0.8 });
      return `  ('00000000-0000-0000-0000-000000000000', ${q(m.id)}, 'authenticated', 'authenticated', ${q(m.eposta)}, '', ${q(t)}, '{"provider":"email","providers":["email"]}', ${q(meta)}, ${q(t)}, ${q(t)})`;
    })
    .join(",\n") + ";",
);
satirlar.push("update public.profiller p set olusturuldu = u.created_at from auth.users u where u.id = p.id and p.id::text like 'de300000-%';");
satirlar.push("");
satirlar.push("-- Randevular");
satirlar.push("insert into public.randevular (id, musteri_id, uzman_id, uzman_ad, baslangic, bitis, durum, toplam_fiyat, toplam_sure_dk, tahsil_edilen, musteri_ad, musteri_telefon, olusturan, iptal_eden, iptal_nedeni, iptal_tarihi, olusturuldu) values");
satirlar.push(
  randevular
    .map((r) => {
      const kayitli = !!r.musteri.id;
      const iptal = r.durum === "iptal";
      return `  (${q(r.id)}, ${kayitli ? q(r.musteri.id) : "null"}, ${q(r.uzman.id)}, ${q(r.uzman.ad)}, ${q(zaman(r.tarih, r.bas))}, ${q(zaman(r.tarih, r.bit))}, ${q(r.durum)}, ${r.hizmet.fiyat}, ${r.hizmet.dk}, ${r.durum === "tamamlandi" ? r.hizmet.fiyat : "null"}, ${kayitli ? "null" : q(r.musteri.ad)}, ${kayitli ? "null" : q(r.musteri.tel)}, ${q(r.olusturan)}, ${iptal ? q(rnd() < 0.7 ? "musteri" : "salon") : "null"}, ${iptal ? q(sec(["Planım değişti", "Rahatsızlandım", "İşten çıkamadım", null])) : "null"}, ${iptal ? q(zaman(gunEkle(r.tarih, -1), 18 * 60)) : "null"}, ${q(zaman(gunEkle(r.tarih, -Math.floor(1 + rnd() * 6)), 10 * 60 + Math.floor(rnd() * 600)))})`;
    })
    .join(",\n") + ";",
);
satirlar.push("");
satirlar.push("insert into public.randevu_hizmetleri (id, randevu_id, hizmet_id, ad, fiyat, sure_dk) values");
satirlar.push(randevular.map((r) => `  (${q(yeniId("3"))}, ${q(r.id)}, ${q(r.hizmet.id)}, ${q(r.hizmet.ad)}, ${r.hizmet.fiyat}, ${r.hizmet.dk})`).join(",\n") + ";");
satirlar.push("");
satirlar.push("-- Tamamlanan her randevu için 50 puan");
const puanlar = randevular.filter((r) => r.durum === "tamamlandi" && r.musteri.id);
satirlar.push("insert into public.puan_hareketleri (id, musteri_id, randevu_id, miktar, tur, aciklama, olusturuldu) values");
satirlar.push(puanlar.map((r) => `  (${q(yeniId("4"))}, ${q(r.musteri.id)}, ${q(r.id)}, 50, 'kazanim', ${q(r.hizmet.ad)}, ${q(zaman(r.tarih, r.bit))})`).join(",\n") + ";");
satirlar.push("");
satirlar.push("-- Kampanyalar");
satirlar.push("insert into public.kampanyalar (id, baslik, aciklama, etiket, hizmet_id, baslangic, bitis, aktif, sira) values");
satirlar.push(
  [
    ["Kuruluş Yıl Dönümü Kampanyası", "Tüm boya hizmetlerinde %20 indirim. Ekim sonuna kadar geçerli.", "%20 İndirim", H.tum.id, 1],
    ["Keratin Bakımında Fön Hediye", "Keratin bakımı yaptıran herkese bir sonraki fön bizden.", "Hediye", H.keratin.id, 2],
    ["Gelin Paketi", "Gelin saçı + prova + nikah günü makyaj danışmanlığı tek pakette.", "Yeni", H.gelin.id, 3],
  ]
    .map(([b, a, e, h, s]) => `  (${q(yeniId("5"))}, ${q(b)}, ${q(a)}, ${q(e)}, ${q(h)}, '2026-09-20', '2026-10-31', true, ${s})`)
    .join(",\n") + ";",
);
satirlar.push("");
satirlar.push("commit;");
satirlar.push("");

writeFileSync(new URL("./demo_veri.sql", import.meta.url), satirlar.join("\n"));
const say = (d) => randevular.filter((r) => r.durum === d).length;
console.log(`müşteri ${musteriler.length}, randevu ${randevular.length} (tamamlandı ${say("tamamlandi")}, onaylı ${say("onaylandi")}, iptal ${say("iptal")}, gelmedi ${say("gelmedi")}), puan ${puanlar.length}`);
console.log(`bugün: ${randevular.filter((r) => r.tarih === BUGUN).length} randevu`);
