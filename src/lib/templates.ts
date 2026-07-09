import type { Palette } from "@/lib/colorThemes";

export type TemplateId = "community" | "counseling" | "practice";
export type DecorationChoice =
  | "heart"
  | "leaf"
  | "curve"
  | "dotted"
  | "bubble"
  | "star"
  | "none";

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  usage: string;
  mood: string;
  defaultThemeId: string;
  defaultDecoration: DecorationChoice;
  palette: Palette;
  titleAlign: "center" | "left";
  emphasisMode: "afterCommaPhrase" | "communityAction" | "lastAction";
  maxTitleWidthRatio: number;
}

export const templates: TemplateDefinition[] = [
  {
    id: "community",
    label: "공동체형",
    usage: "주민조직화, 타임뱅크, 관계망, 상호돌봄",
    mood: "따뜻함, 연결감, 사람 중심",
    defaultThemeId: "tealCoral",
    defaultDecoration: "heart",
    palette: {
      main: "#5F8F8B",
      sub: "#F2B38A",
      accent: "#93B46E",
      background: "#F8F4EC",
      text: "#2F3A40"
    },
    titleAlign: "center",
    emphasisMode: "communityAction",
    maxTitleWidthRatio: 0.78
  },
  {
    id: "counseling",
    label: "상담형",
    usage: "사례관리, 상담 기술, 관계 심리학, 경청",
    mood: "차분함, 전문성, 신뢰감",
    defaultThemeId: "blueRose",
    defaultDecoration: "bubble",
    palette: {
      main: "#6C7A9C",
      sub: "#C98B7B",
      accent: "#9AAE8C",
      background: "#F5F0EA",
      text: "#31343C"
    },
    titleAlign: "center",
    emphasisMode: "afterCommaPhrase",
    maxTitleWidthRatio: 0.76
  },
  {
    id: "practice",
    label: "실천형",
    usage: "AI 교육, 스마트워크, 실무 도구, 업무 자동화",
    mood: "명확함, 실용성, 활기",
    defaultThemeId: "navyOrange",
    defaultDecoration: "star",
    palette: {
      main: "#2F80ED",
      sub: "#FFB347",
      accent: "#78C6A3",
      background: "#F7FAFF",
      text: "#222222"
    },
    titleAlign: "center",
    emphasisMode: "lastAction",
    maxTitleWidthRatio: 0.8
  }
];

export const templateMap = Object.fromEntries(
  templates.map((template) => [template.id, template])
) as Record<TemplateId, TemplateDefinition>;

export const templateThemeMap: Record<TemplateId, string> = {
  community: "tealCoral",
  counseling: "blueRose",
  practice: "navyOrange"
};

export const decorationLabels: Record<DecorationChoice, string> = {
  heart: "하트",
  leaf: "잎사귀",
  curve: "곡선 라인",
  dotted: "점선 라인",
  bubble: "말풍선",
  star: "별",
  none: "없음"
};

export const fontFamilies = [
  {
    id: "pretendard",
    label: "Pretendard",
    cssValue:
      "var(--font-pretendard), 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
  },
  {
    id: "rounded-fallback",
    label: "라운드 계열 준비",
    cssValue:
      "'Pretendard Variable', 'NanumSquareRound', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
  }
];
