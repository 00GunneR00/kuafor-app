// Veritabanı satır tipleri (supabase/migrations ile eşleşir)

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
  aktif: boolean;
  sira: number;
};

export type Uzman = {
  id: string;
  ad: string;
  unvan: string | null;
  uzmanlik: string | null;
  foto_url: string | null;
  aktif: boolean;
  sira: number;
};

export type UzmanHizmet = { uzman_id: string; hizmet_id: string };

export type RandevuDurum = "onaylandi" | "tamamlandi" | "iptal" | "gelmedi";

export type PanelRandevu = {
  id: string;
  musteri_id: string | null;
  musteri_ad: string | null;
  musteri_telefon: string | null;
  /** Uzman silindiyse boş; ad uzman_ad alanında korunur */
  uzman_id: string | null;
  uzman_ad: string | null;
  baslangic: string;
  bitis: string;
  durum: RandevuDurum;
  /** Randevu alınırken hesaplanan liste fiyatı */
  toplam_fiyat: number;
  /** Salonda gerçekten alınan ücret (yalnızca tamamlanan randevularda; boşsa liste fiyatı kullanılır) */
  tahsil_edilen: number | null;
  toplam_sure_dk: number;
  musteri_notu: string | null;
  iptal_nedeni: string | null;
  iptal_eden: "musteri" | "salon" | null;
  /** musteri: uygulamadan, salon: panelden, web: hesapsız web randevu sayfasından */
  olusturan: "musteri" | "salon" | "web";
  musteri: { ad_soyad: string; telefon: string | null; eposta: string | null } | null;
  hizmetler: { ad: string; fiyat: number; sure_dk: number }[];
};

export type MusteriOzeti = {
  id: string;
  ad_soyad: string;
  telefon: string | null;
  eposta: string | null;
  kampanya_izni: boolean;
  olusturuldu: string;
  tamamlanan: number;
  gelmedi: number;
  iptal: number;
  son_ziyaret: string | null;
  siradaki_randevu: string | null;
  puan: number;
};

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
  web_randevu_acik: boolean;
  magaza_ios: string | null;
  magaza_android: string | null;
};

export type Kampanya = {
  id: string;
  baslik: string;
  aciklama: string | null;
  etiket: string | null;
  gorsel_url: string | null;
  hizmet_id: string | null;
  baslangic: string | null;
  bitis: string | null;
  aktif: boolean;
  sira: number;
};

export type GaleriOgesi = {
  id: string;
  gorsel_url: string;
  kategori_id: string | null;
  hizmet_adi: string | null;
  uzman_id: string | null;
  aktif: boolean;
  sira: number;
};

export const DURUM_ADI: Record<RandevuDurum, string> = {
  onaylandi: "Onaylandı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
};

export function musteriAdi(r: Pick<PanelRandevu, "musteri" | "musteri_ad">): string {
  return r.musteri?.ad_soyad || r.musteri_ad || "İsimsiz müşteri";
}
