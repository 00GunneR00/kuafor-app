import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdimEkrani, adimaGit } from '@/components/AdimEkrani';
import { SecimOzeti } from '@/components/SecimOzeti';
import { Buton, Ikon, Metin } from '@/components/ui';
import { UzmanFoto } from '@/components/UzmanFoto';
import { uygunUzmanlar } from '@/lib/slotlar';
import { useKatalog } from '@/lib/randevuKatalog';
import { useTaslak } from '@/lib/randevuTaslak';
import { Bosluk, Font, Golge, Kose, Renk } from '@/lib/tema';

// 2. adım: Uzman seç ("Farketmez" = en erken uygun uzman)
export default function UzmanAdimi() {
  const { veri } = useKatalog();
  const { taslak, guncelle } = useTaslak();

  if (taslak.hizmetIds.length === 0) return <Redirect href="/randevu/hizmet" />;

  const secili = veri?.hizmetler.filter((h) => taslak.hizmetIds.includes(h.id)) ?? [];
  const uygunIds = veri ? uygunUzmanlar(taslak.hizmetIds, veri.iliskiler, veri.uzmanlar.map((u) => u.id)) : [];
  const uzmanlar = veri?.uzmanlar.filter((u) => uygunIds.includes(u.id)) ?? [];

  function sec(id: string | null) {
    // Uzman değişince dolu saatler değişir: seçilen saat sıfırlanır
    if (id !== taslak.uzmanId) guncelle({ uzmanId: id, saat: null });
  }

  return (
    <AdimEkrani
      adim={2}
      alt={
        <>
          <Buton tur="cizgili" baslik="Geri" ikon="arrow-back" onPress={() => adimaGit(1)} />
          <Buton baslik="Devam Et" sagIkon="arrow-forward" pasif={taslak.uzmanId === undefined} onPress={() => adimaGit(3)} style={{ flex: 1 }} />
        </>
      }>
      <SecimOzeti
        baslik={secili.map((h) => h.ad).join(', ')}
        alt={`${secili.reduce((t, h) => t + h.sure_dk, 0)} dk`}
        onDegistir={() => adimaGit(1)}
      />
      <Metin tur="baslik">Kimden hizmet almak istersin?</Metin>

      {uzmanlar.length === 0 ? (
        <Metin renk={Renk.taupe}>
          Seçtiğin hizmetlerin hepsini veren bir uzman yok. Hizmetleri ayrı randevular olarak almayı dene.
        </Metin>
      ) : (
        <>
          <Secenek secili={taslak.uzmanId === null} onPress={() => sec(null)}>
            <View style={[s.foto, { backgroundColor: Renk.anaSoluk }]}>
              <Ikon ad="shuffle" boyut={26} renk={Renk.ana} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ad}>Farketmez</Text>
              <Metin tur="kucuk">En erken uygun uzmanı seçeriz</Metin>
            </View>
          </Secenek>
          {uzmanlar.map((u) => (
            <Secenek key={u.id} secili={taslak.uzmanId === u.id} onPress={() => sec(u.id)}>
              <UzmanFoto ad={u.ad} foto={u.foto_url} />
              <View style={{ flex: 1 }}>
                <Text style={s.ad}>{u.ad}</Text>
                {u.unvan && <Metin tur="kucuk">{u.unvan}</Metin>}
                {u.uzmanlik && (
                  <Metin tur="kucuk" renk={Renk.ana}>
                    {u.uzmanlik}
                  </Metin>
                )}
              </View>
            </Secenek>
          ))}
        </>
      )}
    </AdimEkrani>
  );
}

function Secenek({ secili, onPress, children }: { secili: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili }} onPress={onPress} style={[s.kart, secili && { borderColor: Renk.ana }]}>
      {children}
      <View style={[s.radyo, secili && { backgroundColor: Renk.ana, borderColor: Renk.ana }]}>
        {secili && <Ikon ad="check" boyut={16} renk={Renk.beyaz} />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Bosluk.m,
    backgroundColor: Renk.beyaz,
    borderRadius: Kose.m,
    padding: Bosluk.l,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Golge,
  },
  foto: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ad: { fontFamily: Font.sansKalin, fontSize: 17, color: Renk.koyu },
  radyo: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Renk.cizgi, alignItems: 'center', justifyContent: 'center' },
});
