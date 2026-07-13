import sharp from "sharp";
import { parseImageSize } from "@/lib/generativeOptions";
import { getIconFileName } from "@/lib/iconAssets";
import type { GeneratedIconAsset, IconSpec, ImageSize, PngValidationResult } from "@/lib/generativeTypes";

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

type EdgeBackgroundModel = {
  colors: Array<[number, number, number]>;
  opaquePixelRatio: number;
  whitePixelRatio: number;
  grayPixelRatio: number;
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

export async function prepareServerPng(
  base64Png: string,
  size: ImageSize,
  options: { punchOutInteriorLight?: boolean } = {}
) {
  const startedAt = performance.now();

  try {
    const input = Buffer.from(base64Png, "base64");
    const decoded = await decodeRgba(input);
    const initialCheckerboard = detectCheckerboardFromEdges(decoded);
    const backgroundModel = getEdgeBackgroundModel(decoded);
    const removed = removeEdgeConnectedBackground(decoded, initialCheckerboard, backgroundModel);
    const chromaRemoved = removeChromaKeyPixels(
      {
        ...decoded,
        data: removed.buffer
      },
      backgroundModel
    );
    const punched = options.punchOutInteriorLight
      ? removeEnclosedLightIslands(
          {
            ...decoded,
            data: chromaRemoved.buffer
          },
          { preserveLargeDecorations: true }
        )
      : { buffer: chromaRemoved.buffer, changedPixels: 0 };
    const sourcePng = await rgbaToPng(punched.buffer, decoded.width, decoded.height);
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
      corrected: removed.changedPixels + chromaRemoved.changedPixels + punched.changedPixels > 0,
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

export async function prepareIconPng(base64Png: string, options: { maxSize?: number } = {}) {
  const startedAt = performance.now();

  try {
    const input = Buffer.from(base64Png, "base64");
    const normalized = await normalizeTransparentPng(input);
    const trimmed = await trimAlphaPng(normalized.buffer, {
      maxSize: options.maxSize ?? 512,
      padding: 24
    });
    const validation = await validateTransparentPng(trimmed.buffer, {
      corrected: normalized.corrected,
      originalHadAlpha: normalized.originalHadAlpha
    });

    return {
      imageDataUrl: `data:image/png;base64,${trimmed.buffer.toString("base64")}`,
      width: trimmed.width,
      height: trimmed.height,
      processingMs: performance.now() - startedAt,
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
      message: error instanceof Error ? error.message : "아이콘 PNG 후처리에 실패했습니다."
    };

    return {
      imageDataUrl: "",
      width: 0,
      height: 0,
      processingMs: performance.now() - startedAt,
      validation,
      validationStatus: validation.status,
      corrected: false
    };
  }
}

export async function extractActualIconAssets({
  imageDataUrl,
  specs,
  sourceImageId
}: {
  imageDataUrl: string;
  specs: IconSpec[];
  sourceImageId?: string;
}) {
  const startedAt = performance.now();
  const source = dataUrlToBuffer(imageDataUrl);
  const normalized = await normalizeTransparentPng(source.buffer);
  const components = await findAlphaComponents(normalized.buffer);
  const chosenBoxes = chooseIconBoxes(components, specs.length || components.length);
  const fallbackBox = await getAlphaBoundingBox(normalized.buffer);
  const boxes = chosenBoxes.length > 0 ? chosenBoxes : fallbackBox ? [fallbackBox] : [];
  const assets: GeneratedIconAsset[] = [];

  for (let index = 0; index < boxes.length; index += 1) {
    const spec = specs[index] ?? {
      id: `actual-icon-${index + 1}`,
      name: `아이콘 ${index + 1}`,
      slug: `icon-${index + 1}`,
      promptLabel: `icon ${index + 1}`,
      fileLabel: `icon_${index + 1}`,
      index
    };
    const cropped = await cropAlphaBox(normalized.buffer, boxes[index], { padding: 24, maxSize: 512 });
    const validation = await validateTransparentPng(cropped.buffer, {
      corrected: normalized.corrected,
      originalHadAlpha: normalized.originalHadAlpha
    });

    assets.push({
      id: crypto.randomUUID(),
      kind: "actual",
      spec,
      name: spec.name,
      slug: spec.slug,
      fileName: getIconFileName("actual", spec),
      imageDataUrl: `data:image/png;base64,${cropped.buffer.toString("base64")}`,
      width: cropped.width,
      height: cropped.height,
      createdAt: new Date().toISOString(),
      sourceImageId,
      sourceComponentIndex: index,
      operation: "server-extract",
      validationStatus: validation.status,
      validation,
      corrected: validation.corrected,
      timings: {
        processingMs: performance.now() - startedAt,
        totalMs: performance.now() - startedAt
      }
    });
  }

  return assets;
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
  const edgeBackground = getEdgeBackgroundModel(decoded);
  const transparentPixelRatio = getTransparentPixelRatio(decoded);
  const hasAlphaChannel = Boolean(metadata.hasAlpha) || metadata.channels === 4;
  const base = {
    hasAlphaChannel,
    transparentPixelRatio,
    checkerboardDetected: checkerboard.detected,
    checkerboardAlternatingRatio: checkerboard.alternatingRatio,
    checkerboardColors: checkerboard.colors.map(colorToHex),
    edgeOpaquePixelRatio: edgeBackground.opaquePixelRatio,
    backgroundDetected: edgeBackground.opaquePixelRatio > 0.08,
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

  if (edgeBackground.whitePixelRatio > 0.12) {
    return {
      ...base,
      status: "WHITE_BACKGROUND_DETECTED",
      message: "흰색 배경이 가장자리 픽셀에 남아 있습니다."
    };
  }

  if (edgeBackground.grayPixelRatio > 0.12) {
    return {
      ...base,
      status: "GRAY_BACKGROUND_DETECTED",
      message: "회색 배경이 가장자리 픽셀에 남아 있습니다."
    };
  }

  if (edgeBackground.opaquePixelRatio > 0.16) {
    return {
      ...base,
      status: "BACKGROUND_REMAINS",
      message: "이미지 가장자리와 연결된 불투명 배경이 남아 있습니다."
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
    message: options.corrected
      ? "서버에서 배경 제거를 적용한 뒤 검증을 통과한 투명 PNG입니다."
      : options.originalHadAlpha
        ? "알파 채널이 있는 투명 PNG입니다."
        : "서버에서 배경을 제거해 알파 채널을 만든 투명 PNG입니다."
  };
}

async function normalizeTransparentPng(input: Buffer) {
  const decoded = await decodeRgba(input);
  const checkerboard = detectCheckerboardFromEdges(decoded);
  const backgroundModel = getEdgeBackgroundModel(decoded);
  const removed = removeEdgeConnectedBackground(decoded, checkerboard, backgroundModel);
  const chromaRemoved = removeChromaKeyPixels(
    {
      ...decoded,
      data: removed.buffer
    },
    backgroundModel
  );

  return {
    buffer: await rgbaToPng(chromaRemoved.buffer, decoded.width, decoded.height),
    width: decoded.width,
    height: decoded.height,
    originalHadAlpha: decoded.hasAlphaChannel,
    corrected: removed.changedPixels + chromaRemoved.changedPixels > 0
  };
}

function removeEdgeConnectedBackground(
  image: RgbaImage,
  checkerboard: CheckerboardDetection,
  backgroundModel: EdgeBackgroundModel
): BackgroundRemovalResult {
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
    if (!isBackgroundCandidate(bytes, byteIndex, checkerboard, backgroundModel)) {
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

function removeEnclosedLightIslands(
  image: RgbaImage,
  options: { preserveLargeDecorations: boolean }
): BackgroundRemovalResult {
  const bytes = Buffer.from(image.data);
  const { width, height } = image;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let changedPixels = 0;

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    if (visited[pixelIndex] || !isInteriorHoleCandidate(bytes, pixelIndex * 4)) {
      continue;
    }

    let head = 0;
    let tail = 0;
    let area = 0;
    let touchesTransparentEdge = false;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    const members: number[] = [];

    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      const byteIndex = current * 4;

      members.push(current);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || bytes[byteIndex + 3] <= 8) {
        touchesTransparentEdge = true;
      }

      const neighbors = [current - 1, current + 1, current - width, current + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= totalPixels || visited[neighbor]) {
          continue;
        }

        const nx = neighbor % width;
        const ny = Math.floor(neighbor / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1 || !isInteriorHoleCandidate(bytes, neighbor * 4)) {
          continue;
        }

        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const maxRemovableArea = Math.max(1800, Math.round(totalPixels * 0.0035));
    const isLongUnderline = boxWidth > width * 0.28 && boxWidth / Math.max(1, boxHeight) > 7;
    const keepAsDecoration =
      options.preserveLargeDecorations && (area > maxRemovableArea || isLongUnderline || boxHeight > height * 0.2);

    if (touchesTransparentEdge || keepAsDecoration || area < 18) {
      continue;
    }

    for (const member of members) {
      const byteIndex = member * 4;
      if (bytes[byteIndex + 3] !== 0) {
        bytes[byteIndex + 3] = 0;
        changedPixels += 1;
      }
    }
  }

  return { buffer: bytes, changedPixels };
}

function removeChromaKeyPixels(image: RgbaImage, backgroundModel: EdgeBackgroundModel): BackgroundRemovalResult {
  const bytes = Buffer.from(image.data);
  const keyColors = backgroundModel.colors.filter(isChromaKeyColor);
  let changedPixels = 0;

  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 4) {
    if (bytes[byteIndex + 3] <= 8) {
      continue;
    }

    if (!isLikelyChromaKeyPixel(bytes, byteIndex, keyColors)) {
      continue;
    }

    bytes[byteIndex + 3] = 0;
    changedPixels += 1;
  }

  return { buffer: bytes, changedPixels };
}

function isBackgroundCandidate(
  bytes: Buffer,
  byteIndex: number,
  checkerboard: CheckerboardDetection,
  backgroundModel: EdgeBackgroundModel
) {
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

  if (checkerboard.detected && checkerboard.colors.some((color) => colorDistance(color, [red, green, blue]) <= 34)) {
    return true;
  }

  return backgroundModel.colors.some((color) => colorDistance(color, [red, green, blue]) <= 38);
}

function isInteriorHoleCandidate(bytes: Buffer, byteIndex: number) {
  const red = bytes[byteIndex];
  const green = bytes[byteIndex + 1];
  const blue = bytes[byteIndex + 2];
  const alpha = bytes[byteIndex + 3];
  const minChannel = Math.min(red, green, blue);
  const maxChannel = Math.max(red, green, blue);
  const chroma = maxChannel - minChannel;

  return alpha > 32 && minChannel >= 155 && chroma <= 48;
}

function isChromaKeyColor(color: [number, number, number]) {
  const [red, green, blue] = color;
  return isMagentaKey(red, green, blue) || isGreenKey(red, green, blue);
}

function isLikelyChromaKeyPixel(bytes: Buffer, byteIndex: number, keyColors: Array<[number, number, number]>) {
  const red = bytes[byteIndex];
  const green = bytes[byteIndex + 1];
  const blue = bytes[byteIndex + 2];
  const alpha = bytes[byteIndex + 3];

  if (alpha <= 8) {
    return false;
  }

  if (isMagentaKey(red, green, blue) || isGreenKey(red, green, blue)) {
    return true;
  }

  return keyColors.some((color) => colorDistance(color, [red, green, blue]) <= 92);
}

function isMagentaKey(red: number, green: number, blue: number) {
  return red >= 150 && blue >= 135 && green <= 145 && red - green >= 45 && blue - green >= 35;
}

function isGreenKey(red: number, green: number, blue: number) {
  return green >= 150 && red <= 135 && blue <= 145 && green - red >= 45 && green - blue >= 35;
}

function getEdgeBackgroundModel(image: RgbaImage): EdgeBackgroundModel {
  const edgeIndexes = getEdgePixelIndexes(image.width, image.height);
  const histogram = new Map<string, { count: number; color: [number, number, number] }>();
  let opaque = 0;
  let white = 0;
  let gray = 0;

  for (const pixelIndex of edgeIndexes) {
    const byteIndex = pixelIndex * 4;
    const red = image.data[byteIndex];
    const green = image.data[byteIndex + 1];
    const blue = image.data[byteIndex + 2];
    const alpha = image.data[byteIndex + 3];

    if (alpha <= 32) {
      continue;
    }

    opaque += 1;
    if (red >= 245 && green >= 245 && blue >= 245) {
      white += 1;
    } else if (isNeutral(red, green, blue) && red >= 170 && green >= 170 && blue >= 170) {
      gray += 1;
    }

    const color = quantizeColor(red, green, blue);
    const key = color.join(",");
    const entry = histogram.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      histogram.set(key, { count: 1, color });
    }
  }

  const edgeTotal = edgeIndexes.length || 1;
  const colors = [...histogram.values()]
    .filter((entry) => entry.count / edgeTotal >= 0.015)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entry) => entry.color);

  return {
    colors,
    opaquePixelRatio: opaque / edgeTotal,
    whitePixelRatio: white / edgeTotal,
    grayPixelRatio: gray / edgeTotal
  };
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

async function findAlphaComponents(input: Buffer) {
  const decoded = await decodeRgba(input);
  const { width, height, data } = decoded;
  const visited = new Uint8Array(width * height);
  const components: Array<{ x: number; y: number; width: number; height: number; area: number }> = [];
  const queue = new Int32Array(width * height);

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    if (visited[pixelIndex] || data[pixelIndex * 4 + 3] <= 28) {
      continue;
    }

    let head = 0;
    let tail = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let area = 0;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [current - 1, current + 1, current - width, current + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= width * height || visited[neighbor]) {
          continue;
        }

        const nx = neighbor % width;
        const ny = Math.floor(neighbor / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1 || data[neighbor * 4 + 3] <= 28) {
          continue;
        }

        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    if (area >= 24) {
      components.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        area
      });
    }
  }

  return mergeNearbyBoxes(components, Math.max(28, Math.round(Math.min(width, height) * 0.035))).sort(
    (first, second) => first.y - second.y || first.x - second.x
  );
}

