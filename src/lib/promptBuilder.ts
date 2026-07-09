import { outputTypeLabelMap } from "@/lib/generativeOptions";
import type { EducationImageForm, GeneratedPrompt, OutputType, PromptAnalysis } from "@/lib/generativeTypes";

type Palette = Array<{ name: string; hex: string; usage: string }>;
type Classification = "counseling" | "community" | "practice" | "promotion" | "reflective" | "care";

const humanImpactBasePalette: Palette = [
  { name: "Human Teal", hex: "#5F8F8B", usage: "사람중심과 연결감" },
  { name: "Warm Coral", hex: "#F2B38A", usage: "따뜻한 강조" },
  { name: "Sage Green", hex: "#93B46E", usage: "현장 실천과 회복" },
  { name: "Cream Paper", hex: "#F8F4EC", usage: "부드러운 여백" },
  { name: "Deep Ink", hex: "#2F3A40", usage: "제목 가독성" }
];

const palettePresets: Record<Classification, Palette[]> = {
  counseling: [
    [
      { name: "Deep Blue Gray", hex: "#40506F", usage: "신뢰와 전문성" },
      { name: "Dusty Rose", hex: "#D7837E", usage: "관계의 온도" },
      { name: "Warm Cream", hex: "#FFF1DD", usage: "편안한 배경 제거용 여백" },
      { name: "Sage", hex: "#8FB285", usage: "회복과 성장 아이콘" },
      { name: "Ink Black", hex: "#1E2430", usage: "굵은 제목 외곽선" }
    ],
    [
      { name: "Cobalt Trust", hex: "#2867B2", usage: "명확한 상담 기술" },
      { name: "Coral Voice", hex: "#F26D5B", usage: "대화와 감정 강조" },
      { name: "Ivory", hex: "#FFF7EA", usage: "깨끗한 후처리 배경" },
      { name: "Mint Calm", hex: "#8FD0BD", usage: "부드러운 장식" },
      { name: "Navy Ink", hex: "#162033", usage: "읽히는 큰 글자" }
    ]
  ],
  community: [
    [
      { name: "Human Teal", hex: "#5F8F8B", usage: "관계망과 공동체" },
      { name: "Action Orange", hex: "#F2994A", usage: "실천 에너지" },
      { name: "Leaf Green", hex: "#8BBE57", usage: "회복과 상호돌봄" },
      { name: "Warm Yellow", hex: "#FFD76A", usage: "밝은 연결감" },
      { name: "Deep Ink", hex: "#263238", usage: "굵은 제목" }
    ],
    [
      { name: "Forest Green", hex: "#357A55", usage: "마을과 지속성" },
      { name: "Peach Coral", hex: "#FF9B73", usage: "사람 사이 온기" },
      { name: "Butter Yellow", hex: "#FFE177", usage: "밝은 스티커 장식" },
      { name: "Sky Mint", hex: "#A8D8C8", usage: "연결선" },
      { name: "Charcoal", hex: "#272B2F", usage: "제목 외곽선" }
    ]
  ],
  practice: [
    [
      { name: "Signal Blue", hex: "#2F80ED", usage: "AI와 실무 도구" },
      { name: "Action Orange", hex: "#FF9F1C", usage: "도전과 실행" },
      { name: "Lime Green", hex: "#9BD23C", usage: "체크와 성장" },
      { name: "Clean White Blue", hex: "#F2F8FF", usage: "선명한 여백" },
      { name: "Graphite", hex: "#20242A", usage: "강한 제목" }
    ],
    [
      { name: "Navy", hex: "#1D3557", usage: "전문성과 구조" },
      { name: "Hot Orange", hex: "#F77F00", usage: "현장 실행" },
      { name: "Fresh Cyan", hex: "#4CC9F0", usage: "디지털 감각" },
      { name: "Yellow Pop", hex: "#FFD166", usage: "스티커 포인트" },
      { name: "Near Black", hex: "#111827", usage: "제목 가독성" }
    ]
  ],
  promotion: [
    [
      { name: "Poster Pink", hex: "#F765A3", usage: "눈에 띄는 홍보성" },
      { name: "Ink Black", hex: "#151515", usage: "강한 외곽선" },
      { name: "Paper White", hex: "#FFFFFF", usage: "투명 후처리 배경" },
      { name: "Lemon", hex: "#F8D84E", usage: "스티커 하이라이트" },
      { name: "Blue Accent", hex: "#357DED", usage: "정보성 포인트" }
    ]
  ],
  reflective: [
    [
      { name: "Deep Plum", hex: "#5E5166", usage: "성찰과 깊이" },
      { name: "Rose Beige", hex: "#C58C84", usage: "따뜻한 감정" },
      { name: "Muted Yellow", hex: "#EACD68", usage: "작은 강조" },
      { name: "Soft Mauve", hex: "#D9C7CA", usage: "부드러운 장식" },
      { name: "Charcoal", hex: "#2F2F35", usage: "제목 가독성" }
    ]
  ],
  care: [
    [
      { name: "Care Green", hex: "#6BAA75", usage: "돌봄과 안정" },
      { name: "Warm Orange", hex: "#F4A259", usage: "현장 온기" },
      { name: "Soft Blue", hex: "#7EA8BE", usage: "신뢰와 안전" },
      { name: "Cream", hex: "#FFF3DE", usage: "후처리 여백" },
      { name: "Deep Brown Ink", hex: "#2E2A25", usage: "제목 외곽선" }
    ]
  ]
};

