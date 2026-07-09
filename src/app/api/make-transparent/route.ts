import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { imageDataUrl?: string };

  if (!body.imageDataUrl) {
    return NextResponse.json(
      {
        error: "투명 처리할 이미지가 없습니다."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    imageDataUrl: body.imageDataUrl,
    status: "passthrough",
    message:
      "MVP에서는 클라이언트에서 흰 배경 제거와 300dpi PNG 메타데이터 처리를 수행합니다."
  });
}
