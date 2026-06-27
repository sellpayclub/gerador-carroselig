import type { CardConfig, FacePreset } from "./types";

/**
 * Regras verbatim fornecidas pelo usuário, organizadas em constantes.
 */

export const FACE_PRESERVATION_RULES = `Rules: BE CAREFUL NOT TO CHANGE THE FACE; KEEP THE SAME FEATURES AND MAKE THE PERSON LOOK REALISTIC! include scenario.`;

/** Bloco forte de preservação de identidade para rosto da biblioteca. */
export const IDENTITY_PRESERVATION_RULES = `Use the uploaded images as the identity reference.
Preserve:
- facial structure
- eye shape
- nose
- mouth
- skin tone
- hairstyle
- age
Do not change the person's identity. Do not create a new person.
Only change: pose, clothes, background.
Photorealistic. Identity preservation is extremely important.`;

/** Bloco de identidade para upload usado como está. */
export const UPLOAD_IDENTITY_RULES = `Keep the exact same person.
Preserve identity. Do not alter facial features. Do not create a new person.
Photorealistic.`;

/** Reforço curto de qualidade visual (imagem do zero). */
export const QUALITY_RULES = `Quality: photorealistic, highly detailed, natural cinematic lighting, realistic shadows, professional composition, well-chosen framing, depth of field, sharp focus on the subject.`;

export const CAROUSEL_LAYOUT_RULES = `Create the artwork in a 4:5 format (1080x1350 px), optimized for Instagram.

Keep ALL important elements (title, logo, faces, and main objects) within a central 1080x1080 px safe area.

Leave margins at the top and bottom to avoid cropping in various Instagram views.

Rules:
- No text may be placed closer than 120 px from the edges.
- The title must be entirely within the central square.
- Faces and main elements must be within the safe area.
- If the original image is rectangular or horizontal, reposition and resize the photo so the main subject is centered without being cropped.
- Fill the extra space by extending the background, applying a blur, or continuing the image.

Instagram carousel cover.
Keep all important content inside the central square safe area (1080x1080) even though the final canvas is 1080x1350.
Do not place text near edges.
Composition optimized to avoid cropping on Instagram feed and profile grid.`;

export const VISUAL_STYLE_RULES = `1:1 format. Top Section (40% of the image): image spans the full width.

Black Fade (Transition): This fade starts roughly in the middle of the photo and transitions to solid black by the time it reaches the text. There is a gradient between the image and the text.

Title Area (60% of the image, bottom section):
Typography: Font Bebas Neue, Anton, or Oswald ExtraBold. These are extremely condensed fonts.
Text occupies approximately 80% of the width. 10% side margins.

1. Highly eye-catching image.
2. Black gradient rising from the bottom.
3. Giant white headline.
4. High-impact word in yellow.
5. Plenty of black negative space.
6. Everything centered.

For the written part, write in portuguese brazil.`;

export const AUTO_TYPOGRAPHY_RULES = `AUTONOMOUS DESIGN DECISIONS (you decide, the user does NOT specify):
- From the EXACT headline text provided below, choose the single highest-impact word and render ONLY that one word in YELLOW (#FFD700). All other words stay white.
- Choose the typography from: Bebas Neue, Anton, or Oswald ExtraBold (condensed fonts).
- Choose the font size so the headline fills approximately 80% of the width, fitting inside the central 1080x1080 safe area, never closer than 120px to any edge.
- Break the headline into multiple centered lines if needed for impact.
- Keep everything centered with plenty of black negative space.`;

/**
 * Regra crítica: o texto fornecido deve ser reproduzido VERBATIM.
 */
export const VERBATIM_TEXT_RULES = `CRITICAL TEXT RULE:
The headline/caption text provided below in the "HEADLINE / TEXT CONTENT" section MUST be reproduced EXACTLY as written — character for character, word for word, in the same order, with the same punctuation and capitalization. Do NOT modify, paraphrase, reword, translate, shorten, expand, reorder, or "improve" the text in any way. Render it verbatim. The ONLY freedom you have is choosing which single word becomes yellow and the typography (font/size/layout). The words themselves are immutable.`;

