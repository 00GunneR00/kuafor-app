import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormAlani } from '@/components/Form';
import { BilgiSatiri, BosDurum, Buton, Cip, HataKutusu, Ikon, Kart, Metin, Rozet } from '@/components/ui';
import { UzmanFoto } from '@/components/UzmanFoto';
import { useOturum } from '@/lib/oturum';
import { salonuAra, yolTarifiAc } from '@/lib/salon';
import { useSimdi, fiyatYaz, goreliGun, saatYaz, tarihParca, uzunTarih } from '@/lib/tarih';
import { Bosluk, Font, Kose, Renk } from '@/lib/tema';
import { tekrarRandevuHedefi, uzmanAdi, type Randevu, type SalonAyarlari } from '@/lib/tipler';
import { randevuIptalEt, randevularimiGetir, salonAyarlariniGetir, useSorgu, webRandevusuAktar } from '@/lib/veri';

const IPTAL_NEDENLERI = ['Planım değişti', 'Başka bir saate alacağım', 'Hastayım', 'Diğer'];

export default function Randevularim() {
  const { oturum } = useOturum();
  const [sekme, setSekme] = useState<'yaklasan' | 'gecmis'>('yaklasan');
  const [iptalEdilecek, setIptalEdilecek] = useState<Randevu | null>(null);
  const [kodPenceresi, setKodPenceresi] = useState(false);
  const simdi = useSimdi();

  const veri = useSorgu(async () => {
    if (!oturum) return null;
    const [randevular, ayarlar] = await Promise.all([randevularimiGetir(), salonAyarlariniGetir()]);
    return { randevular, ayarlar };
  }, [oturum?.user.id]);

  useFocusEffect(
    useCallback(() => {
      veri.yenile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oturum?.user.id]),
  );

  if (!oturum) {
    return (
      <SafeAreaView style={s.ekran} edges={['top']}>
        <Text style={s.baslik}>Randevularım</Text>
        <BosDurum ikon="calendar-month" baslik="Randevularını görmek için giriş yap" aciklama="Giriş yaptıktan sonra randevu alabilir, iptal edebilir ve geçmişini görebilirsin.">
          <Buton baslik="Giriş Yap" onPress={() => router.push({ pathname: '/giris', params: { sonra: '/randevularim' } })} style={{ marginTop: Bosluk.m, alignSelf: 'stretch' }} />
        </BosDurum>
      </SafeAreaView>
    );
  }

  const yaklasan = (veri.veri?.randevular ?? [])
    .filter((r) => r.durum === 'onaylandi' && new Date(r.bitis).getTime() > simdi)
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic));
  const gecmis = (veri.veri?.randevular ?? []).filter((r) => !yaklasan.includes(r));

  return (
    <SafeAreaView style={s.ekran} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Bosluk.xl, gap: Bosluk.l, paddingBottom: Bosluk.xxxl }}
        refreshControl={<RefreshControl refreshing={veri.yukleniyor && !!veri.veri} onRefresh={veri.yenile} tintColor={Renk.ana} />}>
        <Text style={[s.baslik, { padding: 0 }]}>Randevularım</Text>
        <Buton baslik="Yeni Randevu Al" ikon="add" onPress={() => router.push('/randevu/hizmet')} />
        <Buton tur="metin" ikon="language" baslik="Web'den aldığın randevuyu ekle" onPress={() => setKodPenceresi(true)} />

        <View style={s.sekmeler}>
          {(['yaklasan', 'gecmis'] as const).map((k) => (
            <Pressable key={k} onPress={() => setSekme(k)} style={[s.sekme, sekme === k && s.sekmeSecili]}>
              <Text style={[s.sekmeYazi, sekme === k && { color: Renk.beyaz }]}>
                {k === 'yaklasan' ? `Yaklaşan${yaklasan.length ? ` (${yaklasan.length})` : ''}` : 'Geçmiş'}
              </Text>
            </Pressable>
          ))}
        </View>

        {veri.hata && <HataKutusu mesaj={veri.hata} tekrar={veri.yenile} />}

        {veri.veri && sekme === 'yaklasan' && (
          <>
            {yaklasan.length === 0 ? (
              <BosDurum ikon="event-available" baslik="Yaklaşan randevun yok" aciklama="Yeni bir randevu alarak başlayabilirsin." />
            ) : (
              yaklasan.map((r) => <YaklasanKart key={r.id} r={r} simdi={simdi} ayarlar={veri.veri!.ayarlar} onIptal={() => setIptalEdilecek(r)} />)
            )}
            <View style={s.ipucu}>
              <Ikon ad="notifications-none" renk={Renk.ana} />
              <Metin tur="kucuk" style={{ flex: 1 }}>
                Randevundan önce sana hatırlatma bildirimi göndereceğiz.
              </Metin>
            </View>
          </>
        )}

        {veri.veri && sekme === 'gecmis' && (gecmis.length === 0 ? <BosDurum ikon="history" baslik="Henüz geçmiş randevun yok" /> : <GecmisListe randevular={gecmis} puan={veri.veri.ayarlar.puan_basina} />)}
      </ScrollView>

      {iptalEdilecek && veri.veri && (
        <IptalPenceresi
          r={iptalEdilecek}
          kapat={() => setIptalEdilecek(null)}
          bitti={() => {
            setIptalEdilecek(null);
            veri.yenile();
          }}
        />
      )}

      {kodPenceresi && (
        <WebKoduPenceresi
          kapat={() => setKodPenceresi(false)}
          bitti={() => {
            setKodPenceresi(false);
            setSekme('yaklasan');
            veri.yenile();
          }}
        />
      )}
    </SafeAreaView>
  );
}

