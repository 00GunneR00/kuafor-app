import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bosluk, Font, Golge, Kose, Renk } from '@/lib/tema';

export type IkonAdi = ComponentProps<typeof MaterialIcons>['name'];

export function Ikon({ ad, boyut = 20, renk = Renk.koyu }: { ad: IkonAdi; boyut?: number; renk?: ColorValue }) {
  return <MaterialIcons name={ad} size={boyut} color={renk} />;
}

// --- Metin ---

type MetinTur = 'baslik' | 'altBaslik' | 'bolum' | 'govde' | 'kucuk' | 'etiket';

export function Metin({
  tur = 'govde',
  renk,
  kalin,
  style,
  children,
  satir,
}: {
  tur?: MetinTur;
  renk?: string;
  kalin?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  satir?: number;
}) {
  return (
    <Text numberOfLines={satir} style={[s[tur], kalin && { fontFamily: Font.sansKalin }, renk ? { color: renk } : null, style]}>
      {children}
    </Text>
  );
}

// --- Buton ---

export function Buton({
  baslik,
  onPress,
  tur = 'dolu',
  ikon,
  sagIkon,
  yukleniyor,
  pasif,
  style,
}: {
  baslik: string;
  onPress: () => void;
  tur?: 'dolu' | 'cizgili' | 'metin' | 'tehlike';
  ikon?: IkonAdi;
  sagIkon?: IkonAdi;
  yukleniyor?: boolean;
  pasif?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const yaziRengi = tur === 'dolu' || tur === 'tehlike' ? Renk.beyaz : tur === 'metin' ? Renk.ana : Renk.ana;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={pasif || yukleniyor}
      onPress={onPress}
      style={({ pressed }) => [
        s.buton,
        tur === 'dolu' && { backgroundColor: Renk.ana },
        tur === 'tehlike' && { backgroundColor: Renk.tugla },
        tur === 'cizgili' && { borderWidth: 1.5, borderColor: Renk.ana, backgroundColor: Renk.beyaz },
        tur === 'metin' && { paddingVertical: Bosluk.s },
        (pasif || yukleniyor) && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {yukleniyor ? (
        <ActivityIndicator color={yaziRengi} />
      ) : (
        <>
          {ikon && <Ikon ad={ikon} boyut={18} renk={yaziRengi} />}
          <Text style={[s.butonYazi, { color: yaziRengi }]}>{baslik}</Text>
          {sagIkon && <Ikon ad={sagIkon} boyut={18} renk={yaziRengi} />}
        </>
      )}
    </Pressable>
  );
}

// --- Kart ---

export function Kart({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.kart, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.kart, style]}>{children}</View>;
}

// --- Çip (kategori, iptal nedeni vb.) ---

export function Cip({ baslik, secili, onPress }: { baslik: string; secili?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.cip, secili && { backgroundColor: Renk.ana, borderColor: Renk.ana }]}>
      <Text style={[s.cipYazi, secili && { color: Renk.beyaz }]}>{baslik}</Text>
    </Pressable>
  );
}

export function Rozet({ metin, renk = Renk.ana, zemin = Renk.anaSoluk, ikon }: { metin: string; renk?: string; zemin?: string; ikon?: IkonAdi }) {
  return (
    <View style={[s.rozet, { backgroundColor: zemin }]}>
      {ikon && <Ikon ad={ikon} boyut={14} renk={renk} />}
      <Text style={[s.rozetYazi, { color: renk }]}>{metin}</Text>
    </View>
  );
}

// --- Ekran iskeleti ---

