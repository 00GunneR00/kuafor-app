import { ac, supabase } from "./supabase";
import { anOlustur, gunEkle } from "./tarih";
import type { CalismaSaati, Hizmet, Kategori, MusteriOzeti, PanelRandevu, SalonAyarlari, Uzman, UzmanHizmet } from "./tipler";

export const RANDEVU_ALANLARI =
  "id, musteri_id, musteri_ad, musteri_telefon, uzman_id, uzman_ad, baslangic, bitis, durum, toplam_fiyat, tahsil_edilen, toplam_sure_dk, " +
  "musteri_notu, iptal_nedeni, iptal_eden, olusturan, " +
  "musteri:profiller(ad_soyad, telefon, eposta), hizmetler:randevu_hizmetleri(ad, fiyat, sure_dk)";

/** Seçilen günün (salon saatine göre) randevuları */
export async function gununRandevulari(tarih: string): Promise<PanelRandevu[]> {
  return ac(
    await supabase
      .from("randevular")
      .select(RANDEVU_ALANLARI)
      .gte("baslangic", anOlustur(tarih, "00:00"))
      .lt("baslangic", anOlustur(gunEkle(tarih, 1), "00:00"))
      .order("baslangic"),
  ) as unknown as PanelRandevu[];
}

/** İki tarih arasındaki (ikisi de dahil, salon saatine göre) randevular */
export async function araliktakiRandevular(basTarih: string, bitisTarih: string): Promise<PanelRandevu[]> {
  return ac(
    await supabase
      .from("randevular")
      .select(RANDEVU_ALANLARI)
      .gte("baslangic", anOlustur(basTarih, "00:00"))
      .lt("baslangic", anOlustur(gunEkle(bitisTarih, 1), "00:00"))
      .order("baslangic"),
  ) as unknown as PanelRandevu[];
}

export async function musterininRandevulari(musteriId: string): Promise<PanelRandevu[]> {
  return ac(
    await supabase.from("randevular").select(RANDEVU_ALANLARI).eq("musteri_id", musteriId).order("baslangic", { ascending: false }),
  ) as unknown as PanelRandevu[];
}

export async function kategoriler(): Promise<Kategori[]> {
  return ac(await supabase.from("kategoriler").select("id, ad, sira").order("sira"));
}

export async function hizmetler(): Promise<Hizmet[]> {
  return ac(
    await supabase
      .from("hizmetler")
      .select("id, kategori_id, ad, aciklama, detay, dahil, sure_dk, fiyat, fiyat_baslangic, gorsel_url, aktif, sira")
      .order("sira"),
  );
}

export async function uzmanlar(): Promise<Uzman[]> {
  return ac(await supabase.from("uzmanlar").select("id, ad, unvan, uzmanlik, foto_url, aktif, sira").order("sira"));
}

export async function uzmanHizmetleri(): Promise<UzmanHizmet[]> {
  return ac(await supabase.from("uzman_hizmetleri").select("uzman_id, hizmet_id"));
}

export async function calismaSaatleri(): Promise<CalismaSaati[]> {
  return ac(await supabase.from("calisma_saatleri").select("gun, kapali, acilis, kapanis").order("gun"));
}

export async function salonAyarlari(): Promise<SalonAyarlari> {
  return ac(
    await supabase
      .from("salon_ayarlari")
      .select(
        "ad, adres, telefon, enlem, boylam, puan_basina, odul_puani, odul_hizmet_id, ucretsiz_iptal_saat, hatirlatma_saatleri, " +
          "web_randevu_acik, magaza_ios, magaza_android",
      )
      .single(),
  );
}

export async function musteriler(): Promise<MusteriOzeti[]> {
  return ac(await supabase.from("musteri_ozeti").select("*").order("ad_soyad"));
}