function chooseIconBoxes(
  components: Array<{ x: number; y: number; width: number; height: number; area: number }>,
  targetCount: number
) {
  if (components.length <= targetCount || targetCount <= 0) {
    return components;
  }

  return [...components]
    .sort((first, second) => second.area - first.area)
    .slice(0, targetCount)
    .sort((first, second) => first.y - second.y || first.x - second.x);
}

function mergeNearbyBoxes(
  boxes: Array<{ x: number; y: number; width: number; height: number; area: number }>,
  margin: number
) {
  const merged = [...boxes];
  let changed = true;

  while (changed) {
    changed = false;

    for (let firstIndex = 0; firstIndex < merged.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < merged.length; secondIndex += 1) {
        if (!expandedBoxesOverlap(merged[firstIndex], merged[secondIndex], margin)) {
          continue;
        }

        const first = merged[firstIndex];
        const second = merged[secondIndex];
        const x = Math.min(first.x, second.x);
        const y = Math.min(first.y, second.y);
        const right = Math.max(first.x + first.width, second.x + second.width);
        const bottom = Math.max(first.y + first.height, second.y + second.height);
        merged[firstIndex] = {
          x,
          y,
          width: right - x,
          height: bottom - y,
          area: first.area + second.area
        };
        merged.splice(secondIndex, 1);
        changed = true;
        break;
      }

      if (changed) {
        break;
      }
    }
  }

  return merged.filter((box) => box.area >= 40);
}

function expandedBoxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
  margin: number
) {
  return !(
    first.x + first.width + margin < second.x ||
    second.x + second.width + margin < first.x ||
    first.y + first.height + margin < second.y ||
    second.y + second.height + margin < first.y
  );
}

async function getAlphaBoundingBox(input: Buffer) {
  const decoded = await decodeRgba(input);
  let minX = decoded.width;
  let maxX = -1;
  let minY = decoded.height;
  let maxY = -1;
  let area = 0;

  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const alpha = decoded.data[(y * decoded.width + x) * 4 + 3];

      if (alpha <= 28) {
        continue;
      }

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      area += 1;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    area
  };
}

async function trimAlphaPng(input: Buffer, options: { padding: number; maxSize: number }) {
  const box = await getAlphaBoundingBox(input);

  if (!box) {
    const empty = await sharp({
      create: {
        width: options.maxSize,
        height: options.maxSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
      .withMetadata({ density: 300 })
      .toBuffer();

    return { buffer: empty, width: options.maxSize, height: options.maxSize };
  }

  return cropAlphaBox(input, box, options);
}

async function cropAlphaBox(
  input: Buffer,
  box: { x: number; y: number; width: number; height: number },
  options: { padding: number; maxSize: number }
) {
  const metadata = await sharp(input).metadata();
  const sourceWidth = metadata.width ?? box.width;
  const sourceHeight = metadata.height ?? box.height;
  const left = Math.max(0, box.x - options.padding);
  const top = Math.max(0, box.y - options.padding);
  const right = Math.min(sourceWidth, box.x + box.width + options.padding);
  const bottom = Math.min(sourceHeight, box.y + box.height + options.padding);
  const cropped = await sharp(input)
    .extract({
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top)
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
    .toBuffer();
  const croppedMetadata = await sharp(cropped).metadata();
  const width = croppedMetadata.width ?? 1;
  const height = croppedMetadata.height ?? 1;
  const scale = Math.min(1, options.maxSize / Math.max(width, height));
  const output =
    scale < 1
      ? await sharp(cropped)
          .resize({
            width: Math.round(width * scale),
            height: Math.round(height * scale),
            fit: "inside",
            kernel: "lanczos3",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
          .withMetadata({ density: 300 })
          .toBuffer()
      : await sharp(cropped)
          .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
          .withMetadata({ density: 300 })
          .toBuffer();
  const outputMetadata = await sharp(output).metadata();

  return {
    buffer: output,
    width: outputMetadata.width ?? Math.round(width * scale),
    height: outputMetadata.height ?? Math.round(height * scale)
  };
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
