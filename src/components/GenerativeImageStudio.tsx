"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  candidateDirectionMap,
  candidateLabelMap,
  candidateOrder,
  defaultImageSize,
  outputOrder,
  outputTypeDescriptionMap,
  outputTypeLabelMap,
  sizeOptions
} from "@/lib/generativeOptions";
import type {
  CandidateId,
  EducationImageForm,
  GeneratedCandidateSet,
  GeneratedImage,
  GeneratedPromptSet,
  ImageSize,
  OutputType,
  PngValidationStatus
} from "@/lib/generativeTypes";
import { createDownloadName, createSafeBaseName, downloadDataUrl } from "@/lib/imageDownload";
import { downloadImageZip } from "@/lib/zipDownload";

const sampleOne: EducationImageForm = {
  title: "사례관리, 상담 기술로 전문성을 더하다",
  promotionCopy:
    "좋은 상담은 좋은 관계에서 시작됩니다. 사례관리 현장에서 바로 사용할 수 있는 질문과 경청의 실천 기술을 다룹니다.",
  topics: [
    "사회복지 상담의 본질과 관계 중심 실천",
    "사례관리에 사용하는 질문과 경청 기술",
    "변화를 만드는 상담 대화 구조"
  ],
  audiences: [
    "사례관리 과정에서 상담을 더 자신 있게 적용하고 싶은 분",
    "당사자와의 만남을 살아 있는 관계로 만들고 싶은 분",
    "현장 상담의 전문성과 따뜻함을 함께 세우고 싶은 분"
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
    "지역 안에서 사람 중심 실천의 다음 접근을 찾는 분"
  ],
  outputType: "decorated-title",
  textMode: "with-text",
  quality: "high",
  size: defaultImageSize,
  styleSeed: 2
};

type FlowState = "idle" | "generating-candidates" | "awaiting-selection" | "generating-derivatives" | "complete";
type ResultStatus = "idle" | "generating" | "success" | "error";

type ImageResult = {
  outputType: OutputType;
  status: ResultStatus;
  image?: GeneratedImage;
  error?: string;
};

type CandidateResult = {
  candidateId: CandidateId;
  label: string;
  direction: string;
  status: ResultStatus;
  promptSet?: GeneratedPromptSet;
  image?: GeneratedImage;
  error?: string;
};

type TimingEntry = {
  label: string;
  ms: number;
};

type RequestImageOptions = {
  inputImageDataUrl?: string;
  sourceImageId?: string;
};

const derivativeOrder: OutputType[] = ["title-only", "icons-only"];
const checkerboardFailureMessage =
  "실제 투명 배경이 아닌 체크무늬가 감지되었습니다. 다시 생성하거나 자동 보정할 수 있습니다.";

const initialResults = (): Record<OutputType, ImageResult> => ({
  "decorated-title": { outputType: "decorated-title", status: "idle" },
  "title-only": { outputType: "title-only", status: "idle" },
  "icons-only": { outputType: "icons-only", status: "idle" }
});

const initialCandidates = (): Record<CandidateId, CandidateResult> => ({
  "option-1": {
    candidateId: "option-1",
    label: candidateLabelMap["option-1"],
    direction: candidateDirectionMap["option-1"],
    status: "idle"
  },
  "option-2": {
    candidateId: "option-2",
    label: candidateLabelMap["option-2"],
    direction: candidateDirectionMap["option-2"],
    status: "idle"
  }
});