/**
 * Monta o prompt master enviado à OpenAI para gerar o carrossel completo.
 */
export function buildFullCarouselPrompt(
  card: CardConfig,
  facePreset?: FacePreset,
  enhancedScene?: string,
): string {
  const parts: string[] = [];

  // Cena já pré-processada (inglês, rica) com fallback para o texto cru.
  const scene = (enhancedScene && enhancedScene.trim()) || card.imagePrompt;

  // ---- Cabeçalho conforme a fonte da imagem ----
  if (card.imageSource === "upload") {
    // Upload sempre "as-is": preservar a foto, só adicionar layout do carrossel.
    parts.push(
      `Regarding the attached reference image:`,
      FACE_PRESERVATION_RULES,
      ``,
      UPLOAD_IDENTITY_RULES,
      ``,
      `USE THE ATTACHED IMAGE AS-IS as the base. Do NOT change the image content, scene, or subject. Only ADD the Instagram carousel layout on top of it: black gradient rising from the bottom and the headline text in the bottom 60%. Keep the original photo fully visible in the top 40%, centered, inside the safe area.`,
    );
  } else if (facePreset && facePreset.images.length > 0) {
    // Rosto da biblioteca: gerar imagem NOVA usando as fotos só como referência de rosto
    parts.push(
      `CRITICAL INSTRUCTION ABOUT THE ATTACHED REFERENCE PHOTOS:`,
      `The attached photos show a specific person. They are provided ONLY as REFERENCE for that person's face, identity, and features.`,
      ``,
      `DO NOT simply return, copy, duplicate, edit, crop, or reuse the attached photos. DO NOT reproduce the same scene, background, clothing, or composition shown in the reference photos.`,
      ``,
      `Instead, GENERATE A COMPLETELY NEW, photorealistic image FROM SCRATCH in which THIS EXACT PERSON (with their face, identity, and features faithfully preserved) appears in the brand new scene described below. Think of it as: "make me look like this (my face, from the references) doing this (the new scene)".`,
      ``,
      `The person's face must clearly match the references. The scene, background, action, clothing, and composition must come from the scene description — NOT from the reference photos.`,
      ``,
      IDENTITY_PRESERVATION_RULES,
      ``,
      FACE_PRESERVATION_RULES,
      ``,
      `NEW SCENE the person should appear in: ${scene || "a compelling, eye-catching scenario that suits an Instagram carousel"}`,
    );
  } else {
    // Sem rosto, sem upload — gerar do zero
    parts.push(
      `Generate a photorealistic eye-catching image for the scene: ${scene || "a compelling, eye-catching scenario"}`,
      ``,
      QUALITY_RULES,
    );
  }

  parts.push(
    ``,
    `Turn this into a unique CAROUSEL — an Instagram banner.`,
    ``,
    CAROUSEL_LAYOUT_RULES,
    ``,
    `Here is what I want:`,
    VISUAL_STYLE_RULES,
    ``,
    AUTO_TYPOGRAPHY_RULES,
    ``,
    VERBATIM_TEXT_RULES,
    ``,
    `HEADLINE / TEXT CONTENT (in portuguese brazil — reproduce VERBATIM, do not change a single character):`,
    card.textPrompt,
  );

  return parts.join("\n");
}

/**
 * Determina o input_fidelity adequado para images.edit:
 * - "high" quando queremos PRESERVAR a imagem enviada (upload como está)
 * - "low" quando queremos que a IA gere uma imagem nova usando as fotos como
 *   referência de rosto (não preserva o layout das fotos de referência)
 */
export function inferInputFidelity(card: CardConfig): "high" | "low" {
  if (card.imageSource === "upload") return "high"; // sempre preservar
  return "low"; // rosto da biblioteca: gerar novo
}
