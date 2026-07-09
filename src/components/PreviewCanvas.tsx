"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DecorationLayer } from "@/components/DecorationLayer";
import type { Palette } from "@/lib/colorThemes";
import { splitTitle } from "@/lib/splitTitle";
import { fontFamilies, templateMap } from "@/lib/templates";
import type { ExportMode, GeneratorSettings, OutputSize } from "@/lib/types";

interface PreviewCanvasProps {
  settings: GeneratorSettings;
  palette: Palette;
  outputSize: OutputSize;
  backgroundColor: string;
  exportMode: ExportMode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

type ColorRole = "main" | "accent" | "text";

interface TextRule {
  text: string;
  role: ColorRole;
}

export function PreviewCanvas({
  settings,
  palette,
  outputSize,
  backgroundColor,
  exportMode,
  canvasRef
}: PreviewCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.45);
  const template = templateMap[settings.templateId];
  const fontFamily =
    fontFamilies.find((font) => font.id === settings.fontFamilyId)?.cssValue ??
    fontFamilies[0].cssValue;
  const forceTransparent = exportMode === "transparent";
  const showDecoration =
    settings.decoration !== "none" && (exportMode === "preview" || exportMode === "decorated");
  const canvasBackground = forceTransparent ? "transparent" : backgroundColor;

  const titleLines = useMemo(
    () => getResolvedTitleLines(settings.title, settings.lineMode, outputSize),
    [settings.title, settings.lineMode, outputSize]
  );

  const emphasisRules = useMemo(
    () => createEmphasisRules(settings.title, settings.highlightWords, template.emphasisMode),
    [settings.title, settings.highlightWords, template.emphasisMode]
  );

  const titleFontSize = useMemo(
    () => getTitleFontSize(titleLines, outputSize, template.maxTitleWidthRatio),
    [titleLines, outputSize, template.maxTitleWidthRatio]
  );

  const subtitleFontSize = Math.max(
    outputSize.width >= 1400 ? 30 : 24,
    Math.min(Math.round(titleFontSize * 0.34), outputSize.height >= 900 ? 40 : 34)
  );

  useEffect(() => {
    const updateScale = () => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const availableWidth = Math.max(viewport.clientWidth - 32, 240);
      const maxHeight = Math.min(window.innerHeight * 0.66, 660);
      const nextScale = Math.min(availableWidth / outputSize.width, maxHeight / outputSize.height, 1);
      setScale(Math.max(nextScale, 0.22));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);

    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }

    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [outputSize]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 rounded-lg border border-white/70 bg-white/70 p-4 shadow-soft backdrop-blur md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-[-0.03em] text-slate-800">실시간 미리보기</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            실제 PNG 크기: {outputSize.width} x {outputSize.height}px
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-900 px-3 py-1.5 text-white">
            {forceTransparent || backgroundColor === "transparent" ? "투명 배경" : "배경 있음"}
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
            {showDecoration ? "장식 포함" : "제목 중심"}
          </span>
        </div>
      </div>

      <div ref={viewportRef} className="checkerboard flex min-h-[280px] flex-1 items-center justify-center overflow-auto rounded-lg border border-slate-200 p-4">
        <div
          style={{
            width: outputSize.width * scale,
            height: outputSize.height * scale
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: outputSize.width,
              height: outputSize.height
            }}
          >
            <div
              ref={canvasRef}
              className="relative isolate flex overflow-hidden"
              data-export-canvas="true"
              style={{
                width: outputSize.width,
                height: outputSize.height,
                backgroundColor: canvasBackground,
                color: palette.text,
                fontFamily
              }}
            >
              {showDecoration ? <DecorationLayer decoration={settings.decoration} palette={palette} /> : null}
              <div
                className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center"
                style={{
                  padding: `${Math.round(outputSize.height * 0.12)}px ${Math.round(
                    outputSize.width * 0.1
                  )}px`
                }}
              >
                <div
                  className="max-w-full font-black"
                  style={{
                    fontSize: titleFontSize,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                    maxWidth: outputSize.width * template.maxTitleWidthRatio
                  }}
                >
                  {titleLines.map((line, index) => (
                    <div key={`${line}-${index}`} className="whitespace-pre">
                      {renderColoredText(line, emphasisRules, palette)}
                    </div>
                  ))}
                </div>

