import type { ImageSize, OutputType } from "@/lib/generativeTypes";

export const outputOrder: OutputType[] = ["decorated-title", "title-only", "icons-only"];

export const outputTypeLabelMap: Record<OutputType, string> = {
  "decorated-title": "꾸민 제목 투명 PNG",
  "title-only": "제목만 투명 PNG",
  "icons-only": "아이콘만 투명 PNG"
};

export const outputTypeDescriptionMap: Record<OutputType, string> = {
  "decorated-title": "제목과 작은 장식을 함께 담은 대표 이미지",
  "title-only": "대표 이미지와 같은 서체, 색상, 줄바꿈의 제목 글씨만 분리한 이미지",
  "icons-only": "대표 이미지와 같은 장식 요소만 분리한 이미지"
};

export const sizeOptions: Array<{ value: ImageSize; label: string; width: number; height: number }> = [
  { value: "1500x730", label: "1500 × 730 가로형", width: 1500, height: 730 },
  { value: "1500x416", label: "1500 × 416 와이드형", width: 1500, height: 416 },
  { value: "1500x1500", label: "1500 × 1500 정사각형", width: 1500, height: 1500 }
];

export const defaultImageSize: ImageSize = "1500x730";

export function parseImageSize(size: ImageSize) {
  const option = sizeOptions.find((item) => item.value === size) ?? sizeOptions[0];
  return { width: option.width, height: option.height };
}

export function getOpenAIImageSize(size: ImageSize) {
  if (size === "1500x1500") {
    return "1024x1024";
  }

  return "1536x1024";
}
