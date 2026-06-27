"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, GripVertical } from "lucide-react";
import { Button, Label } from "./ui";
import type { UploadedImage } from "@/lib/types";

interface ImageLibraryProps {
  uploads: UploadedImage[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  title?: string;
  emptyHint?: string;
  compact?: boolean;
}

export function ImageLibrary({
  uploads,
  onAdd,
  onRemove,
  onReorder,
  title = "Biblioteca de imagens",
  emptyHint = "Arraste imagens aqui ou clique para enviar.",
  compact = false,
}: ImageLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) onAdd(files);
    },
    [onAdd],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="mb-0">{title}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} /> Enviar
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploads.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:border-primary hover:text-primary transition-colors"
        >
          <Upload size={18} />
          {emptyHint}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {uploads.map((img, i) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(i);
              }}
              onDragEnd={() => {
                if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
                  onReorder(dragIndex, dropIndex);
                }
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
                  onReorder(dragIndex, dropIndex);
                }
                setDragIndex(null);
                setDropIndex(null);
              }}
              className={`group relative ${compact ? "h-16 w-16" : "h-24 w-24"} overflow-hidden rounded-md border border-zinc-700 ${dropIndex === i ? "ring-2 ring-primary" : ""}`}
              title={img.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center bg-black/60 text-[10px] text-white">
                <GripVertical size={12} />
              </div>
              <div className="absolute left-0 top-5 bg-black/70 px-1 text-[10px] text-white">
                {i + 1}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
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
            className={`flex ${compact ? "h-16 w-16" : "h-24 w-24"} items-center justify-center rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-primary hover:text-primary`}
          >
            <Upload size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
