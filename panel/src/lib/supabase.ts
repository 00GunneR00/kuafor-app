import { createClient } from "@supabase/supabase-js";

// Panel tamamen tarayıcıda çalışır; yetkiyi veritabanındaki RLS kuralları belirler
// (yalnızca profiller.rol = 'yonetici' olan hesaplar salon verisini yönetebilir).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

export function hataMetni(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : "Bir hata oluştu";
}

/** Supabase cevabını açar: hata varsa fırlatır */
export function ac<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/** Görseli "gorseller" deposuna yükler, herkese açık adresini döndürür */
export async function gorselYukle(klasor: string, dosya: File): Promise<string> {
  const uzanti = dosya.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const yol = `${klasor}/${crypto.randomUUID()}.${uzanti}`;
  const { error } = await supabase.storage.from("gorseller").upload(yol, dosya, { contentType: dosya.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("gorseller").getPublicUrl(yol).data.publicUrl;
}
