import {
  candidateDirectionMap,
  candidateLabelMap,
  candidateOrder,
  parseImageSize
} from "@/lib/generativeOptions";
import type {
  CandidateId,
  DesignSpec,
  EducationImageForm,
  GeneratedCandidateSet,
  GeneratedPrompt,
  GeneratedPromptSet,
  ImageSize,
  OutputType,
  PaletteColor,
  PromptAnalysis
} from "@/lib/generativeTypes";

type Classification = "counseling" | "community" | "practice" | "promotion" | "reflective" | "care";

type CandidateVariant = {
  id: CandidateId;
  label: string;
  direction: string;
  seedOffset: number;
  warmth: "soft" | "structured";
};

const candidateVariants: Record<CandidateId, CandidateVariant> = {
  "option-1": {
    id: "option-1",
    label: candidateLabelMap["option-1"],
    direction: candidateDirectionMap["option-1"],
    seedOffset: 11,
    warmth: "soft"
  },
  "option-2": {
    id: "option-2",
    label: candidateLabelMap["option-2"],
    direction: candidateDirectionMap["option-2"],
    seedOffset: 47,
    warmth: "structured"
  }
};

const palettePresets: Record<Classification, PaletteColor[][]> = {
  counseling: [
    [
      { name: "딥 블루그레이", hex: "#40506F", usage: "제목 메인 컬러" },
      { name: "따뜻한 로즈", hex: "#D7837E", usage: "강조 단어와 작은 장식" },
      { name: "세이지 그린", hex: "#8FB285", usage: "잎사귀와 관계 장식" },
      { name: "잉크 네이비", hex: "#1E2430", usage: "가독성 보조 컬러" }
    ],
    [
      { name: "코발트 블루", hex: "#2867B2", usage: "전문적인 제목 포인트" },
      { name: "코랄", hex: "#F26D5B", usage: "핵심 단어 강조" },
      { name: "민트", hex: "#8FD0BD", usage: "얇은 선 장식" },
      { name: "딥 네이비", hex: "#162033", usage: "제목 그림자와 보조 텍스트" }
    ]
  ],
  community: [
    [
      { name: "티크 그린", hex: "#5F8F8B", usage: "제목 메인 컬러" },
      { name: "웜 코랄", hex: "#F2A36B", usage: "강조 단어와 하트" },
      { name: "리프 그린", hex: "#8BBE57", usage: "잎사귀와 연결감" },
      { name: "딥 차콜", hex: "#263238", usage: "가독성 보조 컬러" }
    ],
    [
      { name: "포레스트", hex: "#357A55", usage: "제목 메인 컬러" },
      { name: "피치", hex: "#FF9B73", usage: "따뜻한 강조" },
      { name: "버터 옐로", hex: "#F4CF5D", usage: "작은 사인 장식" },
      { name: "차콜", hex: "#272B2F", usage: "선명한 외곽" }
    ]
  ],
  practice: [
    [
      { name: "시그널 블루", hex: "#2F80ED", usage: "제목 메인 컬러" },
      { name: "액션 오렌지", hex: "#FF9F1C", usage: "핵심 단어 강조" },
      { name: "프레시 그린", hex: "#78C6A3", usage: "체크와 도구 아이콘" },
      { name: "그래파이트", hex: "#20242A", usage: "가독성 보조 컬러" }
    ],
    [
      { name: "네이비", hex: "#1D3557", usage: "전문적인 제목 컬러" },
      { name: "오렌지", hex: "#F77F00", usage: "실행감 강조" },
      { name: "시안", hex: "#4CC9F0", usage: "기술/도구 사인" },
      { name: "블랙", hex: "#111827", usage: "선명한 외곽" }
    ]
  ],
  promotion: [
    [
      { name: "코랄 핑크", hex: "#E95D75", usage: "제목 메인 컬러" },
      { name: "잉크 블랙", hex: "#151515", usage: "가독성 보조 컬러" },
      { name: "레몬", hex: "#F4D35E", usage: "작은 반짝 장식" },
      { name: "블루", hex: "#357DED", usage: "정보성 사인" }
    ],
    [
      { name: "청록", hex: "#2A9D8F", usage: "제목 메인 컬러" },
      { name: "코랄", hex: "#E76F51", usage: "따뜻한 강조" },
      { name: "샌드", hex: "#E9C46A", usage: "소량 장식" },
      { name: "차콜", hex: "#22223B", usage: "제목 외곽" }
    ]
  ],
  reflective: [
    [
      { name: "딥 플럼", hex: "#5E5166", usage: "제목 메인 컬러" },
      { name: "더스티 로즈", hex: "#C58C84", usage: "강조 단어" },
      { name: "뮤트 옐로", hex: "#EACD68", usage: "작은 사인" },
      { name: "차콜", hex: "#2F2F35", usage: "가독성 보조" }
    ],
    [
      { name: "슬레이트", hex: "#52616B", usage: "차분한 제목 컬러" },
      { name: "테라코타", hex: "#C97064", usage: "따뜻한 강조" },
      { name: "올리브", hex: "#9DA65D", usage: "작은 장식" },
      { name: "잉크", hex: "#202124", usage: "선명한 외곽" }
    ]
  ],
  care: [
    [
      { name: "케어 그린", hex: "#6BAA75", usage: "제목 메인 컬러" },
      { name: "웜 오렌지", hex: "#F4A259", usage: "따뜻한 강조" },
      { name: "소프트 블루", hex: "#7EA8BE", usage: "안정감 사인" },
      { name: "브라운 차콜", hex: "#2E2A25", usage: "가독성 보조" }
    ],
    [
      { name: "세이지", hex: "#7A9E7E", usage: "제목 메인 컬러" },
      { name: "살몬", hex: "#E5989B", usage: "부드러운 강조" },
      { name: "페일 블루", hex: "#9BC4CB", usage: "작은 장식" },
      { name: "딥 브라운", hex: "#2D2522", usage: "선명한 외곽" }
    ]
  ]
};