const typographyStyles = [
  "clean bold Korean title lettering, warm professional tone, one subtle color accent, no comic-book styling",
  "rounded humanist Hangul display lettering, friendly and readable, soft corners, restrained highlight stroke",
  "editorial Korean headline lettering, confident but calm, generous spacing, balanced word hierarchy",
  "modern geometric Hangul lettering, simple solid fills, subtle offset accent, crisp vector-like edges",
  "warm handwritten-inspired Korean lettering, polished and readable, one underline accent at most",
  "soft premium education-poster lettering, heavy weight, gentle curves, understated color contrast",
  "balanced mixed Hangul lettering: one key word emphasized, the rest clean and stable, no extreme outline",
  "calm poster title typography, clear social-welfare education mood, refined Canva-ready wordmark"
];

const thumbnailGrammar = [
  "Use Human Impact education-thumbnail grammar in a moderated way: clear Korean title typography, warm people-centered color, simple underline or speech-bubble cues, a few small education icons only when the output type allows decoration.",
  "Aim for polished education promotion, not a comic logo, game logo, sports emblem, mascot sticker, or challenge-poster style.",
  "Use 2-3 main colors, quiet contrast, clean edges, and enough whitespace. Avoid overstuffed decorations, aggressive outlines, warped perspective, heavy shadows, and tiny details.",
  "Do not copy or recreate the official logo, lecturer photos, or any exact existing thumbnail."
].join(" ");

const transparentAssetRules = [
  "Create the artwork on a pure white #FFFFFF background only because the app will remove white pixels into transparency after generation.",
  "The actual intended final file is a transparent PNG asset, not a full poster background.",
  "Use simple solid colored shapes with crisp anti-aliased edges. Avoid very thin strokes, noisy texture, soft white glow, white lettering, pale near-white details, blurred shadows, halftone clouds, or distressed effects that would be damaged by background removal.",
  "Leave clear padding around the asset so it can be placed directly in Canva or MiriCanvas.",
  "Make it high-resolution, crisp, print-quality, 300dpi-ready PNG artwork."
].join(" ");

