import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { getOpenAIImageSize } from "@/lib/generativeOptions";
import { getOpenAIErrorMessage } from "@/lib/openaiErrors";
import { isTransparentOutput } from "@/lib/promptBuilder";
import type { GeneratedPrompt, OutputType } from "@/lib/generativeTypes";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  prompt: GeneratedPrompt;
  variationHint?: string;
};

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY를 설정해야 이미지를 생성할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const prompt = body.prompt;
    const transparentRequested = isTransparentOutput(prompt.outputType);
    const model = chooseImageModel(prompt.outputType);
    const apiSize = getOpenAIImageSize(prompt.size);
    const apiPrompt = [
      prompt.prompt,
      body.variationHint,
      "Final reminder: produce an isolated reusable transparent PNG asset. If transparent background is unsupported, use only pure white background for post-processing."
    ]
      .filter(Boolean)
      .join("\n\n");
    const requestBody: Record<string, unknown> = {
      model,
      prompt: apiPrompt,
      n: 1,
      size: apiSize,
      quality: prompt.quality,
      output_format: "png"
    };

    if (transparentRequested && !model.startsWith("gpt-image-2")) {
      requestBody.background = "transparent";
    } else if (!model.startsWith("gpt-image-2")) {
      requestBody.background = "auto";
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: getOpenAIErrorMessage(data, "OpenAI 이미지 생성 API 요청에 실패했습니다.") },
        { status: response.status }
      );
    }

    const first = data.data?.[0];
    const b64 = first?.b64_json;

    if (!b64) {
      return NextResponse.json({ error: "OpenAI 응답에 이미지 데이터가 없습니다." }, { status: 502 });
    }

    return NextResponse.json({
      image: {
        id: crypto.randomUUID(),
        imageDataUrl: `data:image/png;base64,${b64}`,
        prompt,
        createdAt: new Date().toISOString(),
        outputType: prompt.outputType,
        size: prompt.size,
        quality: prompt.quality,
        model,
        usage: data.usage,
        revisedPrompt: first.revised_prompt,
        transparentRequested,
        background: data.background ?? requestBody.background,
        apiSize
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function chooseImageModel(outputType: OutputType) {
  void outputType;

  if (process.env.OPENAI_IMAGE_MODEL) {
    return process.env.OPENAI_IMAGE_MODEL;
  }

  return "gpt-image-2";
}
