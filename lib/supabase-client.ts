import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.",
  );
}

/** Singleton do cliente Supabase (browser + server). Usa só a anon key. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const FACE_BUCKET = "face-images";

export function facePublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(FACE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
