import type { ImageUsage } from "./types";

/**
 * Tabela de preços OpenAI por 1M de tokens (standard API).
 * Fonte: https://openai.com/api/pricing/ (março/2026) — valores podem mudar.
 */
export const PRICE_USD_PER_1M: Record<
  string,
  { textIn: number; imgIn: number; textOut: number; imgOut: number }
> = {
  "gpt-image-1.5": { textIn: 5, imgIn: 8, textOut: 10, imgOut: 32 },
  "gpt-image-2": { textIn: 5, imgIn: 8, textOut: 0, imgOut: 30 },
  "gpt-image-1": { textIn: 5, imgIn: 10, textOut: 0, imgOut: 40 },
  "gpt-image-1-mini": { textIn: 2, imgIn: 2.5, textOut: 0, imgOut: 8 },
  "chatgpt-image-latest": { textIn: 5, imgIn: 8, textOut: 10, imgOut: 32 },
};

const DEFAULT_PRICES = PRICE_USD_PER_1M["gpt-image-1.5"];

/** Preços de modelos de texto (enhancement do prompt) por 1M de tokens. */
export const TEXT_PRICE_USD_PER_1M: Record<
  string,
  { in: number; out: number }
> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4.1-nano": { in: 0.1, out: 0.4 },
};

const DEFAULT_TEXT_PRICES = TEXT_PRICE_USD_PER_1M["gpt-4o-mini"];

/** Cotação USD→BRL usada para estimativa (média informada pelo usuário). */
export const USD_TO_BRL = 5.15;

/**
 * Calcula o custo estimado em USD de uma geração a partir do usage retornado.
 */
export function cardCost(model: string, usage?: ImageUsage): number | undefined {
  if (!usage) return undefined;
  const p = PRICE_USD_PER_1M[model] ?? DEFAULT_PRICES;
  const inDetail = usage.input_tokens_details ?? {
    image_tokens: 0,
    text_tokens: 0,
  };
  const outDetail = usage.output_tokens_details ?? {
    image_tokens: 0,
    text_tokens: 0,
  };
  const cost =
    (inDetail.text_tokens * p.textIn) / 1_000_000 +
    (inDetail.image_tokens * p.imgIn) / 1_000_000 +
    (outDetail.text_tokens * p.textOut) / 1_000_000 +
    (outDetail.image_tokens * p.imgOut) / 1_000_000;
  return cost;
}

/** Custo (USD) do enhancement de prompt feito por um modelo de texto. */
export function textCost(
  model: string,
  usage?: { prompt_tokens: number; completion_tokens: number },
): number | undefined {
  if (!usage) return undefined;
  const p = TEXT_PRICE_USD_PER_1M[model] ?? DEFAULT_TEXT_PRICES;
  return (
    (usage.prompt_tokens * p.in) / 1_000_000 +
    (usage.completion_tokens * p.out) / 1_000_000
  );
}

/** Formata USD com 2–4 casas (apenas para exibir o valor original em USD). */
export function formatUsd(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/** Converte USD para BRL pela cotação configurada. */
export function usdToBrl(usd: number): number {
  return usd * USD_TO_BRL;
}

/**
 * Formata em REAIS (R$ X,XX) — usado em todo o app.
 */
export function formatBrl(brl: number | undefined): string {
  if (brl === undefined || Number.isNaN(brl)) return "—";
  return brl.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: brl < 0.1 ? 4 : 2,
    maximumFractionDigits: brl < 0.1 ? 4 : 2,
  });
}

/** Atalho: USD → BRL formatado. */
export function formatBrlFromUsd(usd: number | undefined): string {
  if (usd === undefined) return "—";
  return formatBrl(usdToBrl(usd));
}
