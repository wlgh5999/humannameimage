import { toPng } from "html-to-image";

export interface DownloadImageOptions {
  fileName: string;
  width: number;
  height: number;
  backgroundColor?: string;
  transparent?: boolean;
  trimTransparent?: boolean;
  trimPadding?: number;
}

export async function downloadNodeAsPng(node: HTMLElement, options: DownloadImageOptions) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(node, {
    width: options.width,
    height: options.height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: options.transparent ? undefined : options.backgroundColor,
    style: {
      margin: "0"
    }
  });

  const finalDataUrl =
    options.transparent && options.trimTransparent
      ? await trimTransparentPng(dataUrl, options.trimPadding ?? 36)
      : dataUrl;

  triggerDownload(finalDataUrl, options.fileName);
}

export function createPngFileName(title: string, suffix?: string) {
  const base =
    title
      .normalize("NFC")
      .replace(/[,，]/g, " ")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "education_title";

  return suffix ? `${base}_${suffix}.png` : `${base}.png`;
}

async function trimTransparentPng(dataUrl: string, padding: number) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return dataUrl;
  }

  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findOpaqueBounds(imageData.data, canvas.width, canvas.height);

  if (!bounds) {
    return dataUrl;
  }

  const left = Math.max(bounds.left - padding, 0);
  const top = Math.max(bounds.top - padding, 0);
  const right = Math.min(bounds.right + padding, canvas.width - 1);
  const bottom = Math.min(bounds.bottom + padding, canvas.height - 1);
  const width = right - left + 1;
  const height = bottom - top + 1;

  const trimmedCanvas = document.createElement("canvas");
  const trimmedContext = trimmedCanvas.getContext("2d");

  if (!trimmedContext) {
    return dataUrl;
  }

  trimmedCanvas.width = width;
  trimmedCanvas.height = height;
  trimmedContext.drawImage(canvas, left, top, width, height, 0, 0, width, height);

  return trimmedCanvas.toDataURL("image/png");
}

function findOpaqueBounds(data: Uint8ClampedArray, width: number, height: number) {
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 0) {
        top = Math.min(top, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right === -1 || bottom === -1) {
    return null;
  }

  return { top, left, right, bottom };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
