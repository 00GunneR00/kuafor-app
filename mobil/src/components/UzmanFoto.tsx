import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Font, Renk } from '@/lib/tema';

/** Uzmanın fotoğrafı; yoksa adının baş harfi */
export function UzmanFoto({ ad, foto, boyut = 56 }: { ad: string; foto: string | null; boyut?: number }) {
  if (foto) {
    return <Image source={{ uri: foto }} style={{ width: boyut, height: boyut, borderRadius: boyut / 2 }} />;
  }
  return (
    <View
      style={{ width: boyut, height: boyut, borderRadius: boyut / 2, backgroundColor: Renk.ana, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Font.serifKalin, fontSize: boyut * 0.4, color: Renk.beyaz }}>{ad.charAt(0)}</Text>
    </View>
  );
}
