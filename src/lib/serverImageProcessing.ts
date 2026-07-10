import sharp from "sharp";
import { parseImageSize } from "@/lib/generativeOptions";
import type { ImageSize, PngValidationResult } from "@/lib/generativeTypes";

const DEFAULT_TRANSPARENT_PIXEL_RATIO_THRESHOLD = Number(
  process.env.TRANSPARENT_PIXEL_RATIO_THRESHOLD ?? "0.05"
);

type RgbaImage = {
  data: Buffer;
  width: number;
  height: number;
  hasAlphaChannel: boolean;
};

type CheckerboardDetection = {
  detected: boolean;
  colors: Array<[number, number, number]>;
  alternatingRatio: number;
};

type BackgroundRemovalResult = {
  buffer: Buffer;
  changedPixels: number;
};

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

  try {
    const input = Buffer.from(base64Png, "base64");
    const decoded = await decodeRgba(input);
    const initialCheckerboard = detectCheckerboardFromEdges(decoded);
    const removed = removeEdgeConnectedBackground(decoded, initialCheckerboard);
    const sourcePng = await rgbaToPng(removed.buffer, decoded.width, decoded.height);
    const { width, height } = parseImageSize(size);
    const output = await sharp(sourcePng, { density: 300 })
      .resize({
        width,
        height,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: "lanczos3"
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
      .withMetadata({ density: 300 })
      .toBuffer();
    const validation = await validateTransparentPng(output, {
      corrected: removed.changedPixels > 0,
      originalHadAlpha: decoded.hasAlphaChannel
    });

    return {
      imageDataUrl: `data:image/png;base64,${output.toString("base64")}`,
      resizeMs: performance.now() - startedAt,
      validation,
      validationStatus: validation.status,
      corrected: validation.corrected
    };
  } catch (error) {
    const validation: PngValidationResult = {
      status: "PROCESSING_FAILED",
      hasAlphaChannel: false,
      transparentPixelRatio: 0,
      checkerboardDetected: false,
      corrected: false,
      message: error instanceof Error ? error.message : "PNG 후처리에 실패했습니다."
    };

    return {
      imageDataUrl: "",
      resizeMs: performance.now() - startedAt,
      validation,
      validationStatus: validation.status,
      corrected: false
    };
  }
}

async function decodeRgba(input: Buffer): Promise<RgbaImage> {
  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();
  const decoded = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  return {
    data: Buffer.from(decoded.data),
    width: decoded.info.width,
    height: decoded.info.height,
    hasAlphaChannel: Boolean(metadata.hasAlpha) || metadata.channels === 4
  };
}

async function validateTransparentPng(
  input: Buffer,
  options: { corrected: boolean; originalHadAlpha: boolean }
): Promise<PngValidationResult> {
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  const decoded = await decodeRgba(input);
  const checkerboard = detectCheckerboardFromEdges(decoded);
  const transparentPixelRatio = getTransparentPixelRatio(decoded);
  const hasAlphaChannel = Boolean(metadata.hasAlpha) || metadata.channels === 4;
  const base = {
    hasAlphaChannel,
    transparentPixelRatio,
    checkerboardDetected: checkerboard.detected,
    checkerboardAlternatingRatio: checkerboard.alternatingRatio,
    checkerboardColors: checkerboard.colors.map(colorToHex),
    corrected: options.corrected
  };

  if (metadata.format !== "png") {
    return {
      ...base,
      status: "PROCESSING_FAILED",
      message: "PNG 형식으로 처리되지 않았습니다."
    };
  }

  if (!hasAlphaChannel) {
    return {
      ...base,
      status: "NO_ALPHA_CHANNEL",
      message: "PNG에 알파 채널이 없습니다."
    };
  }

  if (checkerboard.detected) {
    return {
      ...base,
      status: "CHECKERBOARD_DETECTED",
      message: "실제 투명 배경이 아닌 체크무늬가 감지되었습니다. 다시 생성하거나 자동 보정할 수 있습니다."
    };
  }

  if (transparentPixelRatio < DEFAULT_TRANSPARENT_PIXEL_RATIO_THRESHOLD) {
    return {
      ...base,
      status: "LOW_TRANSPARENCY",
      message: "투명 픽셀 비율이 너무 낮습니다."
    };
  }

  return {
    ...base,
    status: "VALID_TRANSPARENT_PNG",
    message: options.originalHadAlpha
      ? "알파 채널이 있는 투명 PNG입니다."
      : "서버에서 배경을 제거해 알파 채널을 만든 투명 PNG입니다."
  };
}

function removeEdgeConnectedBackground(image: RgbaImage, checkerboard: CheckerboardDetection): BackgroundRemovalResult {
  const bytes = Buffer.from(image.data);
  const { width, height } = image;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;
  let changedPixels = 0;

  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex]) {
      return;
    }

    const byteIndex = pixelIndex * 4;
    if (!isBackgroundCandidate(bytes, byteIndex, checkerboard)) {
      return;
    }

    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const byteIndex = pixelIndex * 4;

    if (bytes[byteIndex + 3] !== 0) {
      bytes[byteIndex + 3] = 0;
      changedPixels += 1;
    }

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y < height - 1) enqueue(pixelIndex + width);
  }

  return { buffer: bytes, changedPixels };
}

function isBackgroundCandidate(bytes: Buffer, byteIndex: number, checkerboard: CheckerboardDetection) {
  const red = bytes[byteIndex];
  const green = bytes[byteIndex + 1];
  const blue = bytes[byteIndex + 2];
  const alpha = bytes[byteIndex + 3];

  if (alpha <= 8) {
    return true;
  }

  if (alpha < 180) {
    return false;
  }

  if (isLightNeutral(red, green, blue)) {
    return true;
  }

  return checkerboard.detected && checkerboard.colors.some((color) => colorDistance(color, [red, green, blue]) <= 34);
}

