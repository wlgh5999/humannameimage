import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { extractActualIconAssets } from "@/lib/serverImageProcessing";
import type { IconSpec } from "@/lib/generativeTypes";

export const runtime = "nodejs";
export const maxDuration = 120;

type RequestBody = {
  imageDataUrl?: string;
  specs?: IconSpec[];
  sourceImageId?: string;
};

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.imageDataUrl) {
      return NextResponse.json({ error: "분리할 아이콘 이미지가 없습니다." }, { status: 400 });
    }

    const icons = await extractActualIconAssets({
      imageDataUrl: body.imageDataUrl,
      specs: body.specs ?? [],
      sourceImageId: body.sourceImageId
    });

    return NextResponse.json({ icons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "실제 사용 아이콘 분리에 실패했습니다." },
      { status: 500 }
    );
  }
}