                {settings.subtitle.trim() ? (
                  <div
                    className="mt-7 font-semibold tracking-[-0.02em]"
                    style={{
                      color: palette.text,
                      fontSize: subtitleFontSize,
                      lineHeight: 1.35,
                      opacity: 0.78,
                      maxWidth: outputSize.width * 0.72
                    }}
                  >
                    {settings.subtitle}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getResolvedTitleLines(title: string, lineMode: GeneratorSettings["lineMode"], outputSize: OutputSize) {
  const requestedCount = lineMode === "auto" ? "auto" : (Number(lineMode) as 1 | 2 | 3);
  let lines = splitTitle(title, requestedCount);

  if (lineMode !== "auto") {
    const selectedCount = Number(lineMode) as 1 | 2 | 3;
    const fontSize = getTitleFontSize(lines, outputSize, 0.78);

    if (fontSize <= 49 && selectedCount < 3 && !title.includes("\n")) {
      lines = splitTitle(title, (selectedCount + 1) as 2 | 3);
    }
  }

  return lines;
}

function getTitleFontSize(lines: string[], outputSize: OutputSize, maxWidthRatio: number) {
  const lineCount = Math.min(Math.max(lines.length, 1), 3) as 1 | 2 | 3;
  const maxByLineCount: Record<1 | 2 | 3, number> = {
    1: 96,
    2: 88,
    3: 76
  };
  const sizeScale = outputSize.width < 1200 ? outputSize.width / 1600 : 1;
  const maxFontSize = Math.round(maxByLineCount[lineCount] * Math.max(sizeScale, 0.62));
  const longestLineLength = Math.max(...lines.map((line) => visibleLength(line)), 1);
  const allowedWidth = outputSize.width * maxWidthRatio;
  const estimatedByWidth = Math.floor(allowedWidth / (longestLineLength * 0.86));
  const verticalReserve = outputSize.height * 0.62;
  const estimatedByHeight = Math.floor(verticalReserve / (lineCount * 1.1));

  return clamp(Math.min(maxFontSize, estimatedByWidth, estimatedByHeight), 48, maxByLineCount[lineCount]);
}

function createEmphasisRules(
  title: string,
  customWords: string,
  emphasisMode: "afterCommaPhrase" | "communityAction" | "lastAction"
): TextRule[] {
  const customRules = customWords
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean)
    .map((text) => ({ text, role: "accent" as const }));

  if (customRules.length > 0) {
    return customRules;
  }

  const [beforeComma, afterComma] = title.split(/[,，]/).map((part) => part.trim());
  const rules: TextRule[] = [];

  if (beforeComma) {
    rules.push({ text: stripTrailingParticles(beforeComma), role: "main" });
  }

  if (afterComma) {
    const words = afterComma.split(/\s+/).filter(Boolean);

    if (emphasisMode === "communityAction") {
      if (words[0]) {
        rules.push({ text: stripTrailingParticles(words[0]), role: "main" });
      }

      if (words.length > 1) {
        rules.push({ text: stripTrailingParticles(words[words.length - 1]), role: "accent" });
      }
    } else if (emphasisMode === "lastAction") {
      if (words[0]) {
        rules.push({ text: stripTrailingParticles(words[0]), role: "main" });
      }

      if (words.length > 1) {
        rules.push({ text: stripTrailingParticles(words.slice(1).join(" ")), role: "accent" });
      }
    } else {
      const phrase = stripTrailingParticles(words.slice(0, Math.min(words.length, 2)).join(" "));
      const rest = words.slice(2).join(" ");

      if (phrase) {
        rules.push({ text: phrase, role: "accent" });
      }

      if (rest) {
        rules.push({ text: stripTrailingParticles(rest), role: "text" });
      }
    }
  } else {
    const words = title.split(/\s+/).filter(Boolean);
    const lastWord = stripTrailingParticles(words[words.length - 1] ?? "");

    if (lastWord && words.length > 1) {
      rules.push({ text: lastWord, role: "accent" });
    }
  }

  return uniqueRules(rules.filter((rule) => rule.text.length > 0));
}

function renderColoredText(line: string, rules: TextRule[], palette: Palette) {
  const segments = splitByRules(line, rules);

  return segments.map((segment, index) => {
    const color =
      segment.role === "main" ? palette.main : segment.role === "accent" ? palette.sub : palette.text;

    return (
      <span key={`${segment.text}-${index}`} style={{ color }}>
        {segment.text}
      </span>
    );
  });
}

function splitByRules(line: string, rules: TextRule[]) {
  const sortedRules = [...rules].sort((a, b) => b.text.length - a.text.length);
  const segments: Array<{ text: string; role: ColorRole }> = [];
  let cursor = 0;

  while (cursor < line.length) {
    const candidates = sortedRules
      .map((rule) => ({ rule, index: line.indexOf(rule.text, cursor) }))
      .filter((candidate) => candidate.index !== -1)
      .sort((a, b) => a.index - b.index || b.rule.text.length - a.rule.text.length);
    const next = candidates[0];

    if (!next) {
      segments.push({ text: line.slice(cursor), role: "text" });
      break;
    }

    if (next.index > cursor) {
      segments.push({ text: line.slice(cursor, next.index), role: "text" });
    }

    segments.push({ text: next.rule.text, role: next.rule.role });
    cursor = next.index + next.rule.text.length;
  }

  return segments;
}

function stripTrailingParticles(value: string) {
  return value
    .replace(/[,.!?，。！？:;]+$/g, "")
    .replace(/(으로|로|을|를|은|는|이|가)$/g, "")
    .trim();
}

function uniqueRules(rules: TextRule[]) {
  const seen = new Set<string>();

  return rules.filter((rule) => {
    const key = `${rule.text}-${rule.role}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function visibleLength(value: string) {
  return value.replace(/\s+/g, "").length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
