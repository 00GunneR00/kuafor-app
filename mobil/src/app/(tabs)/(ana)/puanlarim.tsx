import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BosDurum, Buton, HataKutusu, Ikon, Kart, Metin, UstBar, Yukleniyor, type IkonAdi } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { tarihParca } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { puanHareketleriniGetir, salonAyarlariniGetir, useSorgu } from '@/lib/veri';

const GECMIS_SINIRI = 5;

// Tek ödül: odul_puani puan = 1 ücretsiz bakım. Seviye/indirim/son kullanma yok (PLAN.md).
export default function Puanlarim() {
  const { oturum } = useOturum();
  const [tumu, setTumu] = useState(false);
  const veri = useSorgu(async () => {
    const [hareketler, ayarlar] = await Promise.all([oturum ? puanHareketleriniGetir() : [], salonAyarlariniGetir()]);
    return { hareketler, ayarlar };
  }, [oturum?.user.id]);

  useFocusEffect(
    useCallback(() => {
      veri.yenile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oturum?.user.id]),
  );

  if (!oturum) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
        <UstBar baslik="Puanlarım" />
        <BosDurum ikon="workspace-premium" baslik="Sadakat Kulübü" aciklama="Giriş yap, her tamamlanan randevuda puan kazan.">
          <Buton baslik="Giriş Yap" onPress={() => router.push({ pathname: '/giris', params: { sonra: '/puanlarim' } })} style={{ alignSelf: 'stretch', marginTop: Bosluk.m }} />
        </BosDurum>
      </SafeAreaView>
    );
  }

  const bakiye = veri.veri?.hareketler.reduce((t, h) => t + h.miktar, 0) ?? 0;
  const odul = veri.veri?.ayarlar.odul_puani ?? 500;
  const puanBasina = veri.veri?.ayarlar.puan_basina ?? 50;
  const kalan = Math.max(odul - bakiye, 0);
  const kalanRandevu = Math.ceil(kalan / puanBasina);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
      <UstBar baslik="Puanlarım" />
      {!veri.veri ? (
        <View style={{ padding: Bosluk.xl }}>{veri.yukleniyor ? <Yukleniyor /> : <HataKutusu mesaj={veri.hata ?? ''} tekrar={veri.yenile} />}</View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Bosluk.xl, gap: Bosluk.l, paddingBottom: Bosluk.xxxl }}>
          <View style={s.hero}>
            <View style={s.heroRozet}>
              <Ikon ad="workspace-premium" boyut={16} renk={Renk.beyaz} />
              <Text style={s.heroRozetYazi}>SADAKAT KULÜBÜ</Text>
            </View>
            <Text style={s.heroPuan}>
              {bakiye} <Text style={s.heroBirim}>puan</Text>
            </Text>
            <View style={s.cubuk}>
              <View style={[s.cubukDolu, { width: `${Math.min(bakiye / odul, 1) * 100}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.heroKucuk}>
                {Math.min(bakiye, odul)} / {odul}
              </Text>
              <Text style={s.heroKucuk}>{kalan === 0 ? 'Ücretsiz bakım hakkın var!' : `Ücretsiz bakıma ${kalan} puan kaldı`}</Text>
            </View>
            {kalan > 0 && <Text style={s.heroKucuk}>✨ {kalanRandevu} randevu sonra ücretsiz bakım seni bekliyor.</Text>}
          </View>

          <Metin tur="bolum">Ödülün</Metin>
          <Kart style={{ gap: Bosluk.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Bosluk.m }}>
              <View style={s.ikonDaire}>
                <Ikon ad="spa" renk={Renk.ana} />
              </View>
              <View style={{ flex: 1 }}>
                <Metin kalin>1 Ücretsiz Bakım</Metin>
                <Metin tur="kucuk">{odul} puan</Metin>
              </View>
              <View style={[s.durum, kalan === 0 && { backgroundColor: Renk.yesilSoluk }]}>
                <Ikon ad={kalan === 0 ? 'lock-open' : 'lock-outline'} boyut={14} renk={kalan === 0 ? Renk.yesil : Renk.taupe} />
                <Text style={[s.durumYazi, kalan === 0 && { color: Renk.yesil }]}>{kalan === 0 ? 'Kullanılabilir' : `${kalan} puan kaldı`}</Text>
              </View>
            </View>
            <Metin tur="kucuk" style={s.ayracUst}>
              {odul} puana ulaştığında ödülünü salonda kullanabilirsin. Randevu alırken uzmanına söylemen yeterli.
            </Metin>
          </Kart>

          <Metin tur="bolum">Nasıl puan kazanırım?</Metin>
          <Kart style={{ gap: Bosluk.m }}>
            <Adim ikon="event-available" baslik="Randevunu al" aciklama="Uygulamadan randevu oluştur." />
            <Adim ikon="check-circle-outline" baslik="Salona gel" aciklama={`Randevun tamamlandığında hesabına +${puanBasina} puan eklenir.`} />
            <Adim ikon="redeem" baslik="Ödülünü kullan" aciklama={`${odul} puanda 1 ücretsiz bakım.`} />
            <Metin tur="kucuk" style={s.ayracUst}>
              İptal edilen randevular puan kazandırmaz.
            </Metin>
          </Kart>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Metin tur="bolum">Puan Geçmişi</Metin>
            {veri.veri.hareketler.length > GECMIS_SINIRI && (
              <Buton tur="metin" baslik={tumu ? 'Daha az' : 'Tümü'} onPress={() => setTumu(!tumu)} />
            )}
          </View>
          {veri.veri.hareketler.length === 0 ? (
            <Metin tur="kucuk">Henüz puan hareketin yok. İlk randevun tamamlandığında burada görünecek.</Metin>
          ) : (
            <Kart style={{ padding: 0 }}>
              {(tumu ? veri.veri.hareketler : veri.veri.hareketler.slice(0, GECMIS_SINIRI)).map((h, i) => {
                const t = tarihParca(h.olusturuldu);
                return (
                  <View key={h.id} style={[s.hareket, i > 0 && { borderTopWidth: 1, borderTopColor: Renk.kremKoyu }]}>
                    <View style={s.tarih}>
                      <Text style={s.tarihYazi}>
                        {t.gun.replace(/^0/, '')} {t.ay.slice(0, 3)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Metin>{h.aciklama ?? (h.tur === 'odul' ? 'Ücretsiz bakım' : 'Puan')}</Metin>
                      <Metin tur="kucuk">{h.tur === 'kazanim' ? 'Tamamlandı' : h.tur === 'odul' ? 'Ödül kullanıldı' : 'Düzeltme'}</Metin>
                    </View>
                    <Text style={[s.miktar, h.miktar < 0 && { color: Renk.taupe }]}>
                      {h.miktar > 0 ? `+${h.miktar}` : h.miktar}
                    </Text>
                  </View>
                );
              })}
            </Kart>
          )}

          <Buton baslik="Randevu Al, Puan Kazan" sagIkon="arrow-forward" onPress={() => router.push('/randevu/hizmet')} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Adim({ ikon, baslik, aciklama }: { ikon: IkonAdi; baslik: string; aciklama: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Bosluk.m }}>
      <View style={s.ikonDaire}>
        <Ikon ad={ikon} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Metin kalin>{baslik}</Metin>
        <Metin tur="kucuk">{aciklama}</Metin>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: Renk.ana, borderRadius: Kose.xl, padding: Bosluk.xxl, gap: Bosluk.m },
  heroRozet: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Kose.tam },
  heroRozetYazi: { fontFamily: Font.sansKalin, fontSize: 11, letterSpacing: 1.2, color: Renk.beyaz },
  heroPuan: { fontFamily: Font.serifKalin, fontSize: 52, color: Renk.beyaz },
  heroBirim: { fontFamily: Font.sans, fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  heroKucuk: { fontFamily: Font.sansOrta, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  cubuk: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  cubukDolu: { height: 8, borderRadius: 4, backgroundColor: Renk.beyaz },
  ikonDaire: { width: 44, height: 44, borderRadius: 22, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  durum: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Renk.kremKoyu, borderRadius: Kose.tam, paddingHorizontal: 10, paddingVertical: 5 },
  durumYazi: { fontFamily: Font.sansOrta, fontSize: 12, color: Renk.taupe },
  ayracUst: { borderTopWidth: 1, borderTopColor: Renk.kremKoyu, paddingTop: Bosluk.m },
  hareket: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, padding: Bosluk.l },
  tarih: { backgroundColor: Renk.krem, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 56, alignItems: 'center' },
  tarihYazi: { fontFamily: Font.sansKalin, fontSize: 12, color: Renk.koyu },
  miktar: { fontFamily: Font.sansEnKalin, fontSize: 16, color: Renk.ana },
});
