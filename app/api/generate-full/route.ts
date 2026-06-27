import { NextResponse } from "next/server";
import {
  getOpenAI,
  getImageModel,
  dataUrlsToOpenAIFiles,
} from "@/lib/openai-client";
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

  const { fullPrompt, referenceImagesBase64, cardIndex, inputFidelity } = body;

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