export function buildPromptLocally(form: EducationImageForm): GeneratedPrompt {
  const classification = classifyEducation(form);
  const palette = pickPalette(classification, form.styleSeed);
  const typographyStyle = typographyStyles[Math.abs(form.styleSeed) % typographyStyles.length];
  const transparentBackground = isTransparentOutput(form.outputType);
  const analysis: PromptAnalysis = {
    coreEmotion: getCoreEmotion(classification),
    keywords: getKeywords(form, classification),
    visualMetaphor: getVisualMetaphor(classification, form.outputType),
    recommendedColors: palette.map((color) => `${color.name} ${color.hex}`),
    avoid: [
      "misspelled Korean text",
      "extra readable words",
      "official logo replication",
      "lecturer portrait or stock photo",
      "full poster background",
      "tiny unreadable typography",
      "flat default font",
      "overly bland beige-only design",
      "white lettering or white icons on white background",
      "extreme comic-book logo style",
      "too many decorative icons",
      "heavy 3D extrusion",
      "jagged pixelated edges",
      "distorted or warped Korean letters"
    ],
    titlePlacement: getTitlePlacement(form.outputType),
    typographyStyle,
    aspectRatio: form.size,
    transparentBackground
  };

  return {
    analysis,
    prompt: composeImagePrompt(form, analysis, palette),
    negativePrompt: analysis.avoid.join(", "),
    palette,
    outputType: form.outputType,
    textMode: form.outputType === "icons-transparent" ? "without-text" : "with-text",
    size: form.size,
    quality: "high",
    usedFallback: true
  };
}

export function composeImagePrompt(form: EducationImageForm, analysis: PromptAnalysis, palette: Palette) {
  const title = form.title.trim();
  const topics = form.topics.filter(Boolean).join(" / ");
  const audiences = form.audiences.filter(Boolean).join(" / ");
  const sharedContext = [
    "Brand context: Korean social-welfare and social-impact education for Human Impact Cooperative; people-centered growth, relationship-centered practice, dignity, field wisdom, practical learning.",
    "Visual direction: warm, professional, human, field-oriented, clear enough to use as a reusable transparent title asset. Keep the energy moderate and refined."
  ].join(" ");

  return [
    "Create a single polished PNG asset for Korean education promotion.",
    `Output type: ${outputTypeLabelMap[form.outputType]}.`,
    sharedContext,
    thumbnailGrammar,
    transparentAssetRules,
    `Education title source: "${title}".`,
    `Promotion copy source: ${form.promotionCopy.trim() || "not provided"}.`,
    `Key topics: ${topics || "infer from the title"}.`,
    `Target learners: ${audiences || "infer from the education context"}.`,
    `Recommended emotion: ${analysis.coreEmotion}.`,
    `Core keywords: ${analysis.keywords.join(", ")}.`,
    `Visual metaphor: ${analysis.visualMetaphor}.`,
    `Recommended palette: ${palette.map((color) => `${color.name} ${color.hex} for ${color.usage}`).join(", ")}.`,
    `Typography direction: ${analysis.typographyStyle}. Make the Hangul lettering visibly different from generic default fonts.`,
    getOutputSpecificPrompt(form.outputType, title),
    "Prioritize exact Korean spelling and legibility. If there is any conflict, exact Korean title text and transparent-asset usability win.",
    `Avoid: ${analysis.avoid.join(", ")}.`
  ].join("\n");
}

export function isTransparentOutput(outputType: string): outputType is OutputType {
  return outputType === "title-transparent" || outputType === "title-decorated-transparent" || outputType === "icons-transparent";
}

function pickPalette(classification: Classification, seed: number) {
  const palettes = palettePresets[classification] ?? [humanImpactBasePalette];
  return palettes[Math.abs(seed) % palettes.length] ?? humanImpactBasePalette;
}

