import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { getOpenAIImageSize } from "@/lib/generativeOptions";
import { getOpenAIErrorMessage } from "@/lib/openaiErrors";
import { isTransparentOutput } from "@/lib/promptBuilder";
import { dataUrlToBuffer, prepareServerPng } from "@/lib/serverImageProcessing";
import type { GeneratedPrompt, OutputType } from "@/lib/generativeTypes";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  prompt: GeneratedPrompt;
  variationHint?: string;
  inputImageDataUrl?: string;
  sourceImageId?: string;
};

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = performance.now();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY를 설정해야 이미지를 생성할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const prompt = body.prompt;
    const isEdit = prompt.outputType !== "decorated-title";

    if (prompt.quality !== "high") {
      return NextResponse.json({ error: "이미지 품질은 high만 사용할 수 있습니다." }, { status: 400 });
    }

    if (isEdit && !body.inputImageDataUrl) {
      return NextResponse.json(
        { error: "제목만/아이콘만 PNG는 선택한 꾸민 제목 이미지를 입력 이미지로 사용해야 합니다." },
        { status: 400 }
      );
    }

    const model = chooseImageModel(prompt.outputType);
    const apiSize = getOpenAIImageSize(prompt.size);
    const transparentRequested = isTransparentOutput(prompt.outputType);
    const apiPrompt = [
      prompt.prompt,
      body.variationHint,
      "Final reminder: quality must be high. Produce an isolated reusable PNG asset. If transparent background is unsupported, use only pure white background for server-side background removal."
    ]
      .filter(Boolean)
      .join("\n\n");
    const openAIStartedAt = performance.now();
    const data = isEdit
      ? await requestImageEdit({
          apiPrompt,
          apiSize,
          inputImageDataUrl: body.inputImageDataUrl as string,
          model,
          transparentRequested
        })
      : await requestImageGeneration({ apiPrompt, apiSize, model, transparentRequested });
    const openaiMs = performance.now() - openAIStartedAt;
    const first = data.data?.[0];
    const b64 = first?.b64_json;

    if (!b64) {
      return NextResponse.json({ error: "OpenAI 응답에 이미지 데이터가 없습니다." }, { status: 502 });
    }

    const processed = await prepareServerPng(b64, prompt.size);

    return NextResponse.json({
      image: {
        id: crypto.randomUUID(),
        imageDataUrl: processed.imageDataUrl,
        prompt: { ...prompt, quality: "high" },
        createdAt: new Date().toISOString(),
        outputType: prompt.outputType,
        size: prompt.size,
        quality: "high",
        model,
        usage: data.usage,
        revisedPrompt: first.revised_prompt,
        transparentRequested,
        background: data.background ?? "auto",
        apiSize,
        sourceImageId: body.sourceImageId,
        operation: isEdit ? "edit" : "generation",
        timings: {
          openaiMs,
          resizeMs: processed.resizeMs,
          totalMs: performance.now() - startedAt
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function requestImageGeneration({
  apiPrompt,
  apiSize,
  model,
  transparentRequested
}: {
  apiPrompt: string;
  apiSize: string;
  model: string;
  transparentRequested: boolean;
}) {
  const requestBody: Record<string, unknown> = {
    model,
    prompt: apiPrompt,
    n: 1,
    size: apiSize,
    quality: "high",
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
    throw new Error(getOpenAIErrorMessage(data, "OpenAI 이미지 생성 API 요청에 실패했습니다."));
  }

  return data;
}

async function requestImageEdit({
  apiPrompt,
  apiSize,
  inputImageDataUrl,
  model,
  transparentRequested
}: {
  apiPrompt: string;
  apiSize: string;
  inputImageDataUrl: string;
  model: string;
  transparentRequested: boolean;
}) {
  const source = dataUrlToBuffer(inputImageDataUrl);
  const formData = new FormData();
  formData.set("model", model);
  formData.set("prompt", apiPrompt);
  formData.set("n", "1");
  formData.set("size", apiSize);
  formData.set("quality", "high");
  formData.set("output_format", "png");
  formData.set("image", new File([source.buffer], "selected-decorated-title.png", { type: source.mimeType }));

  if (transparentRequested && !model.startsWith("gpt-image-2")) {
    formData.set("background", "transparent");
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data, "OpenAI 이미지 편집 API 요청에 실패했습니다."));
  }

  return data;
}

function chooseImageModel(outputType: OutputType) {
  void outputType;

  if (process.env.OPENAI_IMAGE_MODEL) {
    return process.env.OPENAI_IMAGE_MODEL;
  }

  return "gpt-image-2";
}
