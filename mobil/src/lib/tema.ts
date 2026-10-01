// Örnek Salon tasarım değerleri (PLAN.md > Tasarım)

export const Renk = {
  krem: '#F8F3EE',
  kremKoyu: '#EFE7DE',
  cizgi: '#E5DDD3',
  ana: '#B98B73',
  anaKoyu: '#A2735B',
  anaSoluk: 'rgba(185,139,115,0.12)',
  koyu: '#2B211C',
  taupe: '#7A6B63',
  soluk: '#A59990',
  mercan: '#E8643C',
  mercanSoluk: '#FBEAE4',
  tugla: '#A0523D',
  tuglaSoluk: 'rgba(160,82,61,0.10)',
  yesil: '#557A55',
  yesilSoluk: '#EBF2EB',
  beyaz: '#FFFFFF',
  karartma: 'rgba(43,33,28,0.45)',
} as const;

export const Font = {
  serif: 'PlayfairDisplay_500Medium',
  serifKalin: 'PlayfairDisplay_600SemiBold',
  serifItalik: 'PlayfairDisplay_400Regular_Italic',
  sans: 'DMSans_400Regular',
  sansOrta: 'DMSans_500Medium',
  sansKalin: 'DMSans_600SemiBold',
  sansEnKalin: 'DMSans_700Bold',
} as const;

export const Bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const Kose = { s: 12, m: 16, l: 20, xl: 28, tam: 999 } as const;

export const Golge = {
  shadowColor: '#2B211C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
