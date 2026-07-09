export type SplitLineCount = 1 | 2 | 3 | "auto";

const MAX_LINES = 3;
const PARTICLE_BREAK_ENDINGS = [
  "으로",
  "에서",
  "에게",
  "부터",
  "까지",
  "처럼",
  "보다",
  "으로써",
  "로"
];

const WEAK_ENDINGS = ["은", "는", "이", "가", "을", "를", "와", "과", "및"];

export function splitTitle(title: string, lineCount: SplitLineCount = "auto"): string[] {
  const cleaned = normalizeTitle(title);

  if (!cleaned) {
    return [""];
  }

  const manualLines = title
    .split(/\r?\n/)
    .map((line) => normalizeTitle(line))
    .filter(Boolean);

  if (manualLines.length > 1) {
    return mergeToMaxLines(manualLines, MAX_LINES);
  }

  const desiredLineCount = lineCount === "auto" ? getAutoLineCount(cleaned) : lineCount;

  return splitIntoBalancedLines(cleaned, desiredLineCount);
}

export function getAutoLineCount(title: string): 1 | 2 | 3 {
  const length = visibleLength(normalizeTitle(title));

  if (length <= 18) {
    return 1;
  }

  if (length <= 35) {
    return 2;
  }

  return 3;
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeToMaxLines(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) {
    return lines;
  }

  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

function splitIntoBalancedLines(title: string, lineCount: 1 | 2 | 3) {
  const tokens = title.match(/\S+/g) ?? [title];

  if (lineCount <= 1 || tokens.length <= 1) {
    return [title];
  }

  if (tokens.length <= lineCount) {
    return tokens;
  }

  const usableLineCount = Math.min(lineCount, tokens.length, MAX_LINES) as 1 | 2 | 3;
  const combinations = getBreakCombinations(tokens.length, usableLineCount - 1);
  const targetLength = visibleLength(title) / usableLineCount;

  let bestSegments = [title];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const breaks of combinations) {
    const segments = buildSegments(tokens, breaks);
    const score = scoreSegments(segments, breaks, tokens, targetLength);

    if (score < bestScore) {
      bestScore = score;
      bestSegments = segments;
    }
  }

  return bestSegments;
}

function getBreakCombinations(tokenCount: number, breakCount: number) {
  const results: number[][] = [];

  function visit(start: number, path: number[]) {
    if (path.length === breakCount) {
      results.push(path);
      return;
    }

    for (let index = start; index <= tokenCount - 1; index += 1) {
      visit(index + 1, [...path, index]);
    }
  }

  visit(1, []);
  return results;
}

function buildSegments(tokens: string[], breaks: number[]) {
  const indexes = [0, ...breaks, tokens.length];
  const segments: string[] = [];

  for (let index = 0; index < indexes.length - 1; index += 1) {
    segments.push(tokens.slice(indexes[index], indexes[index + 1]).join(" "));
  }

  return segments;
}

function scoreSegments(
  segments: string[],
  breaks: number[],
  tokens: string[],
  targetLength: number
) {
  let score = 0;

  segments.forEach((segment, index) => {
    const length = visibleLength(segment);
    const distance = Math.abs(length - targetLength);
    score += Math.pow(distance / Math.max(targetLength, 1), 2) * 30;

    if (index === segments.length - 1 && length <= 4 && segments.length > 1) {
      score += 18;
    }

    if (startsWithWeakParticle(segment)) {
      score += 8;
    }
  });

  breaks.forEach((breakIndex) => {
    const previousToken = tokens[breakIndex - 1];
    const nextToken = tokens[breakIndex];

    score += scoreBreak(previousToken, nextToken);
  });

  return score;
}

function scoreBreak(previousToken: string, nextToken?: string) {
  let score = 0;

  if (/[,，]$/.test(previousToken)) {
    score -= 16;
  }

  if (PARTICLE_BREAK_ENDINGS.some((ending) => stripPunctuation(previousToken).endsWith(ending))) {
    score -= 9;
  }

  if (WEAK_ENDINGS.some((ending) => stripPunctuation(previousToken).endsWith(ending))) {
    score += 3;
  }

  if (nextToken && visibleLength(nextToken) <= 2 && !/[,，]$/.test(previousToken)) {
    score += 4;
  }

  if (nextToken && /^(더하다|답하다|시작|시작됩니다|만들다|배우다)$/.test(stripPunctuation(nextToken))) {
    score += 5;
  }

  return score;
}

function stripPunctuation(value: string) {
  return value.replace(/[,.!?，。！？:;]+$/g, "");
}

function startsWithWeakParticle(segment: string) {
  return /^(은|는|이|가|을|를|와|과)\b/.test(segment.trim());
}

function visibleLength(value: string) {
  return value.replace(/\s+/g, "").length;
}
