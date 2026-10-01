import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BilgiSatiri, Buton, HataKutusu, Ikon, Kart, Metin, Rozet, Yukleniyor, type IkonAdi } from '@/components/ui';
import { uzmanAdi } from '@/lib/tipler';
import { hatirlatmaMetni, yolTarifiAc } from '@/lib/salon';
import { fiyatYaz, saatYaz, tarihParca, uzunTarih } from '@/lib/tarih';
import { Bosluk, Renk } from '@/lib/tema';
import { randevuGetir, salonAyarlariniGetir, useSorgu } from '@/lib/veri';

// "Randevun alındı!" ekranı. Geri dönülmez: X ve "Ana Sayfaya Dön" ana sayfaya gider.
export default function Basarili() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const veri = useSorgu(async () => {
    const [randevu, ayarlar] = await Promise.all([randevuGetir(id), salonAyarlariniGetir()]);
    return { randevu, ayarlar };
  }, [id]);

  const anaSayfa = () => router.dismissTo('/');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: Bosluk.xl }}>
        <Pressable accessibilityLabel="Kapat" onPress={anaSayfa} style={s.kapat}>
          <Ikon ad="close" />
        </Pressable>
      </View>
      {!veri.veri ? (
        <View style={{ padding: Bosluk.xl }}>
          {veri.yukleniyor ? <Yukleniyor /> : <HataKutusu mesaj={veri.hata ?? ''} tekrar={veri.yenile} />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Bosluk.xl, gap: Bosluk.l }}>
          <View style={{ alignItems: 'center', gap: Bosluk.s }}>
            <View style={s.halka}>
              <View style={s.daire}>
                <Ikon ad="check" boyut={36} renk={Renk.beyaz} />
              </View>
            </View>
            <Metin tur="baslik">Randevun alındı!</Metin>
            <Metin renk={Renk.taupe} style={{ textAlign: 'center' }}>
              {`Seni ${tarihParca(veri.veri.randevu.baslangic).gun.replace(/^0/, '')} ${tarihParca(veri.veri.randevu.baslangic).ay}'de görmek için sabırsızlanıyoruz.`}
            </Metin>
          </View>

          <Kart style={{ padding: 0 }}>
            <Satir ikon="content-cut" etiket="HİZMET" deger={`${veri.veri.randevu.hizmetler.map((h) => h.ad).join(', ')} · ${veri.veri.randevu.toplam_sure_dk} dk`} />
            <Satir ikon="person-outline" etiket="UZMAN" deger={uzmanAdi(veri.veri.randevu)} />
            <Satir ikon="calendar-month" etiket="TARİH & SAAT" deger={`${uzunTarih(veri.veri.randevu.baslangic)}, ${saatYaz(veri.veri.randevu.baslangic)}`} />
            <Satir
              ikon="place"
              etiket="ADRES"
              deger={`${veri.veri.ayarlar.ad}${veri.veri.ayarlar.adres ? `, ${veri.veri.ayarlar.adres}` : ''}`}
              sag={
                <Buton
                  tur="metin"
                  ikon="directions"
                  baslik="Yol Tarifi"
                  onPress={() => yolTarifiAc(veri.veri!.ayarlar)}
                />
              }
            />
            <Satir ikon="payments" etiket="TOPLAM" deger={`${fiyatYaz(veri.veri.randevu.toplam_fiyat)} · Ödeme salonda`} />
          </Kart>

          <Rozet ikon="star" metin={`Randevun tamamlandığında +${veri.veri.ayarlar.puan_basina} puan hesabına eklenecek.`} />
          <BilgiSatiri
            ikon="notifications-none"
            metin={`Randevundan ${hatirlatmaMetni(veri.veri.ayarlar.hatirlatma_saatleri)} önce sana hatırlatma göndereceğiz.`}
          />

          <Buton baslik="Randevularımı Gör" onPress={() => { router.dismissTo('/'); router.navigate('/randevularim'); }} />
          <Buton tur="metin" baslik="Ana Sayfaya Dön" onPress={anaSayfa} />
          <Metin tur="kucuk" style={{ textAlign: 'center' }}>
            {`Randevundan ${veri.veri.ayarlar.ucretsiz_iptal_saat} saat öncesine kadar Randevularım sayfasından ücretsiz iptal edebilirsin.`}
          </Metin>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Satir({ ikon, etiket, deger, sag }: { ikon: IkonAdi; etiket: string; deger: string; sag?: ReactNode }) {
  return (
    <View style={s.satir}>
      <View style={s.satirIkon}>
        <Ikon ad={ikon} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Metin tur="etiket">{etiket}</Metin>
        <Metin>{deger}</Metin>
      </View>
      {sag}
    </View>
  );
}

const s = StyleSheet.create({
  kapat: { width: 40, height: 40, borderRadius: 20, backgroundColor: Renk.beyaz, alignItems: 'center', justifyContent: 'center' },
  halka: { width: 110, height: 110, borderRadius: 55, backgroundColor: Renk.anaSoluk, alignItems: 'center', justifyContent: 'center' },
  daire: { width: 76, height: 76, borderRadius: 38, backgroundColor: Renk.ana, alignItems: 'center', justifyContent: 'center' },
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, padding: Bosluk.l, borderBottomWidth: 1, borderBottomColor: Renk.kremKoyu },
  satirIkon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
});
