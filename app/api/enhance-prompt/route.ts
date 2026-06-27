import { NextResponse } from "next/server";
import { getOpenAI, getTextModel } from "@/lib/openai-client";

export const runtime = "nodejs";
export const maxDuration = 30;

interface EnhanceRequest {
  scene: string;
  withFace?: boolean;
}

interface TextUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface EnhanceResponse {
  enhanced: string;
  model: string;
  usage?: TextUsage;
}

function buildSystemPrompt(withFace: boolean): string {
  const base = `You are an expert prompt engineer for photorealistic AI image generation (gpt-image).
Your job: take the user's short scene idea (which may be in Portuguese or any language) and rewrite it as ONE rich, detailed image prompt IN ENGLISH.

Always enrich the prompt with:
- photorealistic, highly detailed
- natural / cinematic lighting and realistic shadows
- professional composition and well-chosen framing
- depth of field, sharp focus on the subject
- realistic skin texture and fine detail
- a fitting, coherent environment/background

Rules:
- Keep the user's original intent and main subject. Do not invent unrelated content or change the meaning.
- Do NOT include any text, headline, caption, typography, logo, watermark, or UI instructions — only describe the visual scene.
- Output ONLY the final English image prompt as a single paragraph. No preamble, no quotes, no explanations, no lists.`;

  if (withFace) {
    return `${base}

This image will feature a SPECIFIC real person whose face comes from reference photos. Describe ONLY the scene, pose, action, clothing, and background for that person. Do NOT describe inventing or changing facial features — assume the person's identity is fixed and preserved elsewhere.`;
  }
  return base;
}

export async function POST(req: Request) {
  let body: EnhanceRequest;
  try {
    body = (await req.json()) as EnhanceRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const scene = (body.scene ?? "").trim();
  if (!scene) {
    return NextResponse.json({ error: "scene é obrigatório" }, { status: 400 });
  }

  try {
    const openai = getOpenAI();
    const model = getTextModel();

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: buildSystemPrompt(!!body.withFace) },
        { role: "user", content: scene },
      ],
    });

    const enhanced = completion.choices?.[0]?.message?.content?.trim();
    if (!enhanced) {
      return NextResponse.json(
        { error: "Modelo não retornou prompt" },
        { status: 502 },
      );
    }

    const out: EnhanceResponse = {
      enhanced,
      model,
      usage: completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined,
    };
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[enhance-prompt] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
