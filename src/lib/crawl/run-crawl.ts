import { db } from "@/lib/db";
import { parseCriteria } from "@/lib/parse-criteria";
import { extractOffersFromUrl } from "@/lib/crawl/extract-offers";
import { saveOffersForSource } from "@/lib/offers";
import { syncConfiguredSources } from "@/lib/sources";

/** In-app crawl: fetch the page and extract offers with OpenAI. */
export async function crawlSource(
  sourceId: string,
  options?: { criteria?: string[] }
) {
  const source = await db.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error("Source not found");
  }

  const crawlRun = await db.crawlRun.create({
    data: { sourceId: source.id, status: "running", method: "openai" },
  });

  try {
    const criteria = options?.criteria ?? parseCriteria(source.criteria);
    const offers = await extractOffersFromUrl(source.url, criteria);
    return await saveOffersForSource(source.id, offers, {
      method: "openai",
      criteria,
      crawlRunId: crawlRun.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error";
    await db.crawlRun.update({
      where: { id: crawlRun.id },
      data: { status: "failed", error: message, finishedAt: new Date() },
    });
    throw error;
  }
}

export async function crawlAllSources() {
  await syncConfiguredSources();
  const sources = await db.source.findMany({ orderBy: { createdAt: "asc" } });
  const results = [];

  for (const source of sources) {
    try {
      const result = await crawlSource(source.id);
      results.push({ sourceId: source.id, success: true, ...result });
    } catch (error) {
      results.push({
        sourceId: source.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
