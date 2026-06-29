import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina no .env.local (desenvolvimento) ou nas Environment Variables do Vercel.",
    );
  }
  client = new OpenAI({ apiKey });
  return client;
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
}

/** Modelo de texto usado para o pré-processamento (enhancement) do prompt. */
export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
}

/**
 * Converte um data URL (base64) em um objeto File-like compatível com a SDK.
 * A SDK do OpenAI aceita { value, mimeType } via toFile().
 */
export async function dataUrlToOpenAIFile(
  dataUrl: string,
  filename = "reference.png",
) {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("dataUrl inválido");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  return await OpenAI.toFile(bytes, filename, { type: mimeType });
}

/**
 * Converte vários data URLs em File[] para images.edit com array de referências.
 */
export async function dataUrlsToOpenAIFiles(dataUrls: string[]) {
  const files = await Promise.all(
    dataUrls.map((d, i) => dataUrlToOpenAIFile(d, `reference-${i + 1}.png`)),
  );
  return files;
}

/** Converte um Buffer PNG/JPEG em File-like para a SDK. */
export async function bufferToOpenAIFile(
  buffer: Buffer,
  filename: string,
  mimeType = "image/png",
) {
  return await OpenAI.toFile(buffer, filename, { type: mimeType });
}
