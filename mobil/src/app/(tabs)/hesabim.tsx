import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BilgiSatiri, BosDurum, Buton, Ikon, Kart, Metin, type IkonAdi } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { saatOzeti, salonuAra, yolTarifiAc } from '@/lib/salon';
import { supabase } from '@/lib/supabase';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { calismaSaatleriniGetir, puanBakiyesiniGetir, randevularimiGetir, salonAyarlariniGetir, useSorgu } from '@/lib/veri';

type Pencere = 'profil' | 'sifre' | 'sil' | null;

export default function Hesabim() {
  const { oturum, profil, profiliYenile, cikisYap } = useOturum();
  const [pencere, setPencere] = useState<Pencere>(null);

  const salon = useSorgu(async () => {
    const [ayarlar, saatler] = await Promise.all([salonAyarlariniGetir(), calismaSaatleriniGetir()]);
    return { ayarlar, saatler };
  });
  const ozet = useSorgu(async () => {
    if (!oturum) return null;
    const [puan, randevular] = await Promise.all([puanBakiyesiniGetir(), randevularimiGetir()]);
    return { puan, tamamlanan: randevular.filter((r) => r.durum === 'tamamlandi').length };
  }, [oturum?.user.id]);

  useFocusEffect(
    useCallback(() => {
      ozet.yenile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oturum?.user.id]),
  );

  if (!oturum) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
        <Text style={s.baslik}>Hesabım</Text>
        <BosDurum ikon="person-outline" baslik="Hesabına giriş yap" aciklama="Randevularını, puanlarını ve bildirim tercihlerini buradan yönetebilirsin.">
          <Buton baslik="Giriş Yap" onPress={() => router.push({ pathname: '/giris', params: { sonra: '/hesabim' } })} style={{ alignSelf: 'stretch', marginTop: Bosluk.m }} />
          <Buton tur="metin" baslik="Hesabın yok mu? Kayıt Ol" onPress={() => router.push('/kayit')} />
        </BosDurum>
      </SafeAreaView>
    );
  }

  async function tercihDegistir(alan: 'hatirlatma_bildirim' | 'kampanya_izni', deger: boolean) {
    await supabase.from('profiller').update({ [alan]: deger }).eq('id', oturum!.user.id);
    await profiliYenile();
  }

  const basHarf = (profil?.ad_soyad ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Renk.krem }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: Bosluk.xl, gap: Bosluk.l, paddingBottom: Bosluk.xxxl }}>
        <Text style={[s.baslik, { padding: 0 }]}>Hesabım</Text>

        <Kart style={s.satir}>
          <View style={s.avatar}>
            <Text style={s.avatarYazi}>{basHarf}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Metin tur="altBaslik">{profil?.ad_soyad || 'İsimsiz'}</Metin>
            <Metin tur="kucuk">{oturum.user.email}</Metin>
            {profil?.telefon && <Metin tur="kucuk">{profil.telefon}</Metin>}
          </View>
          <Buton tur="cizgili" ikon="edit" baslik="Düzenle" onPress={() => setPencere('profil')} style={{ paddingVertical: 8, paddingHorizontal: Bosluk.m }} />
        </Kart>

        <View style={{ flexDirection: 'row', gap: Bosluk.m }}>
          <Istatistik ikon="star-outline" deger={ozet.veri?.puan ?? '–'} etiket="Puan" />
          <Istatistik ikon="event-available" deger={ozet.veri?.tamamlanan ?? '–'} etiket="Tamamlanan Randevu" />
        </View>

        <Grup baslik="HESAP">
          <Satir ikon="person-outline" ad="Profil Bilgilerim" onPress={() => setPencere('profil')} />
          <Satir ikon="calendar-month" ad="Randevularım" onPress={() => router.navigate('/randevularim')} />
          <Satir ikon="star-outline" ad="Puanlarım" onPress={() => router.navigate('/puanlarim')} />
          <Satir ikon="lock-outline" ad="Şifre Değiştir" onPress={() => setPencere('sifre')} />
        </Grup>

        <Grup baslik="BİLDİRİMLER">
          <Anahtar
            ad="Randevu hatırlatmaları"
            aciklama="Randevundan önce bildirim al"
            deger={profil?.hatirlatma_bildirim ?? true}
            onDegis={(d) => tercihDegistir('hatirlatma_bildirim', d)}
          />
          <Anahtar
            ad="Kampanya ve fırsatlar"
            aciklama="Salonun özel teklifleri"
            deger={profil?.kampanya_izni ?? false}
            onDegis={(d) => tercihDegistir('kampanya_izni', d)}
          />
        </Grup>

        {salon.veri && (
          <Grup baslik="SALON">
            <Satir ikon="place" ad="Adres ve Yol Tarifi" alt={salon.veri.ayarlar.adres ?? undefined} onPress={() => yolTarifiAc(salon.veri!.ayarlar)} />
            <Satir ikon="schedule" ad="Çalışma Saatleri" alt={saatOzeti(salon.veri.saatler)} />
            {salon.veri.ayarlar.telefon && <Satir ikon="call" ad="Salonu Ara" onPress={() => salonuAra(salon.veri!.ayarlar.telefon)} />}
          </Grup>
        )}

        <Grup baslik="YASAL">
          {/* Metinler salon adına hazırlanınca bağlanacak (PLAN.md > Henüz belli olmayanlar) */}
          <Satir ikon="description" ad="KVKK Aydınlatma Metni" alt="Hazırlanıyor" />
          <Satir ikon="privacy-tip" ad="Gizlilik Politikası" alt="Hazırlanıyor" />
        </Grup>

        <Buton tur="cizgili" ikon="logout" baslik="Çıkış Yap" onPress={cikisYap} />
        <Buton tur="metin" baslik="Hesabımı Sil" onPress={() => setPencere('sil')} style={{ opacity: 0.9 }} />
        <Metin tur="kucuk" style={{ textAlign: 'center' }}>
          Sürüm {Constants.expoConfig?.version ?? '1.0.0'}
        </Metin>
      </ScrollView>

      {pencere === 'profil' && <ProfilPenceresi kapat={() => setPencere(null)} />}
      {pencere === 'sifre' && <SifrePenceresi kapat={() => setPencere(null)} />}
      {pencere === 'sil' && <SilPenceresi kapat={() => setPencere(null)} />}
    </SafeAreaView>
  );
}

