import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Randevu akışı boyunca (hizmet -> uzman -> tarih & saat -> onay) seçimleri tutar.
// Adımlar arasında ileri-geri gidildiğinde seçimler korunur.
export type Taslak = {
  hizmetIds: string[];
  /** undefined: henüz seçilmedi, null: "Farketmez" */
  uzmanId: string | null | undefined;
  tarih: string | null;
  saat: string | null;
  not: string;
  /** Yeniden planlamada: yeni randevu onaylanınca iptal edilecek eski randevu */
  eskiRandevuId?: string;
};

type TaslakDegeri = {
  taslak: Taslak;
  guncelle: (degisiklik: Partial<Taslak>) => void;
  sifirla: () => void;
};

const BOS: Taslak = { hizmetIds: [], uzmanId: undefined, tarih: null, saat: null, not: '' };

const TaslakBaglami = createContext<TaslakDegeri | null>(null);

export function TaslakSaglayici({ children, baslangic }: { children: ReactNode; baslangic?: Partial<Taslak> }) {
  const [taslak, setTaslak] = useState<Taslak>({ ...BOS, ...baslangic });
  const guncelle = useCallback((d: Partial<Taslak>) => setTaslak((t) => ({ ...t, ...d })), []);
  const sifirla = useCallback(() => setTaslak(BOS), []);
  return <TaslakBaglami.Provider value={{ taslak, guncelle, sifirla }}>{children}</TaslakBaglami.Provider>;
}

export function useTaslak() {
  const d = useContext(TaslakBaglami);
  if (!d) throw new Error('useTaslak, TaslakSaglayici içinde kullanılmalı');
  return d;
}
