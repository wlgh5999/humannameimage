import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        pretendard: [
          "var(--font-pretendard)",
          "Pretendard Variable",
          "Pretendard",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif"
        ]
      },
      colors: {
        paper: "#FBF8F2",
        ink: "#263238"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(47, 58, 64, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
