import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "교육 홍보물 제목 투명 PNG 생성기",
  description: "OpenAI 이미지 생성 API로 교육 홍보물용 제목과 아이콘 투명 PNG를 만듭니다."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
