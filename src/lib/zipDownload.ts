import { createSafeBaseName, crc32, dataUrlToBytes } from "@/lib/imageDownload";
import type { GeneratedIconAsset, GeneratedImage, OutputType } from "@/lib/generativeTypes";

type ZipImage = {
  outputType: OutputType;
  dataUrl: string;
};

const fileNames: Record<OutputType, string> = {
  "decorated-title": "01_꾸민제목_선택안.png",
  "title-only": "02_제목만_투명.png",
  "icons-only": "03_아이콘만_투명.png"
};

export function downloadImageZip(title: string, images: ZipImage[]) {
  if (images.length === 0) {
    throw new Error("ZIP으로 묶을 이미지가 없습니다.");
  }

  const files = images.map((image) => ({
    name: fileNames[image.outputType],
    bytes: dataUrlToBytes(image.dataUrl)
  }));
  downloadZipFiles(`${createSafeBaseName(title)}_제목이미지_3종.zip`, files);
}

export function downloadIconZip(title: string, folderName: "actual-icons" | "recommended-icons", icons: GeneratedIconAsset[]) {
  if (icons.length === 0) {
    throw new Error("ZIP으로 묶을 아이콘이 없습니다.");
  }

  downloadZipFiles(
    `${createSafeBaseName(title)}_${folderName === "actual-icons" ? "실제사용아이콘" : "추천아이콘"}.zip`,
    icons.map((icon) => ({
      name: `${folderName}/${icon.fileName}`,
      bytes: dataUrlToBytes(icon.imageDataUrl)
    }))
  );
}

export function downloadAllIconsZip(title: string, actualIcons: GeneratedIconAsset[], recommendedIcons: GeneratedIconAsset[]) {
  const files = [
    ...actualIcons.map((icon) => ({ name: `actual-icons/${icon.fileName}`, bytes: dataUrlToBytes(icon.imageDataUrl) })),
    ...recommendedIcons.map((icon) => ({
      name: `recommended-icons/${icon.fileName}`,
      bytes: dataUrlToBytes(icon.imageDataUrl)
    }))
  ];

  if (files.length === 0) {
    throw new Error("ZIP으로 묶을 아이콘이 없습니다.");
  }

  downloadZipFiles(`${createSafeBaseName(title)}_아이콘전체.zip`, files);
}

export function downloadFinalZip({
  title,
  decoratedTitle,
  titleOnly,
  actualIcons,
  recommendedIcons
}: {
  title: string;
  decoratedTitle: GeneratedImage;
  titleOnly: GeneratedImage;
  actualIcons: GeneratedIconAsset[];
  recommendedIcons: GeneratedIconAsset[];
}) {
  downloadZipFiles(`${createSafeBaseName(title)}_최종결과.zip`, [
    {
      name: "01_꾸민제목_투명.png",
      bytes: dataUrlToBytes(decoratedTitle.imageDataUrl)
    },
    {
      name: "02_제목만_투명.png",
      bytes: dataUrlToBytes(titleOnly.imageDataUrl)
    },
    ...actualIcons.map((icon) => ({
      name: `actual-icons/${icon.fileName.replace(/^actual_/, "")}`,
      bytes: dataUrlToBytes(icon.imageDataUrl)
    })),
    ...recommendedIcons.map((icon) => ({
      name: `recommended-icons/${icon.fileName.replace(/^recommended_/, "")}`,
      bytes: dataUrlToBytes(icon.imageDataUrl)
    }))
  ]);
}

export function downloadZipFiles(fileName: string, files: Array<{ name: string; bytes: Uint8Array }>) {
  const zipBytes = createStoredZip(files);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createStoredZip(files: Array<{ name: string; bytes: Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const checksum = crc32(file.bytes);
    const localHeader = createLocalFileHeader(nameBytes, file.bytes, checksum);
    const centralHeader = createCentralDirectoryHeader(nameBytes, file.bytes, checksum, offset);

    localParts.push(localHeader, file.bytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + file.bytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = createEndOfCentralDirectory(files.length, centralDirectory.length, offset);

  return concatBytes([...localParts, centralDirectory, end]);
}

function createLocalFileHeader(nameBytes: Uint8Array, bytes: Uint8Array, checksum: number) {
  const header = new Uint8Array(30 + nameBytes.length);
  writeUint32LE(header, 0, 0x04034b50);
  writeUint16LE(header, 4, 20);
  writeUint16LE(header, 6, 0x0800);
  writeUint16LE(header, 8, 0);
  writeUint16LE(header, 10, 0);
  writeUint16LE(header, 12, 0);
  writeUint32LE(header, 14, checksum);
  writeUint32LE(header, 18, bytes.length);
  writeUint32LE(header, 22, bytes.length);
  writeUint16LE(header, 26, nameBytes.length);
  writeUint16LE(header, 28, 0);
  header.set(nameBytes, 30);
  return header;
}

function createCentralDirectoryHeader(nameBytes: Uint8Array, bytes: Uint8Array, checksum: number, localOffset: number) {
  const header = new Uint8Array(46 + nameBytes.length);
  writeUint32LE(header, 0, 0x02014b50);
  writeUint16LE(header, 4, 20);
  writeUint16LE(header, 6, 20);
  writeUint16LE(header, 8, 0x0800);
  writeUint16LE(header, 10, 0);
  writeUint16LE(header, 12, 0);
  writeUint16LE(header, 14, 0);
  writeUint32LE(header, 16, checksum);
  writeUint32LE(header, 20, bytes.length);
  writeUint32LE(header, 24, bytes.length);
  writeUint16LE(header, 28, nameBytes.length);
  writeUint16LE(header, 30, 0);
  writeUint16LE(header, 32, 0);
  writeUint16LE(header, 34, 0);
  writeUint16LE(header, 36, 0);
  writeUint32LE(header, 38, 0);
  writeUint32LE(header, 42, localOffset);
  header.set(nameBytes, 46);
  return header;
}

function createEndOfCentralDirectory(fileCount: number, centralSize: number, centralOffset: number) {
  const header = new Uint8Array(22);
  writeUint32LE(header, 0, 0x06054b50);
  writeUint16LE(header, 4, 0);
  writeUint16LE(header, 6, 0);
  writeUint16LE(header, 8, fileCount);
  writeUint16LE(header, 10, fileCount);
  writeUint32LE(header, 12, centralSize);
  writeUint32LE(header, 16, centralOffset);
  writeUint16LE(header, 20, 0);
  return header;
}

function writeUint16LE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => chunk.length + sum, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}
