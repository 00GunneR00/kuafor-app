// Logo metni salona göre .env.local'den ayarlanır (NEXT_PUBLIC_LOGO_UST / NEXT_PUBLIC_LOGO_ALT)
export const LOGO_UST = process.env.NEXT_PUBLIC_LOGO_UST ?? "LOGO";
export const LOGO_ALT = process.env.NEXT_PUBLIC_LOGO_ALT ?? "SALONUNUZUN ADI";