export function GenerativeImageStudio() {
  const [form, setForm] = useState<EducationImageForm>(sampleOne);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [candidateSet, setCandidateSet] = useState<GeneratedCandidateSet | null>(null);
  const [candidates, setCandidates] = useState<Record<CandidateId, CandidateResult>>(initialCandidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<CandidateId | null>(null);
  const [promptSet, setPromptSet] = useState<GeneratedPromptSet | null>(null);
  const [results, setResults] = useState<Record<OutputType, ImageResult>>(initialResults);
  const [dailyCount, setDailyCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [timings, setTimings] = useState<TimingEntry[]>([]);
  const runStartedAtRef = useRef(0);

  const todayKey = useMemo(() => getTodayStorageKey(), []);
  const candidateList = candidateOrder.map((candidateId) => candidates[candidateId]);
  const successfulFinalResults = outputOrder
    .map((outputType) => results[outputType])
    .filter((result): result is ImageResult & { image: GeneratedImage } => isValidTransparentImage(result.image));
  const finalSetReady = outputOrder.every((outputType) => isValidTransparentImage(results[outputType].image));
  const selectedCandidate = selectedCandidateId ? candidates[selectedCandidateId] : null;

  useEffect(() => {
    const storedCount = Number(window.localStorage.getItem(todayKey) ?? "0");
    setDailyCount(Number.isFinite(storedCount) ? storedCount : 0);
  }, [todayKey]);

  const updateField = <Key extends keyof EducationImageForm>(key: Key, value: EducationImageForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const generateCandidates = async () => {
    if (isGenerating) {
      return;
    }

    try {
      const normalizedForm = normalizeForm(form, true);
      validateForm(normalizedForm);
      runStartedAtRef.current = performance.now();
      setForm(normalizedForm);
      setError("");
      setTimings([]);
      setCandidateSet(null);
      setSelectedCandidateId(null);
      setPromptSet(null);
      setResults(initialResults());
      setCandidates(markAllCandidates("generating"));
      setFlowState("generating-candidates");
      setIsGenerating(true);
      setProgressText("[1/3] 제목 시안 2안을 동시에 만들고 있어요...");

      const promptStartedAt = performance.now();
      const promptResponse = await fetch("/api/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm)
      });
      const promptData = await promptResponse.json();
      const promptMs = performance.now() - promptStartedAt;

      if (promptResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!promptResponse.ok) {
        throw new Error(promptData.error ?? "제목 시안 프롬프트 생성에 실패했습니다.");
      }

      addTiming("Prompt analysis", promptMs);
      const nextCandidateSet = promptData.candidateSet as GeneratedCandidateSet;
      setCandidateSet(nextCandidateSet);

      const draftStartedAt = performance.now();
      const candidateEntries = await Promise.all(
        candidateOrder.map(async (candidateId) => {
          const promptSetForCandidate = nextCandidateSet.candidates[candidateId];

          try {
            const image = await requestImage(promptSetForCandidate, "decorated-title");
            return {
              candidateId,
              result: {
                ...initialCandidates()[candidateId],
                promptSet: promptSetForCandidate,
                status: "success" as const,
                image
              }
            };
          } catch (caught) {
            return {
              candidateId,
              result: {
                ...initialCandidates()[candidateId],
                promptSet: promptSetForCandidate,
                status: "error" as const,
                error: caught instanceof Error ? caught.message : `${candidateLabelMap[candidateId]} 생성에 실패했습니다.`
              }
            };
          }
        })
      );
      const draftMs = performance.now() - draftStartedAt;
      const nextCandidates = initialCandidates();
      let draftResizeMs = 0;

      for (const entry of candidateEntries) {
        nextCandidates[entry.candidateId] = entry.result;
        draftResizeMs += entry.result.image?.timings?.resizeMs ?? 0;
      }

      setCandidates(nextCandidates);
      addTiming("Draft 1 + Draft 2 parallel generation", draftMs);
      addTiming("Server resize and PNG processing", draftResizeMs);

      const hasCandidate = Object.values(nextCandidates).some((candidate) => candidate.image && candidate.promptSet);
      if (!hasCandidate) {
        throw new Error("생성된 제목 시안이 없습니다. 잠시 후 다시 시도해 주세요.");
      }

      setFlowState("awaiting-selection");
      setProgressText("[2/3] 원하는 시안을 선택해주세요.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "제목 시안 생성에 실패했습니다.");
      setProgressText("");
      setFlowState("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectCandidate = async (candidateId: CandidateId) => {
    const candidate = candidates[candidateId];
    if (!candidate.promptSet || !candidate.image || isGenerating) {
      return;
    }

    setError("");
    setSelectedCandidateId(candidateId);
    setPromptSet(candidate.promptSet);
    setFlowState("generating-derivatives");
    setIsGenerating(true);
    setProgressText("[3/3] 선택한 디자인에서 제목과 아이콘을 동시에 분리하고 있어요...");

    const nextResults = initialResults();
    nextResults["decorated-title"] = {
      outputType: "decorated-title",
      status: "success",
      image: candidate.image
    };
    nextResults["title-only"] = { outputType: "title-only", status: "generating" };
    nextResults["icons-only"] = { outputType: "icons-only", status: "generating" };
    setResults({ ...nextResults });

    const derivativeStartedAt = performance.now();
    const derivativeEntries = await Promise.all(
      derivativeOrder.map(async (outputType) => {
        const label = outputTypeLabelMap[outputType];

        try {
          const image = await requestImage(candidate.promptSet as GeneratedPromptSet, outputType, {
            inputImageDataUrl: candidate.image?.imageDataUrl,
            sourceImageId: candidate.image?.id
          });
          return {
            outputType,
            result: { outputType, status: "success" as const, image }
          };
        } catch (caught) {
          return {
            outputType,
            result: {
              outputType,
              status: "error" as const,
              error: caught instanceof Error ? caught.message : `${label} 생성에 실패했습니다.`
            }
          };
        }
      })
    );
    const derivativeMs = performance.now() - derivativeStartedAt;
    let derivativeResizeMs = 0;

    for (const entry of derivativeEntries) {
      nextResults[entry.outputType] = entry.result;
      derivativeResizeMs += entry.result.image?.timings?.resizeMs ?? 0;
    }

    setResults({ ...nextResults });
    addTiming("Selected image extraction parallel processing", derivativeMs);
    addTiming("Extraction server resize and PNG processing", derivativeResizeMs);
    addTiming("Total", performance.now() - runStartedAtRef.current);

    const allDerivativesSucceeded = derivativeEntries.every((entry) => entry.result.status === "success");
    setFlowState("complete");
    setProgressText(
      allDerivativesSucceeded
        ? "최종 3종 결과가 준비되었습니다."
        : "선택한 디자인 기준으로 가능한 결과를 만들었습니다. 실패한 항목은 다시 선택해 재시도할 수 있습니다."
    );

    if (allDerivativesSucceeded) {
      const nextCount = dailyCount + 1;
      setDailyCount(nextCount);
      window.localStorage.setItem(todayKey, String(nextCount));
    }

    setIsGenerating(false);
  };

  const regenerateCandidate = async (candidateId: CandidateId) => {
    if (isGenerating) {
      return;
    }

    const promptSetForCandidate = candidateSet?.candidates[candidateId] ?? candidates[candidateId].promptSet;
    if (!promptSetForCandidate) {
      setError("재생성할 시안 정보가 없습니다. 제목 시안 2안을 다시 생성해 주세요.");
      return;
    }

    setError("");
    setIsGenerating(true);
    setProgressText(`${candidateLabelMap[candidateId]}을 다시 만들고 투명 배경을 검증하고 있어요...`);
    setCandidates((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        promptSet: promptSetForCandidate,
        status: "generating",
        error: undefined
      }
    }));

    const startedAt = performance.now();
    try {
      const image = await requestImage(promptSetForCandidate, "decorated-title");
      setCandidates((current) => ({
        ...current,
        [candidateId]: {
          ...current[candidateId],
          promptSet: promptSetForCandidate,
          image,
          status: "success",
          error: undefined
        }
      }));
      addTiming(`${candidateLabelMap[candidateId]} retry generation`, performance.now() - startedAt);
      setFlowState("awaiting-selection");
      setProgressText("[2/3] 원하는 시안을 선택해주세요.");
    } catch (caught) {
      setCandidates((current) => ({
        ...current,
        [candidateId]: {
          ...current[candidateId],
          promptSet: promptSetForCandidate,
          status: "error",
          error: caught instanceof Error ? caught.message : `${candidateLabelMap[candidateId]} 재생성에 실패했습니다.`
        }
      }));
      setProgressText("");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateDerivative = async (outputType: OutputType) => {
    if (isGenerating || outputType === "decorated-title") {
      return;
    }

    if (!promptSet || !selectedCandidate?.image) {
      setError("선택한 꾸민 제목 이미지가 있어야 다시 분리할 수 있습니다.");
      return;
    }

    setError("");
    setIsGenerating(true);
    setProgressText("선택한 디자인에서 해당 결과물을 다시 분리하고 투명 배경을 검증하고 있어요...");
    setResults((current) => ({
      ...current,
      [outputType]: { outputType, status: "generating" }
    }));

    const startedAt = performance.now();
    try {
      const image = await requestImage(promptSet, outputType, {
        inputImageDataUrl: selectedCandidate.image.imageDataUrl,
        sourceImageId: selectedCandidate.image.id
      });
      setResults((current) => ({
        ...current,
        [outputType]: { outputType, status: "success", image }
      }));
      addTiming(`${outputTypeLabelMap[outputType]} retry extraction`, performance.now() - startedAt);
      setProgressText("최종 3종 결과를 갱신했습니다.");
    } catch (caught) {
      setResults((current) => ({
        ...current,
        [outputType]: {
          outputType,
          status: "error",
          error: caught instanceof Error ? caught.message : `${outputTypeLabelMap[outputType]} 재생성에 실패했습니다.`
        }
      }));
      setProgressText("");
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
      if (!finalSetReady) {
        throw new Error("최종 3종 결과가 모두 실제 투명 PNG 검증을 통과한 뒤 ZIP 다운로드가 가능합니다.");
      }

      downloadImageZip(
        form.title,
        outputOrder.map((outputType) => ({
          outputType,
          dataUrl: results[outputType].image?.imageDataUrl ?? ""
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
                <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">제목 이미지 생성기</h1>
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
              품질은 항상 high로 유지합니다. 속도는 시안 2개 병렬 생성과 선택 후 병렬 편집으로 최적화합니다.
            </p>
          </header>

          <div className="mb-5 flex gap-2">
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#6C7A9C]"
              type="button"
              onClick={() => loadSample(sampleOne)}
            >
              예시 1
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#5F8F8B]"
              type="button"
              onClick={() => loadSample(sampleTwo)}
            >
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
                label="홍보 문구"
                rows={5}
                value={form.promotionCopy}
                onChange={(value) => updateField("promotionCopy", value)}
              />
            </FormSection>

            <FormSection title="핵심 주제">
              <TextArea
                helper="여러 주제를 줄바꿈으로 한 번에 입력할 수 있습니다."
                label="핵심 주제"
                rows={5}
                value={form.topics.join("\n")}
                onChange={(value) => updateField("topics", parseMultilineList(value))}
              />
            </FormSection>

            <FormSection title="대상자">
              <TextArea
                helper="대상자를 줄바꿈으로 한 번에 입력할 수 있습니다."
                label="어떤 분들과 함께하고 싶나요?"
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
                AI 생성은 한 번만 수행하고, 최종 PNG 크기 보정은 서버에서 정확히 처리합니다.
              </p>
            </FormSection>

            <section className="grid gap-2 border-t border-slate-200 pt-5">
              <button
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isGenerating}
                type="button"
                onClick={generateCandidates}
              >
                {isGenerating && flowState === "generating-candidates"
                  ? "제목 시안 2안 생성 중..."
                  : flowState === "complete"
                    ? "새 제목 시안 2안 다시 생성하기"
                    : "제목 시안 2안 생성하기"}
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
                선택 전에는 제목만/아이콘만 PNG를 만들지 않습니다. 선택한 꾸민 제목 이미지를 입력 이미지로 편집합니다.
              </p>
            </div>
            <button
              className="rounded-lg bg-[#5F8F8B] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#527d79] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!finalSetReady}
              type="button"
              onClick={downloadAll}
            >
              최종 3종 다운로드
            </button>
          </div>

          <FlowSteps state={flowState} />
          {timings.length > 0 ? <TimingPanel timings={timings} /> : null}
          {error ? <Notice>{error}</Notice> : null}
          {!candidateSet && flowState === "idle" ? <EmptyPrompt /> : null}

          {candidateSet || flowState === "generating-candidates" ? (
            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black tracking-[-0.03em] text-slate-900">1단계: 꾸민 제목 투명 PNG 2안</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    두 시안은 동시에 생성됩니다. 둘 중 하나를 선택해야 파생 PNG가 만들어집니다.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {candidateList.map((candidate) => (
                  <CandidateCard
                    key={candidate.candidateId}
                    formTitle={form.title}
                    result={candidate}
                    selected={selectedCandidateId === candidate.candidateId}
                    size={form.size}
                    disabled={isGenerating}
                    onSelect={() => selectCandidate(candidate.candidateId)}
                    onRetry={() => regenerateCandidate(candidate.candidateId)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {promptSet ? <PromptSummary promptSet={promptSet} selectedLabel={selectedCandidate?.label ?? ""} /> : null}

          {flowState === "generating-derivatives" || flowState === "complete" ? (
            <section className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black tracking-[-0.03em] text-slate-900">최종 3종 결과</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    선택한 {selectedCandidate?.label ?? "안"}의 꾸민 제목 PNG를 입력 이미지로 사용해 분리한 세트입니다.
                  </p>
                </div>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:border-[#5F8F8B] disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!finalSetReady}
                  type="button"
                  onClick={downloadAll}
                >
                  3개 모두 ZIP 다운로드
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {outputOrder.map((outputType) => (
                  <FinalResultCard
                    key={outputType}
                    formTitle={form.title}
                    result={results[outputType]}
                    size={form.size}
                    onRetry={outputType === "decorated-title" ? undefined : () => regenerateDerivative(outputType)}
                  />
                ))}
              </div>

              {successfulFinalResults.length > 0 ? (
                <p className="mt-3 rounded-lg bg-white px-3 py-3 text-xs font-bold leading-5 text-slate-500">
                  PNG 각각 다운로드는 각 카드에서, ZIP 다운로드는 세 결과물이 모두 성공했을 때 사용할 수 있습니다.
                </p>
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );

  function loadSample(sample: EducationImageForm) {
    setForm({ ...sample, topics: [...sample.topics], audiences: [...sample.audiences], styleSeed: Date.now() });
    setFlowState("idle");
    setCandidateSet(null);
    setCandidates(initialCandidates());
    setSelectedCandidateId(null);
    setPromptSet(null);
    setResults(initialResults());
    setError("");
    setProgressText("");
    setTimings([]);
  }

  function addTiming(label: string, ms: number) {
    setTimings((current) => [...current.filter((entry) => entry.label !== label), { label, ms }]);
  }
}

async function requestImage(promptSet: GeneratedPromptSet, outputType: OutputType, options: RequestImageOptions = {}) {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: { ...promptSet.prompts[outputType], quality: "high" },
      inputImageDataUrl: options.inputImageDataUrl,
      sourceImageId: options.sourceImageId
    })
  });
  const data = await response.json();

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("인증이 만료되었습니다.");
  }

  if (!response.ok) {
    const status = data.status as PngValidationStatus | undefined;
    throw new Error(
      status === "CHECKERBOARD_DETECTED"
        ? checkerboardFailureMessage
        : data.error ?? `${outputTypeLabelMap[outputType]} 생성에 실패했습니다.`
    );
  }

  return data.image as GeneratedImage;
}

function CandidateCard({
  formTitle,
  result,
  selected,
  size,
  disabled,
  onSelect,
  onRetry
}: {
  formTitle: string;
  result: CandidateResult;
  selected: boolean;
  size: ImageSize;
  disabled: boolean;
  onSelect: () => void;
  onRetry: () => void;
}) {
  const canDownload = isValidTransparentImage(result.image);

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white shadow-sm transition ${
        selected ? "border-[#5F8F8B] ring-4 ring-[#5F8F8B]/15" : "border-slate-200"
      }`}
    >
      <div className="checkerboard flex aspect-[3/2] min-h-[240px] items-center justify-center p-3">
        {result.status === "success" && result.image ? (
          <img
            alt={`꾸민 제목 투명 PNG ${result.label} 미리보기`}
            className="max-h-[440px] w-full rounded-md object-contain"
            src={result.image.imageDataUrl}
          />
        ) : result.status === "generating" ? (
          <p className="text-sm font-extrabold text-slate-500">{result.label} 생성 중...</p>
        ) : result.status === "error" ? (
          <p className="px-4 text-center text-sm font-bold leading-6 text-red-600">{result.error}</p>
        ) : (
          <p className="text-sm font-bold text-slate-400">아직 생성 전입니다.</p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="mb-1 inline-flex rounded-full bg-[#F8F4EC] px-2.5 py-1 text-[11px] font-black text-[#527d79]">
            {result.direction}
          </p>
          <h3 className="font-extrabold tracking-[-0.03em] text-slate-900">
            꾸민 제목 투명 PNG - {result.label}
          </h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            배경 투명 후처리 · 제목 중심 · 소량 장식 · high 품질 · {size}
          </p>
        </div>

        {result.image ? (
          <p className="text-xs font-bold text-slate-400">
            {result.image.model} · {result.image.operation ?? "generation"} · {formatSeconds(result.image.timings?.totalMs ?? 0)}
          </p>
        ) : null}
        {result.image ? <ValidationMeta image={result.image} /> : null}

        <div className="flex flex-wrap gap-2">
          <ActionButton
            disabled={!canDownload}
            onClick={() => {
              if (!canDownload || !result.image) return;
              downloadDataUrl(result.image.imageDataUrl, `${createSafeBaseName(formTitle)}_${result.label}_꾸민제목_투명.png`);
            }}
          >
            {result.label} PNG 다운로드
          </ActionButton>
          <ActionButton disabled={disabled || !canDownload} onClick={onSelect}>
            {result.label} 선택
          </ActionButton>
          {result.status === "error" ? (
            <>
              <ActionButton disabled={disabled} onClick={onRetry}>
                자동 보정
              </ActionButton>
              <ActionButton disabled={disabled} onClick={onRetry}>
                다시 생성
              </ActionButton>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FinalResultCard({
  formTitle,
  result,
  size,
  onRetry
}: {
  formTitle: string;
  result: ImageResult;
  size: ImageSize;
  onRetry?: () => void;
}) {
  const label = outputTypeLabelMap[result.outputType];
  const canDownload = isValidTransparentImage(result.image);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="checkerboard flex aspect-[3/2] min-h-[220px] items-center justify-center p-3">
        {result.status === "success" && result.image ? (
          <img alt={`${label} 미리보기`} className="max-h-[420px] w-full rounded-md object-contain" src={result.image.imageDataUrl} />
        ) : result.status === "generating" ? (
          <p className="text-sm font-extrabold text-slate-500">동시에 분리 생성 중...</p>
        ) : result.status === "error" ? (
          <p className="px-4 text-center text-sm font-bold leading-6 text-red-600">{result.error}</p>
        ) : (
          <p className="text-sm font-bold text-slate-400">시안 선택 후 생성됩니다.</p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-extrabold tracking-[-0.03em] text-slate-900">{label}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{outputTypeDescriptionMap[result.outputType]}</p>
        </div>

        {result.image ? (
          <p className="text-xs font-bold text-slate-400">
            {result.image.model} · {result.image.operation ?? "generation"} · high · {size}
          </p>
        ) : null}
        {result.image ? <ValidationMeta image={result.image} /> : null}

        <ActionButton
          disabled={!canDownload}
          onClick={() => {
            if (!canDownload || !result.image) return;
            downloadDataUrl(result.image.imageDataUrl, createDownloadName(formTitle, result.outputType));
          }}
        >
          PNG 다운로드
        </ActionButton>
        {result.status === "error" && onRetry ? (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={onRetry}>자동 보정</ActionButton>
            <ActionButton onClick={onRetry}>다시 생성</ActionButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ValidationMeta({ image }: { image: GeneratedImage }) {
  const isValid = isValidTransparentImage(image);

  return (
    <p className={`text-xs font-extrabold ${isValid ? "text-[#527d79]" : "text-red-600"}`}>
      {getValidationLabel(image.validationStatus)}
      {image.corrected ? " · 자동 보정됨" : ""}
      {image.validation ? ` · 투명 ${formatPercent(image.validation.transparentPixelRatio)}` : ""}
    </p>
  );
}

function PromptSummary({ promptSet, selectedLabel }: { promptSet: GeneratedPromptSet; selectedLabel: string }) {
  const [openPrompt, setOpenPrompt] = useState(false);

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black tracking-[-0.03em] text-slate-900">
            선택된 디자인 스펙 {selectedLabel ? `· ${selectedLabel}` : ""}
          </h3>
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
        <InfoBlock label="핵심 정서 3개" value={promptSet.designSpec.coreEmotions.join(", ")} />
        <InfoBlock label="핵심 키워드 5개" value={promptSet.designSpec.keywords.join(", ")} />
        <InfoBlock label="추천 아이콘" value={promptSet.designSpec.decorations.join(", ")} />
        <InfoBlock label="줄바꿈" value={promptSet.designSpec.lineBreakPlan} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">추천 색상</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {promptSet.designSpec.palette.map((color) => (
            <div key={`${color.hex}-${color.name}`} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="h-12 rounded-md" style={{ backgroundColor: color.hex }} />
              <p className="mt-2 text-sm font-extrabold text-slate-800">{color.hex}</p>
              <p className="text-xs font-medium text-slate-500">
                {color.name} · {color.usage}
              </p>
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
    <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white/70 p-6">
      <h3 className="font-black tracking-[-0.03em] text-slate-800">아직 생성된 제목 시안이 없습니다</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
        교육명과 내용을 입력한 뒤 제목 시안 2안을 먼저 생성해 주세요. 선택한 시안을 기준으로 최종 3종 PNG가 만들어집니다.
      </p>
    </div>
  );
}

function FlowSteps({ state }: { state: FlowState }) {
  const steps: Array<{ state: FlowState; label: string; description: string }> = [
    { state: "idle", label: "상태 1", description: "초기 입력 상태" },
    { state: "generating-candidates", label: "상태 2", description: "[1/3] 시안 2안 동시 생성" },
    { state: "awaiting-selection", label: "상태 3", description: "[2/3] 시안 선택 대기" },
    { state: "generating-derivatives", label: "상태 4", description: "[3/3] 제목/아이콘 동시 분리" },
    { state: "complete", label: "상태 5", description: "최종 3종 결과 표시" }
  ];
  const activeIndex = steps.findIndex((step) => step.state === state);

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-5">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <div
            key={step.state}
            className={`rounded-lg px-3 py-2 ${
              isActive
                ? "bg-[#5F8F8B] text-white"
                : isDone
                  ? "bg-[#F8F4EC] text-slate-700"
                  : "bg-slate-50 text-slate-400"
            }`}
          >
            <p className="text-[11px] font-black">{step.label}</p>
            <p className="mt-1 text-xs font-extrabold leading-4">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function TimingPanel({ timings }: { timings: TimingEntry[] }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-black tracking-[-0.03em] text-slate-900">처리 시간</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {timings.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs font-extrabold text-slate-500">{entry.label}</span>
            <span className="text-sm font-black text-slate-900">{formatSeconds(entry.ms)}</span>
          </div>
        ))}
      </div>
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

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
      {children}
    </div>
  );
}

function markAllCandidates(status: ResultStatus): Record<CandidateId, CandidateResult> {
  const candidates = initialCandidates();
  return {
    "option-1": { ...candidates["option-1"], status },
    "option-2": { ...candidates["option-2"], status }
  };
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
    topics: form.topics.map((item) => item.trim()).filter(Boolean),
    audiences: form.audiences.map((item) => item.trim()).filter(Boolean),
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

function isValidTransparentImage(image?: GeneratedImage) {
  return image?.validationStatus === "VALID_TRANSPARENT_PNG";
}

function getValidationLabel(status?: PngValidationStatus) {
  const labels: Record<PngValidationStatus, string> = {
    VALID_TRANSPARENT_PNG: "투명 PNG 검증 완료",
    CHECKERBOARD_DETECTED: "체크무늬 감지",
    NO_ALPHA_CHANNEL: "알파 채널 없음",
    LOW_TRANSPARENCY: "투명 영역 부족",
    PROCESSING_FAILED: "PNG 처리 실패"
  };

  return status ? labels[status] : "투명 PNG 검증 대기";
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value * 100)}%`;
}

function formatSeconds(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0.0s";
  }

  return `${(ms / 1000).toFixed(1)}s`;
}
