// Veritabanı satır tipleri (supabase/migrations/0001_temel_sema.sql ile eşleşir)

export type Kategori = { id: string; ad: string; sira: number };

export type Hizmet = {
  id: string;
  kategori_id: string;
  ad: string;
  aciklama: string | null;
  detay: string | null;
  dahil: string[];
  sure_dk: number;
  fiyat: number;
  fiyat_baslangic: boolean;
  gorsel_url: string | null;
  sira: number;
};

export type Uzman = {
  id: string;
  ad: string;
  unvan: string | null;
  uzmanlik: string | null;
  foto_url: string | null;
  sira: number;
};

export type UzmanHizmet = { uzman_id: string; hizmet_id: string };

export type CalismaSaati = { gun: number; kapali: boolean; acilis: string | null; kapanis: string | null };

export type SalonAyarlari = {
  ad: string;
  adres: string | null;
  telefon: string | null;
  enlem: number | null;
  boylam: number | null;
  puan_basina: number;
  odul_puani: number;
  odul_hizmet_id: string | null;
  ucretsiz_iptal_saat: number;
  hatirlatma_saatleri: number[];
};

export type Profil = {
  id: string;
  ad_soyad: string;
  telefon: string | null;
  rol: 'musteri' | 'yonetici';
  kampanya_izni: boolean;
  hatirlatma_bildirim: boolean;
};

export type RandevuDurum = 'onaylandi' | 'tamamlandi' | 'iptal' | 'gelmedi';

export type Randevu = {
  id: string;
  /** Uzman silindiyse boş; adı uzman_ad alanında korunur */
  uzman_id: string | null;
  uzman_ad: string | null;
  baslangic: string;
  bitis: string;
  durum: RandevuDurum;
  toplam_fiyat: number;
  toplam_sure_dk: number;
  musteri_notu: string | null;
  iptal_eden: 'musteri' | 'salon' | null;
  iptal_tarihi: string | null;
  uzman: { ad: string; unvan: string | null; foto_url: string | null } | null;
  /** hizmet_id: hizmet silindiyse boş (ad/fiyat/süre randevuda saklı kalır) */
  hizmetler: { hizmet_id: string | null; ad: string; fiyat: number; sure_dk: number }[];
};

export type PuanHareketi = {
  id: string;
  miktar: number;
  tur: 'kazanim' | 'odul' | 'duzeltme';
  aciklama: string | null;
  olusturuldu: string;
};

export type Kampanya = {
  id: string;
  baslik: string;
  aciklama: string | null;
  etiket: string | null;
  gorsel_url: string | null;
  hizmet_id: string | null;
};

export type GaleriOgesi = {
  id: string;
  gorsel_url: string;
  kategori_id: string | null;
  hizmet_adi: string | null;
  uzman: { ad: string } | null;
};

/** Randevunun uzman adı (uzman silindiyse randevuda saklanan ad) */
export function uzmanAdi(r: Pick<Randevu, 'uzman' | 'uzman_ad'>): string {
  return r.uzman?.ad ?? r.uzman_ad ?? '—';
}

/**
 * "Tekrar Randevu Al" / yeniden planlama için akışın başlangıcı.
 * Silinmiş hizmetler atlanır; hiçbiri kalmadıysa hizmet seçiminden başlanır.
 */
export function tekrarRandevuHedefi(r: Pick<Randevu, 'hizmetler' | 'uzman_id'>, ek: Record<string, string> = {}) {
  const hizmetIds = r.hizmetler.map((h) => h.hizmet_id).filter((x): x is string => !!x);
  if (hizmetIds.length === 0) return { pathname: '/randevu/hizmet' as const, params: ek };
  return {
    pathname: '/randevu/tarih-saat' as const,
    params: { hizmet: hizmetIds.join(','), ...(r.uzman_id ? { uzman: r.uzman_id } : {}), ...ek },
  };
}
