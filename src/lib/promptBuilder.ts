import { outputTypeLabelMap, parseImageSize } from "@/lib/generativeOptions";
import type {
  DesignSpec,
  EducationImageForm,
  GeneratedPrompt,
  GeneratedPromptSet,
  ImageSize,
  OutputType,
  PaletteColor,
  PromptAnalysis
} from "@/lib/generativeTypes";

type Classification = "counseling" | "community" | "practice" | "promotion" | "reflective" | "care";

const palettePresets: Record<Classification, PaletteColor[][]> = {
  counseling: [
    [
      { name: "신뢰 블루그레이", hex: "#40506F", usage: "제목 메인 컬러" },
      { name: "따뜻한 로즈", hex: "#D7837E", usage: "강조 단어와 작은 장식" },
      { name: "세이지", hex: "#8FB285", usage: "잎사귀나 관계 장식" },
      { name: "잉크 네이비", hex: "#1E2430", usage: "얇은 외곽선과 가독성" }
    ],
    [
      { name: "코발트", hex: "#2867B2", usage: "제목 메인 컬러" },
      { name: "코랄", hex: "#F26D5B", usage: "강조 단어" },
      { name: "민트", hex: "#8FD0BD", usage: "작은 곡선 장식" },
      { name: "딥 네이비", hex: "#162033", usage: "보조 텍스트 컬러" }
    ]
  ],
  community: [
    [
      { name: "휴먼 틸", hex: "#5F8F8B", usage: "제목 메인 컬러" },
      { name: "따뜻한 코랄", hex: "#F2A36B", usage: "강조 단어와 하트" },
      { name: "리프 그린", hex: "#8BBE57", usage: "잎사귀와 연결감" },
      { name: "딥 잉크", hex: "#263238", usage: "가독성 보조" }
    ],
    [
      { name: "포레스트", hex: "#357A55", usage: "제목 메인 컬러" },
      { name: "피치", hex: "#FF9B73", usage: "강조 단어" },
      { name: "버터 옐로", hex: "#F4CF5D", usage: "작은 포인트" },
      { name: "차콜", hex: "#272B2F", usage: "외곽선" }
    ]
  ],
  practice: [
    [
      { name: "시그널 블루", hex: "#2F80ED", usage: "제목 메인 컬러" },
      { name: "액션 오렌지", hex: "#FF9F1C", usage: "강조 단어" },
      { name: "프레시 그린", hex: "#78C6A3", usage: "체크와 도구 아이콘" },
      { name: "그래파이트", hex: "#20242A", usage: "가독성 보조" }
    ],
    [
      { name: "네이비", hex: "#1D3557", usage: "제목 메인 컬러" },
      { name: "오렌지", hex: "#F77F00", usage: "실행감 강조" },
      { name: "시안", hex: "#4CC9F0", usage: "디지털 포인트" },
      { name: "블랙", hex: "#111827", usage: "외곽선" }
    ]
  ],
  promotion: [
    [
      { name: "코랄 핑크", hex: "#E95D75", usage: "제목 메인 컬러" },
      { name: "잉크 블랙", hex: "#151515", usage: "가독성 보조" },
      { name: "레몬", hex: "#F4D35E", usage: "작은 라벨 장식" },
      { name: "블루", hex: "#357DED", usage: "정보성 포인트" }
    ]
  ],
  reflective: [
    [
      { name: "딥 플럼", hex: "#5E5166", usage: "제목 메인 컬러" },
      { name: "더스티 로즈", hex: "#C58C84", usage: "강조 단어" },
      { name: "뮤트 옐로", hex: "#EACD68", usage: "작은 포인트" },
      { name: "차콜", hex: "#2F2F35", usage: "가독성 보조" }
    ]
  ],
  care: [
    [
      { name: "케어 그린", hex: "#6BAA75", usage: "제목 메인 컬러" },
      { name: "웜 오렌지", hex: "#F4A259", usage: "따뜻한 강조" },
      { name: "소프트 블루", hex: "#7EA8BE", usage: "안정감 포인트" },
      { name: "브라운 잉크", hex: "#2E2A25", usage: "가독성 보조" }
    ]
  ]
};

const typographyStyles = [
  "굵고 부드러운 휴먼 산스 한글 레터링, 둥근 모서리, 안정적인 자간",
  "따뜻한 교육 포스터형 한글 타이포, 핵심 단어만 색상 강조",
  "차분한 에디토리얼 한글 헤드라인, 큰 글자와 넉넉한 여백",
  "현장 실천형 모던 한글 타이포, 단정한 굵기와 선명한 획",
  "부드러운 손글씨 감각을 살린 정돈된 한글 레터링, 가독성 우선",
  "캔바에 얹기 좋은 워드마크형 한글 제목, 과하지 않은 외곽선"
];

