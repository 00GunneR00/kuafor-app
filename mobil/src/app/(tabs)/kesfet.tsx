import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BilgiSatiri, BolumBasligi, Buton, Cip, HataKutusu, Kart, Metin, Yukleniyor } from '@/components/ui';
import { UzmanFoto } from '@/components/UzmanFoto';
import { hatirlatmaMetni, saatOzeti, salonuAra, yolTarifiAc } from '@/lib/salon';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import {
  calismaSaatleriniGetir,
  galeriyiGetir,
  kampanyalariGetir,
  kategorileriGetir,
  salonAyarlariniGetir,
  useSorgu,
  uzmanlariGetir,
} from '@/lib/veri';

// Keşfet: Kampanyalar · Çalışmalarımız · Uzmanlarımız · Salonumuz (PLAN.md)
export default function Kesfet() {
  const veri = useSorgu(async () => {
    const [kampanyalar, galeri, kategoriler, uzmanlar, ayarlar, saatler] = await Promise.all([
      kampanyalariGetir(),
      galeriyiGetir(),
      kategorileriGetir(),
      uzmanlariGetir(),
      salonAyarlariniGetir(),
      calismaSaatleriniGetir(),
    ]);
    return { kampanyalar, galeri, kategoriler, uzmanlar, ayarlar, saatler };
  });
  const [kategori, setKategori] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
      <Text style={s.baslik}>Keşfet</Text>
      {!veri.veri ? (
        <View style={{ padding: Bosluk.xl }}>{veri.yukleniyor ? <Yukleniyor /> : <HataKutusu mesaj={veri.hata ?? ''} tekrar={veri.yenile} />}</View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: Bosluk.xxxl, gap: Bosluk.l }}>
          {/* Kampanyalar */}
          <View style={s.bolum}>
            <BolumBasligi baslik="Kampanyalar" />
          </View>
          {veri.veri.kampanyalar.length === 0 ? (
            <View style={s.bolum}>
              <Kart>
                <Metin tur="kucuk">Şu an aktif bir kampanya yok. Yeni fırsatlar burada görünecek.</Metin>
              </Kart>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.m, paddingHorizontal: Bosluk.xl }}>
              {veri.veri.kampanyalar.map((k) => (
                <View key={k.id} style={s.kampanya}>
                  <Image
                    source={k.gorsel_url ? { uri: k.gorsel_url } : require('@/assets/images/kampanyalar.jpg')}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <View style={s.karartma} />
                  {k.etiket && (
                    <View style={s.etiket}>
                      <Text style={s.etiketYazi}>{k.etiket}</Text>
                    </View>
                  )}
                  <View style={{ padding: Bosluk.l, gap: 4 }}>
                    <Text style={s.kampanyaBaslik}>{k.baslik}</Text>
                    {k.aciklama && <Text style={s.kampanyaAciklama}>{k.aciklama}</Text>}
                    <Buton
                      tur="cizgili"
                      baslik="Randevu Al"
                      onPress={() => router.push(k.hizmet_id ? { pathname: '/randevu/uzman', params: { hizmet: k.hizmet_id } } : '/randevu/hizmet')}
                      style={{ alignSelf: 'flex-start', paddingVertical: 8, borderWidth: 0, marginTop: 4 }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Çalışmalarımız */}
          <View style={[s.bolum, { gap: Bosluk.m }]}>
            <View>
              <Metin tur="bolum">Çalışmalarımız</Metin>
              <Metin tur="kucuk">Salonumuzda yapılan saç modelleri</Metin>
            </View>
            {veri.veri.galeri.length === 0 ? (
              <Kart>
                <Metin tur="kucuk">Galeri yakında burada olacak.</Metin>
              </Kart>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.s }}>
                  <Cip baslik="Tümü" secili={!kategori} onPress={() => setKategori(null)} />
                  {veri.veri.kategoriler.map((k) => (
                    <Cip key={k.id} baslik={k.ad} secili={kategori === k.id} onPress={() => setKategori(k.id)} />
                  ))}
                </ScrollView>
                <View style={s.izgara}>
                  {veri.veri.galeri
                    .filter((g) => !kategori || g.kategori_id === kategori)
                    .map((g) => (
                      <View key={g.id} style={s.foto}>
                        <Image source={{ uri: g.gorsel_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        {(g.hizmet_adi || g.uzman) && (
                          <View style={s.fotoEtiket}>
                            <Text style={s.fotoEtiketYazi}>{[g.hizmet_adi, g.uzman?.ad].filter(Boolean).join(' · ')}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                </View>
              </>
            )}
          </View>

          {/* Uzmanlarımız */}
          <View style={s.bolum}>
            <Metin tur="bolum">Uzmanlarımız</Metin>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.m, paddingHorizontal: Bosluk.xl }}>
            {veri.veri.uzmanlar.map((u) => (
              <Kart key={u.id} style={{ alignItems: 'center', gap: 4, width: 124 }}>
                <UzmanFoto ad={u.ad} foto={u.foto_url} />
                <Metin kalin>{u.ad}</Metin>
                {u.unvan && (
                  <Metin tur="kucuk" style={{ textAlign: 'center' }}>
                    {u.unvan}
                  </Metin>
                )}
              </Kart>
            ))}
          </ScrollView>

          {/* Salonumuz */}
          <View style={[s.bolum, { gap: Bosluk.m }]}>
            <Metin tur="bolum">Salonumuz</Metin>
            <Kart style={{ gap: Bosluk.m }}>
              <BilgiSatiri ikon="place" renk={Renk.koyu} metin={`${veri.veri.ayarlar.ad}${veri.veri.ayarlar.adres ? ` · ${veri.veri.ayarlar.adres}` : ''}`} />
              <BilgiSatiri ikon="schedule" metin={saatOzeti(veri.veri.saatler)} />
              {veri.veri.ayarlar.telefon && <BilgiSatiri ikon="call" renk={Renk.koyu} metin={veri.veri.ayarlar.telefon} />}
              <BilgiSatiri ikon="notifications-none" metin={`Randevundan ${hatirlatmaMetni(veri.veri.ayarlar.hatirlatma_saatleri)} önce hatırlatma alırsın.`} />
              <View style={{ flexDirection: 'row', gap: Bosluk.s }}>
                <Buton tur="cizgili" baslik="Yol Tarifi" ikon="directions" onPress={() => yolTarifiAc(veri.veri!.ayarlar)} style={{ flex: 1 }} />
                <Buton baslik="Randevu Al" onPress={() => router.push('/randevu/hizmet')} style={{ flex: 1 }} />
              </View>
              {veri.veri.ayarlar.telefon && <Buton tur="metin" ikon="call" baslik="Salonu Ara" onPress={() => salonuAra(veri.veri!.ayarlar.telefon)} />}
            </Kart>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  baslik: { fontFamily: Font.serif, fontSize: 28, color: Renk.koyu, textAlign: 'center', padding: Bosluk.l },
  bolum: { paddingHorizontal: Bosluk.xl },
  kampanya: { width: 290, height: 190, borderRadius: Kose.l, overflow: 'hidden', justifyContent: 'flex-end' },
  karartma: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,33,28,0.45)' },
  etiket: { position: 'absolute', top: Bosluk.m, left: Bosluk.m, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: Kose.tam, paddingHorizontal: 10, paddingVertical: 3 },
  etiketYazi: { fontFamily: Font.sansKalin, fontSize: 11, color: Renk.koyu },
  kampanyaBaslik: { fontFamily: Font.serifKalin, fontSize: 20, color: Renk.beyaz },
  kampanyaAciklama: { fontFamily: Font.sans, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: Bosluk.m },
  foto: { width: '48%', aspectRatio: 0.8, borderRadius: Kose.m, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: Renk.kremKoyu },
  fotoEtiket: { margin: Bosluk.s, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fotoEtiketYazi: { fontFamily: Font.sansOrta, fontSize: 11, color: Renk.beyaz },
});
