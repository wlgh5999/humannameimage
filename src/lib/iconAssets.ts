import type { DesignSpec, EducationImageForm, IconSpec } from "@/lib/generativeTypes";

type IconDefinition = {
  slug: string;
  name: string;
  promptLabel: string;
  keywords: string[];
};

const iconDefinitions: IconDefinition[] = [
  { slug: "heart", name: "하트", promptLabel: "heart line icon", keywords: ["heart", "하트", "care", "돌봄"] },
  { slug: "leaf", name: "잎사귀", promptLabel: "leaf sprout icon", keywords: ["leaf", "sprout", "리프", "잎", "새싹"] },
  { slug: "curve", name: "곡선", promptLabel: "gentle curved line icon", keywords: ["curve", "curved", "underline", "곡선"] },
  { slug: "dotted-line", name: "점선", promptLabel: "small dotted line icon", keywords: ["dot", "dotted", "점선"] },
  { slug: "speechbubble", name: "말풍선", promptLabel: "speech bubble icon", keywords: ["speech", "bubble", "말풍선", "대화"] },
  { slug: "star", name: "별", promptLabel: "small star icon", keywords: ["star", "별"] },
  { slug: "sparkle", name: "반짝임", promptLabel: "tiny sparkle icon", keywords: ["sparkle", "반짝"] },
  { slug: "check", name: "체크", promptLabel: "check mark icon", keywords: ["check", "체크"] },
  { slug: "tool", name: "도구", promptLabel: "simple tool icon", keywords: ["tool", "도구"] },
  { slug: "link", name: "연결고리", promptLabel: "link connection icon", keywords: ["link", "connected", "connection", "연결"] },
  { slug: "network", name: "관계망", promptLabel: "small network node icon", keywords: ["network", "circle network", "관계망"] },
  { slug: "question", name: "질문", promptLabel: "question mark icon", keywords: ["question", "질문"] },
  { slug: "memo", name: "메모", promptLabel: "small memo icon", keywords: ["memo", "note", "메모"] },
  { slug: "quote", name: "따옴표", promptLabel: "simple quote mark icon", keywords: ["quote", "따옴표"] },
  { slug: "shield", name: "보호", promptLabel: "protective shield outline icon", keywords: ["shield", "protective", "보호"] }
];

const recommendationPools: Record<string, IconDefinition[]> = {
  counseling: [
    define("listening", "경청", "listening ear symbol icon", ["listening", "ear", "경청"]),
    findDefinition("speechbubble"),
    define("handshake", "악수", "warm handshake symbol icon", ["handshake", "손", "악수"]),
    findDefinition("question"),
    findDefinition("heart"),
    findDefinition("memo")
  ],
  community: [
    define("house", "작은 집", "small community house icon", ["house", "home", "마을", "집"]),
    findDefinition("link"),
    findDefinition("network"),
    define("seed", "씨앗", "small seed sprout icon", ["seed", "씨앗"]),
    findDefinition("heart"),
    define("hands", "손잡기", "two hands connection symbol icon", ["hands", "손잡기"])
  ],
  practice: [
    define("bulb", "전구", "small idea light bulb icon", ["bulb", "전구"]),
    define("laptop", "노트북", "simple laptop icon", ["laptop", "노트북"]),
    findDefinition("check"),
    define("gear", "톱니바퀴", "simple gear icon", ["gear", "톱니"]),
    define("lightning", "번개", "small lightning icon", ["lightning", "번개"]),
    findDefinition("sparkle")
  ],
  promotion: [
    findDefinition("speechbubble"),
    findDefinition("sparkle"),
    findDefinition("star"),
    define("megaphone", "작은 확성기", "small megaphone icon", ["megaphone", "확성기"]),
    findDefinition("dotted-line"),
    findDefinition("heart")
  ],
  reflective: [
    findDefinition("memo"),
    findDefinition("quote"),
    findDefinition("star"),
    define("book", "책", "small open book icon", ["book", "책"]),
    findDefinition("leaf"),
    findDefinition("curve")
  ],
  care: [
    findDefinition("shield"),
    findDefinition("heart"),
    findDefinition("leaf"),
    define("plus", "돌봄 플러스", "small care plus icon", ["plus", "플러스"]),
    define("safe-house", "안전한 집", "small safe house icon", ["safe house", "안전"]),
    findDefinition("check")
  ]
};

export function getActualIconSpecs(decorations: string[]) {
  const specs = decorations.map((decoration, index) => {
    const definition = findDefinitionForText(decoration);

    return toSpec(definition, index, decoration);
  });
  const seen = new Set<string>();

  return specs.map((spec) => {
    if (!seen.has(spec.slug)) {
      seen.add(spec.slug);
      return spec;
    }

    return {
      ...spec,
      id: `${spec.id}-${spec.index + 1}`,
      fileLabel: `${spec.fileLabel}_${spec.index + 1}`
    };
  });
}

export function getRecommendedIconSpecs(form: EducationImageForm, designSpec: DesignSpec, actualSpecs: IconSpec[]) {
  const category = designSpec.topicCategory || classifyFromForm(form);
  const actualSlugs = new Set(actualSpecs.map((spec) => spec.slug));
  const pool = [...(recommendationPools[category] ?? recommendationPools.community), ...iconDefinitions];
  const unique: IconDefinition[] = [];

  for (const definition of pool) {
    if (actualSlugs.has(definition.slug) || unique.some((item) => item.slug === definition.slug)) {
      continue;
    }

    unique.push(definition);
  }

  return unique.slice(0, 3).map((definition, index) => toSpec(definition, index));
}

export function getIconFileName(kind: "actual" | "recommended", spec: IconSpec) {
  const prefix = kind === "actual" ? "actual" : "recommended";
  return `${prefix}_${String(spec.index + 1).padStart(2, "0")}_${spec.fileLabel}.png`;
}

export function getSafeIconFileLabel(value: string) {
  return (
    value
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 36) || "icon"
  );
}

function findDefinition(slug: string) {
  return iconDefinitions.find((definition) => definition.slug === slug) ?? iconDefinitions[0];
}

function findDefinitionForText(text: string) {
  const normalized = text.toLowerCase();
  return (
    iconDefinitions.find((definition) =>
      definition.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    ) ?? define(getSafeIconFileLabel(text), text, text, [text])
  );
}

function toSpec(definition: IconDefinition, index: number, sourceDecoration?: string): IconSpec {
  return {
    id: `${definition.slug}-${index + 1}`,
    name: definition.name,
    slug: definition.slug,
    promptLabel: definition.promptLabel,
    fileLabel: getSafeIconFileLabel(definition.slug),
    sourceDecoration,
    index
  };
}

function define(slug: string, name: string, promptLabel: string, keywords: string[]): IconDefinition {
  return { slug, name, promptLabel, keywords };
}

function classifyFromForm(form: EducationImageForm) {
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

  return "reflective";
}
