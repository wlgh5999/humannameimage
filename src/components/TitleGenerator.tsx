"use client";

import { flushSync } from "react-dom";
import { useMemo, useRef, useState } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { colorThemeMap } from "@/lib/colorThemes";
import { downloadNodeAsPng, createPngFileName } from "@/lib/downloadImage";
import type { ExportMode, GeneratorSettings, OutputSize, OutputSizePreset } from "@/lib/types";

const outputSizeMap: Record<Exclude<OutputSizePreset, "custom">, OutputSize> = {
  wide: { width: 1600, height: 600 },
  thumbnail: { width: 960, height: 360 },
  square: { width: 1080, height: 1080 }
};

const initialSettings: GeneratorSettings = {
  title: "사례관리, 상담 기술로 전문성을 더하다",
  subtitle: "좋은 상담은 좋은 관계에서 시작됩니다",
  templateId: "counseling",
  lineMode: "2",
  colorThemeId: "blueRose",
  customPalette: {
    main: "#5F8F8B",
    sub: "#F2B38A",
    accent: "#93B46E",
    background: "#F8F4EC",
    text: "#2F3A40"
  },
  highlightWords: "",
  decoration: "bubble",
  backgroundChoice: "transparent",
  customBackground: "#F8F4EC",
  outputSizePreset: "wide",
  customSize: { width: 1600, height: 600 },
  trimTransparent: true,
  fontFamilyId: "pretendard"
};

export function TitleGenerator() {
  const [settings, setSettings] = useState<GeneratorSettings>(initialSettings);
  const [exportMode, setExportMode] = useState<ExportMode>("preview");
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const palette = useMemo(() => {
    if (settings.colorThemeId === "custom") {
      return settings.customPalette;
    }

    return colorThemeMap[settings.colorThemeId]?.colors ?? colorThemeMap.blueRose.colors;
  }, [settings.colorThemeId, settings.customPalette]);

  const outputSize = useMemo(() => {
    if (settings.outputSizePreset === "custom") {
      return {
        width: clampSize(settings.customSize.width),
        height: clampSize(settings.customSize.height)
      };
    }

    return outputSizeMap[settings.outputSizePreset];
  }, [settings.customSize, settings.outputSizePreset]);

  const backgroundColor = useMemo(() => {
    if (settings.backgroundChoice === "transparent") {
      return "transparent";
    }

    if (settings.backgroundChoice === "white") {
      return "#FFFFFF";
    }

    if (settings.backgroundChoice === "custom") {
      return settings.customBackground;
    }

    return palette.background;
  }, [palette.background, settings.backgroundChoice, settings.customBackground]);

  const downloadVariant = async (mode: Exclude<ExportMode, "preview">) => {
    const node = canvasRef.current;

    if (!node) {
      return;
    }

    setIsDownloading(true);

    try {
      flushSync(() => setExportMode(mode));
      await waitForPaint();

      const transparent = mode === "transparent" || backgroundColor === "transparent";
      const suffix = mode === "transparent" ? "투명" : mode === "decorated" ? "장식포함" : undefined;

      await downloadNodeAsPng(node, {
        fileName: createPngFileName(settings.title, suffix),
        width: outputSize.width,
        height: outputSize.height,
        backgroundColor,
        transparent,
        trimTransparent: transparent && settings.trimTransparent
      });
    } finally {
      flushSync(() => setExportMode("preview"));
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-4 md:flex-row">
        <ControlPanel
          isDownloading={isDownloading}
          settings={settings}
          setSettings={setSettings}
          onDownloadDecorated={() => downloadVariant("decorated")}
          onDownloadTitle={() => downloadVariant("title")}
          onDownloadTransparent={() => downloadVariant("transparent")}
        />
        <PreviewCanvas
          backgroundColor={backgroundColor}
          canvasRef={canvasRef}
          exportMode={exportMode}
          outputSize={outputSize}
          palette={palette}
          settings={settings}
        />
      </div>
    </main>
  );
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function clampSize(value: number) {
  return Math.min(Math.max(Math.round(value), 240), 4000);
}