function detectCheckerboardFromEdges(image: RgbaImage): CheckerboardDetection {
  const edgeIndexes = getEdgePixelIndexes(image.width, image.height);
  const histogram = new Map<string, { count: number; color: [number, number, number] }>();
  let neutralOpaqueSamples = 0;

  for (const pixelIndex of edgeIndexes) {
    const byteIndex = pixelIndex * 4;
    const red = image.data[byteIndex];
    const green = image.data[byteIndex + 1];
    const blue = image.data[byteIndex + 2];
    const alpha = image.data[byteIndex + 3];

    if (alpha < 200 || !isNeutral(red, green, blue)) {
      continue;
    }

    neutralOpaqueSamples += 1;
    const color = quantizeColor(red, green, blue);
    const key = color.join(",");
    const entry = histogram.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      histogram.set(key, { count: 1, color });
    }
  }

  if (neutralOpaqueSamples < Math.max(24, edgeIndexes.length * 0.08)) {
    return { detected: false, colors: [], alternatingRatio: 0 };
  }

  const dominant = [...histogram.values()]
    .sort((a, b) => b.count - a.count)
    .filter((entry) => entry.count / neutralOpaqueSamples >= 0.025)
    .slice(0, 4);

  if (dominant.length < 2) {
    return { detected: false, colors: dominant.map((entry) => entry.color), alternatingRatio: 0 };
  }

  const colors = dominant.map((entry) => entry.color);
  const dominantShare = dominant.reduce((sum, entry) => sum + entry.count, 0) / neutralOpaqueSamples;
  const minorShare = dominant[1].count / neutralOpaqueSamples;
  const hasContrastingPair = colors.some((first, firstIndex) =>
    colors.some((second, secondIndex) => secondIndex > firstIndex && colorDistance(first, second) >= 18)
  );
  const alternatingRatio = estimateEdgeAlternation(image, colors);
  const detected =
    hasContrastingPair &&
    dominantShare >= 0.48 &&
    minorShare >= 0.08 &&
    (alternatingRatio >= 0.12 || (dominantShare >= 0.7 && minorShare >= 0.16));

  return { detected, colors, alternatingRatio };
}

function estimateEdgeAlternation(image: RgbaImage, colors: Array<[number, number, number]>) {
  const step = Math.max(3, Math.round(Math.min(image.width, image.height) / 120));
  let comparable = 0;
  let changes = 0;

  const comparePair = (firstIndex: number, secondIndex: number) => {
    const firstColor = nearestColorIndex(image.data, firstIndex * 4, colors);
    const secondColor = nearestColorIndex(image.data, secondIndex * 4, colors);

    if (firstColor < 0 || secondColor < 0) {
      return;
    }

    comparable += 1;
    if (firstColor !== secondColor) {
      changes += 1;
    }
  };

  for (let y = 0; y < image.height; y += step) {
    comparePair(y * image.width, y * image.width + image.width - 1);
  }

  for (let x = 0; x < image.width; x += step) {
    comparePair(x, (image.height - 1) * image.width + x);
  }

  return comparable === 0 ? 0 : changes / comparable;
}

function nearestColorIndex(bytes: Buffer, byteIndex: number, colors: Array<[number, number, number]>) {
  if (bytes[byteIndex + 3] < 200) {
    return -1;
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const pixel: [number, number, number] = [bytes[byteIndex], bytes[byteIndex + 1], bytes[byteIndex + 2]];

  colors.forEach((color, index) => {
    const distance = colorDistance(color, pixel);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestDistance <= 34 ? bestIndex : -1;
}

function getTransparentPixelRatio(image: RgbaImage) {
  let transparentPixels = 0;
  const totalPixels = image.width * image.height;

  for (let index = 3; index < image.data.length; index += 4) {
    if (image.data[index] <= 8) {
      transparentPixels += 1;
    }
  }

  return totalPixels === 0 ? 0 : transparentPixels / totalPixels;
}

function getEdgePixelIndexes(width: number, height: number) {
  const band = Math.max(4, Math.min(64, Math.floor(Math.min(width, height) * 0.08)));
  const indexes: number[] = [];

  for (let y = 0; y < height; y += 1) {
    const isVerticalEdge = y < band || y >= height - band;

    for (let x = 0; x < width; x += 1) {
      if (isVerticalEdge || x < band || x >= width - band) {
        indexes.push(y * width + x);
      }
    }
  }

  return indexes;
}

function rgbaToPng(data: Buffer, width: number, height: number) {
  return sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
    .toBuffer();
}

function isLightNeutral(red: number, green: number, blue: number) {
  const minChannel = Math.min(red, green, blue);
  const maxChannel = Math.max(red, green, blue);
  const chroma = maxChannel - minChannel;

  return (minChannel >= 244 && chroma <= 24) || (minChannel >= 226 && chroma <= 16);
}

function isNeutral(red: number, green: number, blue: number) {
  return Math.max(red, green, blue) - Math.min(red, green, blue) <= 28;
}

function quantizeColor(red: number, green: number, blue: number): [number, number, number] {
  return [quantizeChannel(red), quantizeChannel(green), quantizeChannel(blue)];
}

function quantizeChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value / 16) * 16));
}

function colorDistance(first: [number, number, number], second: [number, number, number]) {
  return Math.sqrt(
    (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2
  );
}

function colorToHex(color: [number, number, number]) {
  return `#${color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
