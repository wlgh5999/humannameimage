"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultImageSize,
  outputOrder,
  outputTypeDescriptionMap,
  outputTypeLabelMap,
  sizeOptions
} from "@/lib/generativeOptions";
import type {
  EducationImageForm,
  GeneratedImage,
  GeneratedPromptSet,
  ImageSize,
  OutputType
} from "@/lib/generativeTypes";
import { createDownloadName, downloadDataUrl, prepareFinalPng } from "@/lib/imageDownload";
import { downloadImageZip } from "@/lib/zipDownload";

const sampleOne: EducationImageForm = {
  title: "사례관리, 상담 기술로 전문성을 더하다",
  promotionCopy:
    "좋은 상담은 좋은 관계에서 시작됩니다. 사례관리 현장에서 바로 활용할 수 있는 질문과 경청의 실천 기술을 다룹니다.",
  topics: [
    "사회복지 상담의 본질과 관계 중심 실천",
    "사례관리에 활용되는 질문과 경청 기술",
    "변화를 만드는 상담 대화 구조"
  ],
  audiences: [
    "사례관리 과정에서 상담을 더 자신 있게 적용하고 싶은 분",
    "당사자와의 만남을 살아 있는 관계로 만들고 싶은 분",
    "현장 상담의 전문성과 따뜻함을 함께 키우고 싶은 분"
  ],
  outputType: "decorated-title",
  textMode: "with-text",
  quality: "high",
  size: defaultImageSize,
  styleSeed: 1
};

const sampleTwo: EducationImageForm = {
  title: "외로움의 시대, 주민조직화로 답하다",
  promotionCopy: "사람과 사람을 다시 연결하는 실천을 통해 지역 안에서 외로움과 사회적 고립을 함께 다룹니다.",
  topics: [
    "외로움과 사회적 고립을 현장에서 바라보는 관점",
    "주민조직화로 만드는 관계망과 상호돌봄",
    "사람과 사람을 다시 연결하는 실천 사례"
  ],
  audiences: [
    "사회적 고립과 외로움 대응을 새로운 실천 과제로 고민하는 분",
    "주민과의 관계를 세우고 지속 가능한 관계망을 만들고 싶은 분",
    "지역 안에서 사람중심 실천의 다음 접근을 찾는 분"
  ],
  outputType: "decorated-title",
  textMode: "with-text",
  quality: "high",
  size: defaultImageSize,
  styleSeed: 2
};

type ResultStatus = "idle" | "generating" | "success" | "error";

type ImageResult = {
  outputType: OutputType;
  status: ResultStatus;
  image?: GeneratedImage;
  error?: string;
};

const initialResults = (): Record<OutputType, ImageResult> => ({
  "decorated-title": { outputType: "decorated-title", status: "idle" },
  "title-only": { outputType: "title-only", status: "idle" },
  "icons-only": { outputType: "icons-only", status: "idle" }
});

