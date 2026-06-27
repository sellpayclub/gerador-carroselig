"use client";

import { useState } from "react";
import {
  AlertCircle,
  Download,
  Layers,
  Pencil,
  RefreshCw,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Badge, Button, Label, Textarea } from "./ui";
import { formatBrlFromUsd } from "@/lib/pricing";
import type { GeneratedCard } from "@/lib/types";

interface ResultsGalleryProps {
  results: GeneratedCard[];
  onRegenerateImage: (id: string) => void;
  onEditAndRegenerate: (
    id: string,
    next: { imagePrompt: string; textPrompt: string },
  ) => void;
  onDelete: (id: string) => void;
  onDownloadAll: () => void;
  onDownloadSingle: (id: string) => void;
  isGenerating: boolean;
}

export function ResultsGallery({
  results,
  onRegenerateImage,
  onEditAndRegenerate,
  onDelete,
  onDownloadAll,
  onDownloadSingle,
  isGenerating,
}: ResultsGalleryProps) {
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImagePrompt, setEditImagePrompt] = useState("");
  const [editTextPrompt, setEditTextPrompt] = useState("");

  const doneCount = results.filter((r) => r.status === "done").length;
  const lightboxCard = lightboxId
    ? results.find((r) => r.id === lightboxId) ?? null
    : null;

  const startEdit = (r: GeneratedCard) => {
    setEditingId(r.id);
    setEditImagePrompt(r.snapshot?.imagePrompt ?? "");
    setEditTextPrompt(r.snapshot?.textPrompt ?? "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Resultados</h3>
          <Badge className="bg-zinc-800 text-zinc-300">
            {doneCount}/{results.length} prontos
          </Badge>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={onDownloadAll}
          disabled={doneCount === 0}
        >
          <Download size={14} /> Baixar todos (ZIP)
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center">
          <p className="text-sm text-zinc-500">Nenhum card gerado ainda.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Configure os cards e clique em <strong>Gerar carrossel</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <div
                key={r.id}
                className="fade-in-up overflow-hidden rounded-xl border border-zinc-800 bg-card"
              >
                <div className="relative aspect-[4/5] w-full bg-zinc-900">
                  {/* Loading state com gradiente conic girando + ring pulsante */}
                  {r.status === "generating" && (
                    <div className="absolute inset-0 overflow-hidden">
                      {/* Fundo: gradiente conic girando */}
                      <div className="conic-spin absolute -inset-[40%]" />
                      {/* Máscara radial pra escurecer o centro e destacar o ring */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0)_70%)]" />

                      {/* Ring central + ícone */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="ring-pulse relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/70">
                          <Layers className="animate-spin text-white/90" size={26} style={{ animationDuration: "3s" }} />
                        </div>
                        <div className="text-fade text-center">
                          <div className="text-sm font-semibold text-white">
                            Gerando card {r.cardIndex + 1}
                          </div>
                          <div className="text-[11px] text-white/70">
                            a IA leva ~20–40s
                          </div>
                        </div>
                      </div>

                      {/* Skeleton da legenda no rodapé */}
                      <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3">
                        <div className="shimmer h-3 w-[85%] rounded-sm" />
                        <div className="shimmer h-3 w-[65%] rounded-sm" />
                        <div className="flex gap-1.5">
                          <div className="shimmer h-3 w-[28%] rounded-sm" />
                          <div className="h-3 w-[18%] rounded-sm bg-yellow-500/70" />
                          <div className="shimmer h-3 w-[22%] rounded-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {r.status === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-red-400">
                      <AlertCircle size={24} />
                      <span className="text-xs">{r.error || "Erro ao gerar"}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRegenerateImage(r.id)}
                      >
                        <RefreshCw size={12} /> Tentar novamente
                      </Button>
                    </div>
                  )}

                  {r.status === "done" && r.finalDataUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxId(r.id)}
                      className="group absolute inset-0 cursor-zoom-in"
                      aria-label="Ampliar imagem"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.finalDataUrl}
                        alt={`Card ${r.cardIndex + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    </button>
                  )}

                  {r.status === "pending" && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
                      Aguardando…
                    </div>
                  )}

                  {r.status === "done" && (
                    <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1">
                      {r.costUsd !== undefined && (
                        <div className="rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          ≈ {formatBrlFromUsd(r.costUsd)}
                        </div>
                      )}
                      <div className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
                        Card {r.cardIndex + 1}
                      </div>
                    </div>
                  )}
                </div>

                {r.status === "done" && (
                  <div className="space-y-2 p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <Label>Prompt de imagem</Label>
                          <Textarea
                            value={editImagePrompt}
                            onChange={(e) => setEditImagePrompt(e.target.value)}
                            rows={2}
                            placeholder="Descreva a cena / mudanças da imagem"
                          />
                        </div>
                        <div>
                          <Label>Texto da legenda (PT-BR)</Label>
                          <Textarea
                            value={editTextPrompt}
                            onChange={(e) => setEditTextPrompt(e.target.value)}
                            rows={2}
                            placeholder="Legenda — será reproduzida verbatim"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              onEditAndRegenerate(r.id, {
                                imagePrompt: editImagePrompt,
                                textPrompt: editTextPrompt,
                              });
                              setEditingId(null);
                            }}
                          >
                            <Check size={12} /> Gerar com novo prompt
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => startEdit(r)}
                          disabled={isGenerating}
                        >
                          <Pencil size={12} /> Editar e regenerar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRegenerateImage(r.id)}
                          disabled={isGenerating}
                          title="Regenerar com o mesmo prompt (nova variação)"
                        >
                          <RefreshCw size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDownloadSingle(r.id)}
                        >
                          <Download size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-950/40"
                          onClick={() => onDelete(r.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxCard?.finalDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxId(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxId(null)}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxCard.finalDataUrl}
            alt={`Card ${lightboxCard.cardIndex + 1}`}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs text-white">
            Card {lightboxCard.cardIndex + 1}
            {lightboxCard.costUsd !== undefined && (
              <span className="ml-2 text-emerald-400">
                · ≈ {formatBrlFromUsd(lightboxCard.costUsd)}
              </span>
            )}
            <span className="ml-2 text-zinc-400">· clique fora pra fechar</span>
          </div>
        </div>
      )}
    </div>
  );
}
