"use client";

import { ChevronDown, ImageIcon, User, Wand2 } from "lucide-react";
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
  const [open, setOpen] = useState(
    defaultOpen || card.index === 0 || !!card.assignedUploadId,
  );
  const hasAssignedUpload = !!card.assignedUploadId;
  const assignedImage = uploads.find((u) => u.id === card.assignedUploadId);
  const isUpload = card.imageSource === "upload" && hasAssignedUpload;
  const isAi = !isUpload;
  const hasFace = !!card.facePresetId;

  const subtitle = isUpload
    ? assignedImage
      ? `sua foto: ${assignedImage.name}`
      : "imagem enviada"
    : hasFace
      ? "gerada pela IA com rosto da biblioteca"
      : "gerada pela IA";

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
          {assignedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assignedImage.dataUrl}
              alt=""
              className="h-10 w-8 rounded object-cover border border-zinc-700"
            />
          )}
          <div>
            <div className="text-sm font-medium text-zinc-100">
              Card {card.index + 1}
              {isUpload && (
                <span className="ml-2 text-[11px] text-emerald-400">
                  · sua imagem
                </span>
              )}
              {isAi && hasFace && (
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
          {/* ---- Imagem: sua foto OU gerar com IA ---- */}
          <div>
            <Label>Imagem deste card</Label>
            {uploads.length > 0 ? (
              <>
                <Select
                  value={card.assignedUploadId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || undefined;
                    if (id) {
                      onChange({
                        assignedUploadId: id,
                        imageSource: "upload",
                        facePresetId: undefined,
                      });
                    } else {
                      onChange({
                        assignedUploadId: undefined,
                        imageSource: "ai",
                      });
                    }
                  }}
                >
                  <option value="">✨ Gerar imagem com IA</option>
                  {uploads.map((u, i) => (
                    <option key={u.id} value={u.id}>
                      🖼 Usar minha foto #{i + 1} — {u.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Escolha uma foto que você enviou, ou deixe em &quot;Gerar com
                  IA&quot; para a IA criar a imagem.
                </p>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
                Nenhuma foto enviada ainda — suba imagens na biblioteca acima,
                ou a IA gera tudo sozinha.
              </div>
            )}
          </div>

          {/* ---- Modo UPLOAD: observações + aviso ---- */}
          {isUpload && (
            <div className="space-y-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="text-[11px] text-emerald-300/90">
                <ImageIcon size={12} className="mr-1 inline" />
                Sua foto será usada <strong>exatamente como está</strong>. A IA
                só adiciona o gradiente preto e a legenda embaixo.
              </p>
              <div>
                <Label>Observações sobre a foto (opcional)</Label>
                <Textarea
                  value={card.uploadNotes ?? ""}
                  onChange={(e) => onChange({ uploadNotes: e.target.value })}
                  placeholder="Ex.: É foto de produto — destaque o nome. / Pessoa à esquerda. / Fundo já é escuro."
                  rows={2}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Ajuda a IA a entender sua foto ao montar a legenda. Não altera
                  a imagem.
                </p>
              </div>
            </div>
          )}

          {/* ---- Modo IA: rosto + prompt de cena ---- */}
          {isAi && (
            <>
              <div>
                <Label>Rosto da biblioteca (opcional)</Label>
                <Select
                  value={card.facePresetId ?? ""}
                  onChange={(e) =>
                    onChange({ facePresetId: e.target.value || undefined })
                  }
                >
                  <option value="">Nenhum — cena sem rosto específico</option>
                  {facePresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.images.length} fotos)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>
                  {hasFace
                    ? "Cena onde a pessoa aparece"
                    : "Descreva a imagem que a IA deve criar"}
                </Label>
                <Textarea
                  value={card.imagePrompt}
                  onChange={(e) => onChange({ imagePrompt: e.target.value })}
                  placeholder="Ex.: mulher no notebook com dinheiro saindo da tela, feliz e animada"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* ---- Legenda (sempre) ---- */}
          <div>
            <Label>Texto da legenda (português BR)</Label>
            <Textarea
              value={card.textPrompt}
              onChange={(e) => onChange({ textPrompt: e.target.value })}
              placeholder="Ex.: O SEGREDO PARA GANHAR 10K POR MÊS NO DIGITAL"
              rows={3}
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
              <Wand2 size={11} />
              Texto exato que aparece na imagem. A IA escolhe tipografia e qual
              palavra fica amarela.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="flex items-center gap-1 text-[11px] text-zinc-500">
              <User size={11} />
              {isUpload
                ? "Foto preservada + legenda gerada pela IA."
                : hasFace
                  ? "IA gera cena nova com o rosto da biblioteca."
                  : "IA gera imagem e legenda do zero."}
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