function classifyEducation(form: EducationImageForm): Classification {
  const source = `${form.title} ${form.promotionCopy} ${form.topics.join(" ")} ${form.audiences.join(" ")}`;

  if (/주민|조직화|마을|공동체|고립|외로움|관계망|상호돌봄|타임뱅크|연결|지역복지|느슨한/.test(source)) {
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
    promotion: "눈에 띄는 홍보성, 밝은 설득력, 콘텐츠 감각",
    reflective: "성찰, 깊이, 품격, 따뜻한 사유",
    care: "돌봄, 안정감, 현장의 온기, 안전한 관계"
  };

  return values[classification];
}

function getVisualMetaphor(classification: Classification, outputType: OutputType) {
  if (outputType === "icons-transparent") {
    return "a coordinated small icon set: speech bubbles, connection lines, leaves, check marks, notes, laptop or field-tool cues chosen by topic";
  }

  const values: Record<Classification, string> = {
    counseling: "conversation rhythm, trust bridge, question mark turning into insight, simple speech-bubble accent",
    community: "connected people, community circle, shared care line, gentle leaf and line accents",
    practice: "workflow cards, check marks, cursor lines, simple tool icons, action arrows",
    promotion: "content labels, gentle emphasis, clean underline, social card rhythm",
    reflective: "quiet light, thought circle, paper note, gentle pause line",
    care: "open hands, safety circle, warm care path, soft heart and leaf accents"
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
    promotion: ["홍보", "콘텐츠", "관계", "전달력", "브랜드"],
    reflective: ["성찰", "존엄", "소통", "깊이", "성장"],
    care: ["돌봄", "안전", "관계", "회복", "현장"]
  };

  return [...titleWords, ...byClass[classification]].slice(0, 6);
}

function getTitlePlacement(outputType: OutputType) {
  if (outputType === "title-transparent") {
    return "글씨만 중앙 배치, 크게 쌓은 한글 레터링, 장식 없이 타이포 자체의 굵기·외곽선·색 대비로 완성";
  }

  if (outputType === "icons-transparent") {
    return "제목 없이 아이콘을 균형 있게 모은 시트형 배치, 각 아이콘 사이 충분한 투명 여백";
  }

  return "제목을 가장 크게 배치하고 주변에 말풍선, 밑줄, 점선, 스티커, 작은 주제 아이콘을 리듬 있게 배치";
}

function getOutputSpecificPrompt(outputType: OutputType, title: string) {
  if (outputType === "title-transparent") {
    return [
      `Render only the Korean title lettering exactly: "${title}".`,
      "Strict wordmark only: no icons, no hearts, no leaves, no speech bubbles, no dotted lines, no underline decoration, no subtitle, no badges, no logo, no people, no extra text.",
      "Use refined Korean lettering with at most two text colors. A very subtle solid shadow is allowed only if it improves readability; do not use thick cartoon outlines or sticker borders.",
      "Large centered composition, calm professional education-poster mood, crisp vector-like edges, transparent-title PNG after white removal."
    ].join(" ");
  }

  if (outputType === "icons-transparent") {
    return [
      "Do not render the education title or any readable text.",
      "Create a cohesive transparent PNG icon collection inspired by the education topic: 6-9 separate simple icon elements, matching palette, not sticker-heavy.",
      "Include only topic-appropriate icons such as speech bubbles, connected dots, leaves, check marks, notebooks, laptop/window, cursor arrow, simple stars, underlines, community circle, or care symbols.",
      "Arrange icons as a clean, spacious icon sheet on pure white background for later transparency removal. Use simple fills and outlines, no tiny texture."
    ].join(" ");
  }

  return [
    `Render the Korean education title exactly: "${title}".`,
    "The title must be the main element, but keep the overall mood calm and professional.",
    "Add only 2-4 tasteful small decorations total: a simple speech bubble, a short curved underline, a small leaf/check/laptop icon, or one small label shape without text depending on topic.",
    "No subtitle, no logo, no people, no extra readable words.",
    "Make it feel like a reusable transparent title bundle for an education thumbnail, not an extreme sticker logo."
  ].join(" ");
}
