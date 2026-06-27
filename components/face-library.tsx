"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, User, X, Check, Trash2, AlertCircle } from "lucide-react";
import { Button, Input, Label } from "./ui";
import type { FacePreset, UploadedImage } from "@/lib/types";

interface FaceLibraryProps {
  presets: FacePreset[];
  stagingImages: UploadedImage[];
  onAddStaging: (files: FileList) => void;
  onRemoveStaging: (id: string) => void;
  onSavePreset: (name: string) => void;
  onRemovePreset: (id: string) => void;
  loading?: boolean;
  loadError?: string | null;
}

export function FaceLibrary({
  presets,
  stagingImages,
  onAddStaging,
  onRemoveStaging,
  onSavePreset,
  onRemovePreset,
  loading = false,
  loadError = null,
}: FaceLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  const canSave = name.trim().length > 0 && stagingImages.length >= 1;

  const handleSave = () => {
    if (!canSave) return;
    onSavePreset(name.trim());
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="mb-0">Biblioteca de Rostos</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} /> Enviar fotos
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0)
            onAddStaging(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-[11px] text-zinc-500">
        Suba 4–5 fotos de uma pessoa, dê um nome e salve. Depois é só escolher
        o rosto em cada card — a IA gera a imagem preservando o rosto.
        Os rostos ficam salvos no Supabase (não precisa reenviar a cada sessão).
      </p>

      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-red-900 bg-red-950/40 p-2 text-[11px] text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading && presets.length === 0 && stagingImages.length === 0 && (
        <div className="flex h-20 items-center justify-center gap-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-500">
          <Loader2 size={14} className="animate-spin" /> Carregando rostos
          salvos…
        </div>
      )}

      {/* Staging: fotos sendo montadas para salvar */}
      {stagingImages.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {stagingImages.map((img) => (
              <div
                key={img.id}
                className="group relative h-16 w-16 overflow-hidden rounded-md border border-zinc-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveStaging(img.id)}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remover"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-primary hover:text-primary"
            >
              <Upload size={16} />
            </button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Nome do rosto</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Maria"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            <Button
              type="button"
              size="md"
              variant="primary"
              onClick={handleSave}
              disabled={!canSave}
            >
              <Check size={14} /> Salvar rosto
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {stagingImages.length} foto(s) — ideal 4–5.
          </p>
        </div>
      )}

      {/* Presets salvos */}
      {presets.length > 0 && (
        <div className="space-y-2">
          {presets.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-zinc-800">
                <User size={18} className="text-zinc-400" />
              </div>
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <div className="flex h-12 gap-0.5 overflow-hidden">
                  {p.images.slice(0, 5).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.dataUrl}
                      alt={p.name}
                      className="h-12 w-9 rounded-sm border border-zinc-700 object-cover"
                    />
                  ))}
                </div>
                <span className="truncate text-sm font-medium text-zinc-200">
                  {p.name}
                </span>
                <span className="text-[11px] text-zinc-500">
                  ({p.images.length} fotos)
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-400 hover:bg-red-950/40"
                onClick={() => onRemovePreset(p.id)}
                aria-label="Remover rosto"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {presets.length === 0 && stagingImages.length === 0 && (
        <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-800 text-center">
          <User size={18} className="text-zinc-600" />
          <span className="text-[11px] text-zinc-500">
            Nenhum rosto salvo ainda.
          </span>
        </div>
      )}
    </div>
  );
}
