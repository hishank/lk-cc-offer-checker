import { SOURCES, type ConfiguredSource } from "@/config/sources";
import { db } from "@/lib/db";

const globalForSync = globalThis as unknown as {
  sourcesSyncedHash: string | undefined;
};

function validate(sources: ConfiguredSource[]) {
  const keys = new Set<string>();
  for (const source of sources) {
    if (!source.key.trim()) throw new Error("src/config/sources.ts: every source needs a key");
    if (keys.has(source.key)) {
      throw new Error(`src/config/sources.ts: duplicate source key "${source.key}"`);
    }
    keys.add(source.key);
    try {
      new URL(source.url);
    } catch {
      throw new Error(`src/config/sources.ts: invalid URL for "${source.key}": ${source.url}`);
    }
  }
}

/**
 * Mirror src/config/sources.ts into the database: upsert by key, adopt legacy
 * sources with the same URL, and delete keyed sources no longer in the config.
 * Cheap to call often — it only touches the DB when the config changed.
 */
export async function syncConfiguredSources(force = false): Promise<void> {
  const hash = JSON.stringify(SOURCES);
  if (!force && globalForSync.sourcesSyncedHash === hash) return;

  validate(SOURCES);

  for (const source of SOURCES) {
    const data = {
      url: source.url.trim(),
      label: source.label.trim(),
      criteria: JSON.stringify(source.criteria ?? []),
    };

    const existing = await db.source.findUnique({ where: { key: source.key } });
    if (existing) {
      await db.source.update({ where: { id: existing.id }, data });
      continue;
    }

    const legacy = await db.source.findFirst({
      where: { key: null, url: data.url },
    });
    if (legacy) {
      await db.source.update({
        where: { id: legacy.id },
        data: { ...data, key: source.key },
      });
    } else {
      await db.source.create({ data: { ...data, key: source.key } });
    }
  }

  await db.source.deleteMany({
    where: {
      key: { not: null, notIn: SOURCES.map((source) => source.key) },
    },
  });

  globalForSync.sourcesSyncedHash = hash;
}

/** Sources with the number of offers currently listed (from their latest successful crawl). */
export async function getSourcesWithCounts() {
  await syncConfiguredSources();
  const sources = await db.source.findMany({
    orderBy: [{ createdAt: "asc" }],
    include: {
      crawlRuns: {
        where: { status: "success" },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { _count: { select: { offers: true } } },
      },
    },
  });
  return sources.map(({ crawlRuns, ...source }) => ({
    ...source,
    currentOffers: crawlRuns[0]?._count.offers ?? 0,
  }));
}

export async function findSource(keyOrId: string) {
  await syncConfiguredSources();
  return db.source.findFirst({
    where: { OR: [{ key: keyOrId }, { id: keyOrId }] },
  });
}
