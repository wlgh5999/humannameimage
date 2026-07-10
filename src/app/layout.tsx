import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "교육 제목 이미지 생성기",
  description: "교육 홍보물용 제목 이미지와 아이콘 투명 PNG를 생성합니다."
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
