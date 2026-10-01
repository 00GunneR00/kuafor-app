import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdimEkrani, adimaGit } from '@/components/AdimEkrani';
import { Buton, Cip, Ikon, Metin } from '@/components/ui';
import { useKatalog } from '@/lib/randevuKatalog';
import { useTaslak } from '@/lib/randevuTaslak';
import { fiyatYaz } from '@/lib/tarih';
import { Bosluk, Font, Golge, Kose, Renk } from '@/lib/tema';

// 1. adım: Hizmet seç (birden fazla seçilebilir)
export default function HizmetAdimi() {
  const { veri } = useKatalog();
  const { taslak, guncelle } = useTaslak();
  const [kategori, setKategori] = useState<string | null>(null);

  const secili = veri?.hizmetler.filter((h) => taslak.hizmetIds.includes(h.id)) ?? [];
  const toplamSure = secili.reduce((t, h) => t + h.sure_dk, 0);
  const toplamFiyat = secili.reduce((t, h) => t + h.fiyat, 0);

  function degistir(id: string) {
    const yeni = taslak.hizmetIds.includes(id) ? taslak.hizmetIds.filter((x) => x !== id) : [...taslak.hizmetIds, id];
    // Hizmet değişince süre değişir: seçilen saat geçersiz olur.
    // Seçili uzman yeni hizmetleri vermiyorsa uzman seçimi de sıfırlanır.
    const uzmanUygun =
      !taslak.uzmanId ||
      yeni.every((h) => veri!.iliskiler.some((i) => i.uzman_id === taslak.uzmanId && i.hizmet_id === h));
    guncelle({ hizmetIds: yeni, saat: null, ...(uzmanUygun ? {} : { uzmanId: undefined }) });
  }

  return (
    <AdimEkrani
      adim={1}
      alt={
        <>
          <View style={{ flex: 1 }}>
            <Metin tur="kucuk">
              {secili.length} hizmet · {toplamSure} dk
            </Metin>
            <Text style={s.toplam}>{fiyatYaz(toplamFiyat, secili.some((h) => h.fiyat_baslangic))}</Text>
          </View>
          <Buton baslik="Devam Et" sagIkon="arrow-forward" pasif={secili.length === 0} onPress={() => adimaGit(2)} />
        </>
      }>
      <View>
        <Metin tur="baslik">Hangi hizmeti istersin?</Metin>
        <Metin tur="kucuk">Birden fazla hizmet seçebilirsin.</Metin>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.s }}>
        <Cip baslik="Tümü" secili={!kategori} onPress={() => setKategori(null)} />
        {veri?.kategoriler.map((k) => (
          <Cip key={k.id} baslik={k.ad} secili={kategori === k.id} onPress={() => setKategori(k.id)} />
        ))}
      </ScrollView>

      {veri?.hizmetler
        .filter((h) => !kategori || h.kategori_id === kategori)
        .map((h) => {
          const seciliMi = taslak.hizmetIds.includes(h.id);
          return (
            <Pressable
              key={h.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: seciliMi }}
              onPress={() => degistir(h.id)}
              style={[s.kart, seciliMi && s.kartSecili]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.ad}>{h.ad}</Text>
                {h.aciklama && <Metin tur="kucuk">{h.aciklama}</Metin>}
                <View style={{ flexDirection: 'row', gap: Bosluk.s, alignItems: 'center', marginTop: 4 }}>
                  <View style={s.sure}>
                    <Text style={s.sureYazi}>{h.sure_dk} dk</Text>
                  </View>
                  <Metin kalin>{fiyatYaz(h.fiyat, h.fiyat_baslangic)}</Metin>
                </View>
              </View>
              <View style={[s.kutu, seciliMi && s.kutuSecili]}>{seciliMi && <Ikon ad="check" boyut={16} renk={Renk.beyaz} />}</View>
            </Pressable>
          );
        })}
    </AdimEkrani>
  );
}

const s = StyleSheet.create({
  toplam: { fontFamily: Font.serifKalin, fontSize: 20, color: Renk.koyu },
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
  kartSecili: { borderColor: Renk.ana },
  ad: { fontFamily: Font.serifKalin, fontSize: 17, color: Renk.koyu },
  sure: { backgroundColor: Renk.krem, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sureYazi: { fontFamily: Font.sansOrta, fontSize: 12, color: Renk.taupe },
  kutu: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Renk.cizgi, alignItems: 'center', justifyContent: 'center' },
  kutuSecili: { backgroundColor: Renk.ana, borderColor: Renk.ana },
});