export function Ekran({
  children,
  kaydir = true,
  altBosluk = 32,
  ust = true,
}: {
  children: ReactNode;
  kaydir?: boolean;
  altBosluk?: number;
  ust?: boolean;
}) {
  return (
    <SafeAreaView style={s.ekran} edges={ust ? ['top'] : []}>
      {kaydir ? (
        <ScrollView contentContainerStyle={{ padding: Bosluk.xl, paddingBottom: altBosluk, gap: Bosluk.l }}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function UstBar({ baslik, geri = true, sag }: { baslik: string; geri?: boolean; sag?: ReactNode }) {
  return (
    <View style={s.ustBar}>
      <View style={{ width: 44 }}>
        {geri && (
          <Pressable accessibilityLabel="Geri" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Ikon ad="arrow-back" boyut={24} />
          </Pressable>
        )}
      </View>
      <Text style={s.ustBarBaslik}>{baslik}</Text>
      <View style={{ width: 44, alignItems: 'flex-end' }}>{sag}</View>
    </View>
  );
}

// Logo metni salona göre .env'den ayarlanır (EXPO_PUBLIC_LOGO_UST / EXPO_PUBLIC_LOGO_ALT)
const LOGO_UST = process.env.EXPO_PUBLIC_LOGO_UST ?? 'LOGO';
const LOGO_ALT = process.env.EXPO_PUBLIC_LOGO_ALT ?? 'SALONUNUZUN ADI';

export function Logo({ boyut = 'orta', acik }: { boyut?: 'kucuk' | 'orta' | 'buyuk'; acik?: boolean }) {
  const b = boyut === 'buyuk' ? 30 : boyut === 'orta' ? 22 : 16;
  const renk = acik ? Renk.beyaz : Renk.koyu;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: Font.serifKalin, fontSize: b, letterSpacing: b * 0.3, color: renk }}>{LOGO_UST}</Text>
      <Text style={{ fontFamily: Font.serifItalik, fontSize: b * 0.45, letterSpacing: b * 0.1, color: acik ? Renk.beyaz : Renk.taupe }}>
        {LOGO_ALT}
      </Text>
    </View>
  );
}

export function BolumBasligi({ baslik, sag, onSag }: { baslik: string; sag?: string; onSag?: () => void }) {
  return (
    <View style={s.bolumBasligi}>
      <Metin tur="bolum">{baslik}</Metin>
      {sag && (
        <Pressable onPress={onSag} hitSlop={8}>
          <Text style={s.bolumSag}>{sag} →</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Durumlar ---

export function Yukleniyor() {
  return (
    <View style={s.orta}>
      <ActivityIndicator color={Renk.ana} />
    </View>
  );
}

export function HataKutusu({ mesaj, tekrar }: { mesaj: string; tekrar?: () => void }) {
  return (
    <Kart style={{ alignItems: 'center', gap: Bosluk.s }}>
      <Ikon ad="error-outline" renk={Renk.tugla} boyut={28} />
      <Metin renk={Renk.taupe} style={{ textAlign: 'center' }}>
        {mesaj}
      </Metin>
      {tekrar && <Buton tur="metin" baslik="Tekrar dene" onPress={tekrar} />}
    </Kart>
  );
}

export function BosDurum({ ikon, baslik, aciklama, children }: { ikon: IkonAdi; baslik: string; aciklama?: string; children?: ReactNode }) {
  return (
    <View style={[s.orta, { gap: Bosluk.s, paddingVertical: Bosluk.xxxl }]}>
      <View style={s.bosIkon}>
        <Ikon ad={ikon} boyut={28} renk={Renk.ana} />
      </View>
      <Metin tur="altBaslik" style={{ textAlign: 'center' }}>
        {baslik}
      </Metin>
      {aciklama && (
        <Metin renk={Renk.taupe} style={{ textAlign: 'center' }}>
          {aciklama}
        </Metin>
      )}
      {children}
    </View>
  );
}

export function BilgiSatiri({ ikon, metin, renk = Renk.taupe }: { ikon: IkonAdi; metin: string; renk?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: Bosluk.s, alignItems: 'flex-start' }}>
      <Ikon ad={ikon} boyut={16} renk={renk} />
      <Metin tur="kucuk" renk={renk} style={{ flex: 1 }}>
        {metin}
      </Metin>
    </View>
  );
}

// --- Randevu adım göstergesi ---

const ADIMLAR = ['Hizmet', 'Uzman', 'Tarih & Saat', 'Onay'];

export function AdimGostergesi({ aktif, onAdim }: { aktif: number; onAdim: (adim: number) => void }) {
  return (
    <View style={s.adimlar}>
      {ADIMLAR.map((ad, i) => {
        const no = i + 1;
        const tamam = no < aktif;
        const simdi = no === aktif;
        return (
          <Pressable
            key={ad}
            disabled={!tamam}
            onPress={() => onAdim(no)}
            accessibilityLabel={tamam ? `${ad} adımına dön` : ad}
            style={s.adim}>
            <View style={[s.adimDaire, (tamam || simdi) && { backgroundColor: Renk.ana }]}>
              {tamam ? (
                <Ikon ad="check" boyut={14} renk={Renk.beyaz} />
              ) : (
                <Text style={[s.adimNo, simdi && { color: Renk.beyaz }]}>{no}</Text>
              )}
            </View>
            <Text style={[s.adimYazi, tamam && { color: Renk.ana }, simdi && { color: Renk.koyu, fontFamily: Font.sansKalin }]}>
              {ad}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Alt menünün üstünde duran sabit aksiyon çubuğu */
export function AltCubuk({ children }: { children: ReactNode }) {
  const alt = useSafeAreaInsets().bottom;
  return <View style={[s.altCubuk, { paddingBottom: Bosluk.l + alt }]}>{children}</View>;
}

const s = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Renk.krem },
  baslik: { fontFamily: Font.serif, fontSize: 28, color: Renk.koyu, lineHeight: 36 },
  altBaslik: { fontFamily: Font.serif, fontSize: 20, color: Renk.koyu },
  bolum: { fontFamily: Font.serif, fontSize: 20, color: Renk.koyu },
  govde: { fontFamily: Font.sans, fontSize: 15, color: Renk.koyu, lineHeight: 21 },
  kucuk: { fontFamily: Font.sans, fontSize: 13, color: Renk.taupe, lineHeight: 18 },
  etiket: { fontFamily: Font.sansKalin, fontSize: 11, color: Renk.taupe, letterSpacing: 1.2, textTransform: 'uppercase' },
  buton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Bosluk.s,
    paddingVertical: 15,
    paddingHorizontal: Bosluk.xl,
    borderRadius: Kose.tam,
  },
  butonYazi: { fontFamily: Font.sansKalin, fontSize: 15 },
  kart: { backgroundColor: Renk.beyaz, borderRadius: Kose.m, padding: Bosluk.l, ...Golge },
  cip: {
    paddingHorizontal: Bosluk.l,
    paddingVertical: Bosluk.s,
    borderRadius: Kose.tam,
    borderWidth: 1,
    borderColor: Renk.cizgi,
    backgroundColor: Renk.beyaz,
  },
  cipYazi: { fontFamily: Font.sansOrta, fontSize: 13, color: Renk.koyu },
  rozet: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Kose.tam, alignSelf: 'flex-start' },
  rozetYazi: { fontFamily: Font.sansKalin, fontSize: 12 },
  ustBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Bosluk.xl, paddingVertical: Bosluk.m },
  ustBarBaslik: { fontFamily: Font.serif, fontSize: 20, color: Renk.koyu },
  bolumBasligi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bolumSag: { fontFamily: Font.sansKalin, fontSize: 13, color: Renk.ana },
  orta: { alignItems: 'center', justifyContent: 'center', padding: Bosluk.xl },
  bosIkon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Renk.anaSoluk, alignItems: 'center', justifyContent: 'center' },
  adimlar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Bosluk.xl, paddingBottom: Bosluk.m },
  adim: { alignItems: 'center', gap: 6, flex: 1 },
  adimDaire: { width: 30, height: 30, borderRadius: 15, backgroundColor: Renk.kremKoyu, alignItems: 'center', justifyContent: 'center' },
  adimNo: { fontFamily: Font.sansKalin, fontSize: 13, color: Renk.soluk },
  adimYazi: { fontFamily: Font.sansOrta, fontSize: 11, color: Renk.soluk },
  altCubuk: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Renk.beyaz,
    borderTopLeftRadius: Kose.l,
    borderTopRightRadius: Kose.l,
    paddingHorizontal: Bosluk.xl,
    paddingTop: Bosluk.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Bosluk.m,
    ...Golge,
    shadowOffset: { width: 0, height: -4 },
  },
});
