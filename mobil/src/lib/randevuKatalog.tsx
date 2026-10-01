import { createContext, useContext, type ReactNode } from 'react';

import type { CalismaSaati, Hizmet, Kategori, SalonAyarlari, Uzman, UzmanHizmet } from './tipler';
import {
  calismaSaatleriniGetir,
  hizmetleriGetir,
  kapaliGunleriGetir,
  kategorileriGetir,
  salonAyarlariniGetir,
  useSorgu,
  uzmanHizmetleriniGetir,
  uzmanlariGetir,
} from './veri';

export type Katalog = {
  kategoriler: Kategori[];
  hizmetler: Hizmet[];
  uzmanlar: Uzman[];
  iliskiler: UzmanHizmet[];
  saatler: CalismaSaati[];
  kapaliGunler: string[];
  ayarlar: SalonAyarlari;
};

type KatalogDegeri = ReturnType<typeof useSorgu<Katalog>>;

const KatalogBaglami = createContext<KatalogDegeri | null>(null);

/** Randevu akışının tüm adımlarında kullanılan salon verisi (bir kez yüklenir) */
export function KatalogSaglayici({ children }: { children: ReactNode }) {
  const sorgu = useSorgu<Katalog>(async () => {
    const [kategoriler, hizmetler, uzmanlar, iliskiler, saatler, kapaliGunler, ayarlar] = await Promise.all([
      kategorileriGetir(),
      hizmetleriGetir(),
      uzmanlariGetir(),
      uzmanHizmetleriniGetir(),
      calismaSaatleriniGetir(),
      kapaliGunleriGetir(),
      salonAyarlariniGetir(),
    ]);
    return { kategoriler, hizmetler, uzmanlar, iliskiler, saatler, kapaliGunler, ayarlar };
  });
  return <KatalogBaglami.Provider value={sorgu}>{children}</KatalogBaglami.Provider>;
}

export function useKatalog() {
  const d = useContext(KatalogBaglami);
  if (!d) throw new Error('useKatalog, KatalogSaglayici içinde kullanılmalı');
  return d;
}
