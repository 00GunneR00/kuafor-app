// Ciro hesapları (Ciro Raporu sayfası)
//   Gerçekleşen : "tamamlandı" randevularda TAHSİL EDİLEN tutar (girilmediyse liste fiyatı)
//   Bekleyen    : "onaylandı" randevuların tutarı (henüz yapılmamış ya da işaretlenmemiş)
//   Beklenen    : gerçekleşen + bekleyen
//   Kayıp       : "iptal" + "gelmedi" randevuların tutarı
// Bekleyen ve kayıp, randevu alınırken hesaplanan liste fiyatıdır (toplam_fiyat); gerçek ücret ancak
// randevu tamamlanırken girilir (tahsil_edilen).

import { AYLAR, gunEkle, isoGun } from "./tarih";

const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
import type { PanelRandevu } from "./tipler";

export type Periyot = "hafta" | "ay";

export type Ozet = {
  gerceklesen: number;
  bekleyen: number;
  beklenen: number;
  kayip: number;
  randevu: number; // iptal hariç
  tamamlanan: number;
  iptal: number;
  gelmedi: number;
  isaretlenmemis: number; // saati geçmiş ama hâlâ "onaylandı"
  tahsilFarki: number; // tamamlananlarda tahsil edilen − liste fiyatı
};

export type GunOzeti = Ozet & { tarih: string; randevular: PanelRandevu[] };

const tutar = (r: PanelRandevu) => Number(r.toplam_fiyat);
/** Tamamlanan randevuda salonda alınan ücret (girilmediyse liste fiyatı) */
export const tahsilat = (r: PanelRandevu) => Number(r.tahsil_edilen ?? r.toplam_fiyat);

export function ozetle(randevular: PanelRandevu[], simdi: number): Ozet {
  const o: Ozet = { gerceklesen: 0, bekleyen: 0, beklenen: 0, kayip: 0, randevu: 0, tamamlanan: 0, iptal: 0, gelmedi: 0, isaretlenmemis: 0, tahsilFarki: 0 };
  for (const r of randevular) {
    if (r.durum === "tamamlandi") {
      o.gerceklesen += tahsilat(r);
      o.tahsilFarki += tahsilat(r) - tutar(r);
      o.tamamlanan++;
    } else if (r.durum === "onaylandi") {
      o.bekleyen += tutar(r);
      if (new Date(r.bitis).getTime() < simdi) o.isaretlenmemis++;
    } else {
      o.kayip += tutar(r);
      if (r.durum === "iptal") o.iptal++;
      else o.gelmedi++;
    }
    if (r.durum !== "iptal") o.randevu++;
  }
  o.beklenen = o.gerceklesen + o.bekleyen;
  return o;
}

/** Seçilen tarihi içeren haftanın (Pzt–Paz) ya da ayın ilk ve son günü */
export function aralik(periyot: Periyot, tarih: string): { bas: string; bit: string } {
  if (periyot === "hafta") {
    const bas = gunEkle(tarih, -(isoGun(tarih) - 1));
    return { bas, bit: gunEkle(bas, 6) };
  }
  const bas = `${tarih.slice(0, 8)}01`;
  const sonrakiAy = gunEkle(bas, 32).slice(0, 8) + "01";
  return { bas, bit: gunEkle(sonrakiAy, -1) };
}

/** Bir önceki / sonraki periyottaki bir gün */
export function kaydir(periyot: Periyot, tarih: string, yon: 1 | -1): string {
  if (periyot === "hafta") return gunEkle(tarih, 7 * yon);
  const bas = aralik("ay", tarih).bas;
  return yon === 1 ? gunEkle(aralik("ay", tarih).bit, 1) : aralik("ay", gunEkle(bas, -1)).bas;
}

export function gunleriListele(bas: string, bit: string): string[] {
  const gunler: string[] = [];
  for (let g = bas; g <= bit; g = gunEkle(g, 1)) gunler.push(g);
  return gunler;
}

