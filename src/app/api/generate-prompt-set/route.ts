import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { buildPromptSet } from "@/lib/promptBuilder";
import type { EducationImageForm } from "@/lib/generativeTypes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = (await request.json()) as EducationImageForm;
    const promptSet = buildPromptSet(form);
    return NextResponse.json({ promptSet });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "프롬프트 세트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