function Istatistik({ ikon, deger, etiket }: { ikon: IkonAdi; deger: number | string; etiket: string }) {
  return (
    <Kart style={[s.satir, { flex: 1 }]}>
      <View style={s.ikonKare}>
        <Ikon ad={ikon} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.istatistik}>{deger}</Text>
        <Metin tur="kucuk">{etiket}</Metin>
      </View>
    </Kart>
  );
}

function Grup({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <View style={{ gap: Bosluk.s }}>
      <Metin tur="etiket">{baslik}</Metin>
      <Kart style={{ padding: 0 }}>{children}</Kart>
    </View>
  );
}

function Satir({ ikon, ad, alt, onPress }: { ikon: IkonAdi; ad: string; alt?: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.menuSatir, pressed && { backgroundColor: Renk.krem }]}>
      <View style={s.ikonDaire}>
        <Ikon ad={ikon} boyut={18} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Metin>{ad}</Metin>
        {alt && <Metin tur="kucuk">{alt}</Metin>}
      </View>
      {onPress && <Ikon ad="chevron-right" renk={Renk.soluk} />}
    </Pressable>
  );
}

function Anahtar({ ad, aciklama, deger, onDegis }: { ad: string; aciklama: string; deger: boolean; onDegis: (d: boolean) => void }) {
  return (
    <View style={s.menuSatir}>
      <View style={{ flex: 1 }}>
        <Metin>{ad}</Metin>
        <Metin tur="kucuk">{aciklama}</Metin>
      </View>
      <Switch value={deger} onValueChange={onDegis} trackColor={{ true: Renk.ana, false: Renk.cizgi }} thumbColor={Renk.beyaz} />
    </View>
  );
}

// --- Pencereler ---

function AltPencere({ baslik, kapat, children }: { baslik: string; kapat: () => void; children: ReactNode }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={kapat}>
      <Pressable style={{ flex: 1, backgroundColor: Renk.karartma }} onPress={kapat} accessibilityLabel="Kapat" />
      <View style={s.pencere}>
        <View style={s.tutamak} />
        <Metin tur="altBaslik">{baslik}</Metin>
        {children}
      </View>
    </Modal>
  );
}

function Girdi({ etiket, ...p }: { etiket: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Metin kalin>{etiket}</Metin>
      <TextInput placeholderTextColor={Renk.soluk} style={s.girdi} {...p} />
    </View>
  );
}