const softTypographyStyles = [
  "rounded bold Korean lettering, soft hand-lettered rhythm, gentle outline, warm spacing, not childish",
  "friendly brush-inspired Korean title lettering, thick but calm strokes, relaxed curves, clean readable shapes",
  "warm editorial Korean headline, rounded corners, subtle shadow, generous inner spacing"
];

const structuredTypographyStyles = [
  "modern Korean display lettering, confident geometric rhythm, clean outline, precise hierarchy",
  "professional bold Korean title typography, structured line breaks, crisp emphasis color, high readability",
  "clear education-poster headline lettering, compact composition, refined contrast, practical and polished"
];

const decorationSets: Record<Classification, { soft: string[][]; structured: string[][] }> = {
  counseling: {
    soft: [
      ["small line heart", "thin listening curve", "two tiny leaf accents"],
      ["small speech bubble icon", "soft curved underline", "one tiny heart"]
    ],
    structured: [
      ["minimal speech bubble icon", "thin bracket line", "small dot accents"],
      ["question mark symbol", "ordered curved line", "small leaf mark"]
    ]
  },
  community: {
    soft: [
      ["small heart line", "leaf sprout", "gentle connecting curve"],
      ["tiny dotted line", "two small hearts", "leaf accent"]
    ],
    structured: [
      ["connected dot line", "small circle network mark", "leaf icon"],
      ["simple link curve", "small heart icon", "ordered dotted accent"]
    ]
  },
  practice: {
    soft: [
      ["small check icon", "tiny sparkle", "rounded tool mark"],
      ["soft arrow curve", "small check mark", "tiny star"]
    ],
    structured: [
      ["check icon", "simple linear tool icon", "small grid dot"],
      ["short action underline", "minimal sparkle", "cursor-like mark"]
    ]
  },
  promotion: {
    soft: [
      ["tiny sparkle", "soft speech bubble", "small dotted line"],
      ["small star", "warm curved underline", "tiny heart"]
    ],
    structured: [
      ["simple sparkle", "short underline", "small corner accent"],
      ["minimal speech bubble", "dot accents", "clean linear mark"]
    ]
  },
  reflective: {
    soft: [
      ["small star", "gentle curved line", "tiny memo mark"],
      ["soft dot trail", "small leaf", "thin underline"]
    ],
    structured: [
      ["minimal memo icon", "thin divider line", "small dot accents"],
      ["ordered underline", "tiny star", "simple quote mark"]
    ]
  },
  care: {
    soft: [
      ["small heart", "leaf sprout", "protective curved line"],
      ["soft plus-like care mark", "gentle curve", "tiny heart"]
    ],
    structured: [
      ["minimal care mark", "thin curved underline", "small check"],
      ["simple shield-like outline", "small leaf", "ordered dot accents"]
    ]
  }
};

