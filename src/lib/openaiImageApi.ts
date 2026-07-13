import { getOpenAIErrorMessage } from "@/lib/openaiErrors";
import { dataUrlToBuffer } from "@/lib/serverImageProcessing";
import type { OutputType } from "@/lib/generativeTypes";

export type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  usage?: unknown;
  background?: "transparent" | "opaque" | "auto";
};

type RequestImageGenerationOptions = {
  apiPrompt: string;
  apiSize: string;
  model: string;
  transparentRequested: boolean;
};

type RequestImageEditOptions = RequestImageGenerationOptions & {
  inputImageDataUrl: string;
  fileName?: string;
};

export function chooseImageModel(outputType?: OutputType | "recommended-icon") {
  void outputType;

  if (process.env.OPENAI_IMAGE_MODEL) {
    return process.env.OPENAI_IMAGE_MODEL;
  }

  return "gpt-image-2";
}

export function supportsTransparentBackground(model: string) {
  return !model.startsWith("gpt-image-2");
}

export async function requestImageGeneration({
  apiPrompt,
  apiSize,
  model,
  transparentRequested
}: RequestImageGenerationOptions) {
  const requestBody: Record<string, unknown> = {
    model,
    prompt: apiPrompt,
    n: 1,
    size: apiSize,
    quality: "high",
    output_format: "png"
  };

  if (transparentRequested && supportsTransparentBackground(model)) {
    requestBody.background = "transparent";
  } else if (supportsTransparentBackground(model)) {
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

  return data as OpenAIImageResponse;
}

export async function requestImageEdit({
  apiPrompt,
  apiSize,
  inputImageDataUrl,
  model,
  transparentRequested,
  fileName = "selected-decorated-title.png"
}: RequestImageEditOptions) {
  const source = dataUrlToBuffer(inputImageDataUrl);
  const formData = new FormData();
  formData.set("model", model);
  formData.set("prompt", apiPrompt);
  formData.set("n", "1");
  formData.set("size", apiSize);
  formData.set("quality", "high");
  formData.set("output_format", "png");
  formData.set("image", new File([source.buffer], fileName, { type: source.mimeType }));

  if (transparentRequested && supportsTransparentBackground(model)) {
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

  return data as OpenAIImageResponse;
}