export function GenerativeImageStudio() {
  const [form, setForm] = useState<EducationImageForm>(sampleOne);
  const [promptSet, setPromptSet] = useState<GeneratedPromptSet | null>(null);
  const [results, setResults] = useState<Record<OutputType, ImageResult>>(initialResults);
  const [dailyCount, setDailyCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const todayKey = useMemo(() => getTodayStorageKey(), []);
  const successfulResults = outputOrder
    .map((outputType) => results[outputType])
    .filter((result): result is ImageResult & { image: GeneratedImage } => Boolean(result.image));

  useEffect(() => {
    const storedCount = Number(window.localStorage.getItem(todayKey) ?? "0");
    setDailyCount(Number.isFinite(storedCount) ? storedCount : 0);
  }, [todayKey]);

  const updateField = <Key extends keyof EducationImageForm>(key: Key, value: EducationImageForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const generateImageSet = async () => {
    const normalizedForm = normalizeForm(form, true);
    validateForm(normalizedForm);
    setForm(normalizedForm);
    setError("");
    setWarning("");
    setPromptSet(null);
    setResults(initialResults());
    setIsGenerating(true);

    try {
      setProgressText("디자인 스펙을 고정하는 중...");
      const promptResponse = await fetch("/api/generate-prompt-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm)
      });
      const promptData = await promptResponse.json();

      if (promptResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!promptResponse.ok) {
        throw new Error(promptData.error ?? "프롬프트 세트 생성에 실패했습니다.");
      }

      const nextPromptSet = promptData.promptSet as GeneratedPromptSet;
      setPromptSet(nextPromptSet);

      for (const [index, outputType] of outputOrder.entries()) {
        const label = outputTypeLabelMap[outputType];
        setProgressText(`${index + 1}/3 ${label} 생성 중...`);
        setResults((current) => ({
          ...current,
          [outputType]: { outputType, status: "generating" }
        }));

        try {
          const image = await requestImage(nextPromptSet, outputType);
          const finalImageDataUrl = await prepareFinalPng(image.imageDataUrl, nextPromptSet.size);
          const processedImage = { ...image, imageDataUrl: finalImageDataUrl };

          setResults((current) => ({
            ...current,
            [outputType]: { outputType, status: "success", image: processedImage }
          }));
        } catch (caught) {
          setResults((current) => ({
            ...current,
            [outputType]: {
              outputType,
              status: "error",
              error: caught instanceof Error ? caught.message : `${label} 생성에 실패했습니다.`
            }
          }));
        }
      }

      setProgressText("완료!");
      const nextCount = dailyCount + 1;
      setDailyCount(nextCount);
      window.localStorage.setItem(todayKey, String(nextCount));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이미지 세트 생성에 실패했습니다.");
      setProgressText("");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateOne = async (outputType: OutputType) => {
    if (!promptSet || isGenerating) {
      return;
    }

    setError("");
    setIsGenerating(true);
    setProgressText(`${outputTypeLabelMap[outputType]} 다시 생성 중...`);
    setResults((current) => ({
      ...current,
      [outputType]: { outputType, status: "generating" }
    }));

    try {
      const image = await requestImage(promptSet, outputType);
      const finalImageDataUrl = await prepareFinalPng(image.imageDataUrl, promptSet.size);
      setResults((current) => ({
        ...current,
        [outputType]: { outputType, status: "success", image: { ...image, imageDataUrl: finalImageDataUrl } }
      }));
      setProgressText("완료!");
    } catch (caught) {
      setResults((current) => ({
        ...current,
        [outputType]: {
          outputType,
          status: "error",
          error: caught instanceof Error ? caught.message : `${outputTypeLabelMap[outputType]} 생성에 실패했습니다.`
        }
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const downloadAll = () => {
    try {
      downloadImageZip(
        form.title,
        successfulResults.map((result) => ({
          outputType: result.outputType,
          dataUrl: result.image.imageDataUrl
        }))
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ZIP 다운로드에 실패했습니다.");
    }
  };

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto grid max-w-[1540px] gap-4 lg:grid-cols-[470px_minmax(0,1fr)]">
        <aside className="soft-scrollbar max-h-none overflow-auto rounded-lg border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur md:max-h-[calc(100vh-48px)] md:p-5">
          <header className="mb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#5F8F8B]">휴먼임팩트 교육 홍보물</p>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">제목 생성기</h1>
              </div>
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-500 transition hover:border-slate-400"
                type="button"
                onClick={logout}
              >
                로그아웃
              </button>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              한 번의 생성으로 같은 디자인 스펙을 공유하는 3종 투명 PNG를 만듭니다.
            </p>
          </header>

          <div className="mb-5 flex gap-2">
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#6C7A9C]" type="button" onClick={() => loadSample(sampleOne)}>
              예시 1
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#5F8F8B]" type="button" onClick={() => loadSample(sampleTwo)}>
              예시 2
            </button>
            <span className="ml-auto rounded-full bg-[#F8F4EC] px-3 py-1.5 text-xs font-extrabold text-slate-600">
              오늘 {dailyCount}세트 생성
            </span>
          </div>

          <div className="space-y-5">
            <FormSection title="교육 정보">
              <TextInput label="교육명" value={form.title} onChange={(value) => updateField("title", value)} />
              <TextArea
                label="홍보문구"
                rows={5}
                value={form.promotionCopy}
                onChange={(value) => updateField("promotionCopy", value)}
              />
            </FormSection>

            <FormSection title="핵심주제">
              <TextArea
                helper="여러 주제를 줄바꿈으로 한 번에 입력하세요."
                label="핵심주제"
                rows={5}
                value={form.topics.join("\n")}
                onChange={(value) => updateField("topics", parseMultilineList(value))}
              />
            </FormSection>

            <FormSection title="대상자">
              <TextArea
                helper="대상자를 줄바꿈으로 한 번에 입력하세요."
                label="이런 분들과 함께하고 싶습니다"
                rows={5}
                value={form.audiences.join("\n")}
                onChange={(value) => updateField("audiences", parseMultilineList(value))}
              />
            </FormSection>

            <FormSection title="출력 크기">
              <div className="grid gap-2">
                {sizeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-extrabold transition ${
                      form.size === option.value
                        ? "border-[#5F8F8B] bg-white text-[#527d79] shadow-sm"
                        : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300"
                    }`}
                    type="button"
                    onClick={() => updateField("size", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="rounded-lg bg-white px-3 py-3 text-xs font-bold leading-5 text-slate-500">
                최종 다운로드 PNG는 선택한 픽셀 크기와 정확히 일치하도록 리사이즈됩니다.
              </p>
            </FormSection>

            <section className="grid gap-2 border-t border-slate-200 pt-5">
              <button
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isGenerating}
                type="button"
                onClick={() => generateImageSet().catch((caught) => setError(caught instanceof Error ? caught.message : "이미지 세트 생성에 실패했습니다."))}
              >
                {isGenerating ? "생성 중..." : "제목 이미지 3종 생성하기"}
              </button>
              {progressText ? (
                <div className="rounded-lg border border-[#5F8F8B]/25 bg-[#F8F4EC] px-3 py-3 text-sm font-extrabold text-slate-700">
                  {progressText}
                </div>
              ) : null}
            </section>
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur md:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">생성 결과</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                3개 결과물은 하나의 디자인 스펙을 공유합니다.
              </p>
            </div>
            <button
              className="rounded-lg bg-[#5F8F8B] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#527d79] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={successfulResults.length === 0}
              type="button"
              onClick={downloadAll}
            >
              3개 모두 ZIP 다운로드
            </button>
          </div>

          {error ? <Notice tone="error">{error}</Notice> : null}
          {warning ? <Notice tone="warning">{warning}</Notice> : null}

          {promptSet ? <PromptSummary promptSet={promptSet} /> : <EmptyPrompt />}

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {outputOrder.map((outputType) => (
              <ResultCard
                key={outputType}
                formTitle={form.title}
                result={results[outputType]}
                size={form.size}
                disabled={isGenerating}
                onRetry={() => regenerateOne(outputType)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );

  function loadSample(sample: EducationImageForm) {
    setForm({ ...sample, topics: [...sample.topics], audiences: [...sample.audiences], styleSeed: Date.now() });
    setPromptSet(null);
    setResults(initialResults());
    setError("");
    setWarning("");
    setProgressText("");
  }
}

async function requestImage(promptSet: GeneratedPromptSet, outputType: OutputType) {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: promptSet.prompts[outputType] })
  });
  const data = await response.json();

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("인증이 만료되었습니다.");
  }

  if (!response.ok) {
    throw new Error(data.error ?? `${outputTypeLabelMap[outputType]} 생성에 실패했습니다.`);
  }

  return data.image as GeneratedImage;
}

function ResultCard({
  formTitle,
  result,
  size,
  disabled,
  onRetry
}: {
  formTitle: string;
  result: ImageResult;
  size: ImageSize;
  disabled: boolean;
  onRetry: () => void;
}) {
  const label = outputTypeLabelMap[result.outputType];

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="checkerboard flex aspect-[3/2] min-h-[220px] items-center justify-center p-3">
        {result.status === "success" && result.image ? (
          <img alt={`${label} 미리보기`} className="max-h-[420px] w-full rounded-md object-contain" src={result.image.imageDataUrl} />
        ) : result.status === "generating" ? (
          <p className="text-sm font-extrabold text-slate-500">생성 중...</p>
        ) : result.status === "error" ? (
          <p className="px-4 text-center text-sm font-bold leading-6 text-red-600">{result.error}</p>
        ) : (
          <p className="text-sm font-bold text-slate-400">아직 생성 전입니다.</p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-extrabold tracking-[-0.03em] text-slate-900">{label}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{outputTypeDescriptionMap[result.outputType]}</p>
        </div>

        {result.image ? (
          <p className="text-xs font-bold text-slate-400">
            {result.image.model} · high · {size}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <ActionButton
            disabled={!result.image}
            onClick={() => {
              if (!result.image) return;
              downloadDataUrl(result.image.imageDataUrl, createDownloadName(formTitle, result.outputType));
            }}
          >
            PNG 다운로드
          </ActionButton>
          <ActionButton disabled={disabled} onClick={onRetry}>
            다시 생성
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function PromptSummary({ promptSet }: { promptSet: GeneratedPromptSet }) {
  const [openPrompt, setOpenPrompt] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black tracking-[-0.03em] text-slate-900">공유 디자인 스펙</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{promptSet.designSpec.coreEmotion}</p>
        </div>
        <button
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-600 hover:border-[#5F8F8B]"
          type="button"
          onClick={() => setOpenPrompt((current) => !current)}
        >
          프롬프트 {openPrompt ? "숨기기" : "보기"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBlock label="핵심 키워드" value={promptSet.designSpec.keywords.join(", ")} />
        <InfoBlock label="서체 방향" value={promptSet.designSpec.typographyStyle} />
        <InfoBlock label="장식 요소" value={promptSet.designSpec.decorations.join(", ")} />
        <InfoBlock label="줄바꿈/배치" value={`${promptSet.designSpec.lineBreakPlan} · ${promptSet.designSpec.titlePlacement}`} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">추천 색상</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {promptSet.designSpec.palette.map((color) => (
            <div key={`${color.hex}-${color.name}`} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="h-12 rounded-md" style={{ backgroundColor: color.hex }} />
              <p className="mt-2 text-sm font-extrabold text-slate-800">{color.hex}</p>
              <p className="text-xs font-medium text-slate-500">{color.name} · {color.usage}</p>
            </div>
          ))}
        </div>
      </div>

      {openPrompt ? (
        <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {outputOrder.map((outputType) => `${outputTypeLabelMap[outputType]}\n${promptSet.prompts[outputType].prompt}`).join("\n\n---\n\n")}
        </pre>
      ) : null}
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6">
      <h3 className="font-black tracking-[-0.03em] text-slate-800">아직 생성된 세트가 없습니다</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
        교육 내용을 입력하고 생성 버튼을 누르면 꾸민 제목, 제목만, 아이콘만 PNG가 순서대로 만들어집니다.
      </p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black tracking-[-0.03em] text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold tracking-[-0.02em] text-slate-800 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  rows,
  helper,
  onChange
}: {
  label: string;
  value: string;
  rows: number;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea
        className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium leading-6 tracking-[-0.02em] text-slate-800 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <span className="mt-1 block text-xs font-bold text-slate-400">{helper}</span> : null}
    </label>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black tracking-[-0.02em] text-slate-600">{children}</span>;
}

function ActionButton({
  children,
  disabled,
  onClick
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "warning"; children: ReactNode }) {
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm font-bold leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {children}
    </div>
  );
}

function getTodayStorageKey() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return `education-image-generation-set-count:${today}`;
}

function parseMultilineList(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\d+[\).]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeForm(form: EducationImageForm, refreshStyle: boolean): EducationImageForm {
  return {
    ...form,
    title: form.title.trim(),
    promotionCopy: form.promotionCopy.trim(),
    topics: form.topics.filter(Boolean),
    audiences: form.audiences.filter(Boolean),
    outputType: "decorated-title",
    textMode: "with-text",
    quality: "high",
    size: form.size,
    styleSeed: refreshStyle ? Date.now() : form.styleSeed || Date.now()
  };
}

function validateForm(form: EducationImageForm) {
  if (!form.title) {
    throw new Error("교육명을 입력해 주세요.");
  }
}
