import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { chooseImageModel, requestImageGeneration } from "@/lib/openaiImageApi";
import { prepareBackgroundPng } from "@/lib/serverImageProcessing";
import type {
  DesignSpec,
  EducationImageForm,
  GeneratedBackgroundAsset,
  ThumbnailBackgroundSpec
} from "@/lib/generativeTypes";

export const runtime = "nodejs";
export const maxDuration = 300;

const thumbnailWidth = 1920;
const thumbnailHeight = 1440;
const apiSize = "1536x1024";

type RequestBody = {
  form?: EducationImageForm;
  designSpec?: DesignSpec;
  backgroundSpec?: ThumbnailBackgroundSpec;
  sourceImageId?: string;
  actualIconNames?: string[];
  recommendedIconNames?: string[];
};

export async function POST(request: Request) {
  if (!(await requireAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = performance.now();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY를 설정해야 썸네일 배경을 생성할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RequestBody;

    if (!body.form || !body.designSpec || !body.backgroundSpec) {
      return NextResponse.json({ error: "썸네일 배경 생성에 필요한 정보가 부족합니다." }, { status: 400 });
    }

    const model = chooseImageModel("thumbnail-background");
    const prompt = buildThumbnailBackgroundPrompt({
      form: body.form,
      designSpec: body.designSpec,
      backgroundSpec: body.backgroundSpec,
      actualIconNames: body.actualIconNames ?? [],
      recommendedIconNames: body.recommendedIconNames ?? []
    });

    const openAIStartedAt = performance.now();
    const data = await requestImageGeneration({
      apiPrompt: prompt,
      apiSize,
      model,
      transparentRequested: false
    });
    const openaiMs = performance.now() - openAIStartedAt;
    const first = data.data?.[0];
    const b64 = first?.b64_json;

    if (!b64) {
      throw new Error("OpenAI 응답에 썸네일 배경 이미지 데이터가 없습니다.");
    }

    const processed = await prepareBackgroundPng(b64, { width: thumbnailWidth, height: thumbnailHeight });
    const asset: GeneratedBackgroundAsset = {
      id: crypto.randomUUID(),
      spec: body.backgroundSpec,
      label: body.backgroundSpec.label,
      fileName: `${String(body.backgroundSpec.index + 1).padStart(2, "0")}_${body.backgroundSpec.fileLabel}.png`,
      imageDataUrl: processed.imageDataUrl,
      width: processed.width,
      height: processed.height,
      createdAt: new Date().toISOString(),
      sourceImageId: body.sourceImageId,
      model,
      operation: "generation",
      prompt,
      revisedPrompt: first?.revised_prompt,
      usage: data.usage,
      apiSize,
      timings: {
        openaiMs,
        processingMs: processed.processingMs,
        totalMs: performance.now() - startedAt
      }
    };

    return NextResponse.json({ background: asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "썸네일 배경 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function buildThumbnailBackgroundPrompt({
  form,
  designSpec,
  backgroundSpec,
  actualIconNames,
  recommendedIconNames
}: {
  form: EducationImageForm;
  designSpec: DesignSpec;
  backgroundSpec: ThumbnailBackgroundSpec;
  actualIconNames: string[];
  recommendedIconNames: string[];
}) {
  const paletteText = designSpec.palette.map((color) => `${color.hex} (${color.usage})`).join(", ");
  const iconText = [...actualIconNames, ...recommendedIconNames].filter(Boolean).join(", ") || designSpec.decorations.join(", ");

  return [
    "Create one polished thumbnail background for a Korean education promotional image.",
    "Final output will be resized by the server to exactly 1920 x 1440 px, 4:3.",
    "",
    "This is BACKGROUND ONLY.",
    "Do not include any Korean text, English text, letters, numbers, captions, title, logo, watermark, UI, card, panel, frame, or mockup.",
    "Do not include people, faces, bodies, classrooms, photo-real scenes, or large character illustrations.",
    "Do not copy or redraw the title. Leave space for a separate transparent title PNG to be placed later.",
    "",
    "Composition:",
    "- 4:3 thumbnail background",
    "- large clean safe area across the center and upper-middle for an external title PNG",
    "- subtle visual interest near the edges and corners",
    "- soft organic curves, gentle connection lines, small dots, light icon-like motifs only if they remain background elements",
    "- no busy patterns behind the title safe area",
    "",
    `Variant direction: ${backgroundSpec.direction}.`,
    `Variant focus: ${backgroundSpec.promptFocus}.`,
    "",
    "Match this selected title design context:",
    `Education title: ${form.title}`,
    `Promotion copy: ${form.promotionCopy}`,
    `Core topics: ${form.topics.join(", ")}`,
    `Audiences: ${form.audiences.join(", ")}`,
    `Core emotions: ${designSpec.coreEmotions.join(", ")}`,
    `Core keywords: ${designSpec.keywords.join(", ")}`,
    `Visual metaphor: ${designSpec.visualMetaphor}`,
    `Typography mood to complement: ${designSpec.typographyStyle}`,
    `Title placement plan: ${designSpec.titlePlacement}`,
    `Existing or recommended icon motifs to harmonize with, but not duplicate loudly: ${iconText}`,
    `Use this palette naturally and softly: ${paletteText}`,
    "",
    "Mood:",
    "- warm, professional, human-centered, relationship-centered",
    "- suitable for Human Impact Cooperative education promotion",
    "- calm but not plain",
    "- refined, readable, Canva-friendly",
    "- no excessive contrast, no comic-book action style, no neon, no dark heavy background",
    "",
    "Quality must be high.",
    "Return a clean opaque PNG background with no text."
  ].join("\n");
}
