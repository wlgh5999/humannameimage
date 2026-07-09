"use client";

import type { Palette } from "@/lib/colorThemes";
import { colorThemes } from "@/lib/colorThemes";
import {
  decorationLabels,
  fontFamilies,
  templateThemeMap,
  templates,
  type DecorationChoice,
  type TemplateId
} from "@/lib/templates";
import type { BackgroundChoice, GeneratorSettings, LineMode, OutputSizePreset } from "@/lib/types";

interface ControlPanelProps {
  settings: GeneratorSettings;
  setSettings: React.Dispatch<React.SetStateAction<GeneratorSettings>>;
  onDownloadTitle: () => void;
  onDownloadTransparent: () => void;
  onDownloadDecorated: () => void;
  isDownloading: boolean;
}

const lineModes: Array<{ value: LineMode; label: string }> = [
  { value: "1", label: "1줄" },
  { value: "2", label: "2줄" },
  { value: "3", label: "3줄" },
  { value: "auto", label: "자동" }
];

const decorations: DecorationChoice[] = ["heart", "leaf", "curve", "dotted", "bubble", "star", "none"];

const backgroundOptions: Array<{ value: BackgroundChoice; label: string }> = [
  { value: "transparent", label: "완전 투명" },
  { value: "white", label: "흰색" },
  { value: "beige", label: "연한 베이지" },
  { value: "custom", label: "사용자 지정" }
];

const sizePresets: Array<{ value: OutputSizePreset; label: string; detail: string }> = [
  { value: "wide", label: "가로형", detail: "1600 x 600" },
  { value: "thumbnail", label: "썸네일용", detail: "960 x 360" },
  { value: "square", label: "정사각형용", detail: "1080 x 1080" },
  { value: "custom", label: "사용자 지정", detail: "직접 입력" }
];

