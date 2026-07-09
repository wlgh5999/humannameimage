import type { OutputType } from "@/lib/generativeTypes";

const transparentOutputTypes: OutputType[] = ["title-transparent", "title-decorated-transparent", "icons-transparent"];

export function createDownloadName(title: string, outputType: OutputType) {
  const suffix: Record<OutputType, string> = {
    "title-transparent": "제목_글씨만_투명_300dpi",
    "title-decorated-transparent": "꾸민제목_투명_300dpi",
    "icons-transparent": "아이콘모음_투명_300dpi"
  };
  const base =
    title
      .normalize("NFC")
      .replace(/[,，]/g, " ")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "education_image";

  return `${base}_${suffix[outputType]}.png`;
}

export async function downloadGeneratedImage(dataUrl: string, fileName: string, outputType: OutputType) {
  const transparentDataUrl = transparentOutputTypes.includes(outputType)
    ? await removeLightBackground(dataUrl)
    : dataUrl;
  const finalDataUrl = setPngDpi(transparentDataUrl, 300);
  const link = document.createElement("a");
  link.href = finalDataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
    } else if (type === "pHYs") {
      // Drop duplicate pHYs chunks after writing our 300dpi metadata.
    } else {
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

function crc32(bytes: Uint8Array) {
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
