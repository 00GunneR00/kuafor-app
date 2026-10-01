import { anOlustur, dakikadanSaat, dakikaya, isoGun, tarihAnahtari } from './tarih';
import type { CalismaSaati, UzmanHizmet } from './tipler';

// Uygun saatleri telefonda hesaplar. Aynı kurallar sunucuda (randevu_olustur) tekrar
// kontrol edildiği için burası yalnızca kullanıcıya doğru seçenekleri göstermek içindir.

export const SLOT_ARALIGI_DK = 30;

export type Slot = { saat: string; uygun: boolean };

export function gunAcikMi(tarih: string, saatler: CalismaSaati[], kapaliGunler: string[]): boolean {
  if (kapaliGunler.includes(tarih)) return false;
  const g = saatler.find((s) => s.gun === isoGun(tarih));
  return !!g && !g.kapali && !!g.acilis && !!g.kapanis;
}

/** Seçilen hizmetlerin hepsini veren uzmanlar */
export function uygunUzmanlar(hizmetIds: string[], iliskiler: UzmanHizmet[], uzmanIds: string[]): string[] {
  return uzmanIds.filter((u) =>
    hizmetIds.every((h) => iliskiler.some((i) => i.uzman_id === u && i.hizmet_id === h)),
  );
}

export function slotlariHesapla(p: {
  tarih: string;
  sureDk: number;
  saatler: CalismaSaati[];
  kapaliGunler: string[];
  /** Değerlendirilecek uzmanlar (seçilen uzman ya da "Farketmez" için hepsi) */
  uzmanIds: string[];
  dolu: { uzman_id: string; baslangic: string; bitis: string }[];
  simdi?: Date;
}): Slot[] {
  if (!gunAcikMi(p.tarih, p.saatler, p.kapaliGunler) || p.uzmanIds.length === 0) return [];
  const g = p.saatler.find((s) => s.gun === isoGun(p.tarih))!;
  const acilis = dakikaya(g.acilis!);
  const kapanis = dakikaya(g.kapanis!);
  const simdi = (p.simdi ?? new Date()).getTime();
  const bugunMu = p.tarih === tarihAnahtari(p.simdi);

  const sonuc: Slot[] = [];
  for (let dk = acilis; dk + p.sureDk <= kapanis; dk += SLOT_ARALIGI_DK) {
    const saat = dakikadanSaat(dk);
    const bas = new Date(anOlustur(p.tarih, saat)).getTime();
    const bit = bas + p.sureDk * 60000;
    if (bugunMu && bas <= simdi) continue; // geçmiş saatler hiç gösterilmez
    const bosUzmanVar = p.uzmanIds.some(
      (u) =>
        !p.dolu.some(
          (d) => d.uzman_id === u && new Date(d.baslangic).getTime() < bit && new Date(d.bitis).getTime() > bas,
        ),
    );
    sonuc.push({ saat, uygun: bosUzmanVar });
  }
  return sonuc;
}