function ProfilPenceresi({ kapat }: { kapat: () => void }) {
  const { oturum, profil, profiliYenile } = useOturum();
  const [ad, setAd] = useState(profil?.ad_soyad ?? '');
  const [telefon, setTelefon] = useState(profil?.telefon ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function kaydet() {
    if (ad.trim().length < 2) return setHata('Adını ve soyadını yaz.');
    setKaydediliyor(true);
    const { error } = await supabase.from('profiller').update({ ad_soyad: ad.trim(), telefon: telefon.trim() || null }).eq('id', oturum!.user.id);
    setKaydediliyor(false);
    if (error) return setHata(error.message);
    await profiliYenile();
    kapat();
  }

  return (
    <AltPencere baslik="Profil Bilgilerim" kapat={kapat}>
      <Girdi etiket="Ad Soyad" value={ad} onChangeText={setAd} autoCapitalize="words" />
      <Girdi etiket="Telefon" value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
      <Metin tur="kucuk">E-posta: {oturum?.user.email}</Metin>
      {hata && <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />}
      <Buton baslik="Kaydet" yukleniyor={kaydediliyor} onPress={kaydet} />
    </AltPencere>
  );
}

function SifrePenceresi({ kapat }: { kapat: () => void }) {
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'tamam'; metin: string } | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function kaydet() {
    if (sifre.length < 8) return setMesaj({ tur: 'hata', metin: 'Şifre en az 8 karakter olmalı.' });
    if (sifre !== tekrar) return setMesaj({ tur: 'hata', metin: 'Şifreler aynı değil.' });
    setKaydediliyor(true);
    const { error } = await supabase.auth.updateUser({ password: sifre });
    setKaydediliyor(false);
    setMesaj(error ? { tur: 'hata', metin: error.message } : { tur: 'tamam', metin: 'Şifren değiştirildi.' });
  }

  return (
    <AltPencere baslik="Şifre Değiştir" kapat={kapat}>
      <Girdi etiket="Yeni şifre" value={sifre} onChangeText={setSifre} secureTextEntry placeholder="En az 8 karakter" />
      <Girdi etiket="Yeni şifre (tekrar)" value={tekrar} onChangeText={setTekrar} secureTextEntry />
      {mesaj && (
        <BilgiSatiri
          ikon={mesaj.tur === 'hata' ? 'error-outline' : 'check-circle-outline'}
          renk={mesaj.tur === 'hata' ? Renk.tugla : Renk.yesil}
          metin={mesaj.metin}
        />
      )}
      {mesaj?.tur === 'tamam' ? <Buton baslik="Kapat" onPress={kapat} /> : <Buton baslik="Şifreyi Değiştir" yukleniyor={kaydediliyor} onPress={kaydet} />}
    </AltPencere>
  );
}

function SilPenceresi({ kapat }: { kapat: () => void }) {
  const { cikisYap } = useOturum();
  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function sil() {
    setSiliniyor(true);
    const { error } = await supabase.rpc('hesabimi_sil');
    setSiliniyor(false);
    if (error) return setHata(error.message);
    kapat();
    await cikisYap();
  }

  return (
    <AltPencere baslik="Hesabını silmek istiyor musun?" kapat={kapat}>
      <Metin renk={Renk.taupe}>
        Hesabın, randevu geçmişin ve puanların kalıcı olarak silinir. Yaklaşan randevuların da iptal edilmiş sayılır. Bu işlem geri alınamaz.
      </Metin>
      {hata && <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />}
      <Buton tur="tehlike" baslik="Evet, Hesabımı Sil" yukleniyor={siliniyor} onPress={sil} />
      <Buton tur="cizgili" baslik="Vazgeç" onPress={kapat} />
    </AltPencere>
  );
}

const s = StyleSheet.create({
  baslik: { fontFamily: Font.serif, fontSize: 28, color: Renk.koyu, textAlign: 'center', padding: Bosluk.xl },
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Renk.ana, alignItems: 'center', justifyContent: 'center' },
  avatarYazi: { fontFamily: Font.serifKalin, fontSize: 24, color: Renk.beyaz },
  ikonKare: { width: 44, height: 44, borderRadius: 12, backgroundColor: Renk.anaSoluk, alignItems: 'center', justifyContent: 'center' },
  istatistik: { fontFamily: Font.serifKalin, fontSize: 24, color: Renk.koyu },
  menuSatir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, padding: Bosluk.l, borderBottomWidth: 1, borderBottomColor: Renk.kremKoyu },
  ikonDaire: { width: 36, height: 36, borderRadius: 18, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  pencere: { backgroundColor: Renk.beyaz, borderTopLeftRadius: Kose.xl, borderTopRightRadius: Kose.xl, padding: Bosluk.xxl, paddingBottom: Bosluk.xxxl, gap: Bosluk.m },
  tutamak: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Renk.cizgi },
  girdi: { borderWidth: 1, borderColor: Renk.cizgi, borderRadius: Kose.s, paddingHorizontal: Bosluk.l, paddingVertical: 12, fontFamily: Font.sans, fontSize: 15, color: Renk.koyu, backgroundColor: Renk.beyaz },
});
