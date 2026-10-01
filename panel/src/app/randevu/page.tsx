import type { Metadata, Viewport } from "next";

import { WebRandevu } from "@/components/WebRandevu";

// Herkese açık hızlı randevu sayfası (Instagram biyografisindeki bağlantı). Panel girişi gerekmez.
export const metadata: Metadata = {
  title: "Hızlı Randevu · Örnek Salon",
  description: "Hizmetini seç, saatini seç, randevun anında onaylansın.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f8f3ee" };

export default function RandevuSayfasi() {
  return <WebRandevu />;
}
