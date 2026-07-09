"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { outputTypeLabelMap, outputTypeOptions, sizeOptions } from "@/lib/generativeOptions";
import type { EducationImageForm, GeneratedImage, GeneratedPrompt, ImageSize, OutputType } from "@/lib/generativeTypes";
import { createDownloadName, downloadGeneratedImage, removeLightBackground } from "@/lib/imageDownload";

const outputTypes: OutputType[] = ["title-transparent", "title-decorated-transparent", "icons-transparent"];
const sizes: ImageSize[] = ["1536x1024", "1024x1024", "1024x1536"];

const sampleOne: EducationImageForm = {
  title: "사례관리, 상담 기술로 전문성을 더하다",
  promotionCopy:
    "우리 현장에서 상담은 서비스와 사례관리의 출발점입니다. 좋은 질문과 경청으로 당사자의 변화를 함께 돕는 교육입니다.",
  topics: [
    "사회복지 상담의 본질과 관계 중심 실천",
    "사례관리에 활용되는 질문과 경청 기술",
    "변화를 만드는 상담 대화 구조"
  ],
  audiences: [
    "사례관리 과정에서 상담을 더 자신 있게 적용하고 싶은 분",
    "당사자와의 만남을 어려운 숙제가 아니라 살아 있는 관계로 만들고 싶은 분",
    "현장 상담의 전문성과 따뜻함을 함께 키우고 싶은 분"
  ],
  outputType: "title-decorated-transparent",
  textMode: "with-text",
  quality: "high",
  size: "1536x1024",
  styleSeed: 1
};

const sampleTwo: EducationImageForm = {
  title: "외로움의 시대, 주민조직화로 답하다",
  promotionCopy: "외로움은 이제 개인의 문제가 아니라 지역사회가 함께 다뤄야 할 과제가 되었습니다.",
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
  outputType: "title-decorated-transparent",
  textMode: "with-text",
  quality: "high",
  size: "1536x1024",
  styleSeed: 2
};

type PendingGeneration = {
  prompt: GeneratedPrompt;
  variationHint?: string;
};

