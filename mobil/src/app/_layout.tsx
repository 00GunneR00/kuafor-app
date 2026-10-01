import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { bildirimDokunmalariniDinle, bildirimleriKaydet } from '@/lib/bildirim';
import { OturumSaglayici, useOturum } from '@/lib/oturum';
import { Renk } from '@/lib/tema';

SplashScreen.preventAutoHideAsync();

function Gezinti() {
  const { hazir, oturum } = useOturum();
  const kullaniciId = oturum?.user.id;
  const [fontlar, fontHatasi] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const yuklendi = (fontlar || !!fontHatasi) && hazir;

  useEffect(() => {
    if (yuklendi) SplashScreen.hideAsync();
  }, [yuklendi]);

  // Giriş yapınca bu telefonu bildirim alıcısı olarak kaydet
  useEffect(() => {
    if (!yuklendi || !kullaniciId) return;
    bildirimleriKaydet().then((neden) => {
      if (neden) console.log('[bildirim] kayıt yapılmadı:', neden);
    });
  }, [yuklendi, kullaniciId]);

  // Bildirime dokununca ilgili ekranı aç
  useEffect(() => {
    if (!yuklendi) return;
    return bildirimDokunmalariniDinle();
  }, [yuklendi]);

  if (!yuklendi) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Renk.krem } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="randevu" />
        <Stack.Screen name="giris" options={{ presentation: 'modal' }} />
        <Stack.Screen name="kayit" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function KokDuzen() {
  return (
    <OturumSaglayici>
      <Gezinti />
    </OturumSaglayici>
  );
}