const sharedAvoid = [
  "misspelled Korean text",
  "extra readable words",
  "people",
  "person",
  "portrait",
  "character",
  "human illustration",
  "photo",
  "scene",
  "room",
  "wall",
  "paper background",
  "card background",
  "banner background",
  "solid rectangle background",
  "large illustration",
  "frame",
  "official logo",
  "heavy 3D",
  "aggressive comic logo",
  "distorted Korean letters",
  "tiny unreadable decorations",
  "crowded sticker composition"
];

export function buildCandidatePromptSets(form: EducationImageForm): GeneratedCandidateSet {
  const normalizedForm = normalizePromptForm(form);
  const candidates = Object.fromEntries(
    candidateOrder.map((candidateId) => {
      const variant = candidateVariants[candidateId];
      const promptSet = buildPromptSetForVariant(normalizedForm, variant);
      return [candidateId, promptSet];
    })
  ) as Record<CandidateId, GeneratedPromptSet>;

  return {
    id: `candidate-set-${createStableHash(`${normalizedForm.title}-${normalizedForm.styleSeed}-${normalizedForm.size}`)}`,
    candidates,
    size: normalizedForm.size,
    quality: "high",
    usedFallback: true
  };
}

export function buildPromptSet(form: EducationImageForm): GeneratedPromptSet {
  return buildPromptSetForVariant(normalizePromptForm(form), candidateVariants["option-1"]);
}

export function buildPromptLocally(form: EducationImageForm): GeneratedPrompt {
  const set = buildPromptSet(form);
  return set.prompts[form.outputType];
}

export function composeImagePrompt(form: EducationImageForm, _analysis: PromptAnalysis, _palette: PaletteColor[]) {
  return buildPromptLocally(form).prompt;
}

export function isTransparentOutput(outputType: string): outputType is OutputType {
  return outputType === "decorated-title" || outputType === "title-only" || outputType === "icons-only";
}

function buildPromptSetForVariant(form: EducationImageForm, variant: CandidateVariant): GeneratedPromptSet {
  const designSpec = createDesignSpec(form, variant);
  const prompts: Record<OutputType, GeneratedPrompt> = {
    "decorated-title": buildPromptFromSpec(form, designSpec, "decorated-title"),
    "title-only": buildPromptFromSpec(form, designSpec, "title-only"),
    "icons-only": buildPromptFromSpec(form, designSpec, "icons-only")
  };

  return {
    id: designSpec.id,
    designSpec,
    prompts,
    size: form.size,
    quality: "high",
    usedFallback: true
  };
}

function normalizePromptForm(form: EducationImageForm): EducationImageForm {
  return {
    ...form,
    title: form.title.trim(),
    promotionCopy: form.promotionCopy.trim(),
    topics: form.topics.map((item) => item.trim()).filter(Boolean),
    audiences: form.audiences.map((item) => item.trim()).filter(Boolean),
    outputType: form.outputType || "decorated-title",
    textMode: form.textMode || "with-text",
    quality: "high",
    size: form.size,
    styleSeed: form.styleSeed || Date.now()
  };
}

