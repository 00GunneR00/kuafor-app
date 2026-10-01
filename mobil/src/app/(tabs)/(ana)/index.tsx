import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Buton, Ekran, Ikon, Kart, Logo, Metin, type IkonAdi } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { uzmanAdi } from '@/lib/tipler';
import { goreliGun, saatYaz, tarihParca } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { puanBakiyesiniGetir, randevularimiGetir, salonAyarlariniGetir, useSorgu } from '@/lib/veri';

const KISAYOLLAR: { ad: string; ikon: IkonAdi; git: () => void }[] = [
  { ad: 'Hizmetler', ikon: 'content-cut', git: () => router.push('/hizmetler') },
  { ad: 'Randevu Al', ikon: 'calendar-month', git: () => router.push('/randevu/hizmet') },
  { ad: 'Puanlarım', ikon: 'star-outline', git: () => router.push('/puanlarim') },
  { ad: 'Hesabım', ikon: 'person-outline', git: () => router.push('/hesabim') },
];

export default function AnaSayfa() {
  const { oturum } = useOturum();
  const girisli = !!oturum;

  const ayarlar = useSorgu(salonAyarlariniGetir);
  const bakiye = useSorgu(async () => (girisli ? puanBakiyesiniGetir() : null), [girisli]);
  const siradaki = useSorgu(async () => {
    if (!girisli) return null;
    const hepsi = await randevularimiGetir();
    const simdi = Date.now();
    return (
      hepsi
        .filter((r) => r.durum === 'onaylandi' && new Date(r.baslangic).getTime() > simdi)
        .sort((a, b) => a.baslangic.localeCompare(b.baslangic))[0] ?? null
    );
  }, [girisli]);

  // Başka ekrandan dönünce (ör. randevu alındıktan sonra) güncel bilgiyi göster
  useFocusEffect(
    useCallback(() => {
      bakiye.yenile();
      siradaki.yenile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [girisli]),
  );

  const odul = ayarlar.veri?.odul_puani ?? 500;
  const puan = bakiye.veri ?? 0;
  const kalan = Math.max(odul - puan, 0);
  const oran = Math.min(puan / odul, 1);

  return (
    <Ekran>
      <Logo />

      {/* Büyük görsel */}
      <View style={s.hero}>
        <Image source={require('@/assets/images/hero.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={s.heroKarartma} />
        <View style={s.heroIcerik}>
          <Text style={s.heroUst}>SAÇINA İYİ BAK, KENDİNİ DAHA İYİ HİSSET</Text>
          <Text style={s.heroBaslik}>Daha Güzel</Text>
          <Text style={[s.heroBaslik, { fontFamily: Font.serifItalik }]}>Bir Sen</Text>
          <Buton baslik="Randevu Al" sagIkon="arrow-forward" onPress={() => router.push('/randevu/hizmet')} style={{ alignSelf: 'flex-start', marginTop: Bosluk.m }} />
        </View>
      </View>

      {/* Kısayollar */}
      <Kart style={s.kisayollar}>
        {KISAYOLLAR.map((k) => (
          <Pressable key={k.ad} onPress={k.git} style={s.kisayol}>
            <View style={s.kisayolIkon}>
              <Ikon ad={k.ikon} boyut={24} renk={Renk.ana} />
            </View>
            <Metin tur="kucuk" renk={Renk.koyu}>
              {k.ad}
            </Metin>
          </Pressable>
        ))}
      </Kart>

      {/* Sadakat kulübü */}
      <Kart onPress={() => router.push(girisli ? '/puanlarim' : '/giris')} style={{ gap: Bosluk.m }}>
        <View style={s.satir}>
          <View style={s.tac}>
            <Ikon ad="workspace-premium" boyut={24} renk={Renk.ana} />
          </View>
          <View style={{ flex: 1 }}>
            <Metin tur="altBaslik">Sadakat Kulübü</Metin>
            <Metin tur="kucuk">Her bakım, daha güzel yarınlara.</Metin>
          </View>
          {girisli ? (
            <Text style={s.puan}>{puan} Puan ›</Text>
          ) : (
            <Ikon ad="chevron-right" renk={Renk.ana} />
          )}
        </View>
        {girisli ? (
          <>
            <View style={s.cubuk}>
              <View style={[s.cubukDolu, { width: `${oran * 100}%` }]} />
            </View>
            <Metin tur="kucuk" style={{ textAlign: 'right' }} renk={Renk.koyu}>
              {puan >= odul ? 'Ücretsiz bakım hakkın var!' : `Ücretsiz bakıma ${kalan} puan kaldı`}
            </Metin>
          </>
        ) : (
          <Metin tur="kucuk">Giriş yap, her tamamlanan randevuda {ayarlar.veri?.puan_basina ?? 50} puan kazan.</Metin>
        )}
      </Kart>

      {/* Yaklaşan randevu */}
      {siradaki.veri && (
        <View style={{ gap: Bosluk.m }}>
          <View style={s.satirArasi}>
            <Metin tur="bolum">Yaklaşan Randevun</Metin>
            <View style={s.onayRozet}>
              <Text style={s.onayYazi}>Onaylandı</Text>
            </View>
          </View>
          <Kart onPress={() => router.push('/randevularim')} style={s.satir}>
            <View style={s.tarihKutu}>
              <Text style={s.tarihAy}>{tarihParca(siradaki.veri.baslangic).ayKisa}</Text>
              <Text style={s.tarihGun}>{tarihParca(siradaki.veri.baslangic).gun}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Metin kalin>{siradaki.veri.hizmetler.map((h) => h.ad).join(', ')}</Metin>
              <Metin tur="kucuk">
                {goreliGun(siradaki.veri.baslangic)}, {saatYaz(siradaki.veri.baslangic)} · Uzman: {uzmanAdi(siradaki.veri)}
              </Metin>
            </View>
            <Ikon ad="chevron-right" renk={Renk.taupe} />
          </Kart>
        </View>
      )}

      {/* Sana özel */}
      <Metin tur="bolum">Sana Özel</Metin>
      <View style={{ flexDirection: 'row', gap: Bosluk.m }}>
        <OzelKart baslik="Saç Bakım Paketleri" ust="BAKIM SERİSİ" gorsel={require('@/assets/images/bakim-paketleri.jpg')} onPress={() => router.push('/hizmetler')} />
        <OzelKart baslik="Özel Kampanyalar" ust="FIRSATLAR" gorsel={require('@/assets/images/kampanyalar.jpg')} onPress={() => router.push('/kesfet')} />
      </View>
    </Ekran>
  );
}

function OzelKart({ baslik, ust, gorsel, onPress }: { baslik: string; ust: string; gorsel: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.ozel}>
      <Image source={gorsel} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={s.ozelKarartma} />
      <View style={{ padding: Bosluk.m }}>
        <Text style={s.ozelUst}>{ust}</Text>
        <Text style={s.ozelBaslik}>{baslik}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { height: 300, borderRadius: Kose.xl, overflow: 'hidden', justifyContent: 'flex-end' },
  heroKarartma: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,33,28,0.35)' },
  heroIcerik: { padding: Bosluk.xxl },
  heroUst: { fontFamily: Font.sansKalin, fontSize: 10, letterSpacing: 1.5, color: Renk.beyaz, marginBottom: Bosluk.s },
  heroBaslik: { fontFamily: Font.serif, fontSize: 34, color: Renk.beyaz, lineHeight: 40 },
  kisayollar: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Bosluk.xl },
  kisayol: { alignItems: 'center', gap: Bosluk.s, flex: 1 },
  kisayolIkon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Renk.anaSoluk, alignItems: 'center', justifyContent: 'center' },
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m },
  satirArasi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tac: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Renk.cizgi, alignItems: 'center', justifyContent: 'center' },
  puan: { fontFamily: Font.sansKalin, fontSize: 16, color: Renk.ana },
  cubuk: { height: 6, borderRadius: 3, backgroundColor: Renk.kremKoyu, overflow: 'hidden' },
  cubukDolu: { height: 6, borderRadius: 3, backgroundColor: Renk.ana },
  onayRozet: { backgroundColor: Renk.anaSoluk, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Kose.tam },
  onayYazi: { fontFamily: Font.sansKalin, fontSize: 12, color: Renk.ana },
  tarihKutu: { width: 56, height: 56, borderRadius: Kose.m, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  tarihAy: { fontFamily: Font.sansKalin, fontSize: 10, color: Renk.taupe },
  tarihGun: { fontFamily: Font.sansEnKalin, fontSize: 18, color: Renk.koyu },
  ozel: { flex: 1, aspectRatio: 0.8, borderRadius: Kose.l, overflow: 'hidden', justifyContent: 'flex-end' },
  ozelKarartma: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,33,28,0.4)' },
  ozelUst: { fontFamily: Font.sansKalin, fontSize: 10, letterSpacing: 1.2, color: Renk.kremKoyu },
  ozelBaslik: { fontFamily: Font.serifKalin, fontSize: 17, color: Renk.beyaz, marginTop: 2 },
});
