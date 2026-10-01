import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdimEkrani, adimaGit } from '@/components/AdimEkrani';
import { BilgiSatiri, Buton, Ikon, Kart, Metin, Rozet, type IkonAdi } from '@/components/ui';
import { useKatalog } from '@/lib/randevuKatalog';
import { useTaslak } from '@/lib/randevuTaslak';
import { anOlustur, fiyatYaz, uzunTarih } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { randevuIptalEt, randevuOlustur } from '@/lib/veri';

const NOT_SINIRI = 150;

// 4. adım: Özet ve onay. Her satırdaki "Düzenle" ilgili adıma döner.
export default function OnayAdimi() {
  const { veri } = useKatalog();
  const { taslak, guncelle } = useTaslak();
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (taslak.hizmetIds.length === 0) return <Redirect href="/randevu/hizmet" />;
  if (taslak.uzmanId === undefined) return <Redirect href="/randevu/uzman" />;
  if (!taslak.tarih || !taslak.saat) return <Redirect href="/randevu/tarih-saat" />;

  const secili = veri?.hizmetler.filter((h) => taslak.hizmetIds.includes(h.id)) ?? [];
  const sure = secili.reduce((t, h) => t + h.sure_dk, 0);
  const fiyat = secili.reduce((t, h) => t + h.fiyat, 0);
  const uzman = veri?.uzmanlar.find((u) => u.id === taslak.uzmanId);

  async function onayla() {
    setGonderiliyor(true);
    setHata(null);
    try {
      const id = await randevuOlustur({
        baslangic: anOlustur(taslak.tarih!, taslak.saat!),
        hizmetIds: taslak.hizmetIds,
        uzmanId: taslak.uzmanId ?? null,
        not: taslak.not,
      });
      // Yeniden planlama: yeni randevu kesinleşti, eskisini iptal et
      if (taslak.eskiRandevuId) {
        await randevuIptalEt(taslak.eskiRandevuId, 'Başka bir saate alındı').catch(() => undefined);
      }
      router.replace({ pathname: '/randevu/basarili', params: { id } });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Randevu oluşturulamadı');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <AdimEkrani
      adim={4}
      alt={
        <>
          <Buton tur="cizgili" baslik="Geri" ikon="arrow-back" onPress={() => adimaGit(3)} />
          <Buton baslik="Randevuyu Onayla" sagIkon="check" yukleniyor={gonderiliyor} onPress={onayla} style={{ flex: 1 }} />
        </>
      }>
      <View>
        <Metin tur="baslik">Randevunu kontrol et</Metin>
        <Metin tur="kucuk">Değiştirmek istediğin bilgiye dokunarak geri dönebilirsin.</Metin>
      </View>

      <Kart style={{ padding: 0 }}>
        <OzetSatiri ikon="content-cut" etiket="Hizmet" deger={`${secili.map((h) => h.ad).join(', ')} · ${sure} dk`} onDuzenle={() => adimaGit(1)} />
        <OzetSatiri ikon="person-outline" etiket="Uzman" deger={uzman ? `${uzman.ad}${uzman.unvan ? ` · ${uzman.unvan}` : ''}` : 'Farketmez (uygun uzman atanacak)'} onDuzenle={() => adimaGit(2)} ayrac />
        <OzetSatiri ikon="calendar-month" etiket="Tarih & Saat" deger={`${uzunTarih(taslak.tarih)}, ${taslak.saat}`} onDuzenle={() => adimaGit(3)} ayrac />
      </Kart>

      <View style={{ gap: Bosluk.s }}>
        <Metin kalin>Not (isteğe bağlı)</Metin>
        <View style={s.notKutu}>
          <TextInput
            value={taslak.not}
            onChangeText={(t) => guncelle({ not: t.slice(0, NOT_SINIRI) })}
            placeholder="Uzmanına iletmek istediğin bir not var mı?"
            placeholderTextColor={Renk.soluk}
            multiline
            style={s.notGirdi}
          />
          <Text style={s.sayac}>
            {taslak.not.length}/{NOT_SINIRI}
          </Text>
        </View>
      </View>

      <Kart style={{ gap: Bosluk.m }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Metin renk={Renk.taupe}>Toplam</Metin>
          <Text style={s.toplam}>{fiyatYaz(fiyat, secili.some((h) => h.fiyat_baslangic))}</Text>
        </View>
        <Rozet ikon="star" metin={`Bu randevudan +${veri?.ayarlar.puan_basina ?? 50} puan kazanacaksın`} />
        <BilgiSatiri
          ikon="info-outline"
          metin={`Ödeme salonda yapılır. Randevundan ${veri?.ayarlar.ucretsiz_iptal_saat ?? 2} saat öncesine kadar ücretsiz iptal edebilirsin.`}
        />
      </Kart>

      {hata && (
        <Kart style={{ backgroundColor: Renk.tuglaSoluk, gap: Bosluk.s }}>
          <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />
          {hata.includes('saat') && <Buton tur="metin" baslik="Başka bir saat seç" onPress={() => adimaGit(3)} />}
        </Kart>
      )}
    </AdimEkrani>
  );
}

function OzetSatiri({ ikon, etiket, deger, onDuzenle, ayrac }: { ikon: IkonAdi; etiket: string; deger: string; onDuzenle: () => void; ayrac?: boolean }) {
  return (
    <Pressable onPress={onDuzenle} style={[s.satir, ayrac && { borderTopWidth: 1, borderTopColor: Renk.kremKoyu }]}>
      <View style={s.satirIkon}>
        <Ikon ad={ikon} renk={Renk.ana} />
      </View>
      <View style={{ flex: 1 }}>
        <Metin tur="kucuk">{etiket}</Metin>
        <Metin kalin>{deger}</Metin>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ikon ad="edit" boyut={14} renk={Renk.ana} />
        <Text style={s.duzenle}>Düzenle</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, padding: Bosluk.l },
  satirIkon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  duzenle: { fontFamily: Font.sansKalin, fontSize: 13, color: Renk.ana },
  notKutu: { backgroundColor: Renk.beyaz, borderRadius: Kose.m, borderWidth: 1, borderColor: Renk.cizgi, padding: Bosluk.m },
  notGirdi: { minHeight: 70, fontFamily: Font.sans, fontSize: 15, color: Renk.koyu, textAlignVertical: 'top' },
  sayac: { alignSelf: 'flex-end', fontFamily: Font.sans, fontSize: 12, color: Renk.taupe },
  toplam: { fontFamily: Font.serifKalin, fontSize: 24, color: Renk.koyu },
});
