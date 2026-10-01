import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from './supabase';
import type {
  CalismaSaati,
  GaleriOgesi,
  Hizmet,
  Kampanya,
  Kategori,
  PuanHareketi,
  Randevu,
  SalonAyarlari,
  Uzman,
  UzmanHizmet,
} from './tipler';

/**
 * Basit veri çekme kancası: { veri, yukleniyor, hata, yenile }
 * `anahtar` değişince veri yeniden çekilir (ör. giriş yapan kullanıcı değişince).
 */
export function useSorgu<T>(getir: () => Promise<T>, anahtar: unknown[] = []) {
  const [veri, setVeri] = useState<T | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // En güncel getir fonksiyonunu tut (her çizimde yeni bir fonksiyon gelir)
  const getirRef = useRef(getir);
  useEffect(() => {
    getirRef.current = getir;
  });

  // Sonucu duruma yazar; iptal edildiyse (ekran kapandı / anahtar değişti) yok sayar
  const cek = useCallback((iptal: { deger: boolean }) => {
    return getirRef.current().then(
      (v) => {
        if (iptal.deger) return;
        setVeri(v);
        setHata(null);
        setYukleniyor(false);
      },
      (e) => {
        if (iptal.deger) return;
        setHata(e instanceof Error ? e.message : 'Bir hata oluştu');
        setYukleniyor(false);
      },
    );
  }, []);

  const anahtarMetni = JSON.stringify(anahtar);
  useEffect(() => {
    const iptal = { deger: false };
    cek(iptal);
    return () => {
      iptal.deger = true;
    };
  }, [anahtarMetni, cek]);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    await cek({ deger: false });
  }, [cek]);

  return { veri, yukleniyor, hata, yenile };
}

function kontrol<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// --- Katalog (herkese açık) ---

export async function kategorileriGetir(): Promise<Kategori[]> {
  return kontrol(await supabase.from('kategoriler').select('id, ad, sira').order('sira'));
}

export async function hizmetleriGetir(): Promise<Hizmet[]> {
  return kontrol(
    await supabase
      .from('hizmetler')
      .select('id, kategori_id, ad, aciklama, detay, dahil, sure_dk, fiyat, fiyat_baslangic, gorsel_url, sira')
      .order('sira'),
  );
}

export async function uzmanlariGetir(): Promise<Uzman[]> {
  return kontrol(await supabase.from('uzmanlar').select('id, ad, unvan, uzmanlik, foto_url, sira').order('sira'));
}

export async function uzmanHizmetleriniGetir(): Promise<UzmanHizmet[]> {
  return kontrol(await supabase.from('uzman_hizmetleri').select('uzman_id, hizmet_id'));
}

export async function salonAyarlariniGetir(): Promise<SalonAyarlari> {
  return kontrol(
    await supabase
      .from('salon_ayarlari')
      .select('ad, adres, telefon, enlem, boylam, puan_basina, odul_puani, odul_hizmet_id, ucretsiz_iptal_saat, hatirlatma_saatleri')
      .single(),
  );
}

export async function calismaSaatleriniGetir(): Promise<CalismaSaati[]> {
  return kontrol(await supabase.from('calisma_saatleri').select('gun, kapali, acilis, kapanis').order('gun'));
}

export async function kapaliGunleriGetir(): Promise<string[]> {
  const satirlar: { tarih: string }[] = kontrol(await supabase.from('kapali_gunler').select('tarih'));
  return satirlar.map((s) => s.tarih);
}

export async function kampanyalariGetir(): Promise<Kampanya[]> {
  return kontrol(
    await supabase.from('kampanyalar').select('id, baslik, aciklama, etiket, gorsel_url, hizmet_id').order('sira'),
  );
}

export async function galeriyiGetir(): Promise<GaleriOgesi[]> {
  return kontrol(
    await supabase
      .from('galeri')
      .select('id, gorsel_url, kategori_id, hizmet_adi, uzman:uzmanlar(ad)')
      .order('sira'),
  ) as unknown as GaleriOgesi[];
}

// --- Müşterinin kendi verisi (RLS: yalnızca kendi satırları döner) ---

const RANDEVU_ALANLARI =
  'id, uzman_id, uzman_ad, baslangic, bitis, durum, toplam_fiyat, toplam_sure_dk, musteri_notu, iptal_eden, iptal_tarihi, ' +
  'uzman:uzmanlar(ad, unvan, foto_url), hizmetler:randevu_hizmetleri(hizmet_id, ad, fiyat, sure_dk)';

export async function randevularimiGetir(): Promise<Randevu[]> {
  return kontrol(
    await supabase.from('randevular').select(RANDEVU_ALANLARI).order('baslangic', { ascending: false }),
  ) as unknown as Randevu[];
}

export async function randevuGetir(id: string): Promise<Randevu> {
  return kontrol(
    await supabase.from('randevular').select(RANDEVU_ALANLARI).eq('id', id).single(),
  ) as unknown as Randevu;
}

export async function puanBakiyesiniGetir(): Promise<number> {
  const { data, error } = await supabase.from('puan_bakiyeleri').select('bakiye').maybeSingle();
  if (error) throw new Error(error.message);
  return data?.bakiye ?? 0;
}

export async function puanHareketleriniGetir(): Promise<PuanHareketi[]> {
  return kontrol(
    await supabase
      .from('puan_hareketleri')
      .select('id, miktar, tur, aciklama, olusturuldu')
      .order('olusturuldu', { ascending: false }),
  );
}

// --- İşlemler (kurallar sunucuda kontrol edilir) ---

export async function doluAraliklariGetir(tarih: string) {
  return kontrol(await supabase.rpc('dolu_araliklar', { p_tarih: tarih })) as {
    uzman_id: string;
    baslangic: string;
    bitis: string;
  }[];
}

export async function randevuOlustur(p: {
  baslangic: string;
  hizmetIds: string[];
  uzmanId: string | null;
  not: string;
}): Promise<string> {
  return kontrol(
    await supabase.rpc('randevu_olustur', {
      p_baslangic: p.baslangic,
      p_hizmet_ids: p.hizmetIds,
      p_uzman_id: p.uzmanId,
      p_not: p.not,
    }),
  ) as string;
}

export async function randevuIptalEt(id: string, neden: string | null) {
  kontrol(await supabase.rpc('randevu_iptal_et', { p_randevu_id: id, p_neden: neden }));
}

/** Web sayfasından hesapsız alınan randevuyu, verilen kodla bu hesaba taşır (telefon numarası aynı olmalı) */
export async function webRandevusuAktar(kod: string) {
  kontrol(await supabase.rpc('web_randevu_aktar', { p_kod: kod }));
}