export function GenerativeImageStudio() {
  const [form, setForm] = useState<EducationImageForm>(sampleOne);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [promptSourceKey, setPromptSourceKey] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);
  const [openPromptIds, setOpenPromptIds] = useState<Record<string, boolean>>({});
  const [dailyCount, setDailyCount] = useState(0);
  const [isPrompting, setIsPrompting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const todayKey = useMemo(() => getTodayStorageKey(), []);

  useEffect(() => {
    const storedCount = Number(window.localStorage.getItem(todayKey) ?? "0");
    setDailyCount(Number.isFinite(storedCount) ? storedCount : 0);
  }, [todayKey]);

  const updateField = <Key extends keyof EducationImageForm>(key: Key, value: EducationImageForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createPrompt = async (nextForm = form, refreshStyle = true) => {
    const normalizedForm = normalizeForm(nextForm, refreshStyle);
    validateForm(normalizedForm);
    setError("");
    setWarning("");
    setIsPrompting(true);

    try {
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "프롬프트 생성에 실패했습니다.");
      }

      setGeneratedPrompt(data.prompt);
      setPromptSourceKey(getFormKey(normalizedForm));
      setForm(normalizedForm);

      if (data.warning) {
        setWarning(data.warning);
      }

      return data.prompt as GeneratedPrompt;
    } finally {
      setIsPrompting(false);
    }
  };

  const openGenerationConfirm = async () => {
    try {
      const normalizedForm = normalizeForm(form, false);
      validateForm(normalizedForm);
      const prompt =
        generatedPrompt && promptSourceKey === getFormKey(normalizedForm)
          ? generatedPrompt
          : await createPrompt(normalizedForm);
      setPendingGeneration({ prompt });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "프롬프트 생성에 실패했습니다.");
    }
  };

  const confirmGeneration = async () => {
    if (!pendingGeneration) {
      return;
    }

    setError("");
    setWarning("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingGeneration)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "이미지 생성에 실패했습니다.");
      }

      const image = data.image as GeneratedImage;
      const imageDataUrl = await removeLightBackground(image.imageDataUrl);
      const processedImage = { ...image, imageDataUrl };

      setGeneratedImages((current) => [processedImage, ...current]);
      const nextCount = dailyCount + 1;
      setDailyCount(nextCount);
      window.localStorage.setItem(todayKey, String(nextCount));
      setPendingGeneration(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이미지 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAs = async (outputType: OutputType) => {
    const nextForm = normalizeForm(
      {
        ...form,
        outputType,
        size: getRecommendedSize(outputType)
      },
      true
    );

    setForm(nextForm);

    try {
      const prompt = await createPrompt(nextForm, false);
      setPendingGeneration({ prompt });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "프롬프트 생성에 실패했습니다.");
    }
  };

  const regenerate = (image: GeneratedImage) => {
    setPendingGeneration({
      prompt: {
        ...image.prompt,
        quality: "high"
      },
      variationHint:
        "Create a fresh variation with a clearly different but calmer Korean typography style, refined education-poster mood, fewer decorations, clean edges, and the same transparent PNG output rules."
    });
  };

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto grid max-w-[1540px] gap-4 lg:grid-cols-[470px_minmax(0,1fr)]">
        <aside className="soft-scrollbar max-h-none overflow-auto rounded-lg border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur md:max-h-[calc(100vh-48px)] md:p-5">
          <header className="mb-5">
            <p className="text-sm font-extrabold text-[#5F8F8B]">휴먼임팩트 교육 홍보물</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">제목 투명 PNG 생성기</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              홈페이지의 사람중심 톤과 첨부 썸네일의 큰 한글 타이포, 스티커, 밑줄, 아이콘 문법을 바탕으로 제목 PNG를 생성합니다.
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
              오늘 {dailyCount}장 생성
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

            <FormSection title="생성 설정">
              <div className="rounded-lg border border-[#5F8F8B]/30 bg-[#F8F4EC] px-3 py-3 text-sm font-bold leading-6 text-slate-700">
                교육분야 선택은 없앴습니다. 앱이 교육명, 홍보문구, 핵심주제, 대상자를 읽고 색상과 분위기를 자동 추천합니다.
              </div>

              <div>
                <Label>결과물 유형</Label>
                <div className="mt-2 grid gap-2">
                  {outputTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`rounded-lg border px-3 py-3 text-left transition ${
                        form.outputType === option.value
                          ? "border-[#5F8F8B] bg-white shadow-sm"
                          : "border-slate-200 bg-white/80 hover:border-slate-300"
                      }`}
                      type="button"
                      onClick={() =>
                        setForm((current) =>
                          normalizeForm(
                            {
                              ...current,
                              outputType: option.value,
                              size: getRecommendedSize(option.value)
                            },
                            false
                          )
                        )
                      }
                    >
                      <span className="block text-sm font-extrabold text-slate-800">{option.label}</span>
                      <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#5F8F8B]/30 bg-white px-3 py-3 text-sm font-bold leading-6 text-slate-700">
                품질은 항상 <span className="text-[#527d79]">high</span>로 고정합니다. 다운로드 PNG에는 <span className="text-[#527d79]">300dpi</span> 해상도 메타데이터를 넣습니다.
                이미지 생성 모델 기본값은 <span className="text-[#527d79]">gpt-image-2</span>입니다.
              </div>

              <SelectField
                label="크기"
                value={form.size}
                options={sizeOptions}
                onChange={(value) => updateField("size", value as ImageSize)}
              />
            </FormSection>

            <section className="grid gap-2 border-t border-slate-200 pt-5">
              <button
                className="rounded-lg border border-[#5F8F8B] bg-white px-4 py-3 text-sm font-extrabold text-[#527d79] transition hover:bg-[#F8F4EC] disabled:cursor-wait disabled:opacity-60"
                disabled={isPrompting || isGenerating}
                type="button"
                onClick={() => createPrompt().catch((caught) => setError(caught instanceof Error ? caught.message : "프롬프트 생성에 실패했습니다."))}
              >
                {isPrompting ? "프롬프트 만드는 중..." : "추천 프롬프트 만들기"}
              </button>
              <button
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isPrompting || isGenerating}
                type="button"
                onClick={openGenerationConfirm}
              >
                선택한 유형으로 이미지 생성
              </button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("title-transparent")}>
                  글씨만
                </MiniButton>
                <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("title-decorated-transparent")}>
                  꾸민 제목
                </MiniButton>
                <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("icons-transparent")}>
                  아이콘 모음
                </MiniButton>
              </div>
            </section>
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur md:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">생성 결과</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">추천 분위기, 색상, 서체 방향과 생성 이미지를 확인합니다.</p>
            </div>
            <div className="rounded-lg bg-[#F8F4EC] px-3 py-2 text-xs font-bold leading-5 text-slate-600">
              세 결과물 모두 투명 후처리와 300dpi 다운로드를 적용합니다.
            </div>
          </div>

          {error ? <Notice tone="error">{error}</Notice> : null}
          {warning ? <Notice tone="warning">{warning}</Notice> : null}

          {generatedPrompt ? <PromptSummary prompt={generatedPrompt} /> : <EmptyPrompt />}

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {generatedImages.map((image) => (
              <article key={image.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="checkerboard flex min-h-[260px] items-center justify-center p-3">
                  <img
                    alt={`${outputTypeLabelMap[image.outputType]} 생성 이미지`}
                    className="max-h-[520px] w-full rounded-md object-contain"
                    src={image.imageDataUrl}
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold tracking-[-0.03em] text-slate-900">{outputTypeLabelMap[image.outputType]}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {image.model} · {image.quality} · {image.size}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                      투명 후처리 · 300dpi
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      onClick={() =>
                        downloadGeneratedImage(
                          image.imageDataUrl,
                          createDownloadName(form.title, image.outputType),
                          image.outputType
                        )
                      }
                    >
                      PNG 다운로드
                    </ActionButton>
                    <ActionButton onClick={() => regenerate(image)}>다시 생성</ActionButton>
                    <ActionButton onClick={() => setOpenPromptIds((current) => ({ ...current, [image.id]: !current[image.id] }))}>
                      프롬프트 {openPromptIds[image.id] ? "숨기기" : "보기"}
                    </ActionButton>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("title-transparent")}>
                      글씨만
                    </MiniButton>
                    <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("title-decorated-transparent")}>
                      꾸민 제목
                    </MiniButton>
                    <MiniButton disabled={isPrompting || isGenerating} onClick={() => generateAs("icons-transparent")}>
                      아이콘 모음
                    </MiniButton>
                  </div>

                  {openPromptIds[image.id] ? (
                    <pre className="max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                      {image.prompt.prompt}
                    </pre>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {generatedImages.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center">
              <p className="text-sm font-bold text-slate-500">아직 생성된 이미지가 없습니다.</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                교육 정보를 입력하고 프롬프트를 만든 뒤 이미지를 생성해 주세요.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {pendingGeneration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">이미지를 생성할까요?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              OpenAI 이미지 생성 API 호출은 비용이 발생할 수 있습니다. 이번 요청은 1장을 최고 품질로 생성하고, 결과는 투명 PNG로 후처리합니다.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-extrabold text-slate-600">
              <div className="rounded-lg bg-slate-100 px-3 py-2">{outputTypeLabelMap[pendingGeneration.prompt.outputType]}</div>
              <div className="rounded-lg bg-slate-100 px-3 py-2">{pendingGeneration.prompt.quality}</div>
              <div className="rounded-lg bg-slate-100 px-3 py-2">{pendingGeneration.prompt.size}</div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600"
                disabled={isGenerating}
                type="button"
                onClick={() => setPendingGeneration(null)}
              >
                취소
              </button>
              <button
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
                disabled={isGenerating}
                type="button"
                onClick={confirmGeneration}
              >
                {isGenerating ? "생성 중..." : "생성하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );

  function loadSample(sample: EducationImageForm) {
    setForm({ ...sample, topics: [...sample.topics], audiences: [...sample.audiences] });
    setGeneratedPrompt(null);
    setPromptSourceKey("");
    setError("");
    setWarning("");
  }
}

function PromptSummary({ prompt }: { prompt: GeneratedPrompt }) {
  const [openPrompt, setOpenPrompt] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black tracking-[-0.03em] text-slate-900">자동 추천 결과</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{prompt.analysis.coreEmotion}</p>
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
        <InfoBlock label="핵심 키워드" value={prompt.analysis.keywords.join(", ")} />
        <InfoBlock label="시각적 은유" value={prompt.analysis.visualMetaphor} />
        <InfoBlock label="제목 배치" value={prompt.analysis.titlePlacement} />
        <InfoBlock label="서체 방향" value={prompt.analysis.typographyStyle} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">추천 색상</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {prompt.palette.map((color) => (
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
          {prompt.prompt}
        </pre>
      ) : null}
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6">
      <h3 className="font-black tracking-[-0.03em] text-slate-800">자동 추천 결과가 아직 없습니다</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
        교육 내용을 입력하면 앱이 사람중심 톤과 첨부 썸네일 문법에 맞는 분위기, 색상, 서체 방향을 자동 추천합니다.
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

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black tracking-[-0.02em] text-slate-600">{children}</span>;
}

function MiniButton({
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
      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-600 transition hover:border-[#5F8F8B] hover:text-[#5F8F8B] disabled:cursor-wait disabled:opacity-50"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-700"
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

function getRecommendedSize(outputType: OutputType): ImageSize {
  return outputType === "icons-transparent" ? "1024x1024" : "1536x1024";
}

function getTodayStorageKey() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return `education-image-generation-count:${today}`;
}

function parseMultilineList(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\d+[\).]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeForm(form: EducationImageForm, refreshStyle: boolean): EducationImageForm {
  const outputType = normalizeOutputType(form.outputType);
  const size = normalizeSize(form.size) ?? getRecommendedSize(outputType);

  return {
    ...form,
    title: form.title.trim(),
    promotionCopy: form.promotionCopy.trim(),
    topics: form.topics.filter(Boolean),
    audiences: form.audiences.filter(Boolean),
    outputType,
    textMode: outputType === "icons-transparent" ? "without-text" : "with-text",
    quality: "high",
    size,
    styleSeed: refreshStyle ? Date.now() : form.styleSeed || Date.now()
  };
}

function normalizeOutputType(value: OutputType) {
  return outputTypes.includes(value) ? value : "title-decorated-transparent";
}

function normalizeSize(value: ImageSize) {
  return sizes.includes(value) ? value : null;
}

function validateForm(form: EducationImageForm) {
  if (!form.title) {
    throw new Error("교육명을 입력해 주세요.");
  }
}

function getFormKey(form: EducationImageForm) {
  return JSON.stringify({
    title: form.title,
    promotionCopy: form.promotionCopy,
    topics: form.topics,
    audiences: form.audiences,
    outputType: form.outputType,
    size: form.size,
    styleSeed: form.styleSeed
  });
}
