export interface Palette {
  main: string;
  sub: string;
  accent: string;
  background: string;
  text: string;
}

export interface ColorTheme {
  id: string;
  label: string;
  description: string;
  colors: Palette;
}

export const colorThemes: ColorTheme[] = [
  {
    id: "tealCoral",
    label: "청록 + 코랄",
    description: "따뜻한 공동체형 기본 팔레트",
    colors: {
      main: "#5F8F8B",
      sub: "#F2B38A",
      accent: "#93B46E",
      background: "#F8F4EC",
      text: "#2F3A40"
    }
  },
  {
    id: "blueRose",
    label: "블루그레이 + 로즈",
    description: "차분하고 전문적인 상담형 팔레트",
    colors: {
      main: "#6C7A9C",
      sub: "#C98B7B",
      accent: "#9AAE8C",
      background: "#F5F0EA",
      text: "#31343C"
    }
  },
  {
    id: "greenBeige",
    label: "그린 + 베이지",
    description: "현장감과 편안함을 주는 팔레트",
    colors: {
      main: "#5F956F",
      sub: "#E2CC9F",
      accent: "#C48664",
      background: "#FBF6EA",
      text: "#2E3930"
    }
  },
  {
    id: "navyOrange",
    label: "네이비 + 오렌지",
    description: "명확하고 활기 있는 실천형 팔레트",
    colors: {
      main: "#263A59",
      sub: "#F2A444",
      accent: "#E66B4E",
      background: "#F7FAFF",
      text: "#222222"
    }
  },
  {
    id: "custom",
    label: "사용자 직접 선택",
    description: "직접 지정한 색상을 사용합니다.",
    colors: {
      main: "#5F8F8B",
      sub: "#F2B38A",
      accent: "#93B46E",
      background: "#F8F4EC",
      text: "#2F3A40"
    }
  }
];

export const colorThemeMap = Object.fromEntries(
  colorThemes.map((theme) => [theme.id, theme])
) as Record<string, ColorTheme>;
