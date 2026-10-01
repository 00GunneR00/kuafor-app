// Salon İstanbul saatinde çalışır (UTC+3, yaz saati yok). Bilgisayarın saat dilimi farklı olsa bile
// tüm tarih/saatler salon saatine göre gösterilir ve kaydedilir. (mobil/src/lib/tarih.ts ile aynı mantık)

const OFSET_MS = 3 * 60 * 60 * 1000;

export const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const iki = (n: number) => String(n).padStart(2, "0");

function parca(d: Date) {
  const s = new Date(d.getTime() + OFSET_MS);
  return { yil: s.getUTCFullYear(), ay: s.getUTCMonth(), gun: s.getUTCDate(), haftaGunu: s.getUTCDay(), saat: s.getUTCHours(), dakika: s.getUTCMinutes() };
}

/** "2026-09-26" (salon saatine göre) */
export function tarihAnahtari(d: Date = new Date()): string {
  const p = parca(d);
  return `${p.yil}-${iki(p.ay + 1)}-${iki(p.gun)}`;
}

export function gunEkle(anahtar: string, n: number): string {
  return tarihAnahtari(new Date(new Date(`${anahtar}T12:00:00+03:00`).getTime() + n * 86400000));
}

/** Tarih anahtarı + "14:30" -> ISO an */
export function anOlustur(anahtar: string, saat: string): string {
  return new Date(`${anahtar}T${saat}:00+03:00`).toISOString();
}

/** ISO haftanın günü (1=Pzt ... 7=Paz) */
export function isoGun(anahtar: string): number {
  const g = new Date(`${anahtar}T12:00:00+03:00`).getUTCDay();
  return g === 0 ? 7 : g;
}

export function saatYaz(iso: string): string {
  const p = parca(new Date(iso));
  return `${iki(p.saat)}:${iki(p.dakika)}`;
}

/** Salon saatine göre günün kaçıncı dakikası */
export function gunDakikasi(iso: string): number {
  const p = parca(new Date(iso));
  return p.saat * 60 + p.dakika;
}

/** "26 Eylül 2026 Cumartesi" */
export function uzunTarih(isoVeyaAnahtar: string): string {
  const d = isoVeyaAnahtar.length === 10 ? new Date(`${isoVeyaAnahtar}T12:00:00+03:00`) : new Date(isoVeyaAnahtar);
  const p = parca(d);
  return `${p.gun} ${AYLAR[p.ay]} ${p.yil} ${GUNLER[p.haftaGunu]}`;
}

/** "26 Eyl 2026" */
export function kisaTarih(iso: string): string {
  const p = parca(new Date(iso));
  return `${p.gun} ${AYLAR[p.ay].slice(0, 3)} ${p.yil}`;
}

/** Bugünden kaç gün önce (salon saatine göre) */
export function kacGunOnce(iso: string, simdi: number): number {
  const a = new Date(`${tarihAnahtari(new Date(iso))}T12:00:00+03:00`).getTime();
  const b = new Date(`${tarihAnahtari(new Date(simdi))}T12:00:00+03:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function dakikaya(saat: string): number {
  const [s, d] = saat.split(":").map(Number);
  return s * 60 + d;
}

export function dakikadanSaat(dk: number): string {
  return `${iki(Math.floor(dk / 60))}:${iki(dk % 60)}`;
}

export function fiyatYaz(fiyat: number, baslangic = false): string {
  const metin = `${String(Math.round(fiyat)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₺`;
  return baslangic ? `${metin}'den başlayan` : metin;
}