/** Randevu başlangıcının salon saatine göre günü */
function gunAnahtari(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function gunlereBol(randevular: PanelRandevu[], bas: string, bit: string, simdi: number): GunOzeti[] {
  return gunleriListele(bas, bit).map((tarih) => {
    const liste = randevular.filter((r) => gunAnahtari(r.baslangic) === tarih);
    return { tarih, randevular: liste, ...ozetle(liste, simdi) };
  });
}

/** Hizmet / uzman kırılımı (iptal ve gelmedi hariç; beklenen ciroya katkı) */
export function kirilim(randevular: PanelRandevu[], anahtar: "hizmet" | "uzman"): { ad: string; tutar: number; adet: number }[] {
  const m = new Map<string, { tutar: number; adet: number }>();
  for (const r of randevular) {
    if (r.durum === "iptal" || r.durum === "gelmedi") continue;
    // Tamamlananlarda tahsil edilen tutar, hizmetlere liste fiyatı oranında dağıtılır
    const gercek = r.durum === "tamamlandi" ? tahsilat(r) : tutar(r);
    const oran = tutar(r) > 0 ? gercek / tutar(r) : 1;
    const satirlar =
      anahtar === "hizmet" ? r.hizmetler.map((h) => ({ ad: h.ad, tutar: Number(h.fiyat) * oran })) : [{ ad: r.uzman_ad ?? "—", tutar: gercek }];
    for (const s of satirlar) {
      const x = m.get(s.ad) ?? { tutar: 0, adet: 0 };
      x.tutar += s.tutar;
      x.adet++;
      m.set(s.ad, x);
    }
  }
  return [...m.entries()].map(([ad, x]) => ({ ad, ...x })).sort((a, b) => b.tutar - a.tutar);
}

export function periyotBasligi(periyot: Periyot, bas: string, bit: string): string {
  const [by, bm, bg] = bas.split("-").map(Number);
  const [, km, kg] = bit.split("-").map(Number);
  if (periyot === "ay") return `${AYLAR[bm - 1]} ${by}`;
  return bm === km ? `${bg}–${kg} ${AYLAR[bm - 1]} ${by}` : `${bg} ${AYLAR[bm - 1]} – ${kg} ${AYLAR[km - 1]} ${by}`;
}

export function gunEtiketi(tarih: string, periyot: Periyot): string {
  const g = Number(tarih.slice(8, 10));
  const hg = GUN_KISA[new Date(`${tarih}T12:00:00+03:00`).getUTCDay()];
  return periyot === "hafta" ? `${hg} ${g}` : String(g);
}

export type HizmetSatiri = { ad: string; yapilan: number; tahsil: number; bekleyenAdet: number; bekleyen: number };

/** Uzman sayfası: hangi hizmetten kaç tane yapıldı, ne kadar tahsil edildi, kaç tane bekliyor */
export function hizmetDokumu(randevular: PanelRandevu[]): HizmetSatiri[] {
  const m = new Map<string, HizmetSatiri>();
  for (const r of randevular) {
    if (r.durum !== "tamamlandi" && r.durum !== "onaylandi") continue;
    const oran = r.durum === "tamamlandi" && tutar(r) > 0 ? tahsilat(r) / tutar(r) : 1;
    for (const h of r.hizmetler) {
      const x = m.get(h.ad) ?? { ad: h.ad, yapilan: 0, tahsil: 0, bekleyenAdet: 0, bekleyen: 0 };
      if (r.durum === "tamamlandi") {
        x.yapilan++;
        x.tahsil += Number(h.fiyat) * oran;
      } else {
        x.bekleyenAdet++;
        x.bekleyen += Number(h.fiyat);
      }
      m.set(h.ad, x);
    }
  }
  return [...m.values()].sort((a, b) => b.tahsil + b.bekleyen - (a.tahsil + a.bekleyen));
}
