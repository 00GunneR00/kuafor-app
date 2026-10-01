import { Linking } from 'react-native';

import { GUNLER } from './tarih';
import type { CalismaSaati, SalonAyarlari } from './tipler';

/** Yol tarifi için harita adresi (konum girildiyse koordinat, yoksa ad + adres) */
export function haritaAdresi(a: Pick<SalonAyarlari, 'ad' | 'adres' | 'enlem' | 'boylam'>) {
  if (a.enlem != null && a.boylam != null) return `https://www.google.com/maps/search/?api=1&query=${a.enlem},${a.boylam}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.ad} ${a.adres ?? ''}`)}`;
}

export function yolTarifiAc(a: Pick<SalonAyarlari, 'ad' | 'adres' | 'enlem' | 'boylam'>) {
  Linking.openURL(haritaAdresi(a));
}

/** Salon telefonu girildiyse arar; dönüş: arama başlatıldı mı */
export function salonuAra(telefon: string | null): boolean {
  if (!telefon) return false;
  Linking.openURL(`tel:${telefon.replace(/\s/g, '')}`);
  return true;
}

/** [24, 2] -> "1 gün ve 2 saat" */
export function hatirlatmaMetni(saatler: number[]) {
  return saatler
    .slice()
    .sort((a, b) => b - a)
    .map((h) => (h % 24 === 0 ? `${h / 24} gün` : `${h} saat`))
    .join(' ve ');
}

/** Çalışma saatlerini kısaltır: "Pzt–Cmt 09:30–19:00 · Pazar kapalı" */
export function saatOzeti(saatler: CalismaSaati[]): string {
  const kisa = ['', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const acik = saatler.filter((s) => !s.kapali && s.acilis && s.kapanis);
  const kapali = saatler.filter((s) => s.kapali).map((s) => GUNLER[s.gun % 7]);
  if (acik.length === 0) return 'Çalışma saatleri henüz girilmedi';
  const ayniSaat = acik.every((s) => s.acilis === acik[0].acilis && s.kapanis === acik[0].kapanis);
  const saat = (s: CalismaSaati) => `${s.acilis!.slice(0, 5)}–${s.kapanis!.slice(0, 5)}`;
  const ardisik = acik.every((s, i) => i === 0 || s.gun === acik[i - 1].gun + 1);
  const ana =
    ayniSaat && ardisik
      ? `${kisa[acik[0].gun]}–${kisa[acik[acik.length - 1].gun]} ${saat(acik[0])}`
      : acik.map((s) => `${kisa[s.gun]} ${saat(s)}`).join(', ');
  return kapali.length ? `${ana} · ${kapali.join(', ')} kapalı` : ana;
}
