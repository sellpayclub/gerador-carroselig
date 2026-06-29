import { NextResponse } from "next/server";
import {
  getOpenAI,
  getImageModel,
  dataUrlsToOpenAIFiles,
  bufferToOpenAIFile,
} from "@/lib/openai-client";
import { prepareUploadForEdit } from "@/lib/upload-preprocess";
import type { GenerateFullRequest, GenerateFullResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: GenerateFullRequest;
  try {
    body = (await req.json()) as GenerateFullRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const {
    fullPrompt,
    referenceImagesBase64,
    cardIndex,
    inputFidelity,
    generationMode,
  } = body;

  if (!fullPrompt || !fullPrompt.trim()) {
    return NextResponse.json(
      { error: "fullPrompt é obrigatório" },
      { status: 400 },
    );
  }

  const refs = referenceImagesBase64 ?? [];

  try {
    const openai = getOpenAI();
    const model = getImageModel();
    const size = "1024x1536" as const;
    const quality = "high" as const;

    // ---- UPLOAD AS-IS: foto exata no topo + máscara (só legenda embaixo) ----
    if (generationMode === "upload-as-is") {
      if (refs.length === 0) {
        return NextResponse.json(
          {
            error:
              "Modo 'Usar minha imagem' exige uma foto atribuída ao card. Selecione a imagem antes de gerar.",
          },
          { status: 400 },
        );
      }

      const { basePng, maskPng } = await prepareUploadForEdit(refs[0]);
      const baseFile = await bufferToOpenAIFile(basePng, "upload-base.png");
      const maskFile = await bufferToOpenAIFile(maskPng, "upload-mask.png");

      const res = await openai.images.edit({
        model,
        image: baseFile,
        mask: maskFile,
        prompt: fullPrompt,
        size,
        quality,
        input_fidelity: "high",
      });

      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        return NextResponse.json(
          { error: "OpenAI não retornou imagem" },
          { status: 502 },
        );
      }
      const out: GenerateFullResponse = {
        imageBase64: b64,
        cardIndex,
        model,
        usage: res.usage,
      };
      return NextResponse.json(out);
    }

    // ---- IA: gerar do zero ----
    if (refs.length === 0) {
      const res = await openai.images.generate({
        model,
        prompt: fullPrompt,
        size,
        quality,
        n: 1,
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        return NextResponse.json(
          { error: "OpenAI não retornou imagem" },
          { status: 502 },
        );
      }
      const out: GenerateFullResponse = {
        imageBase64: b64,
        cardIndex,
        model,
        usage: res.usage,
      };
      return NextResponse.json(out);
    }

    // ---- IA com rosto: edit com referências, fidelity baixa ----
    const files = await dataUrlsToOpenAIFiles(refs);
    const res = await openai.images.edit({
      model,
      image: files,
      prompt: fullPrompt,
      size,
      quality,
      input_fidelity: inputFidelity ?? "low",
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "OpenAI não retornou imagem" },
        { status: 502 },
      );
    }
    const out: GenerateFullResponse = {
      imageBase64: b64,
      cardIndex,
      model,
      usage: res.usage,
    };
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-full] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
