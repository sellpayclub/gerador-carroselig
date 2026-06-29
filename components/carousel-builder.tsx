"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layers,
  Link2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, Card, Input, Label, Progress } from "./ui";
import { ImageLibrary } from "./image-library";
import { FaceLibrary } from "./face-library";
import { CardEditor } from "./card-editor";
import { ResultsGallery } from "./results-gallery";
import {
  buildFullCarouselPrompt,
  buildUploadOverlayPrompt,
  inferGenerationMode,
  inferInputFidelity,
} from "@/lib/prompts";
import { downloadAllAsZip, downloadSingle } from "@/lib/download-zip";
import { cardCost, formatBrl, formatUsd, textCost, usdToBrl } from "@/lib/pricing";
import {
  deleteFacePreset,
  listFacePresets,
  saveFacePreset,
} from "@/lib/face-presets-api";
import type {
  CardConfig,
  FacePreset,
  GeneratedCard,
  UploadedImage,
} from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeCard(index: number): CardConfig {
  return {
    id: uid(),
    index,
    imageSource: "ai",
    imagePrompt: "",
    uploadNotes: "",
    textPrompt: "",
  };
}

function makeInitialCards(n: number): CardConfig[] {
  return Array.from({ length: n }, (_, i) => makeCard(i));
}