const decorationSets: Record<Classification, string[][]> = {
  counseling: [
    ["작은 말풍선", "짧은 곡선 밑줄", "작은 하트"],
    ["질문 표시 아이콘", "부드러운 점선", "작은 잎사귀"]
  ],
  community: [
    ["연결 곡선", "작은 하트", "잎사귀"],
    ["점선 연결선", "작은 사람 원형 아이콘", "부드러운 곡선"]
  ],
  practice: [
    ["체크 아이콘", "짧은 밑줄", "작은 노트북 아이콘"],
    ["커서 아이콘", "작은 별", "액션 라인"]
  ],
  promotion: [
    ["작은 라벨 모양", "짧은 밑줄", "말풍선"],
    ["작은 별", "점선", "콘텐츠 카드 아이콘"]
  ],
  reflective: [
    ["작은 별", "부드러운 곡선", "작은 메모 아이콘"],
    ["빛 점 장식", "짧은 밑줄", "작은 원형 아이콘"]
  ],
  care: [
    ["작은 하트", "잎사귀", "보호 원형 라인"],
    ["돌봄 손 아이콘", "부드러운 곡선", "작은 체크"]
  ]
};

const sharedAvoid = [
  "misspelled Korean text",
  "extra readable words",
  "people",
  "portrait",
  "photo",
  "scene",
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
  "tiny unreadable decorations"
];

export function buildPromptSet(form: EducationImageForm): GeneratedPromptSet {
  const normalizedForm = {
    ...form,
    title: form.title.trim(),
    promotionCopy: form.promotionCopy.trim(),
    topics: form.topics.filter(Boolean),
    audiences: form.audiences.filter(Boolean),
    quality: "high" as const
  };
  const designSpec = createDesignSpec(normalizedForm);
  const prompts = {
    "decorated-title": buildPromptFromSpec(normalizedForm, designSpec, "decorated-title"),
    "title-only": buildPromptFromSpec(normalizedForm, designSpec, "title-only"),
    "icons-only": buildPromptFromSpec(normalizedForm, designSpec, "icons-only")
  };

  return {
    id: designSpec.id,
    designSpec,
    prompts,
    size: normalizedForm.size,
    quality: "high",
    usedFallback: true
  };
}

export function buildPromptLocally(form: EducationImageForm): GeneratedPrompt {
  const set = buildPromptSet(form);
  return set.prompts[form.outputType];
}

export function composeImagePrompt(form: EducationImageForm, analysis: PromptAnalysis, palette: PaletteColor[]) {
  const prompt = buildPromptLocally({
    ...form,
    quality: "high",
    palette,
  } as EducationImageForm);

  return prompt.prompt;
}

export function isTransparentOutput(outputType: string): outputType is OutputType {
  return outputType === "decorated-title" || outputType === "title-only" || outputType === "icons-only";
}

function createDesignSpec(form: EducationImageForm): DesignSpec {
  const category = classifyEducation(form);
  const palette = pickPalette(category, form.styleSeed);
  const typographyStyle = typographyStyles[Math.abs(form.styleSeed) % typographyStyles.length];
  const decorations = pickDecorations(category, form.styleSeed);
  const keywords = getKeywords(form, category);
  const { width, height } = parseImageSize(form.size);

  return {
    id: `design-${Math.abs(form.styleSeed).toString(36)}-${form.size}`,
    coreEmotion: getCoreEmotion(category),
    keywords,
    topicCategory: category,
    visualMetaphor: getVisualMetaphor(category),
    palette,
    typographyStyle,
    lineBreakPlan: getLineBreakPlan(form.title, form.size),
    titlePlacement:
      height >= width ? "정사각형 중앙 배치, 제목을 2-3줄로 안정적으로 쌓기" : "가로형 중앙 배치, 제목을 1-2줄 중심으로 넓게 배치",
    decorations,
    emphasisWords: keywords.slice(0, 2),
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
  const audiences = form.audiences.filter(Boolean).join(" / ") || "infer from education context";
  const paletteText = spec.palette.map((color) => `${color.name} ${color.hex} (${color.usage})`).join(", ");
  const decorationText = spec.decorations.join(", ");
  const sharedLock = [
    `DESIGN LOCK ID: ${spec.id}.`,
    "All outputs in this set must look like the same design family.",
    `Use exactly this visual system: palette ${paletteText}; typography ${spec.typographyStyle}; line breaks ${spec.lineBreakPlan}; decorations ${decorationText}; title placement ${spec.titlePlacement}.`,
    "Use only the Korean title and/or the listed decorative elements according to the output type.",
    "Fully transparent background is required. If transparency is not directly supported, render on pure white #FFFFFF only for later background removal.",
    "No people. No scene. No photo. No wall. No paper. No card. No banner background. No solid rectangle. No large illustration. No frame.",
    "Reusable isolated PNG asset for Canva or Korean education promotional materials.",
    "Clean, warm, professional, human-centered, relationship-centered. Keep comfortable transparent margins."
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
      "OUTPUT 1: Decorated title transparent PNG.",
      `Render the Korean headline exactly: "${title}".`,
      "The headline must be dominant. Add only a few small secondary decorations from the locked decoration list.",
      "Decorations must be smaller than the title and must not compete with readability.",
      "No subtitle, no paragraph text, no extra readable labels.",
      `Avoid: ${spec.avoid.join(", ")}.`
    ].join("\n");
  }

  if (outputType === "title-only") {
    return [
      "Create the title-only layer from the same design system.",
      context,
      sharedLock,
      "OUTPUT 2: Title-only transparent PNG.",
      `Render only the Korean headline exactly: "${title}".`,
      "Keep the exact same typography direction, color palette, emphasis color, line break plan, scale, and title placement as OUTPUT 1.",
      "Remove all icons, hearts, leaves, curves, dotted lines, speech bubbles, stickers, stars, and all other decorative elements.",
      "Only the Korean headline lettering may remain.",
      `Avoid: ${spec.avoid.join(", ")}.`
    ].join("\n");
  }

  return [
    "Create the decoration-only layer from the same design system.",
    context,
    sharedLock,
    "OUTPUT 3: Icons and decorations only transparent PNG.",
    "Do not render the title. Do not render any readable Korean, English, numbers, subtitle, or labels.",
    `Render only the same decoration elements from OUTPUT 1: ${decorationText}.`,
    "Keep the same decoration colors, line weight, scale relationship, spacing, and placement logic as OUTPUT 1.",
    "Do not invent a new icon set. Do not add unrelated icons.",
    `Avoid: ${spec.avoid.join(", ")}.`
  ].join("\n");
}

