import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

import { YoneticiSaglayici } from "@/lib/yonetici";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin", "latin-ext"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Örnek Salon · Salon Paneli",
  description: "Randevu, müşteri ve salon yönetimi",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <YoneticiSaglayici>{children}</YoneticiSaglayici>
      </body>
    </html>
  );
}
