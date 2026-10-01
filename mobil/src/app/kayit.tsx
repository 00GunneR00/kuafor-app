import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormAlani, OnayKutusu } from '@/components/Form';
import { BilgiSatiri, BosDurum, Buton, Ikon, Logo, Metin, Rozet } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Bosluk, Font, Renk } from '@/lib/tema';

// Kayıt: Ad Soyad, E-posta, Telefon, Şifre + KVKK onayı (zorunlu, önceden işaretli DEĞİL)
// + kampanya izni (isteğe bağlı). Bilgiler profile veritabanı tetikleyicisiyle yazılır.
export default function Kayit() {
  const { sonra } = useLocalSearchParams<{ sonra?: string }>();
  const [ad, setAd] = useState('');
  const [eposta, setEposta] = useState('');
  const [telefon, setTelefon] = useState('');
  const [sifre, setSifre] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [kampanya, setKampanya] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [dogrulamaBekleniyor, setDogrulamaBekleniyor] = useState(false);

  async function kayitOl() {
    const tel = telefon.replace(/\D/g, '');
    if (ad.trim().split(' ').filter(Boolean).length < 2) return setHata('Adını ve soyadını yaz.');
    if (!/^\S+@\S+\.\S+$/.test(eposta.trim())) return setHata('Geçerli bir e-posta adresi yaz.');
    if (!/^0?5\d{9}$/.test(tel)) return setHata('Telefonunu 05xx xxx xx xx şeklinde yaz.');
    if (sifre.length < 8) return setHata('Şifre en az 8 karakter olmalı.');
    if (!kvkk) return setHata('Devam etmek için KVKK Aydınlatma Metni\'ni onaylamalısın.');

    setGonderiliyor(true);
    setHata(null);
    const { data, error } = await supabase.auth.signUp({
      email: eposta.trim(),
      password: sifre,
      options: {
        data: { ad_soyad: ad.trim(), telefon: tel.startsWith('0') ? tel : `0${tel}`, kvkk_onay: true, kampanya_izni: kampanya },
      },
    });
    setGonderiliyor(false);
    if (error) {
      return setHata(error.message.includes('already registered') ? 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.' : error.message);
    }
    if (!data.session) {
      // E-posta doğrulaması açık: kullanıcı bağlantıya tıklayınca giriş yapabilir
      return setDogrulamaBekleniyor(true);
    }
    if (router.canGoBack()) router.back();
    else if (!sonra) router.replace('/'); // adresle doğrudan açıldıysa (web) ana sayfaya
    if (sonra) router.push(sonra as Href);
  }

  if (dogrulamaBekleniyor) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem, padding: Bosluk.xl }}>
        <BosDurum ikon="mark-email-read" baslik="E-postanı doğrula" aciklama={`${eposta.trim()} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.`}>
          <Buton baslik="Giriş Yap" onPress={() => router.replace({ pathname: '/giris', params: sonra ? { sonra } : {} })} style={{ alignSelf: 'stretch', marginTop: Bosluk.m }} />
        </BosDurum>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Renk.krem }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.ust}>
          <Pressable accessibilityLabel="Geri" onPress={() => router.back()} hitSlop={12} style={{ width: 44 }}>
            <Ikon ad="arrow-back" boyut={24} />
          </Pressable>
          <Logo boyut="kucuk" />
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: Bosluk.xxl, gap: Bosluk.l, paddingBottom: Bosluk.xxxl }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: Bosluk.s }}>
            <Metin tur="baslik">Aramıza katıl</Metin>
            <Metin renk={Renk.taupe}>Hesabını oluştur, randevunu saniyeler içinde al ve her ziyarette puan kazan.</Metin>
            <Rozet ikon="star" metin="Her tamamlanan randevuda +50 puan" />
          </View>

          <FormAlani etiket="Ad Soyad" ikon="person-outline" value={ad} onChangeText={setAd} placeholder="Adın ve soyadın" autoCapitalize="words" autoComplete="name" />
          <FormAlani etiket="E-posta" ikon="mail-outline" value={eposta} onChangeText={setEposta} placeholder="ornek@mail.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <FormAlani
            etiket="Telefon"
            ikon="call"
            value={telefon}
            onChangeText={setTelefon}
            placeholder="05xx xxx xx xx"
            keyboardType="phone-pad"
            autoComplete="tel"
            yardim="Randevunla ilgili sana ulaşabilmemiz için."
          />
          <FormAlani etiket="Şifre" ikon="lock-outline" value={sifre} onChangeText={setSifre} placeholder="••••••••" sifre yardim="En az 8 karakter" autoComplete="new-password" />

          <OnayKutusu secili={kvkk} onDegis={setKvkk}>
            <Text style={s.link}>KVKK Aydınlatma Metni</Text>{"'ni okudum, kabul ediyorum."} <Text style={s.not}>(zorunlu)</Text>
          </OnayKutusu>
          <OnayKutusu secili={kampanya} onDegis={setKampanya}>
            Kampanya ve fırsatlardan bildirim ile haberdar olmak istiyorum. <Text style={s.not}>(isteğe bağlı)</Text>
          </OnayKutusu>

          {hata && <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />}

          <Buton baslik="Kayıt Ol" yukleniyor={gonderiliyor} onPress={kayitOl} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Metin tur="kucuk">Zaten hesabın var mı?</Metin>
            <Pressable onPress={() => router.replace({ pathname: '/giris', params: sonra ? { sonra } : {} })} hitSlop={8}>
              <Text style={[s.link, { textDecorationLine: 'none', fontFamily: Font.sansEnKalin }]}>Giriş Yap</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Bosluk.xl, paddingVertical: Bosluk.m },
  link: { fontFamily: Font.sansKalin, color: Renk.ana, textDecorationLine: 'underline' },
  not: { color: Renk.taupe, fontSize: 12 },
});