export function CarouselBuilder() {
  const [numCards, setNumCards] = useState(4);
  const [cards, setCards] = useState<CardConfig[]>(() => makeInitialCards(4));
  // Uploads per-card (biblioteca de imagens para atribuir aos cards)
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  // Face presets salvos
  const [facePresets, setFacePresets] = useState<FacePreset[]>([]);
  const [facePresetsLoading, setFacePresetsLoading] = useState(true);
  const [facePresetsError, setFacePresetsError] = useState<string | null>(null);
  // Staging para montar um novo face preset
  const [faceStaging, setFaceStaging] = useState<UploadedImage[]>([]);

  const [results, setResults] = useState<GeneratedCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Hidratar rostos do Supabase no mount ----
  // facePresetsLoading já nasce true (useState(true)); só setamos false ao fim.
  useEffect(() => {
    let cancelled = false;
    listFacePresets()
      .then((presets) => {
        if (cancelled) return;
        setFacePresets(presets);
        setFacePresetsError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setFacePresetsError(err?.message ?? "Falha ao carregar rostos");
      })
      .finally(() => {
        if (!cancelled) setFacePresetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Quantidade de cards ----
  const handleNumCardsChange = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(10, n));
    setNumCards(clamped);
    setCards((prev) => {
      if (prev.length === clamped) return prev;
      if (clamped > prev.length) {
        const added: CardConfig[] = [];
        for (let i = prev.length; i < clamped; i++) added.push(makeCard(i));
        return [...prev, ...added];
      }
      return prev.slice(0, clamped).map((c, i) => ({ ...c, index: i }));
    });
  }, []);

  // ---- Uploads per-card ----
  const handleAddUploads = useCallback(async (files: FileList) => {
    const next: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      next.push({ id: uid(), name: file.name, dataUrl });
    }
    setUploads((prev) => {
      const combined = [...prev, ...next];
      // Auto-atribuir aos cards que não têm imagem atribuída
      setCards((cards) => {
        let uploadIdx = 0;
        const taken = new Set(
          cards.map((c) => c.assignedUploadId).filter(Boolean),
        );
        return cards.map((c) => {
          if (c.assignedUploadId && taken.has(c.assignedUploadId)) return c;
          while (uploadIdx < combined.length) {
            const candidate = combined[uploadIdx];
            uploadIdx++;
            if (!taken.has(candidate.id)) {
              return {
                ...c,
                imageSource: "upload" as const,
                assignedUploadId: candidate.id,
              };
            }
          }
          return c;
        });
      });
      return combined;
    });
  }, []);

  const handleRemoveUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    setCards((prev) =>
      prev.map((c) =>
        c.assignedUploadId === id ? { ...c, assignedUploadId: undefined } : c,
      ),
    );
  }, []);

  const handleReorderUploads = useCallback((from: number, to: number) => {
    setUploads((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }, []);

  const handleAutoAssign = useCallback(() => {
    setCards((cards) => {
      let uploadIdx = 0;
      return cards.map((c) => {
        if (c.assignedUploadId && uploads.some((u) => u.id === c.assignedUploadId)) {
          return c;
        }
        if (uploadIdx < uploads.length) {
          const upload = uploads[uploadIdx];
          uploadIdx++;
          return {
            ...c,
            imageSource: "upload" as const,
            assignedUploadId: upload.id,
          };
        }
        return c;
      });
    });
  }, [uploads]);

  // ---- Face presets ----
  const handleAddFaceStaging = useCallback(async (files: FileList) => {
    const next: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      next.push({ id: uid(), name: file.name, dataUrl });
    }
    setFaceStaging((prev) => [...prev, ...next]);
  }, []);

  const handleRemoveFaceStaging = useCallback((id: string) => {
    setFaceStaging((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const handleSaveFacePreset = useCallback(
    async (name: string) => {
      if (faceStaging.length === 0) return;
      try {
        const preset = await saveFacePreset(name, faceStaging);
        setFacePresets((prev) => [preset, ...prev]);
        setFaceStaging([]);
        setFacePresetsError(null);
      } catch (err) {
        console.error(err);
        setFacePresetsError(
          err instanceof Error ? err.message : "Falha ao salvar rosto",
        );
      }
    },
    [faceStaging],
  );

  const handleRemoveFacePreset = useCallback(async (id: string) => {
    try {
      await deleteFacePreset(id);
      setFacePresets((prev) => prev.filter((p) => p.id !== id));
      setCards((prev) =>
        prev.map((c) =>
          c.facePresetId === id ? { ...c, facePresetId: undefined } : c,
        ),
      );
    } catch (err) {
      console.error(err);
      setFacePresetsError(
        err instanceof Error ? err.message : "Falha ao remover rosto",
      );
    }
  }, []);

  // ---- Editar card ----
  const updateCard = useCallback((id: string, patch: Partial<CardConfig>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      return filtered.map((c, i) => ({ ...c, index: i }));
    });
    setNumCards((n) => Math.max(1, n - 1));
  }, []);

  // ---- Helpers ----
  const findUpload = useCallback(
    (id?: string) => uploads.find((u) => u.id === id),
    [uploads],
  );
  const findFacePreset = useCallback(
    (id?: string) => facePresets.find((p) => p.id === id),
    [facePresets],
  );

  // ---- Geração (sempre full-ai) ----
  const generateOne = useCallback(
    async (card: CardConfig): Promise<GeneratedCard> => {
      const base: GeneratedCard = {
        id: uid(),
        cardIndex: card.index,
        status: "generating",
        snapshot: { ...card },
      };

      try {
        const facePreset =
          card.imageSource === "ai"
            ? findFacePreset(card.facePresetId)
            : undefined;

        const generationMode = inferGenerationMode(card, facePreset);

        // Coletar referências conforme o modo
        let refs: string[] = [];
        let fullPrompt: string;
        let enhanceCostUsd = 0;

        if (generationMode === "upload-as-is") {
          if (!card.assignedUploadId) {
            throw new Error(
              `Card ${card.index + 1}: selecione uma imagem (modo "Usar minha imagem").`,
            );
          }
          const assigned = findUpload(card.assignedUploadId);
          if (!assigned) {
            throw new Error(
              `Card ${card.index + 1}: imagem não encontrada. Faça upload novamente.`,
            );
          }
          refs = [assigned.dataUrl];
          fullPrompt = buildUploadOverlayPrompt(card);
        } else {
          if (card.imageSource === "upload") {
            throw new Error(
              `Card ${card.index + 1}: modo upload sem imagem atribuída.`,
            );
          }

          if (card.facePresetId) {
            const preset = findFacePreset(card.facePresetId);
            if (preset) refs = preset.images.map((img) => img.dataUrl);
          }

          // Pré-processamento: enriquecer/traduzir a cena (só modo IA com prompt).
          let enhancedScene: string | undefined;
          if (card.imagePrompt.trim()) {
            try {
              const enhRes = await fetch("/api/enhance-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scene: card.imagePrompt,
                  withFace: generationMode === "ai-face",
                }),
              });
              if (enhRes.ok) {
                const enhData = (await enhRes.json()) as {
                  enhanced: string;
                  model: string;
                  usage?: { prompt_tokens: number; completion_tokens: number };
                };
                enhancedScene = enhData.enhanced;
                enhanceCostUsd = textCost(enhData.model, enhData.usage) ?? 0;
              }
            } catch {
              // fallback silencioso
            }
          }

          fullPrompt = buildFullCarouselPrompt(
            card,
            facePreset,
            enhancedScene,
          );
        }

        const res = await fetch("/api/generate-full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullPrompt,
            referenceImagesBase64: refs,
            cardIndex: card.index,
            inputFidelity: inferInputFidelity(card),
            generationMode,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { error?: string }).error ||
              `Erro ${res.status} na API`,
          );
        }

        const data = (await res.json()) as {
          imageBase64: string;
          model: string;
          usage?: import("@/lib/types").ImageUsage;
        };
        const finalDataUrl = `data:image/png;base64,${data.imageBase64}`;
        const imgCost = cardCost(data.model, data.usage);
        const costUsd =
          imgCost === undefined
            ? enhanceCostUsd || undefined
            : imgCost + enhanceCostUsd;
        return {
          ...base,
          status: "done",
          finalDataUrl,
          model: data.model,
          usage: data.usage,
          costUsd,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ...base, status: "error", error: message };
      }
    },
    [findUpload, findFacePreset],
  );

  const handleGenerateAll = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setProgress({ current: 0, total: cards.length });

    const pending: GeneratedCard[] = cards.map((c) => ({
      id: uid(),
      cardIndex: c.index,
      status: "pending",
      snapshot: { ...c },
    }));
    setResults(pending);

    for (let i = 0; i < cards.length; i++) {
      setProgress({ current: i + 1, total: cards.length });
      // Marca o card atual como "generating" para disparar a animação
      setResults((prev) =>
        prev.map((r) =>
          r.cardIndex === cards[i].index ? { ...r, status: "generating" } : r,
        ),
      );
      const result = await generateOne(cards[i]);
      setResults((prev) =>
        prev.map((r) => (r.cardIndex === result.cardIndex ? result : r)),
      );
    }

    setIsGenerating(false);
    setProgress(null);
  }, [cards, generateOne]);

  // ---- Ações pós-geração ----
  const handleRegenerateImage = useCallback(
    async (id: string) => {
      const existing = results.find((r) => r.id === id);
      if (!existing?.snapshot) return;
      setResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "generating" } : r)),
      );
      const result = await generateOne(existing.snapshot);
      setResults((prev) => prev.map((r) => (r.id === id ? result : r)));
    },
    [results, generateOne],
  );

  const handleEditAndRegenerate = useCallback(
    async (
      id: string,
      next: {
        imagePrompt: string;
        textPrompt: string;
        uploadNotes?: string;
      },
    ) => {
      const existing = results.find((r) => r.id === id);
      if (!existing?.snapshot) return;
      const updatedSnapshot: CardConfig = {
        ...existing.snapshot,
        imagePrompt: next.imagePrompt,
        textPrompt: next.textPrompt,
        uploadNotes: next.uploadNotes ?? existing.snapshot.uploadNotes,
      };
      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "generating", snapshot: updatedSnapshot }
            : r,
        ),
      );
      const result = await generateOne(updatedSnapshot);
      setResults((prev) => prev.map((r) => (r.id === id ? result : r)));
    },
    [results, generateOne],
  );

  const handleDeleteResult = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const done = results.filter((r) => r.status === "done" && r.finalDataUrl);
    if (done.length === 0) return;
    const items = done
      .slice()
      .sort((a, b) => a.cardIndex - b.cardIndex)
      .map((r, i) => ({
        filename: `card-${String(i + 1).padStart(2, "0")}.png`,
        dataUrl: r.finalDataUrl!,
      }));
    await downloadAllAsZip(items);
  }, [results]);

  const handleDownloadSingle = useCallback(
    (id: string) => {
      const r = results.find((x) => x.id === id);
      if (!r?.finalDataUrl) return;
      const pos = results
        .filter((x) => x.status === "done")
        .sort((a, b) => a.cardIndex - b.cardIndex)
        .findIndex((x) => x.id === id);
      downloadSingle(
        r.finalDataUrl,
        `card-${String(pos + 1).padStart(2, "0")}.png`,
      );
    },
    [results],
  );

  const readyToGenerate = useMemo(
    () => cards.length > 0 && !isGenerating,
    [cards.length, isGenerating],
  );

  // ---- Custo total da sessão (soma de todos os cards prontos) ----
  const totalCostUsd = useMemo(
    () =>
      results.reduce(
        (sum, r) => sum + (r.status === "done" && r.costUsd ? r.costUsd : 0),
        0,
      ),
    [results],
  );
  const totalTokens = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    for (const r of results) {
      if (r.status === "done" && r.usage) {
        inputTokens += r.usage.input_tokens ?? 0;
        outputTokens += r.usage.output_tokens ?? 0;
      }
    }
    return { inputTokens, outputTokens };
  }, [results]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-yellow-400">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gerador de Carrossel Instagram
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          A IA gera o carrossel completo (imagem + tipografia + palavra amarelo
          escolhidos por ela). Suba rostos uma vez e reutilize em qualquer card.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Coluna esquerda: configuração + cards */}
        <div className="space-y-6">
          {/* Configuração */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <h2 className="text-sm font-semibold">Configuração</h2>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-end gap-3">
              <div>
                <Label>Quantidade de cards</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={numCards}
                  onChange={(e) =>
                    handleNumCardsChange(parseInt(e.target.value || "1", 10))
                  }
                />
              </div>
              <p className="pb-2 text-[11px] text-zinc-500">
                De 1 a 10 cards por carrossel.
              </p>
            </div>

            {/* Biblioteca de Rostos */}
            <div className="mt-5">
              <FaceLibrary
                presets={facePresets}
                stagingImages={faceStaging}
                onAddStaging={handleAddFaceStaging}
                onRemoveStaging={handleRemoveFaceStaging}
                onSavePreset={handleSaveFacePreset}
                onRemovePreset={handleRemoveFacePreset}
                loading={facePresetsLoading}
                loadError={facePresetsError}
              />
            </div>

            {/* Biblioteca de imagens (uploads per-card) */}
            <div className="mt-5 border-t border-zinc-800 pt-5">
              <ImageLibrary
                uploads={uploads}
                onAdd={handleAddUploads}
                onRemove={handleRemoveUpload}
                onReorder={handleReorderUploads}
                title="Imagens para os cards (uploads)"
                emptyHint="Envie imagens para atribuir aos cards como base."
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoAssign}
                  disabled={uploads.length === 0}
                >
                  <Link2 size={14} /> Auto-atribuir uploads aos cards
                </Button>
                <p className="text-[11px] text-zinc-500">
                  Ao enviar imagens, elas são auto-atribuídas (1ª → card 1, …).
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleGenerateAll}
                disabled={!readyToGenerate}
                className="w-full"
              >
                <Sparkles size={16} />
                {isGenerating
                  ? "Gerando…"
                  : `Gerar carrossel (${cards.length} cards)`}
              </Button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            {progress && (
              <div className="mt-4 space-y-1.5">
                <Progress value={progress.current} max={progress.total} />
                <p className="text-[11px] text-zinc-500">
                  Gerando card {progress.current} de {progress.total}…
                </p>
              </div>
            )}
          </Card>

          {/* Cards */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                <h2 className="text-sm font-semibold">Cards</h2>
              </div>
              {cards.length < 10 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleNumCardsChange(cards.length + 1)}
                >
                  <Plus size={14} /> Adicionar card
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {cards.map((card, i) => (
                <CardEditor
                  key={card.id}
                  card={card}
                  uploads={uploads}
                  facePresets={facePresets}
                  onChange={(patch) => updateCard(card.id, patch)}
                  onRemove={() => removeCard(card.id)}
                  defaultOpen={i === 0}
                />
              ))}
            </div>

            {cards.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-600">
                <Trash2 size={14} className="mr-2" /> Nenhum card. Ajuste a
                quantidade acima.
              </div>
            )}
          </Card>
        </div>

        {/* Coluna direita: resultados */}
        <div className="space-y-4">
          {/* Resumo de custos da sessão */}
          {results.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Custo estimado da sessão
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatBrl(usdToBrl(totalCostUsd))}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {formatUsd(totalCostUsd)} USD × R$ 5,15
                  </div>
                </div>
                <div className="text-right text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500">Tokens in:</span>{" "}
                    {totalTokens.inputTokens.toLocaleString("pt-BR")}
                  </div>
                  <div>
                    <span className="text-zinc-500">Tokens out:</span>{" "}
                    {totalTokens.outputTokens.toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-1 max-w-[180px] text-[10px] text-zinc-600">
                    Estimativa pela tabela OpenAI. Valor real pode variar.
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <ResultsGallery
              results={results}
              onRegenerateImage={handleRegenerateImage}
              onEditAndRegenerate={handleEditAndRegenerate}
              onDelete={handleDeleteResult}
              onDownloadAll={handleDownloadAll}
              onDownloadSingle={handleDownloadSingle}
              isGenerating={isGenerating}
            />
          </Card>
        </div>
      </div>

      <footer className="mt-10 border-t border-zinc-800 pt-6 text-center text-[11px] text-zinc-600">
        Gerador de Carrossel Instagram · OpenAI gpt-image · IA completa ·
        pronto para Vercel
      </footer>
    </div>
  );
}
