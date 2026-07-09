export type OutputType = "title-transparent" | "title-decorated-transparent" | "icons-transparent";
export type TextMode = "with-text" | "without-text";
export type ImageQuality = "high";
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

export interface EducationImageForm {
  title: string;
  promotionCopy: string;
  topics: string[];
  audiences: string[];
  outputType: OutputType;
  textMode: TextMode;
  quality: ImageQuality;
  size: ImageSize;
  styleSeed: number;
}

export interface PromptAnalysis {
  coreEmotion: string;
  keywords: string[];
  visualMetaphor: string;
  recommendedColors: string[];
  avoid: string[];
  titlePlacement: string;
  typographyStyle: string;
  aspectRatio: string;
  transparentBackground: boolean;
}

export interface GeneratedPrompt {
  analysis: PromptAnalysis;
  prompt: string;
  negativePrompt: string;
  palette: Array<{
    name: string;
    hex: string;
    usage: string;
  }>;
  outputType: OutputType;
  textMode: TextMode;
  size: ImageSize;
  quality: ImageQuality;
  usedFallback?: boolean;
  model?: string;
}

export interface GeneratedImage {
  id: string;
  imageDataUrl: string;
  prompt: GeneratedPrompt;
  createdAt: string;
  outputType: OutputType;
  size: ImageSize;
  quality: ImageQuality;
  model: string;
  usage?: unknown;
  revisedPrompt?: string;
  transparentRequested: boolean;
  background?: "transparent" | "opaque" | "auto";
}
