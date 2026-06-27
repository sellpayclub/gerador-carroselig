"use client";

import { supabase, FACE_BUCKET, facePublicUrl } from "./supabase-client";
import type { FacePreset, UploadedImage } from "./types";

function guessExt(name: string, dataUrl: string): string {
  const m = /^data:image\/([\w+]+);/.exec(dataUrl);
  if (m) {
    const t = m[1];
    if (t === "jpeg") return "jpg";
    return t;
  }
  if (name.includes(".")) return name.split(".").pop()!.toLowerCase();
  return "jpg";
}

async function fetchToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type RawPreset = {
  id: string;
  name: string;
  created_at: string;
  face_preset_images: {
    id: string;
    preset_id: string;
    storage_path: string;
    position: number;
    original_name: string | null;
  }[];
};

/** Carrega todos os presets salvos (com imagens em dataUrl para uso direto). */
export async function listFacePresets(): Promise<FacePreset[]> {
  const { data, error } = await supabase
    .from("face_presets")
    .select(
      "id, name, created_at, face_preset_images(id, preset_id, storage_path, position, original_name)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const out: FacePreset[] = [];
  for (const p of (data as RawPreset[]) ?? []) {
    const imgs = [...(p.face_preset_images ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const images: UploadedImage[] = [];
    for (const img of imgs) {
      const publicUrl = facePublicUrl(img.storage_path);
      try {
        const dataUrl = await fetchToDataUrl(publicUrl);
        images.push({
          id: img.id,
          name: img.original_name ?? "face.jpg",
          dataUrl,
        });
      } catch (err) {
        console.warn("face-presets-api: falha ao buscar", img.storage_path, err);
      }
    }
    if (images.length > 0) out.push({ id: p.id, name: p.name, images });
  }
  return out;
}

/** Cria um preset: insere a linha, faz upload das fotos pro Storage e registra metadados. */
export async function saveFacePreset(
  name: string,
  staging: UploadedImage[],
): Promise<FacePreset> {
  if (staging.length === 0) throw new Error("Nenhuma foto no staging.");

  // 1. insere o preset (gera id)
  const { data: preset, error: e1 } = await supabase
    .from("face_presets")
    .insert({ name })
    .select("id, name")
    .single();
  if (e1) throw e1;
  const presetId = preset.id;

  const uploadedPaths: string[] = [];
  try {
    // 2. upload de cada foto
    const rows: {
      preset_id: string;
      storage_path: string;
      position: number;
      original_name: string;
    }[] = [];
    for (let i = 0; i < staging.length; i++) {
      const img = staging[i];
      const ext = guessExt(img.name, img.dataUrl);
      const path = `${presetId}/${i}.${ext}`;
      const blob = await (await fetch(img.dataUrl)).blob();
      const { error: upErr } = await supabase.storage
        .from(FACE_BUCKET)
        .upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: true,
        });
      if (upErr) throw upErr;
      uploadedPaths.push(path);
      rows.push({
        preset_id: presetId,
        storage_path: path,
        position: i,
        original_name: img.name,
      });
    }

    // 3. insere metadados das imagens
    const { data: inserted, error: e3 } = await supabase
      .from("face_preset_images")
      .insert(rows)
      .select("id, storage_path, position, original_name");
    if (e3) throw e3;

    const images: UploadedImage[] = inserted.map((row, i) => ({
      id: row.id,
      name: row.original_name ?? staging[i].name,
      dataUrl: staging[i].dataUrl,
    }));

    return { id: presetId, name, images };
  } catch (err) {
    // rollback: limpa Storage + apaga preset (cascade)
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(FACE_BUCKET).remove(uploadedPaths);
    }
    await supabase.from("face_presets").delete().eq("id", presetId);
    throw err;
  }
}

/** Remove um preset: apaga a linha (cascade) e os objetos do Storage. */
export async function deleteFacePreset(id: string): Promise<void> {
  const { data: imgs } = await supabase
    .from("face_preset_images")
    .select("storage_path")
    .eq("preset_id", id);
  const paths = (imgs ?? []).map((i) => i.storage_path);

  const { error } = await supabase
    .from("face_presets")
    .delete()
    .eq("id", id);
  if (error) throw error;

  if (paths.length > 0) {
    const { error: delErr } = await supabase.storage
      .from(FACE_BUCKET)
      .remove(paths);
    if (delErr) console.warn("face-presets-api: storage.remove", delErr);
  }
}
