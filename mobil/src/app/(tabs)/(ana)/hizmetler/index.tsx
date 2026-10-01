import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BilgiSatiri, BosDurum, Cip, HataKutusu, Ikon, Kart, Metin, UstBar, Yukleniyor } from '@/components/ui';
import { fiyatYaz } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { hizmetleriGetir, kategorileriGetir, useSorgu } from '@/lib/veri';

export default function Hizmetler() {
  const veri = useSorgu(async () => {
    const [kategoriler, hizmetler] = await Promise.all([kategorileriGetir(), hizmetleriGetir()]);
    return { kategoriler, hizmetler };
  });
  const [kategori, setKategori] = useState<string | null>(null);
  const [arama, setArama] = useState('');

  const gruplar = useMemo(() => {
    if (!veri.veri) return [];
    const q = arama.trim().toLocaleLowerCase('tr');
    return veri.veri.kategoriler
      .filter((k) => !kategori || k.id === kategori)
      .map((k) => ({
        kategori: k,
        hizmetler: veri.veri!.hizmetler.filter(
          (h) =>
            h.kategori_id === k.id &&
            (!q || h.ad.toLocaleLowerCase('tr').includes(q) || (h.aciklama ?? '').toLocaleLowerCase('tr').includes(q)),
        ),
      }))
      .filter((g) => g.hizmetler.length > 0);
  }, [veri.veri, kategori, arama]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
      <UstBar baslik="Hizmetler" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: Bosluk.xl, paddingBottom: Bosluk.xxxl, gap: Bosluk.l }}>
        <View style={s.arama}>
          <Ikon ad="search" renk={Renk.taupe} />
          <TextInput
            value={arama}
            onChangeText={setArama}
            placeholder="Hizmet ara…"
            placeholderTextColor={Renk.soluk}
            style={s.aramaGirdi}
          />
        </View>

        {veri.yukleniyor && <Yukleniyor />}
        {veri.hata && <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />}

        {veri.veri && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.s }}>
            <Cip baslik="Tümü" secili={!kategori} onPress={() => setKategori(null)} />
            {veri.veri.kategoriler.map((k) => (
              <Cip key={k.id} baslik={k.ad} secili={kategori === k.id} onPress={() => setKategori(k.id)} />
            ))}
          </ScrollView>
        )}

        {veri.veri && gruplar.length === 0 && <BosDurum ikon="search-off" baslik="Sonuç bulunamadı" aciklama="Başka bir kelimeyle aramayı dene." />}

        {gruplar.map((g) => (
          <View key={g.kategori.id} style={{ gap: Bosluk.s }}>
            <Metin tur="bolum">{g.kategori.ad}</Metin>
            <Kart style={{ padding: 0 }}>
              {g.hizmetler.map((h, i) => (
                <Pressable
                  key={h.id}
                  onPress={() => router.push({ pathname: '/hizmetler/[id]', params: { id: h.id } })}
                  style={({ pressed }) => [s.satir, i > 0 && s.ayrac, pressed && { backgroundColor: Renk.krem }]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Metin kalin>{h.ad}</Metin>
                    {h.aciklama && <Metin tur="kucuk">{h.aciklama}</Metin>}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ikon ad="schedule" boyut={14} renk={Renk.taupe} />
                      <Metin tur="kucuk">{h.sure_dk} dk</Metin>
                    </View>
                  </View>
                  <Metin kalin style={{ textAlign: 'right', maxWidth: 140 }}>
                    {fiyatYaz(h.fiyat, h.fiyat_baslangic)}
                  </Metin>
                  <Ikon ad="chevron-right" renk={Renk.soluk} />
                </Pressable>
              ))}
            </Kart>
          </View>
        ))}

        {veri.veri && <BilgiSatiri ikon="info-outline" metin="Fiyatlar saç uzunluğu ve yoğunluğuna göre değişebilir. Kesin fiyat salonda belirlenir." />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  arama: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Bosluk.s,
    backgroundColor: Renk.beyaz,
    borderRadius: Kose.tam,
    borderWidth: 1,
    borderColor: Renk.cizgi,
    paddingHorizontal: Bosluk.l,
  },
  aramaGirdi: { flex: 1, paddingVertical: 12, fontFamily: Font.sans, fontSize: 15, color: Renk.koyu },
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.s, padding: Bosluk.l },
  ayrac: { borderTopWidth: 1, borderTopColor: Renk.kremKoyu },
});
