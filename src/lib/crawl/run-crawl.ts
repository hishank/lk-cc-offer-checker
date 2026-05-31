import { db } from "@/lib/db";
import { parseCriteria } from "@/lib/parse-criteria";
import { extractOffersFromUrl } from "@/lib/crawl/extract-offers";

export async function crawlSource(
  sourceId: string,
  options?: { criteria?: string[] }
) {
  const source = await db.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error("Source not found");
  }

  const crawlRun = await db.crawlRun.create({
    data: {
      sourceId: source.id,
      status: "running",
    },
  });

  try {
    const criteria = options?.criteria ?? parseCriteria(source.criteria);
    const offers = await extractOffersFromUrl(source.url, criteria);

    if (offers.length === 0) {
      await db.crawlRun.update({
        where: { id: crawlRun.id },
        data: {
          status: "success",
          finishedAt: new Date(),
        },
      });
      await db.source.update({
        where: { id: source.id },
        data: { lastCrawledAt: new Date() },
      });
      return { crawlRunId: crawlRun.id, offersFound: 0 };
    }

    await db.offer.createMany({
      data: offers.map((offer) => ({
        crawlRunId: crawlRun.id,
        sourceId: source.id,
        cardName: offer.cardName,
        issuer: offer.issuer,
        annualFee: offer.annualFee,
        signupBonus: offer.signupBonus,
        apr: offer.apr,
        rewardsSummary: offer.rewardsSummary,
        perks: JSON.stringify(offer.perks),
        rawSummary: offer.summary,
        relevanceScore: offer.relevanceScore,
        matchedCriteria: JSON.stringify(offer.matchedCriteria),
      })),
    });

    await db.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "success",
        finishedAt: new Date(),
      },
    });

    await db.source.update({
      where: { id: source.id },
      data: { lastCrawledAt: new Date() },
    });

    return { crawlRunId: crawlRun.id, offersFound: offers.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error";
    await db.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "failed",
        error: message,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function crawlAllSources() {
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
