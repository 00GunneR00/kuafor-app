import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/ui';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';

/** Etiketli, ikonlu metin kutusu. sifre=true ise göster/gizle düğmesi eklenir. */
export function FormAlani({
  etiket,
  ikon,
  yardim,
  sifre,
  ...p
}: { etiket: string; ikon: IkonAdi; yardim?: string; sifre?: boolean } & ComponentProps<typeof TextInput>) {
  const [gizli, setGizli] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.etiket}>{etiket}</Text>
      <View style={s.kutu}>
        <Ikon ad={ikon} renk={Renk.taupe} />
        <TextInput placeholderTextColor={Renk.soluk} style={s.girdi} secureTextEntry={sifre && gizli} autoCorrect={false} {...p} />
        {sifre && (
          <Pressable onPress={() => setGizli(!gizli)} hitSlop={8} accessibilityLabel={gizli ? 'Şifreyi göster' : 'Şifreyi gizle'}>
            <Ikon ad={gizli ? 'visibility' : 'visibility-off'} renk={Renk.taupe} />
          </Pressable>
        )}
      </View>
      {yardim && <Text style={s.yardim}>{yardim}</Text>}
    </View>
  );
}

export function OnayKutusu({ secili, onDegis, children }: { secili: boolean; onDegis: (d: boolean) => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: secili }} onPress={() => onDegis(!secili)} style={s.onay}>
      <View style={[s.kare, secili && { backgroundColor: Renk.ana, borderColor: Renk.ana }]}>
        {secili && <Ikon ad="check" boyut={14} renk={Renk.beyaz} />}
      </View>
      <Text style={s.onayYazi}>{children}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  etiket: { fontFamily: Font.sansOrta, fontSize: 14, color: Renk.koyu },
  kutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Bosluk.m,
    backgroundColor: Renk.beyaz,
    borderWidth: 1,
    borderColor: Renk.cizgi,
    borderRadius: Kose.tam,
    paddingHorizontal: Bosluk.l,
  },
  girdi: { flex: 1, paddingVertical: 14, fontFamily: Font.sans, fontSize: 15, color: Renk.koyu },
  yardim: { fontFamily: Font.sans, fontSize: 12, color: Renk.taupe, paddingLeft: Bosluk.s },
  onay: { flexDirection: 'row', alignItems: 'flex-start', gap: Bosluk.m },
  kare: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Renk.cizgi, backgroundColor: Renk.beyaz, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  onayYazi: { flex: 1, fontFamily: Font.sans, fontSize: 13, color: Renk.koyu, lineHeight: 19 },
});
