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
  /** Cena (ai) OU mudanças (upload — vazio = usar imagem original como base). */
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
}

export interface GenerateFullResponse {
  imageBase64: string;
  cardIndex: number;
  model: string;
  usage?: ImageUsage;
}
