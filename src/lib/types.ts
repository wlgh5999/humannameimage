import type { Palette } from "@/lib/colorThemes";
import type { DecorationChoice, TemplateId } from "@/lib/templates";

export type LineMode = "1" | "2" | "3" | "auto";
export type BackgroundChoice = "transparent" | "white" | "beige" | "custom";
export type OutputSizePreset = "wide" | "thumbnail" | "square" | "custom";
export type ExportMode = "preview" | "title" | "transparent" | "decorated";

export interface OutputSize {
  width: number;
  height: number;
}

export interface GeneratorSettings {
  title: string;
  subtitle: string;
  templateId: TemplateId;
  lineMode: LineMode;
  colorThemeId: string;
  customPalette: Palette;
  highlightWords: string;
  decoration: DecorationChoice;
  backgroundChoice: BackgroundChoice;
  customBackground: string;
  outputSizePreset: OutputSizePreset;
  customSize: OutputSize;
  trimTransparent: boolean;
  fontFamilyId: string;
}
