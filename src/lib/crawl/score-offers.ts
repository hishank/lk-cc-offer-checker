import { z } from "zod";

export const extractedOfferSchema = z.object({
  cardName: z.string(),
  issuer: z.string(),
  annualFee: z.string().nullable(),
  signupBonus: z.string().nullable(),
  apr: z.string().nullable(),
  rewardsSummary: z.string().nullable(),
  perks: z.array(z.string()),
  summary: z.string(),
  category: z
    .string()
    .nullable()
    .describe("Offer type, e.g. dining, hotel, travel, fuel, shopping, cashback"),
  validity: z
    .string()
    .nullable()
    .describe("Validity period as stated, e.g. 'Until 31 Dec 2026'"),
  offerUrl: z.string().nullable().describe("Direct link to the offer, if shown"),
});

export const extractionResultSchema = z.object({
  offers: z.array(extractedOfferSchema).max(20),
});

export type ExtractedOffer = z.infer<typeof extractedOfferSchema>;

export interface ScoredOffer extends ExtractedOffer {
  relevanceScore: number;
  matchedCriteria: string[];
}

export function scoreOffers(
  offers: ExtractedOffer[],
  criteria: string[],
  options: { keepUnmatched?: boolean } = {}
): ScoredOffer[] {
  const normalizedCriteria = criteria
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  return offers
    .map((offer) => {
      const searchableText = [
        offer.cardName,
        offer.issuer,
        offer.annualFee,
        offer.signupBonus,
        offer.apr,
        offer.rewardsSummary,
        offer.summary,
        offer.category,
        ...offer.perks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedCriteria.length === 0) {
        return {
          ...offer,
          relevanceScore: 100,
          matchedCriteria: [],
        };
      }

      const matchedCriteria = normalizedCriteria.filter((criterion) =>
        searchableText.includes(criterion)
      );

      const baseScore = Math.round(
        (matchedCriteria.length / normalizedCriteria.length) * 100
      );

      const fieldHits = [
        offer.cardName,
        offer.signupBonus,
        offer.rewardsSummary,
        offer.summary,
      ].filter(
        (field) =>
          field &&
          normalizedCriteria.some((c) => field.toLowerCase().includes(c))
      ).length;

      const bonus = Math.min(fieldHits * 5, 20);
      const relevanceScore = Math.min(baseScore + bonus, 100);

      return {
        ...offer,
        relevanceScore,
        matchedCriteria,
      };
    })
    .filter(
      (offer) =>
        options.keepUnmatched ||
        normalizedCriteria.length === 0 ||
        offer.relevanceScore > 0
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