export function ControlPanel({
  settings,
  setSettings,
  onDownloadTitle,
  onDownloadTransparent,
  onDownloadDecorated,
  isDownloading
}: ControlPanelProps) {
  const update = <Key extends keyof GeneratorSettings>(key: Key, value: GeneratorSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updatePalette = (key: keyof Palette, value: string) => {
    setSettings((current) => ({
      ...current,
      customPalette: {
        ...current.customPalette,
        [key]: value
      }
    }));
  };

  const selectTemplate = (templateId: TemplateId) => {
    setSettings((current) => ({
      ...current,
      templateId,
      colorThemeId: current.colorThemeId === "custom" ? current.colorThemeId : templateThemeMap[templateId],
      decoration: current.decoration === "none" ? current.decoration : templates.find((template) => template.id === templateId)?.defaultDecoration ?? current.decoration
    }));
  };

  return (
    <aside className="soft-scrollbar max-h-none overflow-auto rounded-lg border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur md:max-h-[calc(100vh-48px)] md:w-[430px] md:shrink-0 md:p-5">
      <div className="mb-5">
        <p className="text-sm font-bold text-[#5F8F8B]">교육 홍보물용</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">제목 PNG 생성기</h1>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label text="샘플 데이터" />
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#6C7A9C] hover:text-[#6C7A9C]"
                type="button"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    title: "사례관리, 상담 기술로 전문성을 더하다",
                    subtitle: "좋은 상담은 좋은 관계에서 시작됩니다",
                    templateId: "counseling",
                    colorThemeId: "blueRose",
                    lineMode: "2",
                    decoration: "bubble"
                  }))
                }
              >
                예시 1
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#5F8F8B] hover:text-[#5F8F8B]"
                type="button"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    title: "외로움의 시대, 주민조직화로 답하다",
                    subtitle: "사람과 사람을 다시 연결하는 실천",
                    templateId: "community",
                    colorThemeId: "tealCoral",
                    lineMode: "2",
                    decoration: "heart"
                  }))
                }
              >
                예시 2
              </button>
            </div>
          </div>

          <div>
            <Label text="교육명" />
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-base font-semibold leading-6 tracking-[-0.02em] text-slate-800 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              value={settings.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="예: 사례관리, 상담 기술로 전문성을 더하다"
            />
          </div>

          <div>
            <Label text="부제 또는 한 줄 카피" optional />
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              value={settings.subtitle}
              onChange={(event) => update("subtitle", event.target.value)}
              placeholder="예: 좋은 상담은 좋은 관계에서 시작됩니다"
            />
          </div>
        </section>

        <section>
          <Label text="템플릿 선택" />
          <div className="mt-2 grid gap-2">
            {templates.map((template) => {
              const active = settings.templateId === template.id;

              return (
                <button
                  key={template.id}
                  className={`rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? "border-[#5F8F8B] bg-[#F8F4EC] shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-extrabold tracking-[-0.03em] text-slate-800">{template.label}</span>
                    <span className="text-xs font-bold text-slate-400">{template.mood}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{template.usage}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div>
            <Label text="줄 수" />
            <select
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              value={settings.lineMode}
              onChange={(event) => update("lineMode", event.target.value as LineMode)}
            >
              {lineModes.map((lineMode) => (
                <option key={lineMode.value} value={lineMode.value}>
                  {lineMode.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label text="제목 폰트" />
            <select
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              value={settings.fontFamilyId}
              onChange={(event) => update("fontFamilyId", event.target.value)}
            >
              {fontFamilies.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <Label text="색상 테마" />
          <div className="mt-2 grid grid-cols-1 gap-2">
            {colorThemes.map((theme) => (
              <button
                key={theme.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                  settings.colorThemeId === theme.id
                    ? "border-[#5F8F8B] bg-white shadow-sm"
                    : "border-slate-200 bg-white/80 hover:border-slate-300"
                }`}
                type="button"
                onClick={() => update("colorThemeId", theme.id)}
              >
                <span>
                  <span className="block text-sm font-extrabold text-slate-700">{theme.label}</span>
                  <span className="block text-xs font-medium text-slate-400">{theme.description}</span>
                </span>
                <span className="flex gap-1.5">
                  {Object.values(theme.colors).slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>

          {settings.colorThemeId === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <ColorInput label="메인" value={settings.customPalette.main} onChange={(value) => updatePalette("main", value)} />
              <ColorInput label="서브" value={settings.customPalette.sub} onChange={(value) => updatePalette("sub", value)} />
              <ColorInput label="포인트" value={settings.customPalette.accent} onChange={(value) => updatePalette("accent", value)} />
              <ColorInput label="텍스트" value={settings.customPalette.text} onChange={(value) => updatePalette("text", value)} />
            </div>
          ) : null}
        </section>

        <section className="grid gap-3">
          <div>
            <Label text="강조 단어" optional />
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              value={settings.highlightWords}
              onChange={(event) => update("highlightWords", event.target.value)}
              placeholder="쉼표로 구분, 비우면 자동 강조"
            />
          </div>

          <div>
            <Label text="장식 요소" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {decorations.map((decoration) => (
                <button
                  key={decoration}
                  className={`rounded-lg border px-2 py-2 text-sm font-bold transition ${
                    settings.decoration === decoration
                      ? "border-[#5F8F8B] bg-[#F8F4EC] text-[#2F3A40]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                  type="button"
                  onClick={() => update("decoration", decoration)}
                >
                  {decorationLabels[decoration]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <Label text="배경 선택" />
          <div className="grid grid-cols-2 gap-2">
            {backgroundOptions.map((option) => (
              <button
                key={option.value}
                className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                  settings.backgroundChoice === option.value
                    ? "border-[#5F8F8B] bg-[#F8F4EC] text-[#2F3A40]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
                type="button"
                onClick={() => update("backgroundChoice", option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {settings.backgroundChoice === "custom" ? (
            <ColorInput
              label="배경색"
              value={settings.customBackground}
              onChange={(value) => update("customBackground", value)}
            />
          ) : null}
        </section>

        <section className="grid gap-3">
          <Label text="출력 크기" />
          <div className="grid grid-cols-2 gap-2">
            {sizePresets.map((preset) => (
              <button
                key={preset.value}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${
                  settings.outputSizePreset === preset.value
                    ? "border-[#5F8F8B] bg-white shadow-sm"
                    : "border-slate-200 bg-white/80 hover:border-slate-300"
                }`}
                type="button"
                onClick={() => update("outputSizePreset", preset.value)}
              >
                <span className="block text-sm font-extrabold text-slate-700">{preset.label}</span>
                <span className="block text-xs font-bold text-slate-400">{preset.detail}</span>
              </button>
            ))}
          </div>

          {settings.outputSizePreset === "custom" ? (
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="가로(px)"
                value={settings.customSize.width}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    customSize: { ...current.customSize, width: value }
                  }))
                }
              />
              <NumberInput
                label="세로(px)"
                value={settings.customSize.height}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    customSize: { ...current.customSize, height: value }
                  }))
                }
              />
            </div>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600">
            <input
              checked={settings.trimTransparent}
              className="h-4 w-4 accent-[#5F8F8B]"
              type="checkbox"
              onChange={(event) => update("trimTransparent", event.target.checked)}
            />
            투명 여백 자동 제거
          </label>
        </section>

        <section className="grid gap-2 border-t border-slate-200 pt-5">
          <button
            className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            disabled={isDownloading}
            type="button"
            onClick={onDownloadTitle}
          >
            제목 PNG 다운로드
          </button>
          <button
            className="rounded-lg bg-[#5F8F8B] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#527d79] disabled:cursor-wait disabled:opacity-60"
            disabled={isDownloading}
            type="button"
            onClick={onDownloadTransparent}
          >
            투명 PNG 다운로드
          </button>
          <button
            className="rounded-lg bg-[#C98B7B] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#b67968] disabled:cursor-wait disabled:opacity-60"
            disabled={isDownloading}
            type="button"
            onClick={onDownloadDecorated}
          >
            장식 포함 PNG 다운로드
          </button>
        </section>
      </div>
    </aside>
  );
}

function Label({ text, optional = false }: { text: string; optional?: boolean }) {
  return (
    <label className="text-sm font-extrabold tracking-[-0.02em] text-slate-700">
      {text}
      {optional ? <span className="ml-1 text-xs font-bold text-slate-400">선택</span> : null}
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
      {label}
      <input className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs font-bold text-slate-500">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
        min={240}
        type="number"
        value={value}
        onChange={(event) => onChange(Math.max(Number(event.target.value), 240))}
      />
    </label>
  );
}
