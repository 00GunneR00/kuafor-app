import { useEffect, useState } from 'react';

/** Şu anki zaman (ms); dakikada bir güncellenir. Çizim sırasında Date.now() çağırmamak için. */
export function useSimdi(aralikMs = 60_000): number {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setSimdi(Date.now()), aralikMs);
    return () => clearInterval(id);
  }, [aralikMs]);
  return simdi;
}

// Salon İstanbul saatinde çalışır (UTC+3, yaz saati uygulaması yok).
// Telefonun saat dilimi farklı olsa bile tarih/saatler salon saatine göre gösterilir.

const OFSET_MS = 3 * 60 * 60 * 1000;

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AYLAR_KISA = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const GUNLER_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** Anın salon saatindeki bileşenleri */
function parca(d: Date) {
  const s = new Date(d.getTime() + OFSET_MS);
  return {
    yil: s.getUTCFullYear(),
    ay: s.getUTCMonth(),
    gun: s.getUTCDate(),
    haftaGunu: s.getUTCDay(),
    saat: s.getUTCHours(),
    dakika: s.getUTCMinutes(),
  };
}

const iki = (n: number) => String(n).padStart(2, '0');

/** "2026-09-26" (salon saatine göre) */
export function tarihAnahtari(d: Date = new Date()): string {
  const p = parca(d);
  return `${p.yil}-${iki(p.ay + 1)}-${iki(p.gun)}`;
}

/** "2026-09-26" + n gün */
export function gunEkle(anahtar: string, n: number): string {
  const d = new Date(`${anahtar}T12:00:00+03:00`);
  return tarihAnahtari(new Date(d.getTime() + n * 86400000));
}

/** Tarih anahtarı + "14:30" -> ISO an (salon saati) */
export function anOlustur(anahtar: string, saat: string): string {
  return new Date(`${anahtar}T${saat}:00+03:00`).toISOString();
}

/** ISO haftanın günü (1=Pzt ... 7=Paz), veritabanındaki calisma_saatleri.gun ile aynı */
export function isoGun(anahtar: string): number {
  const g = new Date(`${anahtar}T12:00:00+03:00`).getUTCDay();
  return g === 0 ? 7 : g;
}

export function gunBilgisi(anahtar: string) {
  const p = parca(new Date(`${anahtar}T12:00:00+03:00`));
  return { gun: p.gun, ay: p.ay, yil: p.yil, haftaGunu: p.haftaGunu };
}

export function saatYaz(iso: string): string {
  const p = parca(new Date(iso));
  return `${iki(p.saat)}:${iki(p.dakika)}`;
}

/** "26 Eylül 2026 Cumartesi" */
export function uzunTarih(isoVeyaAnahtar: string): string {
  const d = isoVeyaAnahtar.length === 10 ? new Date(`${isoVeyaAnahtar}T12:00:00+03:00`) : new Date(isoVeyaAnahtar);
  const p = parca(d);
  return `${p.gun} ${AYLAR[p.ay]} ${p.yil} ${GUNLER[p.haftaGunu]}`;
}

/** "Bugün", "Yarın" ya da "Cumartesi" */
export function goreliGun(iso: string): string {
  const a = tarihAnahtari(new Date(iso));
  const bugun = tarihAnahtari();
  if (a === bugun) return 'Bugün';
  if (a === gunEkle(bugun, 1)) return 'Yarın';
  return GUNLER[parca(new Date(iso)).haftaGunu];
}

export function tarihParca(iso: string) {
  const p = parca(new Date(iso));
  return { gun: iki(p.gun), ayKisa: AYLAR_KISA[p.ay], ay: AYLAR[p.ay], yil: p.yil };
}

/** "09:30:00" -> dakika */
export function dakikaya(saat: string): number {
  const [s, d] = saat.split(':').map(Number);
  return s * 60 + d;
}

export function dakikadanSaat(dk: number): string {
  return `${iki(Math.floor(dk / 60))}:${iki(dk % 60)}`;
}

export function fiyatYaz(fiyat: number, baslangic = false): string {
  const binlik = String(Math.round(fiyat)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const metin = `${binlik} ₺`;
  return baslangic ? `${metin}'den başlayan` : metin;
}