function pickPalette(classification: Classification, seed: number) {
  const palettes = palettePresets[classification] ?? palettePresets.community;
  return palettes[Math.abs(seed) % palettes.length];
}

function pickDecorations(classification: Classification, seed: number) {
  const sets = decorationSets[classification] ?? decorationSets.community;
  return sets[Math.abs(seed) % sets.length];
}

function classifyEducation(form: EducationImageForm): Classification {
  const source = `${form.title} ${form.promotionCopy} ${form.topics.join(" ")} ${form.audiences.join(" ")}`;

  if (/주민|조직화|마을|공동체|고립|외로움|관계망|상호돌봄|타임뱅크|연결|지역복지/.test(source)) {
    return "community";
  }

  if (/상담|사례관리|심리|경청|질문|신뢰|대화|내담|감정|소진|해결중심/.test(source)) {
    return "counseling";
  }

  if (/AI|인공지능|스마트|구글|디지털|자동화|업무|실무|도구|회계|행정|성과|평가|기획|스프레드시트/.test(source)) {
    return "practice";
  }

  if (/홍보|마케팅|브랜드|콘텐츠|PR|관계\(PR\)|소식|캠페인/.test(source)) {
    return "promotion";
  }

  if (/돌봄|어르신|노인|통합돌봄|안전|건강|중독|정신건강/.test(source)) {
    return "care";
  }

  if (/인권|존엄|철학|인문|글쓰기|리더십|조직|갈등|소통|성찰|마음|행복/.test(source)) {
    return "reflective";
  }

  return "community";
}

function getCoreEmotion(classification: Classification) {
  const values: Record<Classification, string> = {
    counseling: "차분한 전문성, 신뢰, 따뜻한 대화, 관계 회복",
    community: "사람중심, 연결감, 공동체 에너지, 현장 실천",
    practice: "명확함, 실행력, 디지털 활기, 실무 자신감",
    promotion: "눈에 띄지만 과하지 않은 홍보성, 밝은 전달력",
    reflective: "성찰, 깊이, 품격, 따뜻한 사유",
    care: "돌봄, 안정감, 현장의 온기, 안전한 관계"
  };

  return values[classification];
}

function getVisualMetaphor(classification: Classification) {
  const values: Record<Classification, string> = {
    counseling: "대화의 리듬, 질문이 통찰로 이어지는 장면, 신뢰의 연결선",
    community: "사람과 사람을 잇는 부드러운 연결선, 공동체 원, 상호돌봄",
    practice: "업무 흐름, 체크, 도구, 실행으로 이어지는 선",
    promotion: "콘텐츠 라벨, 전달력 있는 밑줄, 부드러운 말풍선",
    reflective: "조용한 빛, 사유의 원, 메모와 쉼표",
    care: "보호하는 원, 돌봄의 손, 작은 하트와 잎"
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
    return "preserve the user's manual line breaks";
  }

  if (size === "1500x416") {
    return "prefer one line if short; otherwise two balanced lines";
  }

  if (size === "1500x1500") {
    return "two or three stacked lines with balanced rhythm";
  }

  return "one or two centered lines with natural Korean phrase breaks";
}
