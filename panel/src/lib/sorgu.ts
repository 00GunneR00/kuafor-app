"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { hataMetni } from "./supabase";

/**
 * Basit veri çekme kancası: { veri, yukleniyor, hata, yenile }
 * `anahtar` değişince veri yeniden çekilir (ör. seçili gün değişince).
 */
export function useSorgu<T>(getir: () => Promise<T>, anahtar: unknown[] = []) {
  const [veri, setVeri] = useState<T | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const getirRef = useRef(getir);
  useEffect(() => {
    getirRef.current = getir;
  });

  const cek = useCallback((iptal: { deger: boolean }) => {
    return getirRef.current().then(
      (v) => {
        if (iptal.deger) return;
        setVeri(v);
        setHata(null);
        setYukleniyor(false);
      },
      (e) => {
        if (iptal.deger) return;
        setHata(hataMetni(e));
        setYukleniyor(false);
      },
    );
  }, []);

  const anahtarMetni = JSON.stringify(anahtar);
  useEffect(() => {
    const iptal = { deger: false };
    cek(iptal);
    return () => {
      iptal.deger = true;
    };
  }, [anahtarMetni, cek]);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    await cek({ deger: false });
  }, [cek]);

  return { veri, yukleniyor, hata, yenile };
}

/** Şu anki zaman (ms); dakikada bir güncellenir */
export function useSimdi(aralikMs = 60_000): number {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setSimdi(Date.now()), aralikMs);
    return () => clearInterval(id);
  }, [aralikMs]);
  return simdi;
}
