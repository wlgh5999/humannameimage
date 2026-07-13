import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { getIconFileName } from "@/lib/iconAssets";
import { chooseImageModel, requestImageEdit } from "@/lib/openaiImageApi";
import { prepareIconPng } from "@/lib/serverImageProcessing";
import type { DesignSpec, EducationImageForm, GeneratedIconAsset, IconSpec, PngValidationStatus } from "@/lib/generativeTypes";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  form?: EducationImageForm;
  designSpec?: DesignSpec;
  iconSpec?: IconSpec;
  actualIconNames?: string[];
  inputImageDataUrl?: string;
  sourceImageId?: string;
};

const retryPromptPrefix = [
  "CRITICAL RETRY:",
  "The previous icon incorrectly contained a checkerboard or non-transparent background.",
  "Do not simulate transparency.",
  "Use real alpha transparency only.",
  "Do not render any background pixels."
].join("\n");

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = performance.now();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY를 설정해야 추천 아이콘을 생성할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RequestBody;

    if (!body.form || !body.designSpec || !body.iconSpec || !body.inputImageDataUrl) {
      return NextResponse.json({ error: "추천 아이콘 생성에 필요한 정보가 부족합니다." }, { status: 400 });
    }

    const model = chooseImageModel("recommended-icon");
    const prompt = buildRecommendedIconPrompt({
      form: body.form,
      designSpec: body.designSpec,
      iconSpec: body.iconSpec,
      actualIconNames: body.actualIconNames ?? []
    });
    let attempt = await requestAndProcessIcon({
      apiPrompt: prompt,
      inputImageDataUrl: body.inputImageDataUrl,
      model
    });

    if (attempt.processed.validationStatus !== "VALID_TRANSPARENT_PNG") {
      const retryAttempt = await requestAndProcessIcon({
        apiPrompt: [retryPromptPrefix, prompt].join("\n\n"),
        inputImageDataUrl: body.inputImageDataUrl,
        model
      });

      attempt = {
        ...retryAttempt,
        openaiMs: attempt.openaiMs + retryAttempt.openaiMs,
        processingMs: attempt.processingMs + retryAttempt.processingMs,
        retryCount: 1
      };
    }

    if (attempt.processed.validationStatus !== "VALID_TRANSPARENT_PNG") {
      return NextResponse.json(
        {
          error: getValidationFailureMessage(attempt.processed.validationStatus),
          status: attempt.processed.validationStatus,
          validation: attempt.processed.validation
        },
        { status: 422 }
      );
    }

    const asset: GeneratedIconAsset = {
      id: crypto.randomUUID(),
      kind: "recommended",
      spec: body.iconSpec,
      name: body.iconSpec.name,
      slug: body.iconSpec.slug,
      fileName: getIconFileName("recommended", body.iconSpec),
      imageDataUrl: attempt.processed.imageDataUrl,
      width: attempt.processed.width,
      height: attempt.processed.height,
      createdAt: new Date().toISOString(),
      sourceImageId: body.sourceImageId,
      model,
      operation: "edit",
      prompt,
      validationStatus: attempt.processed.validationStatus,
      validation: attempt.processed.validation,
      corrected: attempt.processed.corrected,
      retryCount: attempt.retryCount,
      timings: {
        openaiMs: attempt.openaiMs,
        processingMs: attempt.processingMs,
        totalMs: performance.now() - startedAt
      }
    };

    return NextResponse.json({ icon: asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "추천 아이콘 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function requestAndProcessIcon({
  apiPrompt,
  inputImageDataUrl,
  model
}: {
  apiPrompt: string;
  inputImageDataUrl: string;
  model: string;
}) {
  const openAIStartedAt = performance.now();
  const data = await requestImageEdit({
    apiPrompt,
    apiSize: "1024x1024",
    inputImageDataUrl,
    model,
    transparentRequested: true,
    fileName: "selected-decorated-title-reference.png"
  });
  const openaiMs = performance.now() - openAIStartedAt;
  const first = data.data?.[0];
  const b64 = first?.b64_json;

  if (!b64) {
    throw new Error("OpenAI 응답에 추천 아이콘 이미지 데이터가 없습니다.");
  }

  const processed = await prepareIconPng(b64);

  return {
    data,
    first,
    processed,
    openaiMs,
    processingMs: processed.processingMs,
    retryCount: 0
  };
}

function buildRecommendedIconPrompt({
  form,
  designSpec,
  iconSpec,
  actualIconNames
}: {
  form: EducationImageForm;
  designSpec: DesignSpec;
  iconSpec: IconSpec;
  actualIconNames: string[];
}) {
  const paletteText = designSpec.palette.map((color) => `${color.hex} (${color.usage})`).join(", ");

  return [
    "Create one isolated decorative icon inspired by the selected decorated Korean title design.",
    "",
    "Reference style:",
    "- Same color palette as the selected title design",
    "- Same line thickness",
    "- Same roundedness",
    "- Same fill style",
    "- Same outline style",
    "- Same texture",
    "- Same shadow style",
    "- Same visual weight",
    "- Same warm and professional mood",
    "",
    `Create this complementary icon: ${iconSpec.promptLabel} (${iconSpec.name}).`,
    `Actual icons already used: ${actualIconNames.length > 0 ? actualIconNames.join(", ") : "none detected"}`,
    "",
    "Education context:",
    form.title,
    form.promotionCopy,
    `Core topics: ${form.topics.join(", ")}`,
    `Education field: ${designSpec.topicCategory}`,
    `Core keywords: ${designSpec.keywords.join(", ")}`,
    `Palette: ${paletteText}`,
    `Typography mood: ${designSpec.typographyStyle}`,
    "",
    "Create one complementary icon that is not a duplicate of the actual icons.",
    "",
    "Use a true transparent alpha background.",
    "If native alpha is not available, use one single flat pure magenta #FF00FF chroma-key background only.",
    "Do not use magenta, pink-magenta, or #FF00FF anywhere in the icon artwork, outline, shadow, texture, or highlight.",
    "IMPORTANT:",
    "- Do NOT draw a checkerboard pattern.",
    "- Do NOT simulate transparency with white and gray squares.",
    "- Do NOT render any transparency preview pattern.",
    "- Do NOT draw a black-and-white checkerboard.",
    "- Do NOT draw a gray checkerboard.",
    "- Do NOT include a white background.",
    "- Do NOT include a gray background.",
    "- Do NOT include a paper texture.",
    "- Do NOT include a card, panel, frame, or solid rectangle.",
    "- The background must be actual alpha transparency.",
    "- Background pixels must be transparent, not painted.",
    "- Return a production-ready isolated PNG asset with real alpha transparency.",
    "",
    "Requirements:",
    "- One icon only",
    "- Fully transparent alpha background",
    "- No checkerboard",
    "- No white or gray background",
    "- No text",
    "- No scene",
    "- No card",
    "- No panel",
    "- No people illustration",
    "- No background",
    "- Clean reusable PNG asset",
    "- Suitable for Canva and Korean education promotional design",
    "- Center the icon with 10 to 30 pixels of safe transparent padding",
    "- Quality must be high"
  ].join("\n");
}

function getValidationFailureMessage(status: PngValidationStatus) {
  if (status === "CHECKERBOARD_DETECTED") {
    return "실제 투명 배경이 아닌 체크무늬가 감지되었습니다.";
  }

  return "추천 아이콘의 실제 투명 배경 생성에 실패했습니다. 다시 시도해주세요.";
}
