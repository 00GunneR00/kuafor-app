import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/ui';
import { Font, Renk } from '@/lib/tema';

function sekme(baslik: string, ikon: IkonAdi) {
  return {
    title: baslik,
    tabBarIcon: ({ color }: { color: ColorValue }) => <Ikon ad={ikon} boyut={24} renk={color} />,
  };
}

// Alt menü: Ana Sayfa · Randevu · Keşfet · Hesabım (PLAN.md)
export default function SekmeDuzeni() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Renk.mercan,
        tabBarInactiveTintColor: Renk.taupe,
        tabBarLabelStyle: { fontFamily: Font.sansOrta, fontSize: 11 },
        tabBarStyle: { backgroundColor: Renk.beyaz, borderTopColor: Renk.cizgi },
        sceneStyle: { backgroundColor: Renk.krem },
      }}>
      {/* (ana): Ana Sayfa + ondan açılan Hizmetler ve Puanlarım (alt menüde "Ana Sayfa" seçili kalır) */}
      <Tabs.Screen name="(ana)" options={sekme('Ana Sayfa', 'home')} />
      <Tabs.Screen name="randevularim" options={sekme('Randevu', 'calendar-month')} />
      <Tabs.Screen name="kesfet" options={sekme('Keşfet', 'search')} />
      <Tabs.Screen name="hesabim" options={sekme('Hesabım', 'person')} />
    </Tabs>
  );
}
