const DEFAULT_MAX_CHARS = 12_000;
const KEYWORD_FOCUSED_MAX_CHARS = 30_000;
const CONTEXT_RADIUS = 550;
const INTRO_CHARS = 600;
const MIN_RANGE_CHARS = 400;

function normalizeKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
}

interface TextRange {
  start: number;
  end: number;
  score: number;
}

function findKeywordRanges(text: string, keywords: string[]): TextRange[] {
  const lower = text.toLowerCase();
  const ranges: TextRange[] = [];

  for (const keyword of keywords) {
    let index = 0;
    while ((index = lower.indexOf(keyword, index)) !== -1) {
      ranges.push({
        start: Math.max(0, index - CONTEXT_RADIUS),
        end: Math.min(text.length, index + keyword.length + CONTEXT_RADIUS),
        score: keyword.length,
      });
      index += keyword.length;
    }
  }

  return ranges;
}

function scoreRange(text: string, range: TextRange, keywords: string[]): number {
  const slice = text.slice(range.start, range.end).toLowerCase();
  let score = range.score;

  for (const keyword of keywords) {
    const matches = slice.split(keyword).length - 1;
    score += matches * keyword.length;
  }

  return score;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end + 80) {
      last.end = Math.max(last.end, current.end);
      last.score = Math.max(last.score, current.score);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function trimRangeToBudget(
  text: string,
  range: TextRange,
  maxLength: number,
  keywords: string[]
): string {
  const slice = text.slice(range.start, range.end);
  if (slice.length <= maxLength) return slice.trim();

  const lower = slice.toLowerCase();
  let bestIndex = 0;
  let bestScore = -1;

  for (const keyword of keywords) {
    let index = 0;
    while ((index = lower.indexOf(keyword, index)) !== -1) {
      const start = Math.max(0, index - Math.floor(maxLength / 2));
      const candidate = slice.slice(start, start + maxLength);
      const candidateScore = scoreRange(
        candidate,
        { start: 0, end: candidate.length, score: 0 },
        keywords
      );
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestIndex = start;
      }
      index += keyword.length;
    }
  }

  return slice.slice(bestIndex, bestIndex + maxLength).trim();
}

function buildBalancedExcerpt(
  text: string,
  ranges: TextRange[],
  keywords: string[],
  maxChars: number
): string {
  const totalRangeChars = ranges.reduce((sum, r) => sum + (r.end - r.start), 0);

  if (totalRangeChars <= maxChars) {
    return ranges
      .map((range, index) => {
        const slice = text.slice(range.start, range.end).trim();
        return index === 0 ? slice : `\n\n---\n\n${slice}`;
      })
      .join("");
  }

  const perRangeBudget = Math.max(
    MIN_RANGE_CHARS,
    Math.floor(maxChars / ranges.length)
  );

  return ranges
    .map((range, index) => {
      const slice = trimRangeToBudget(text, range, perRangeBudget, keywords);
      return index === 0 ? slice : `\n\n---\n\n${slice}`;
    })
    .join("")
    .slice(0, maxChars);
}

export function selectRelevantText(
  text: string,
  keywords: string[],
  maxChars = DEFAULT_MAX_CHARS
): { excerpt: string; keywordFocused: boolean } {
  if (text.length <= maxChars) {
    return { excerpt: text, keywordFocused: false };
  }

  const normalized = normalizeKeywords(keywords);

  if (normalized.length === 0) {
    return {
      excerpt: text.slice(0, maxChars) + "\n\n[Content truncated...]",
      keywordFocused: false,
    };
  }

  const rawRanges = findKeywordRanges(text, normalized);

  if (rawRanges.length === 0) {
    return {
      excerpt: text.slice(0, maxChars) + "\n\n[Content truncated...]",
      keywordFocused: false,
    };
  }

  const merged = mergeRanges(rawRanges);
  const intro = text.slice(0, INTRO_CHARS).trim();
  const introBudget = Math.min(INTRO_CHARS + 100, Math.floor(KEYWORD_FOCUSED_MAX_CHARS * 0.05));
  const bodyBudget = KEYWORD_FOCUSED_MAX_CHARS - introBudget;
  const body = buildBalancedExcerpt(text, merged, normalized, bodyBudget);

  const excerpt = `${intro}\n\n[...keyword-matched sections below...]\n\n${body}`;

  return {
    excerpt:
      excerpt.length > KEYWORD_FOCUSED_MAX_CHARS
        ? excerpt.slice(0, KEYWORD_FOCUSED_MAX_CHARS) + "\n\n[Content truncated...]"
        : excerpt,
    keywordFocused: true,
  };
}

export function truncateText(text: string, maxChars = DEFAULT_MAX_CHARS): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars) + "\n\n[Content truncated...]";
}
