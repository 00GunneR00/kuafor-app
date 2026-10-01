import { Stack } from 'expo-router';

import { Renk } from '@/lib/tema';

export default function AnaYigin() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Renk.krem } }} />;
}