/** Web sayfasından alınan randevunun kodunu girip hesaba taşıma */
function WebKoduPenceresi({ kapat, bitti }: { kapat: () => void; bitti: () => void }) {
  const [kod, setKod] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [tamam, setTamam] = useState(false);

  async function ekle() {
    setGonderiliyor(true);
    setHata(null);
    try {
      await webRandevusuAktar(kod);
      setTamam(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Randevu eklenemedi');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={kapat}>
      <Pressable style={s.karartma} onPress={kapat} accessibilityLabel="Kapat" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.pencere}>
          <View style={s.tutamak} />
          <View style={[s.pencereIkon, { backgroundColor: Renk.anaSoluk }]}>
            <Ikon ad={tamam ? 'check' : 'language'} boyut={30} renk={Renk.ana} />
          </View>
          {tamam ? (
            <>
              <Metin tur="altBaslik" style={{ textAlign: 'center' }}>
                Randevun hesabına eklendi
              </Metin>
              <Metin style={{ textAlign: 'center' }}>Randevu tamamlanınca puanın hesabına yazılır. Randevudan önce hatırlatma da alacaksın.</Metin>
              <Buton baslik="Tamam" onPress={bitti} />
            </>
          ) : (
            <>
              <Metin tur="altBaslik" style={{ textAlign: 'center' }}>
                Web randevusu ekle
              </Metin>
              <Metin style={{ textAlign: 'center' }}>
                Web sayfasından randevu aldıysan, onay ekranındaki 6 haneli kodu gir. Randevu hesabına taşınır ve puan kazanırsın.
              </Metin>
              <FormAlani
                etiket="Randevu kodu"
                ikon="confirmation-number"
                value={kod}
                onChangeText={(t) => setKod(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                autoCapitalize="characters"
                placeholder="ABC123"
                maxLength={6}
                yardim="Randevuda verdiğin telefon numarası profilindeki numarayla aynı olmalı."
              />
              {hata && <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />}
              <Buton baslik="Randevuyu Ekle" yukleniyor={gonderiliyor} pasif={kod.length !== 6} onPress={ekle} />
              <Buton tur="cizgili" baslik="Vazgeç" onPress={kapat} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function iptalSonu(r: Randevu, ayarlar: SalonAyarlari) {
  return new Date(new Date(r.baslangic).getTime() - ayarlar.ucretsiz_iptal_saat * 3600000);
}

function YaklasanKart({ r, simdi, ayarlar, onIptal }: { r: Randevu; simdi: number; ayarlar: SalonAyarlari; onIptal: () => void }) {
  const sinir = iptalSonu(r, ayarlar);
  const iptalEdilebilir = simdi < sinir.getTime();
  const bugun = goreliGun(r.baslangic) === 'Bugün';
  const t = tarihParca(r.baslangic);
  return (
    <Kart style={[{ gap: Bosluk.m }, bugun && { borderTopWidth: 3, borderTopColor: Renk.mercan }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        {bugun ? <Rozet metin="● Bugün" renk={Renk.mercan} zemin={Renk.mercanSoluk} /> : <Rozet metin="Onaylandı" />}
      </View>
      <View style={s.satir}>
        <TarihKutusu gun={t.gun} ay={t.ayKisa} />
        <View style={{ flex: 1, gap: 4 }}>
          <Metin kalin>{r.hizmetler.map((h) => h.ad).join(', ')}</Metin>
          <BilgiSatiri ikon="schedule" metin={`${goreliGun(r.baslangic)}, ${saatYaz(r.baslangic)} · ${r.toplam_sure_dk} dk`} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <UzmanFoto ad={uzmanAdi(r)} foto={r.uzman?.foto_url ?? null} boyut={22} />
            <Metin tur="kucuk">
              Uzman: <Text style={{ color: Renk.koyu, fontFamily: Font.sansKalin }}>{uzmanAdi(r)}</Text>
            </Metin>
          </View>
        </View>
      </View>
      <View style={[s.satir, s.ayrac]}>
        <Metin kalin style={{ flex: 1 }}>
          {fiyatYaz(r.toplam_fiyat)}
        </Metin>
        <Metin tur="kucuk">Ödeme salonda</Metin>
      </View>
      {iptalEdilebilir ? (
        <>
          <View style={s.bilgiKutu}>
            <BilgiSatiri ikon="schedule" metin={`Ücretsiz iptal: ${uzunTarih(sinir.toISOString()).split(' ').slice(0, 2).join(' ')} ${saatYaz(sinir.toISOString())}'a kadar`} />
          </View>
          <View style={{ flexDirection: 'row', gap: Bosluk.s }}>
            <Buton tur="cizgili" ikon="close" baslik="Randevuyu İptal Et" onPress={onIptal} style={{ flex: 1, borderColor: Renk.cizgi }} />
            <Buton tur="cizgili" ikon="directions" baslik="Yol Tarifi" onPress={() => yolTarifiAc(ayarlar)} style={{ borderColor: Renk.cizgi }} />
          </View>
        </>
      ) : (
        <>
          <View style={[s.bilgiKutu, { backgroundColor: Renk.mercanSoluk }]}>
            <BilgiSatiri ikon="info-outline" renk={Renk.tugla} metin={`Ücretsiz iptal süresi doldu (randevuya ${ayarlar.ucretsiz_iptal_saat} saatten az kaldı).`} />
          </View>
          {ayarlar.telefon && <Buton tur="cizgili" ikon="call" baslik="Salonu Ara" onPress={() => salonuAra(ayarlar.telefon)} style={{ borderColor: Renk.cizgi }} />}
        </>
      )}
    </Kart>
  );
}

function GecmisListe({ randevular, puan }: { randevular: Randevu[]; puan: number }) {
  // Aylara göre grupla (en yeni üstte)
  const gruplar: { baslik: string; liste: Randevu[] }[] = [];
  for (const r of randevular) {
    const t = tarihParca(r.baslangic);
    const baslik = `${t.ay.toLocaleUpperCase('tr')} ${t.yil}`;
    const g = gruplar.find((x) => x.baslik === baslik);
    if (g) g.liste.push(r);
    else gruplar.push({ baslik, liste: [r] });
  }
  return (
    <>
      {gruplar.map((g) => (
        <View key={g.baslik} style={{ gap: Bosluk.m }}>
          <Metin tur="etiket">{g.baslik}</Metin>
          {g.liste.map((r) => {
            const t = tarihParca(r.baslangic);
            const iptal = r.durum === 'iptal';
            return (
              <Kart key={r.id} style={[{ gap: Bosluk.m }, iptal && { opacity: 0.75 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  {r.durum === 'tamamlandi' && <Rozet metin="● Tamamlandı" renk={Renk.yesil} zemin={Renk.yesilSoluk} />}
                  {iptal && <Rozet metin="● İptal Edildi" renk={Renk.taupe} zemin={Renk.kremKoyu} />}
                  {r.durum === 'gelmedi' && <Rozet metin="Gelinmedi" renk={Renk.tugla} zemin={Renk.tuglaSoluk} />}
                  {r.durum === 'onaylandi' && <Rozet metin="Onaylandı" />}
                </View>
                <View style={s.satir}>
                  <TarihKutusu gun={t.gun} ay={t.ayKisa} soluk={iptal} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.gecmisAd}>{r.hizmetler.map((h) => h.ad).join(', ')}</Text>
                    <Metin tur="kucuk">
                      {r.toplam_sure_dk} dk · Uzman: {uzmanAdi(r)}
                    </Metin>
                    <Text style={[s.gecmisFiyat, iptal && { textDecorationLine: 'line-through', color: Renk.soluk }]}>{fiyatYaz(r.toplam_fiyat)}</Text>
                  </View>
                </View>
                <View style={[s.satir, s.ayrac]}>
                  <View style={{ flex: 1 }}>
                    {r.durum === 'tamamlandi' && <BilgiSatiri ikon="stars" renk={Renk.ana} metin={`+${puan} puan kazandın`} />}
                    {iptal && (
                      <BilgiSatiri
                        ikon="info-outline"
                        metin={`${r.iptal_eden === 'salon' ? 'Salon iptal etti' : 'Sen iptal ettin'}${r.iptal_tarihi ? ` · ${uzunTarih(r.iptal_tarihi).split(' ').slice(0, 2).join(' ')}` : ''}`}
                      />
                    )}
                  </View>
                  <Buton
                    tur="cizgili"
                    ikon="replay"
                    baslik="Tekrar Randevu Al"
                    onPress={() =>
                      router.push(tekrarRandevuHedefi(r))
                    }
                    style={{ paddingVertical: 8, paddingHorizontal: Bosluk.m }}
                  />
                </View>
              </Kart>
            );
          })}
        </View>
      ))}
    </>
  );
}

function TarihKutusu({ gun, ay, soluk }: { gun: string; ay: string; soluk?: boolean }) {
  return (
    <View style={[s.tarih, soluk && { opacity: 0.6 }]}>
      <Text style={s.tarihGun}>{gun}</Text>
      <Text style={s.tarihAy}>{ay}</Text>
    </View>
  );
}

function IptalPenceresi({ r, kapat, bitti }: { r: Randevu; kapat: () => void; bitti: () => void }) {
  const [neden, setNeden] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function iptalEt() {
    setGonderiliyor(true);
    setHata(null);
    try {
      await randevuIptalEt(r.id, neden);
      bitti();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İptal edilemedi');
    } finally {
      setGonderiliyor(false);
    }
  }

  function baskaSaat() {
    kapat();
    router.push(tekrarRandevuHedefi(r, { degistir: r.id }));
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={kapat}>
      <Pressable style={s.karartma} onPress={kapat} accessibilityLabel="Kapat" />
      <View style={s.pencere}>
        <View style={s.tutamak} />
        <View style={s.pencereIkon}>
          <Ikon ad="event-busy" boyut={30} renk={Renk.tugla} />
        </View>
        <Metin tur="altBaslik" style={{ textAlign: 'center' }}>
          Randevunu iptal etmek istiyor musun?
        </Metin>
        <View style={s.ozet}>
          <View style={{ flex: 1 }}>
            <Metin kalin>
              {r.hizmetler.map((h) => h.ad).join(', ')} · {uzmanAdi(r)}
            </Metin>
            <Metin tur="kucuk">{`${uzunTarih(r.baslangic)}, ${saatYaz(r.baslangic)}`}</Metin>
          </View>
          <Metin kalin>{fiyatYaz(r.toplam_fiyat)}</Metin>
        </View>
        <Metin tur="etiket">İptal nedeni (isteğe bağlı)</Metin>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Bosluk.s }}>
          {IPTAL_NEDENLERI.map((n) => (
            <Cip key={n} baslik={n} secili={neden === n} onPress={() => setNeden(neden === n ? null : n)} />
          ))}
        </View>
        <BilgiSatiri ikon="info-outline" metin="Ücretsiz iptal süresi içindesin. Bu işlem geri alınamaz." />
        {hata && <BilgiSatiri ikon="error-outline" renk={Renk.tugla} metin={hata} />}
        <Buton tur="tehlike" baslik="Evet, İptal Et" yukleniyor={gonderiliyor} onPress={iptalEt} />
        <Buton tur="cizgili" baslik="Vazgeç" onPress={kapat} />
        <Buton tur="metin" baslik="Bunun yerine başka bir saate al" onPress={baskaSaat} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Renk.krem },
  baslik: { fontFamily: Font.serif, fontSize: 28, color: Renk.koyu, textAlign: 'center', padding: Bosluk.xl },
  sekmeler: { flexDirection: 'row', backgroundColor: Renk.kremKoyu, borderRadius: Kose.tam, padding: 4 },
  sekme: { flex: 1, paddingVertical: 10, borderRadius: Kose.tam, alignItems: 'center' },
  sekmeSecili: { backgroundColor: Renk.ana },
  sekmeYazi: { fontFamily: Font.sansKalin, fontSize: 14, color: Renk.taupe },
  satir: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m },
  ayrac: { borderTopWidth: 1, borderTopColor: Renk.kremKoyu, paddingTop: Bosluk.m },
  tarih: { width: 60, height: 64, borderRadius: Kose.m, backgroundColor: Renk.krem, alignItems: 'center', justifyContent: 'center' },
  tarihGun: { fontFamily: Font.serifKalin, fontSize: 22, color: Renk.koyu },
  tarihAy: { fontFamily: Font.sansKalin, fontSize: 11, color: Renk.taupe },
  bilgiKutu: { backgroundColor: Renk.krem, borderRadius: Kose.s, padding: Bosluk.m },
  ipucu: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, backgroundColor: Renk.kremKoyu, borderRadius: Kose.m, padding: Bosluk.l },
  gecmisAd: { fontFamily: Font.serifKalin, fontSize: 17, color: Renk.koyu },
  gecmisFiyat: { fontFamily: Font.sansKalin, fontSize: 15, color: Renk.koyu, marginTop: 2 },
  karartma: { flex: 1, backgroundColor: Renk.karartma },
  pencere: {
    backgroundColor: Renk.beyaz,
    borderTopLeftRadius: Kose.xl,
    borderTopRightRadius: Kose.xl,
    padding: Bosluk.xxl,
    paddingBottom: Bosluk.xxxl,
    gap: Bosluk.m,
  },
  tutamak: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Renk.cizgi },
  pencereIkon: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: Renk.tuglaSoluk, alignItems: 'center', justifyContent: 'center' },
  ozet: { flexDirection: 'row', alignItems: 'center', gap: Bosluk.m, backgroundColor: Renk.krem, borderRadius: Kose.m, padding: Bosluk.l },
});
