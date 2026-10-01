import { Redirect } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdimEkrani, adimaGit } from '@/components/AdimEkrani';
import { SecimOzeti } from '@/components/SecimOzeti';
import { Buton, HataKutusu, Metin, Yukleniyor } from '@/components/ui';
import { useKatalog } from '@/lib/randevuKatalog';
import { useTaslak } from '@/lib/randevuTaslak';
import { gunAcikMi, slotlariHesapla, uygunUzmanlar, type Slot } from '@/lib/slotlar';
import { AYLAR, GUNLER_KISA, gunBilgisi, gunEkle, tarihAnahtari } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { doluAraliklariGetir, useSorgu } from '@/lib/veri';

const GUN_SAYISI = 30; // bugünden itibaren kaç gün gösterilir

// 3. adım: Tarih ve saat seç
export default function TarihSaatAdimi() {
  const { veri } = useKatalog();
  const { taslak, guncelle } = useTaslak();

  const gunler = useMemo(() => {
    const bugun = tarihAnahtari();
    return Array.from({ length: GUN_SAYISI }, (_, i) => gunEkle(bugun, i));
  }, []);

  // İlk açık günü varsayılan seç
  useEffect(() => {
    if (veri && !taslak.tarih) {
      const ilk = gunler.find((g) => gunAcikMi(g, veri.saatler, veri.kapaliGunler));
      if (ilk) guncelle({ tarih: ilk });
    }
  }, [veri, taslak.tarih, gunler, guncelle]);

  const dolu = useSorgu(async () => (taslak.tarih ? doluAraliklariGetir(taslak.tarih) : []), [taslak.tarih]);

  if (taslak.hizmetIds.length === 0) return <Redirect href="/randevu/hizmet" />;
  if (taslak.uzmanId === undefined) return <Redirect href="/randevu/uzman" />;

  const secili = veri?.hizmetler.filter((h) => taslak.hizmetIds.includes(h.id)) ?? [];
  const sure = secili.reduce((t, h) => t + h.sure_dk, 0);
  const uzman = veri?.uzmanlar.find((u) => u.id === taslak.uzmanId);

  const slotlar: Slot[] =
    veri && taslak.tarih && dolu.veri
      ? slotlariHesapla({
          tarih: taslak.tarih,
          sureDk: sure,
          saatler: veri.saatler,
          kapaliGunler: veri.kapaliGunler,
          uzmanIds: taslak.uzmanId
            ? [taslak.uzmanId]
            : uygunUzmanlar(taslak.hizmetIds, veri.iliskiler, veri.uzmanlar.map((u) => u.id)),
          dolu: dolu.veri,
        })
      : [];
  const sabah = slotlar.filter((x) => x.saat < '12:00');
  const ogleden = slotlar.filter((x) => x.saat >= '12:00');
  const ay = taslak.tarih ? gunBilgisi(taslak.tarih) : null;

  return (
    <AdimEkrani
      adim={3}
      alt={
        <>
          <Buton tur="cizgili" baslik="Geri" ikon="arrow-back" onPress={() => adimaGit(2)} />
          <Buton baslik="Devam Et" sagIkon="arrow-forward" pasif={!taslak.saat} onPress={() => adimaGit(4)} style={{ flex: 1 }} />
        </>
      }>
      <SecimOzeti
        baslik={secili.map((h) => h.ad).join(', ')}
        alt={`${sure} dk · Uzman: ${uzman?.ad ?? 'Farketmez'}`}
        onDegistir={() => adimaGit(1)}
      />
      <Metin tur="baslik">Ne zaman gelmek istersin?</Metin>

      {ay && <Metin tur="altBaslik">{`${AYLAR[ay.ay]} ${ay.yil}`}</Metin>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Bosluk.s }}>
        {veri &&
          gunler.map((g) => {
            const acik = gunAcikMi(g, veri.saatler, veri.kapaliGunler);
            const b = gunBilgisi(g);
            const seciliMi = g === taslak.tarih;
            return (
              <Pressable
                key={g}
                disabled={!acik}
                onPress={() => guncelle({ tarih: g, saat: null })}
                style={[s.gun, seciliMi && s.gunSecili, !acik && s.gunKapali]}>
                <Text style={[s.gunAd, seciliMi && { color: Renk.beyaz }]}>{GUNLER_KISA[b.haftaGunu]}</Text>
                <Text style={[s.gunNo, seciliMi && { color: Renk.beyaz }]}>{b.gun}</Text>
                {!acik && <Text style={s.kapaliYazi}>Kapalı</Text>}
              </Pressable>
            );
          })}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Metin tur="altBaslik">Saat Seç</Metin>
        {taslak.saat && (
          <Metin tur="kucuk" renk={Renk.ana}>
            Seçili: {taslak.saat}
          </Metin>
        )}
      </View>

      {dolu.yukleniyor && <Yukleniyor />}
      {dolu.hata && <HataKutusu mesaj={dolu.hata} tekrar={dolu.yenile} />}
      {!dolu.yukleniyor && !dolu.hata && slotlar.length === 0 && (
        <Metin renk={Renk.taupe}>Bu gün için uygun saat kalmadı. Başka bir gün seç.</Metin>
      )}

      <SaatGrubu baslik="ÖĞLEDEN ÖNCE" slotlar={sabah} secili={taslak.saat} onSec={(saat) => guncelle({ saat })} />
      <SaatGrubu baslik="ÖĞLEDEN SONRA" slotlar={ogleden} secili={taslak.saat} onSec={(saat) => guncelle({ saat })} />

      {slotlar.length > 0 && (
        <View style={s.lejant}>
          <Lejant renk={Renk.beyaz} kenar={Renk.cizgi} ad="Uygun" />
          <Lejant renk={Renk.kremKoyu} ad="Dolu" />
          <Lejant renk={Renk.ana} ad="Seçili" />
        </View>
      )}
    </AdimEkrani>
  );
}

