import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Push bildirimleri: cihaz adresini (Expo push token) veritabanına kaydeder.
// Gönderimi veritabanı yapar (supabase/migrations/0008_bildirimler.sql):
// randevu hatırlatmaları, salon iptalleri ve kampanyalar.
//
// ÖNEMLİ: expo-notifications, Android'de Expo Go içinde yüklendiği anda hata fırlatır (SDK 53+).
// Bu yüzden modül en üstte içe aktarılmaz; yalnızca desteklenen ortamda, ihtiyaç anında yüklenir.
// Expo Go ve web'de uygulama bildirimsiz çalışır; bildirimler development/production build'de çalışır.

type BildirimModulu = typeof import('expo-notifications');

const EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const DESTEKLENIYOR = Platform.OS !== 'web' && !EXPO_GO;

let modulSozu: Promise<BildirimModulu> | null = null;

/** expo-notifications'ı yalnızca desteklenen ortamda bir kez yükler ve bildirim davranışını ayarlar */
function modul(): Promise<BildirimModulu> | null {
  if (!DESTEKLENIYOR) return null;
  modulSozu ??= import('expo-notifications').then((N) => {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return N;
  });
  return modulSozu;
}

let kayitliToken: string | null = null;

/** EAS proje kimliği (`npx eas-cli init` ile app.json'a yazılır). Yoksa push kullanılamaz. */
function projeKimligi(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * İzin ister, token alır ve giriş yapmış kullanıcıya bağlar.
 * Başarısızsa sessizce vazgeçer (uygulama bildirimsiz de çalışır); sebebi döndürür.
 */
export async function bildirimleriKaydet(): Promise<string | null> {
  if (Platform.OS === 'web') return 'Web sürümünde push bildirimi yok';
  if (EXPO_GO) return 'Expo Go push bildirimlerini desteklemiyor (development build gerekli)';
  if (!Device.isDevice) return 'Push bildirimleri yalnızca gerçek telefonda çalışır';
  const projectId = projeKimligi();
  if (!projectId) return 'EAS proje kimliği yok (npx eas-cli init çalıştırılmalı)';

  try {
    const N = await modul()!;
    if (Platform.OS === 'android') {
      // Veritabanı mesajları "default" kanalına gönderir
      await N.setNotificationChannelAsync('default', {
        name: 'Randevu ve kampanyalar',
        importance: N.AndroidImportance.HIGH,
        lightColor: '#B98B73',
      });
    }

    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await N.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return 'Bildirim izni verilmedi';

    const token = (await N.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('cihaz_kaydet', { p_token: token, p_platform: Platform.OS });
    if (error) return error.message;
    kayitliToken = token;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Bildirim kaydı yapılamadı';
  }
}

/** Çıkış yapmadan önce: bu telefona artık bu hesabın bildirimleri gitmesin */
export async function cihaziKaldir() {
  if (!kayitliToken) return;
  await supabase.rpc('cihaz_sil', { p_token: kayitliToken });
  kayitliToken = null;
}

/** Bildirime dokununca ilgili ekranı aç (veri.ekran: 'randevularim' | 'kesfet') */
export function bildirimeGit(veri: Record<string, unknown> | undefined) {
  const ekran = veri?.ekran;
  if (ekran === 'randevularim' || ekran === 'kesfet') router.navigate(`/${ekran}` as Href);
}

export function bildirimDokunmalariniDinle(): () => void {
  const yukleme = modul();
  if (!yukleme) return () => undefined;
  let iptal = false;
  let kaldir: (() => void) | null = null;
  yukleme
    .then((N) => {
      if (iptal) return;
      // Uygulama kapalıyken bildirime dokunulup açıldıysa
      const son = N.getLastNotificationResponse();
      if (son) bildirimeGit(son.notification.request.content.data);
      const abonelik = N.addNotificationResponseReceivedListener((y) => bildirimeGit(y.notification.request.content.data));
      kaldir = () => abonelik.remove();
    })
    .catch(() => undefined);
  return () => {
    iptal = true;
    kaldir?.();
  };
}
