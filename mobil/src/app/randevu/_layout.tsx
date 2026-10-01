import { Redirect, Stack, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useOturum } from '@/lib/oturum';
import { KatalogSaglayici } from '@/lib/randevuKatalog';
import { TaslakSaglayici, type Taslak } from '@/lib/randevuTaslak';
import { Renk } from '@/lib/tema';

// Randevu akışı: hizmet -> uzman -> tarih-saat -> onay -> basarili
// Randevu almak için giriş gerekir (PLAN.md: misafir yalnızca gezebilir).
//
// Akış önceden doldurulmuş başlayabilir (yalnızca ilk açılışta okunur):
//   hizmet=<id,id>   hizmet detayından ya da "Tekrar Randevu Al"dan
//   uzman=<id>       "Tekrar Randevu Al" / yeniden planlama
//   degistir=<id>    yeniden planlama: yeni randevu onaylanınca bu randevu iptal edilir
export default function RandevuDuzeni() {
  const { oturum } = useOturum();
  const p = useGlobalSearchParams<{ hizmet?: string; uzman?: string; degistir?: string }>();
  const [baslangic] = useState<Partial<Taslak>>(() => ({
    ...(p.hizmet ? { hizmetIds: p.hizmet.split(',') } : {}),
    ...(p.uzman ? { uzmanId: p.uzman } : {}),
    ...(p.degistir ? { eskiRandevuId: p.degistir } : {}),
  }));

  if (!oturum) return <Redirect href={{ pathname: '/giris', params: { sonra: '/randevu/hizmet' } }} />;

  return (
    <KatalogSaglayici>
      <TaslakSaglayici baslangic={baslangic}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Renk.krem } }}>
          <Stack.Screen name="basarili" options={{ gestureEnabled: false }} />
        </Stack>
      </TaslakSaglayici>
    </KatalogSaglayici>
  );
}