function createDesignSpec(form: EducationImageForm, variant: CandidateVariant): DesignSpec {
  const category = classifyEducation(form);
  const seed = Math.abs(form.styleSeed + variant.seedOffset);
  const palette = pickPalette(category, seed, variant);
  const typographyStyle = pickTypography(seed, variant);
  const decorations = pickDecorations(category, seed, variant);
  const keywords = getKeywords(form, category);
  const { width, height } = parseImageSize(form.size);
  const titlePlacement =
    height >= width
      ? "centered square composition, stacked title in two or three balanced Korean lines"
      : "centered wide composition, title dominant, one or two natural Korean lines";

  return {
    id: `design-${createStableHash(`${form.title}|${form.promotionCopy}|${form.size}|${seed}|${variant.id}`)}`,
    candidateId: variant.id,
    candidateLabel: variant.label,
    variantDirection: variant.direction,
    coreEmotion: `${getCoreEmotion(category)} / ${variant.direction}`,
    keywords,
    topicCategory: category,
    visualMetaphor: getVisualMetaphor(category),
    palette,
    typographyStyle,
    lineBreakPlan: getLineBreakPlan(form.title, form.size),
    titlePlacement,
    decorations,
    emphasisWords: keywords.slice(0, 3),
    avoid: sharedAvoid,
    size: form.size
  };
}

function buildPromptFromSpec(form: EducationImageForm, spec: DesignSpec, outputType: OutputType): GeneratedPrompt {
  const analysis: PromptAnalysis = {
    coreEmotion: spec.coreEmotion,
    keywords: spec.keywords,
    visualMetaphor: spec.visualMetaphor,
    recommendedColors: spec.palette.map((color) => `${color.name} ${color.hex}`),
    avoid: spec.avoid,
    titlePlacement: spec.titlePlacement,
    typographyStyle: spec.typographyStyle,
    aspectRatio: spec.size,
    transparentBackground: true,
    designSpecId: spec.id
  };

  return {
    analysis,
    prompt: createImagePrompt(form, spec, outputType),
    negativePrompt: spec.avoid.join(", "),
    palette: spec.palette,
    outputType,
    textMode: outputType === "icons-only" ? "without-text" : "with-text",
    size: spec.size,
    quality: "high",
    designSpec: spec,
    usedFallback: true
  };
}

function createImagePrompt(form: EducationImageForm, spec: DesignSpec, outputType: OutputType) {
  const title = form.title.trim();
  const topics = form.topics.filter(Boolean).join(" / ") || "infer from the Korean title";
  const audiences = form.audiences.filter(Boolean).join(" / ") || "infer from the education context";
  const paletteText = spec.palette.map((color) => `${color.name} ${color.hex} (${color.usage})`).join(", ");
  const decorationText = spec.decorations.join(", ");
  const candidateText = `${spec.candidateLabel ?? "selected option"}: ${spec.variantDirection ?? "locked style"}`;
  const sharedLock = [
    `DESIGN LOCK ID: ${spec.id}.`,
    `Candidate style: ${candidateText}.`,
    "All outputs derived from this selected candidate must look like one coherent set.",
    `Use exactly this visual system: palette ${paletteText}; typography ${spec.typographyStyle}; line breaks ${spec.lineBreakPlan}; decorations ${decorationText}; title placement ${spec.titlePlacement}.`,
    "Use only the Korean title and/or the listed decorative elements according to the output type.",
    "Fully transparent background is required. If transparency is not directly supported, render on pure white #FFFFFF only for later background removal.",
    "No people. No character. No scene. No photo. No wall. No paper. No card. No banner background. No solid rectangle. No large illustration. No frame.",
    "Reusable isolated PNG asset for Canva or Korean education promotional materials.",
    "Human Impact Cooperative mood: warm, professional, people-centered, relationship-centered, field-practical. Keep comfortable transparent margins."
  ].join("\n");

  const context = [
    `Main Korean title: "${title}"`,
    `Promotion copy: ${form.promotionCopy || "not provided"}`,
    `Topics: ${topics}`,
    `Target learners: ${audiences}`,
    `Core emotion: ${spec.coreEmotion}`,
    `Recommended emphasis words: ${spec.emphasisWords.join(", ")}`
  ].join("\n");

  if (outputType === "decorated-title") {
    return [
      "Create a reusable transparent Korean headline design asset.",
      context,
      sharedLock,
      "OUTPUT: Decorated title transparent PNG candidate.",
      `Render the Korean headline exactly: "${title}".`,
      "The headline must be dominant and readable. Add only a few small secondary decorations from the locked decoration list.",
      "Decorations must support the title; do not let them compete with readability.",
      "Make this candidate visually distinct from the other candidate by following the candidate style direction, but keep quality equal.",
      "No subtitle, no paragraph text, no extra readable labels.",
      `Avoid: ${spec.avoid.join(", ")}.`
    ].join("\n");
  }

  if (outputType === "title-only") {
    return [
      "Create the title-only layer derived from the selected decorated candidate.",
      context,
      sharedLock,
      "OUTPUT: Title-only transparent PNG.",
      `Render only the Korean headline exactly: "${title}".`,
      "Keep the same typography direction, color palette, emphasis colors, line break plan, scale, and title placement as the selected decorated title candidate.",
      "Remove all icons, hearts, leaves, curves, dotted lines, speech bubbles, stickers, stars, sparkles, and all other decorative elements.",
      "Only the Korean headline lettering may remain. Do not redesign the title independently.",
      `Avoid: ${spec.avoid.join(", ")}.`
    ].join("\n");
  }

  return [
    "Create the decoration-only layer derived from the selected decorated candidate.",
    context,
    sharedLock,
    "OUTPUT: Icons and decorations only transparent PNG.",
    "Do not render the title. Do not render any readable Korean, English, numbers, subtitle, or labels.",
    `Render only the same decoration elements from the selected decorated title candidate: ${decorationText}.`,
    "Keep the same decoration colors, line weight, scale relationship, spacing, and placement logic as the selected decorated title candidate.",
    "Do not invent a new icon set. Do not add unrelated icons. Do not redesign independently.",
    `Avoid: ${spec.avoid.join(", ")}.`
  ].join("\n");
}

