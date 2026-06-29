export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL (PNG/JPEG)
}

/** Preset de rosto: 4–5 fotos de uma pessoa, reutilizável em qualquer card. */
export interface FacePreset {
  id: string;
  name: string;
  images: UploadedImage[];
}

export interface CardConfig {
  id: string;
  index: number;
  // Imagem
  imageSource: "ai" | "upload";
  facePresetId?: string; // só quando imageSource === "ai"
  assignedUploadId?: string; // só quando imageSource === "upload"
  /** Observações sobre a foto enviada (contexto pro prompt — não altera a imagem). */
  uploadNotes?: string;
  /** Cena (modo IA). */
  imagePrompt: string;
  // Texto — a IA decide tipografia + palavra amarelo
  textPrompt: string;
}

/** Uso de tokens retornado pela OpenAI (GPT image models). */
export interface ImageUsage {
  input_tokens: number;
  input_tokens_details?: {
    image_tokens: number;
    text_tokens: number;
  };
  output_tokens: number;
  total_tokens: number;
  output_tokens_details?: {
    image_tokens: number;
    text_tokens: number;
  };
}

export interface GeneratedCard {
  id: string;
  cardIndex: number;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
  finalDataUrl?: string;
  snapshot?: CardConfig;
  // Controle de custo
  model?: string;
  usage?: ImageUsage;
  costUsd?: number;
}

export interface GenerateFullRequest {
  fullPrompt: string;
  /** Data URLs de referência. 0 = generate; 1+ = edit com array. */
  referenceImagesBase64?: string[];
  cardIndex: number;
  /** input_fidelity do images.edit: "high" preserva, "low" permite gerar novo. */
  inputFidelity?: "high" | "low";
  /**
   * Modo explícito — evita confundir upload (preservar foto) com IA (gerar novo).
   * - upload-as-is: usa foto exata + máscara (só legenda embaixo)
   * - ai-face: gera cena nova com rosto de referência
   * - ai-generate: gera do zero
   */
  generationMode?: "upload-as-is" | "ai-face" | "ai-generate";
}

export interface GenerateFullResponse {
  imageBase64: string;
  cardIndex: number;
  model: string;
  usage?: ImageUsage;
}
