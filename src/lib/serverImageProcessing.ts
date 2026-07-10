import sharp from "sharp";
import { parseImageSize } from "@/lib/generativeOptions";
import type { ImageSize } from "@/lib/generativeTypes";

export function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("유효한 이미지 data URL이 아닙니다.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export async function prepareServerPng(base64Png: string, size: ImageSize) {
  const startedAt = performance.now();
  const input = Buffer.from(base64Png, "base64");
  const transparent = await removeLightBackground(input);
  const { width, height } = parseImageSize(size);
  const output = await sharp(transparent, { density: 300 })
    .resize({
      width,
      height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3"
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .withMetadata({ density: 300 })
    .toBuffer();

  return {
    imageDataUrl: `data:image/png;base64,${output.toString("base64")}`,
    resizeMs: performance.now() - startedAt
  };
}

async function removeLightBackground(input: Buffer, lightCutoff = 246) {
  const decoded = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bytes = Buffer.from(decoded.data);

  for (let index = 0; index < bytes.length; index += 4) {
    const red = bytes[index];
    const green = bytes[index + 1];
    const blue = bytes[index + 2];
    const minChannel = Math.min(red, green, blue);
    const maxChannel = Math.max(red, green, blue);
    const chroma = maxChannel - minChannel;

    if (minChannel >= lightCutoff && chroma <= 18) {
      bytes[index + 3] = 0;
    } else if (minChannel >= 235 && chroma <= 14) {
      const keepRatio = Math.max(0, Math.min(1, (lightCutoff - minChannel) / (lightCutoff - 235)));
      bytes[index + 3] = Math.round(bytes[index + 3] * keepRatio);
    }
  }

  return sharp(bytes, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();
}
