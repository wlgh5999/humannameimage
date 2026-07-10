import type { CandidateId, ImageSize, OutputType } from "@/lib/generativeTypes";

export const outputOrder: OutputType[] = ["decorated-title", "title-only", "icons-only"];
export const candidateOrder: CandidateId[] = ["option-1", "option-2"];

export const candidateLabelMap: Record<CandidateId, string> = {
  "option-1": "1안",
  "option-2": "2안"
};

export const candidateDirectionMap: Record<CandidateId, string> = {
  "option-1": "따뜻하고 부드러운 관계 중심 스타일",
  "option-2": "정돈되고 전문적인 실무 중심 스타일"
};

export const outputTypeLabelMap: Record<OutputType, string> = {
  "decorated-title": "꾸민 제목 투명 PNG",
  "title-only": "제목만 투명 PNG",
  "icons-only": "아이콘만 투명 PNG"
};

export const outputTypeDescriptionMap: Record<OutputType, string> = {
  "decorated-title": "제목과 소량의 아이콘 장식을 함께 담은 대표 이미지",
  "title-only": "선택한 꾸민 제목 이미지를 입력으로 편집해 제목 글씨만 남긴 이미지",
  "icons-only": "선택한 꾸민 제목 이미지를 입력으로 편집해 아이콘과 장식만 남긴 이미지"
};

export const sizeOptions: Array<{ value: ImageSize; label: string; width: number; height: number }> = [
  { value: "1500x730", label: "1500 x 730 가로형", width: 1500, height: 730 },
  { value: "1500x416", label: "1500 x 416 와이드형", width: 1500, height: 416 },
  { value: "1500x1500", label: "1500 x 1500 정사각형", width: 1500, height: 1500 }
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

  if (size === "1500x416") {
    return "1536x512";
  }

  return "1536x752";
}