function pickPalette(classification: Classification, seed: number, variant: CandidateVariant) {
  const palettes = palettePresets[classification] ?? palettePresets.community;
  const baseIndex = Math.abs(seed + (variant.warmth === "structured" ? 1 : 0)) % palettes.length;
  return palettes[baseIndex];
}

function pickTypography(seed: number, variant: CandidateVariant) {
  const styles = variant.warmth === "soft" ? softTypographyStyles : structuredTypographyStyles;
  return styles[Math.abs(seed) % styles.length];
}

function pickDecorations(classification: Classification, seed: number, variant: CandidateVariant) {
  const sets = decorationSets[classification] ?? decorationSets.community;
  const options = sets[variant.warmth];
  return options[Math.abs(seed) % options.length];
}

function classifyEducation(form: EducationImageForm): Classification {
  const source = `${form.title} ${form.promotionCopy} ${form.topics.join(" ")} ${form.audiences.join(" ")}`;

  if (/주민|조직화|마을|공동체|고립|외로움|관계망|상호돌봄|타임뱅크|연결|지역복지/.test(source)) {
    return "community";
  }

  if (/상담|사례관리|심리|경청|질문|신뢰|대화|면담|감정|소진|해결중심/.test(source)) {
    return "counseling";
  }

  if (/AI|인공지능|스마트|도구|자동화|업무|실무|현장|성과|기획|평가|엑셀|스프레드시트/.test(source)) {
    return "practice";
  }

  if (/홍보|마케팅|브랜드|콘텐츠|PR|소식|캠페인|포스터|카드뉴스/.test(source)) {
    return "promotion";
  }

  if (/돌봄|의료|통합돌봄|안전|건강|중독|정신건강|위기/.test(source)) {
    return "care";
  }

  if (/인권|존엄|철학|인문|글쓰기|리더십|조직|갈등|소통|성찰|마음|회복/.test(source)) {
    return "reflective";
  }

  return "community";
}

function getCoreEmotion(classification: Classification) {
  const values: Record<Classification, string> = {
    counseling: "차분한 전문성, 신뢰, 따뜻한 관계 회복",
    community: "사람 중심, 연결감, 공동체 에너지, 현장 실천",
    practice: "명확함, 실행력, 도구를 쓰는 자신감",
    promotion: "눈에 띄지만 과하지 않은 전달력",
    reflective: "성찰, 깊이, 안정감, 따뜻한 사유",
    care: "돌봄, 안정감, 현장의 온기, 안전한 관계"
  };

  return values[classification];
}

