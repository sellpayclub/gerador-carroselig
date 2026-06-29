"use client";

import { ChevronDown, Sparkles, ImageIcon, User, Wand2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Label, Select, Textarea } from "./ui";
import type { CardConfig, FacePreset, UploadedImage } from "@/lib/types";

interface CardEditorProps {
  card: CardConfig;
  uploads: UploadedImage[];
  facePresets: FacePreset[];
  onChange: (next: Partial<CardConfig>) => void;
  onRemove: () => void;
  defaultOpen?: boolean;
}

export function CardEditor({
  card,
  uploads,
  facePresets,
  onChange,
  onRemove,
  defaultOpen = false,
}: CardEditorProps) {
  const [open, setOpen] = useState(defaultOpen || card.index === 0);
  const isUpload = card.imageSource === "upload";
  const hasAssignedUpload = !!card.assignedUploadId;
  const hasFace = !!card.facePresetId;

  const subtitle = isUpload
    ? hasAssignedUpload
      ? "imagem enviada como está"
      : "imagem enviada (não atribuída)"
    : hasFace
      ? "gerada pela IA com rosto da biblioteca"
      : "gerada pela IA (aleatória)";

  return (
    <div className="rounded-xl border border-zinc-800 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {card.index + 1}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-100">
              Card {card.index + 1}
              {hasAssignedUpload && (
                <span className="ml-2 text-[11px] text-emerald-400">
                  · imagem atribuída
                </span>
              )}
              {hasFace && (
                <span className="ml-2 text-[11px] text-fuchsia-400">
                  · com rosto
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {card.textPrompt && (
            <Badge className="bg-zinc-800 text-zinc-300">
              {card.textPrompt.slice(0, 28)}
              {card.textPrompt.length > 28 ? "…" : ""}
            </Badge>
          )}
          <ChevronDown
            size={16}
            className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
          {/* Fonte da imagem */}
          <div>
            <Label>Fonte da imagem</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={!isUpload ? "primary" : "outline"}
                className="flex-1"
                onClick={() =>
                  onChange({ imageSource: "ai", assignedUploadId: undefined })
                }
              >
                <Sparkles size={14} /> Gerar via IA
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isUpload ? "primary" : "outline"}
                className="flex-1"
                onClick={() =>
                  onChange({ imageSource: "upload", facePresetId: undefined })
                }
                disabled={uploads.length === 0}
              >
                <ImageIcon size={14} /> Usar minha imagem ({uploads.length})
              </Button>
            </div>
          </div>

          {/* Rosto (só IA) */}
          {!isUpload && (
            <div>
              <Label>Rosto da biblioteca (opcional)</Label>
              <Select
                value={card.facePresetId ?? ""}
                onChange={(e) =>
                  onChange({ facePresetId: e.target.value || undefined })
                }
              >
                <option value="">Nenhum — imagem aleatória</option>
                {facePresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.images.length} fotos)
                  </option>
                ))}
              </Select>
              {facePresets.length === 0 && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  Suba rostos na Biblioteca acima para usar aqui.
                </p>
              )}
            </div>
          )}

          {/* Imagem atribuída (só upload) */}
          {isUpload && (
            <div>
              <Label>Imagem atribuída a este card</Label>
              <Select
                value={card.assignedUploadId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || undefined;
                  onChange({
                    assignedUploadId: id,
                    ...(id
                      ? {
                          imageSource: "upload" as const,
                          facePresetId: undefined,
                        }
                      : {}),
                  });
                }}
              >
                <option value="">— selecionar —</option>
                {uploads.map((u, i) => (
                  <option key={u.id} value={u.id}>
                    #{i + 1} — {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Prompt de imagem (só no modo IA) */}
          {!isUpload && (
            <div>
              <Label>
                {hasFace
                  ? "Cena onde a pessoa aparece"
                  : "Prompt da imagem (descreva a cena)"}
              </Label>
              <Textarea
                value={card.imagePrompt}
                onChange={(e) => onChange({ imagePrompt: e.target.value })}
                placeholder="Ex.: Show her working at the computer with LOTS of money coming out of it — as if she were printing money — and make her look happy and excited."
                rows={3}
              />
            </div>
          )}

          {isUpload && (
            <div className="space-y-3">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-[11px] text-zinc-400">
                A IA usa sua foto <strong>como está</strong> e só adiciona o
                layout do carrossel (gradiente preto + legenda). A imagem não é
                alterada.
              </div>
              <div>
                <Label>Observações sobre a imagem (opcional)</Label>
                <Textarea
                  value={card.uploadNotes ?? ""}
                  onChange={(e) => onChange({ uploadNotes: e.target.value })}
                  placeholder="Ex.: É foto de produto — destaque o nome na legenda. / Pessoa à esquerda, deixe espaço pro texto. / Fundo já é escuro."
                  rows={2}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Contexto extra enviado no prompt para a IA entender a foto.
                  Não muda os pixels da imagem.
                </p>
              </div>
            </div>
          )}

          {/* Prompt de texto */}
          <div>
            <Label>Texto da legenda (português BR)</Label>
            <Textarea
              value={card.textPrompt}
              onChange={(e) => onChange({ textPrompt: e.target.value })}
              placeholder="Ex.: O segredo para ganhar 10K por mês no digital — 3 passos que ninguém te conta."
              rows={3}
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
              <Wand2 size={11} />
              A IA escolhe sozinha a tipografia (Bebas/Anton/Oswald) e qual
              palavra fica em amarelo.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="flex items-center gap-1 text-[11px] text-zinc-500">
              <User size={11} />
              {isUpload
                ? "Sua imagem é enviada à IA como está (preserva a foto)."
                : hasFace
                  ? "As fotos do rosto são enviadas à IA para gerar a pessoa na cena."
                  : "A IA gera uma imagem aleatória baseada no prompt."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="text-red-400 hover:bg-red-950/40"
            >
              Remover card
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
