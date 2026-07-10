import { parseImageSize } from "@/lib/generativeOptions";
import type { ImageSize, OutputType } from "@/lib/generativeTypes";

export function createSafeBaseName(title: string) {
  return (
    title
      .normalize("NFC")
      .replace(/[,，"'`]/g, " ")
      .replace(/[\\/:*?<>|]+/g, " ")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "education_title"
  );
}

export function createDownloadName(title: string, outputType: OutputType) {
  const suffix: Record<OutputType, string> = {
    "decorated-title": "01_꾸민제목_선택안",
    "title-only": "02_제목만_투명",
    "icons-only": "03_아이콘만_투명"
  };

  return `${createSafeBaseName(title)}_${suffix[outputType]}.png`;
}

export async function prepareFinalPng(dataUrl: string, size: ImageSize) {
  const transparentDataUrl = await removeLightBackground(dataUrl);
  const resizedDataUrl = await resizeToExactCanvas(transparentDataUrl, size);
  return setPngDpi(resizedDataUrl, 300);
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadGeneratedImage(dataUrl: string, fileName: string, size: ImageSize) {
  const finalDataUrl = await prepareFinalPng(dataUrl, size);
  downloadDataUrl(finalDataUrl, fileName);
}

export function removeLightBackground(dataUrl: string, lightCutoff = 246) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        reject(new Error("이미지를 투명 처리할 수 없습니다."));
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const minChannel = Math.min(red, green, blue);
        const maxChannel = Math.max(red, green, blue);
        const chroma = maxChannel - minChannel;

        if (minChannel >= lightCutoff && chroma <= 18) {
          data[index + 3] = 0;
        } else if (minChannel >= 235 && chroma <= 14) {
          const keepRatio = Math.max(0, Math.min(1, (lightCutoff - minChannel) / (lightCutoff - 235)));
          data[index + 3] = Math.round(data[index + 3] * keepRatio);
        }
      }

      context.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("생성 이미지를 불러올 수 없습니다."));
    image.src = dataUrl;
  });
}

export function resizeToExactCanvas(dataUrl: string, size: ImageSize) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const { width, height } = parseImageSize(size);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("이미지 크기를 조정할 수 없습니다."));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const padding = Math.max(20, Math.round(Math.min(width, height) * 0.05));
      const availableWidth = width - padding * 2;
      const availableHeight = height - padding * 2;
      const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
      const drawWidth = Math.round(image.width * scale);
      const drawHeight = Math.round(image.height * scale);
      const x = Math.round((width - drawWidth) / 2);
      const y = Math.round((height - drawHeight) / 2);

      context.drawImage(image, x, y, drawWidth, drawHeight);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("생성 이미지를 불러올 수 없습니다."));
    image.src = dataUrl;
  });
}

export function setPngDpi(dataUrl: string, dpi = 300) {
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return dataUrl;
  }

  try {
    const pixelsPerMeter = Math.round(dpi / 0.0254);
    const png = base64ToBytes(dataUrl.split(",")[1]);
    const physData = new Uint8Array(9);
    writeUint32(physData, 0, pixelsPerMeter);
    writeUint32(physData, 4, pixelsPerMeter);
    physData[8] = 1;
    const physChunk = makePngChunk("pHYs", physData);
    const rewritten = insertOrReplacePhysChunk(png, physChunk);
    return `data:image/png;base64,${bytesToBase64(rewritten)}`;
  } catch {
    return dataUrl;
  }
}

export function dataUrlToBytes(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",");
  return base64ToBytes(base64);
}

export function bytesToDataUrl(bytes: Uint8Array) {
  return `data:image/png;base64,${bytesToBase64(bytes)}`;
}

function insertOrReplacePhysChunk(png: Uint8Array, physChunk: Uint8Array) {
  const signatureLength = 8;
  let offset = signatureLength;
  const chunks: Uint8Array[] = [png.slice(0, signatureLength)];
  let inserted = false;

  while (offset + 12 <= png.length) {
    const length = readUint32(png, offset);
    const type = bytesToAscii(png.slice(offset + 4, offset + 8));
    const chunkEnd = offset + 12 + length;

    if (chunkEnd > png.length) {
      return png;
    }

    if (type === "pHYs" && !inserted) {
      chunks.push(physChunk);
      inserted = true;
    } else if (type !== "pHYs") {
      chunks.push(png.slice(offset, chunkEnd));
      if (type === "IHDR" && !inserted) {
        chunks.push(physChunk);
        inserted = true;
      }
    }

    offset = chunkEnd;
  }

  if (!inserted) {
    chunks.splice(1, 0, physChunk);
  }

  return concatBytes(chunks);
}

function makePngChunk(type: string, data: Uint8Array) {
  const typeBytes = asciiToBytes(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(concatBytes([typeBytes, data])));
  return chunk;
}

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function asciiToBytes(value: string) {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function bytesToAscii(bytes: Uint8Array) {
  return String.fromCharCode(...bytes);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return btoa(binary);
}
