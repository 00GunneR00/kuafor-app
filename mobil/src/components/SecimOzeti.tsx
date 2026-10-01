import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ikon, Metin } from '@/components/ui';
import { Bosluk, Font, Golge, Kose, Renk } from '@/lib/tema';

/** Önceki adımlarda seçilenlerin özeti + "Değiştir" (o adıma döner) */
export function SecimOzeti({ baslik, alt, onDegistir }: { baslik: string; alt?: string; onDegistir: () => void }) {
  return (
    <View style={s.kutu}>
      <View style={s.ikon}>
        <Ikon ad="content-cut" boyut={20} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Metin kalin satir={2}>
          {baslik}
        </Metin>
        {alt && <Metin tur="kucuk">{alt}</Metin>}
      </View>
      <Pressable onPress={onDegistir} hitSlop={8} style={s.degistir}>
        <Text style={s.degistirYazi}>Değiştir</Text>
        <Ikon ad="edit" boyut={14} renk={Renk.ana} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  kutu: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, backgroundColor: Renk.beyaz, borderRadius: Kose.m, padding: Bosluk.m, ...Golge },
  ikon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  degistir: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Renk.anaSoluk, borderRadius: Kose.tam, paddingHorizontal: 10, paddingVertical: 6 },
  degistirYazi: { fontFamily: Font.sansKalin, fontSize: 12, color: Renk.ana },
});
