import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { imageDataUrl?: string };

  if (!body.imageDataUrl) {
    return NextResponse.json({ error: "투명 처리할 이미지가 없습니다." }, { status: 400 });
  }

  return NextResponse.json({
    imageDataUrl: body.imageDataUrl,
    status: "passthrough",
    message: "현재 단계에서는 클라이언트에서 배경 제거, 정확한 크기 리사이즈, 300dpi PNG 처리를 수행합니다."
  });
}
