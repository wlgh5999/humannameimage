import type { ImageSize, OutputType } from "@/lib/generativeTypes";

export const outputTypeOptions: Array<{ value: OutputType; label: string; description: string }> = [
  {
    value: "title-transparent",
    label: "제목(글씨만) 투명 PNG",
    description: "아이콘 없이 교육명 글씨만 크게 만든 투명 제목 PNG"
  },
  {
    value: "title-decorated-transparent",
    label: "꾸민 제목 투명 PNG",
    description: "교육명에 어울리는 아이콘, 밑줄, 스티커 장식을 더한 투명 제목 PNG"
  },
  {
    value: "icons-transparent",
    label: "아이콘 투명 PNG 모음",
    description: "교육 주제에 맞는 아이콘과 장식 요소만 모은 투명 PNG"
  }
];

export const sizeOptions: Array<{ value: ImageSize; label: string }> = [
  { value: "1536x1024", label: "1536x1024 가로형" },
  { value: "1024x1024", label: "1024x1024 정사각형" },
  { value: "1024x1536", label: "1024x1536 세로형" }
];

export const outputTypeLabelMap: Record<OutputType, string> = {
  "title-transparent": "제목(글씨만) 투명 PNG",
  "title-decorated-transparent": "꾸민 제목 투명 PNG",
  "icons-transparent": "아이콘 투명 PNG 모음"
};
