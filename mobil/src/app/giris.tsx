import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormAlani } from '@/components/Form';
import { BilgiSatiri, Buton, Logo, Metin } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';

// E-posta + şifre ile giriş (SMS sonra eklenecek, PLAN.md)
export default function Giris() {
  const { sonra } = useLocalSearchParams<{ sonra?: string }>();
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'bilgi'; metin: string } | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function girisYap() {
    if (!eposta.trim() || !sifre) return setMesaj({ tur: 'hata', metin: 'E-posta ve şifreni yaz.' });
    setGonderiliyor(true);
    setMesaj(null);
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: sifre });
    setGonderiliyor(false);
    if (error) {
      return setMesaj({
        tur: 'hata',
        metin:
          error.message === 'Email not confirmed'
            ? 'E-posta adresin henüz doğrulanmadı. Gelen kutundaki doğrulama bağlantısına tıkla.'
            : 'E-posta ya da şifre hatalı.',
      });
    }
    if (router.canGoBack()) router.back();
    else if (!sonra) router.replace('/'); // adresle doğrudan açıldıysa (web) ana sayfaya
    if (sonra) router.push(sonra as Href);
  }

  async function sifremiUnuttum() {
    if (!eposta.trim()) return setMesaj({ tur: 'hata', metin: 'Önce e-posta adresini yaz, sana sıfırlama bağlantısı gönderelim.' });
    const { error } = await supabase.auth.resetPasswordForEmail(eposta.trim());
    setMesaj(error ? { tur: 'hata', metin: error.message } : { tur: 'bilgi', metin: 'Şifre sıfırlama bağlantısı e-postana gönderildi.' });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Renk.krem }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: Bosluk.xxxl }} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Image source={require('@/assets/images/hizmet-detay.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={s.karartma} />
          <Logo boyut="buyuk" acik />
        </View>

        <View style={{ padding: Bosluk.xxl, gap: Bosluk.l }}>
          <View style={{ alignItems: 'center' }}>
            <Metin tur="baslik">Tekrar hoş geldin</Metin>
            <Metin renk={Renk.taupe} style={{ textAlign: 'center' }}>
              Randevularını ve puanlarını görmek için giriş yap.
            </Metin>
          </View>

          <FormAlani etiket="E-posta" ikon="mail-outline" value={eposta} onChangeText={setEposta} placeholder="ornek@mail.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <FormAlani etiket="Şifre" ikon="lock-outline" value={sifre} onChangeText={setSifre} placeholder="••••••••" sifre autoComplete="current-password" />

          <Pressable onPress={sifremiUnuttum} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
            <Text style={s.link}>Şifremi unuttum</Text>
          </Pressable>

          {mesaj && (
            <BilgiSatiri ikon={mesaj.tur === 'hata' ? 'error-outline' : 'mark-email-read'} renk={mesaj.tur === 'hata' ? Renk.tugla : Renk.yesil} metin={mesaj.metin} />
          )}

          <Buton baslik="Giriş Yap" yukleniyor={gonderiliyor} onPress={girisYap} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Metin tur="kucuk">Hesabın yok mu?</Metin>
            <Pressable onPress={() => router.replace({ pathname: '/kayit', params: sonra ? { sonra } : {} })} hitSlop={8}>
              <Text style={[s.link, { fontFamily: Font.sansEnKalin }]}>Kayıt Ol</Text>
            </Pressable>
          </View>

          {/* Misafir: hizmetleri ve fiyatları görebilir, randevu için giriş gerekir */}
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              router.push('/hizmetler');
            }}
            style={{ alignSelf: 'center', marginTop: Bosluk.xl }}>
            <Text style={s.misafir}>Giriş yapmadan göz at</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { height: 240, borderBottomLeftRadius: Kose.xl * 1.5, borderBottomRightRadius: Kose.xl * 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  karartma: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,33,28,0.35)' },
  link: { fontFamily: Font.sansKalin, fontSize: 14, color: Renk.ana },
  misafir: { fontFamily: Font.sans, fontSize: 14, color: Renk.taupe, textDecorationLine: 'underline' },
});
