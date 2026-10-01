import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AltCubuk, BilgiSatiri, Buton, HataKutusu, Ikon, Metin, Rozet, Yukleniyor } from '@/components/ui';
import { UzmanFoto } from '@/components/UzmanFoto';
import { fiyatYaz } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import {
  hizmetleriGetir,
  kategorileriGetir,
  salonAyarlariniGetir,
  useSorgu,
  uzmanHizmetleriniGetir,
  uzmanlariGetir,
} from '@/lib/veri';

export default function HizmetDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const veri = useSorgu(async () => {
    const [hizmetler, kategoriler, uzmanlar, iliskiler, ayarlar] = await Promise.all([
      hizmetleriGetir(),
      kategorileriGetir(),
      uzmanlariGetir(),
      uzmanHizmetleriniGetir(),
      salonAyarlariniGetir(),
    ]);
    const hizmet = hizmetler.find((h) => h.id === id);
    if (!hizmet) throw new Error('Bu hizmet artık sunulmuyor.');
    return {
      hizmet,
      kategori: kategoriler.find((k) => k.id === hizmet.kategori_id),
      uzmanlar: uzmanlar.filter((u) => iliskiler.some((i) => i.uzman_id === u.id && i.hizmet_id === hizmet.id)),
      puan: ayarlar.puan_basina,
    };
  }, [id]);

  if (!veri.veri) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem, padding: Bosluk.xl }}>
        {veri.yukleniyor ? <Yukleniyor /> : <HataKutusu mesaj={veri.hata ?? ''} tekrar={veri.yenile} />}
      </SafeAreaView>
    );
  }
  const { hizmet, kategori, uzmanlar, puan } = veri.veri;

  return (
    <View style={{ flex: 1, backgroundColor: Renk.krem }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.gorsel}>
          <Image
            source={hizmet.gorsel_url ? { uri: hizmet.gorsel_url } : require('@/assets/images/hizmet-detay.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <SafeAreaView edges={['top']}>
            <Pressable accessibilityLabel="Geri" onPress={() => router.back()} style={s.geri}>
              <Ikon ad="arrow-back" boyut={22} />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={s.icerik}>
          {kategori && <Metin tur="etiket">{kategori.ad}</Metin>}
          <Metin tur="baslik">{hizmet.ad}</Metin>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Bosluk.s }}>
            <Rozet ikon="schedule" metin={`${hizmet.sure_dk} dk`} renk={Renk.koyu} zemin={Renk.krem} />
            <Rozet ikon="payments" metin={fiyatYaz(hizmet.fiyat, hizmet.fiyat_baslangic)} renk={Renk.koyu} zemin={Renk.krem} />
            <Rozet ikon="star" metin={`+${puan} puan`} />
          </View>

          {(hizmet.detay || hizmet.aciklama) && (
            <View style={{ gap: Bosluk.s }}>
              <Metin tur="altBaslik">Hizmet Hakkında</Metin>
              <Metin renk={Renk.taupe}>{hizmet.detay ?? hizmet.aciklama}</Metin>
            </View>
          )}

          {hizmet.dahil.length > 0 && (
            <View style={{ gap: Bosluk.s }}>
              <Metin tur="altBaslik">Neler Dahil?</Metin>
              {hizmet.dahil.map((d) => (
                <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: Bosluk.s }}>
                  <View style={s.tik}>
                    <Ikon ad="check" boyut={14} renk={Renk.ana} />
                  </View>
                  <Metin>{d}</Metin>
                </View>
              ))}
            </View>
          )}

          {uzmanlar.length > 0 && (
            <View style={{ gap: Bosluk.m }}>
              <Metin tur="altBaslik">Bu hizmeti veren uzmanlar</Metin>
              <View style={{ flexDirection: 'row', gap: Bosluk.l, flexWrap: 'wrap' }}>
                {uzmanlar.map((u) => (
                  <View key={u.id} style={{ alignItems: 'center', gap: 4 }}>
                    <UzmanFoto ad={u.ad} foto={u.foto_url} />
                    <Metin tur="kucuk" renk={Renk.koyu}>
                      {u.ad}
                    </Metin>
                  </View>
                ))}
              </View>
            </View>
          )}

          <BilgiSatiri ikon="info-outline" metin="Fiyat saç uzunluğuna göre değişebilir. Ödeme salonda yapılır." />
        </View>
      </ScrollView>

      <AltCubuk>
        <View style={{ flex: 1 }}>
          <Text style={s.fiyat}>{fiyatYaz(hizmet.fiyat)}</Text>
          <Metin tur="kucuk">{hizmet.sure_dk} dk</Metin>
        </View>
        {/* Hizmet seçili olarak akış uzman adımından başlar */}
        <Buton
          baslik="Bu Hizmetle Randevu Al"
          onPress={() => router.push({ pathname: '/randevu/uzman', params: { hizmet: hizmet.id } })}
        />
      </AltCubuk>
    </View>
  );
}

const s = StyleSheet.create({
  gorsel: { height: 300, backgroundColor: Renk.kremKoyu },
  geri: { margin: Bosluk.l, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  icerik: {
    marginTop: -24,
    backgroundColor: Renk.beyaz,
    borderTopLeftRadius: Kose.xl,
    borderTopRightRadius: Kose.xl,
    padding: Bosluk.xxl,
    gap: Bosluk.xl,
    minHeight: 400,
  },
  tik: { width: 22, height: 22, borderRadius: 11, backgroundColor: Renk.anaSoluk, alignItems: 'center', justifyContent: 'center' },
  fiyat: { fontFamily: Font.serifKalin, fontSize: 22, color: Renk.koyu },
});