function getVisualMetaphor(classification: Classification) {
  const values: Record<Classification, string> = {
    counseling: "대화의 리듬, 질문과 경청으로 이어지는 얇은 선",
    community: "사람과 사람을 잇는 부드러운 연결선과 작은 돌봄의 표시",
    practice: "업무 흐름, 체크, 도구, 실행으로 이어지는 선",
    promotion: "콘텐츠 반짝임, 전달력 있는 말풍선과 작은 사인",
    reflective: "조용한 빛, 사유의 메모와 얇은 표시",
    care: "보호하는 선, 돌봄의 손길을 상징하는 작은 하트와 잎"
  };

  return values[classification];
}

function getKeywords(form: EducationImageForm, classification: Classification) {
  const titleWords = form.title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 3);
  const byClass: Record<Classification, string[]> = {
    counseling: ["상담", "신뢰", "질문", "관계", "전문성"],
    community: ["사람중심", "연결", "공동체", "회복", "실천"],
    practice: ["실무", "도구", "자동화", "명확함", "실행"],
    promotion: ["홍보", "콘텐츠", "전달력", "브랜드", "관계"],
    reflective: ["성찰", "존엄", "소통", "깊이", "성장"],
    care: ["돌봄", "안전", "관계", "회복", "현장"]
  };

  return [...titleWords, ...byClass[classification]].slice(0, 6);
}

function getLineBreakPlan(title: string, size: ImageSize) {
  if (title.includes("\n")) {
    return `preserve the user's manual line breaks: ${title
      .split(/\r?\n/)
      .map((line) => `"${line.trim()}"`)
      .join(" / ")}`;
  }

  const targetLines = size === "1500x1500" ? 3 : 2;
  const lines = splitTitleForPrompt(title, targetLines);

  if (size === "1500x416") {
    return `prefer one line if the title remains readable; otherwise use these natural Korean breaks: ${quoteLines(lines)}`;
  }

  if (size === "1500x1500") {
    return `use two or three stacked balanced Korean lines: ${quoteLines(lines)}`;
  }

  return `use one or two centered lines with natural Korean phrase breaks: ${quoteLines(lines)}`;
}

function splitTitleForPrompt(title: string, maxLines: number) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();

  if (maxLines <= 1 || cleanTitle.length <= 12) {
    return [cleanTitle];
  }

  const commaIndex = cleanTitle.indexOf(",");
  if (commaIndex > 0 && maxLines === 2) {
    const before = cleanTitle.slice(0, commaIndex + 1).trim();
    const after = cleanTitle.slice(commaIndex + 1).trim();
    const afterWords = after.split(/\s+/).filter(Boolean);

    if (before.replace(/\s/g, "").length <= 6 && afterWords.length >= 3) {
      const firstAfter: string[] = [];
      const restAfter = [...afterWords];

      while (restAfter.length > 0 && firstAfter.length < 2) {
        firstAfter.push(restAfter.shift() as string);
      }

      if (restAfter.length > 0 && /(로|으로|와|과|에|에서|까지)$/.test(firstAfter[firstAfter.length - 1])) {
        return [`${before} ${firstAfter.join(" ")}`, restAfter.join(" ")];
      }
    }

    if (before.length >= cleanTitle.length * 0.35) {
      return [before, after];
    }
  }

  const words = cleanTitle.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let remainingWords = [...words];

  for (let lineIndex = 0; lineIndex < maxLines - 1 && remainingWords.length > 1; lineIndex += 1) {
    const remainingText = remainingWords.join(" ");
    const targetLength = Math.ceil(remainingText.replace(/\s/g, "").length / (maxLines - lineIndex));
    let current: string[] = [];

    while (remainingWords.length > 1) {
      const nextWord = remainingWords[0];
      const nextLength = [...current, nextWord].join("").replace(/\s/g, "").length;
      if (current.length > 0 && nextLength > targetLength + 2) {
        break;
      }
      current.push(remainingWords.shift() as string);
    }

    lines.push(current.join(" "));
  }

  if (remainingWords.length > 0) {
    lines.push(remainingWords.join(" "));
  }

  return lines.filter(Boolean);
}

function quoteLines(lines: string[]) {
  return lines.map((line) => `"${line}"`).join(" / ");
}

function createStableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}