function SaatGrubu({ baslik, slotlar, secili, onSec }: { baslik: string; slotlar: Slot[]; secili: string | null; onSec: (s: string) => void }) {
  if (slotlar.length === 0) return null;
  return (
    <View style={{ gap: Bosluk.s }}>
      <Metin tur="etiket">{baslik}</Metin>
      <View style={s.izgara}>
        {slotlar.map((x) => {
          const seciliMi = x.saat === secili;
          return (
            <Pressable
              key={x.saat}
              disabled={!x.uygun}
              accessibilityLabel={x.uygun ? x.saat : `${x.saat} dolu`}
              onPress={() => onSec(x.saat)}
              style={[s.saat, seciliMi && s.saatSecili, !x.uygun && s.saatDolu]}>
              <Text style={[s.saatYazi, seciliMi && { color: Renk.beyaz }, !x.uygun && s.saatDoluYazi]}>{x.saat}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Lejant({ renk, kenar, ad }: { renk: string; kenar?: string; ad: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: renk, borderWidth: kenar ? 1 : 0, borderColor: kenar }} />
      <Metin tur="kucuk">{ad}</Metin>
    </View>
  );
}

const s = StyleSheet.create({
  gun: {
    width: 60,
    paddingVertical: Bosluk.m,
    borderRadius: Kose.m,
    backgroundColor: Renk.beyaz,
    borderWidth: 1,
    borderColor: Renk.cizgi,
    alignItems: 'center',
    gap: 2,
  },
  gunSecili: { backgroundColor: Renk.ana, borderColor: Renk.ana },
  gunKapali: { opacity: 0.5, borderStyle: 'dashed', backgroundColor: Renk.krem },
  gunAd: { fontFamily: Font.sans, fontSize: 12, color: Renk.taupe },
  gunNo: { fontFamily: Font.sansEnKalin, fontSize: 20, color: Renk.koyu },
  kapaliYazi: { fontFamily: Font.sansKalin, fontSize: 9, color: Renk.tugla },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: Bosluk.s },
  saat: {
    width: '23%',
    paddingVertical: 12,
    borderRadius: Kose.tam,
    backgroundColor: Renk.beyaz,
    borderWidth: 1,
    borderColor: Renk.cizgi,
    alignItems: 'center',
  },
  saatSecili: { backgroundColor: Renk.ana, borderColor: Renk.ana },
  saatDolu: { backgroundColor: Renk.kremKoyu, borderColor: Renk.kremKoyu },
  saatYazi: { fontFamily: Font.sansOrta, fontSize: 15, color: Renk.koyu },
  saatDoluYazi: { color: Renk.soluk, textDecorationLine: 'line-through' },
  lejant: { flexDirection: 'row', justifyContent: 'center', gap: Bosluk.xl },
});
