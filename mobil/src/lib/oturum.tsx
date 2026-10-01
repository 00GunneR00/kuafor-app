import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { cihaziKaldir } from './bildirim';
import { supabase } from './supabase';
import type { Profil } from './tipler';

type OturumDegeri = {
  oturum: Session | null;
  profil: Profil | null;
  hazir: boolean;
  profiliYenile: () => Promise<void>;
  cikisYap: () => Promise<void>;
};

const OturumBaglami = createContext<OturumDegeri | null>(null);

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [oturum, setOturum] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [hazir, setHazir] = useState(false);

  const profilGetir = useCallback(async (kullaniciId: string | undefined) => {
    if (!kullaniciId) {
      setProfil(null);
      return;
    }
    const { data } = await supabase
      .from('profiller')
      .select('id, ad_soyad, telefon, rol, kampanya_izni, hatirlatma_bildirim')
      .eq('id', kullaniciId)
      .maybeSingle();
    setProfil(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setOturum(data.session);
      await profilGetir(data.session?.user.id);
      setHazir(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_olay, yeni) => {
      setOturum(yeni);
      // Supabase, dinleyici içinde başka bir auth çağrısını beklemeyi önermiyor
      setTimeout(() => profilGetir(yeni?.user.id), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [profilGetir]);

  const deger: OturumDegeri = {
    oturum,
    profil,
    hazir,
    profiliYenile: () => profilGetir(oturum?.user.id),
    cikisYap: async () => {
      await cihaziKaldir().catch(() => undefined);
      await supabase.auth.signOut();
    },
  };

  return <OturumBaglami.Provider value={deger}>{children}</OturumBaglami.Provider>;
}

export function useOturum() {
  const d = useContext(OturumBaglami);
  if (!d) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı');
  return d;
}
