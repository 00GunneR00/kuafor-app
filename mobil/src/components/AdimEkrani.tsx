import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdimGostergesi, AltCubuk, HataKutusu, UstBar, Yukleniyor } from '@/components/ui';
import { useKatalog } from '@/lib/randevuKatalog';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';

const YOLLAR = ['/randevu/hizmet', '/randevu/uzman', '/randevu/tarih-saat', '/randevu/onay'] as const;

/**
 * Adımlar arası gezinme. navigate: adım yığında varsa ona geri döner (seçimler korunur),
 * yoksa açar (ör. hizmet detayından doğrudan 2. adıma gelindiyse 1. adım açılır).
 */
export function adimaGit(adim: number) {
  router.navigate(YOLLAR[adim - 1]);
}

/** Randevu adımlarının ortak iskeleti: üst bar, adım göstergesi, içerik, alt çubuk */
export function AdimEkrani({ adim, children, alt }: { adim: number; children: ReactNode; alt: ReactNode }) {
  const katalog = useKatalog();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
      <UstBar
        baslik="Randevu Al"
        sag={
          <View style={{ backgroundColor: Renk.kremKoyu, borderRadius: Kose.tam, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: Font.sansOrta, fontSize: 11, color: Renk.taupe }}>{adim}/4</Text>
          </View>
        }
      />
      <AdimGostergesi aktif={adim} onAdim={adimaGit} />
      {katalog.veri ? (
        <>
          <ScrollView contentContainerStyle={{ padding: Bosluk.xl, paddingBottom: 150, gap: Bosluk.l }}>{children}</ScrollView>
          <AltCubuk>{alt}</AltCubuk>
        </>
      ) : katalog.yukleniyor ? (
        <Yukleniyor />
      ) : (
        <View style={{ padding: Bosluk.xl }}>
          <HataKutusu mesaj={katalog.hata ?? 'Bilgiler yüklenemedi'} tekrar={katalog.yenile} />
        </View>
      )}
    </SafeAreaView>
  );
}
