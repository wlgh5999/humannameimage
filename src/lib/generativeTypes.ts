export type OutputType = "decorated-title" | "title-only" | "icons-only";
export type TextMode = "with-text" | "without-text";
export type ImageQuality = "high";
export type ImageSize = "1500x730" | "1500x416" | "1500x1500";

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

export interface PaletteColor {
  name: string;
  hex: string;
  usage: string;
}

export interface DesignSpec {
  id: string;
  coreEmotion: string;
  keywords: string[];
  topicCategory: string;
  visualMetaphor: string;
  palette: PaletteColor[];
  typographyStyle: string;
  lineBreakPlan: string;
  titlePlacement: string;
  decorations: string[];
  emphasisWords: string[];
  avoid: string[];
  size: ImageSize;
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
  designSpecId?: string;
}

export interface GeneratedPrompt {
  analysis: PromptAnalysis;
  prompt: string;
  negativePrompt: string;
  palette: PaletteColor[];
  outputType: OutputType;
  textMode: TextMode;
  size: ImageSize;
  quality: ImageQuality;
  designSpec: DesignSpec;
  usedFallback?: boolean;
  model?: string;
}

export interface GeneratedPromptSet {
  id: string;
  designSpec: DesignSpec;
  prompts: Record<OutputType, GeneratedPrompt>;
  size: ImageSize;
  quality: ImageQuality;
  usedFallback?: boolean;
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
  apiSize?: string;
}
