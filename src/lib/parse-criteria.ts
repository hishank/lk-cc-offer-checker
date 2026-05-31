export function parseCriteria(criteria: string): string[] {
  try {
    const parsed = JSON.parse(criteria) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }
  return [];
}

export function mergeCriteria(
  sourceCriteria: string[],
  queryKeywords: string[]
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of [...sourceCriteria, ...queryKeywords]) {
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(item.trim());
  }

  return merged;
}
