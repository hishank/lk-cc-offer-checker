import { parseCriteria } from "@/lib/parse-criteria";

export interface OfferResult {
  id: string;
  cardName: string;
  issuer: string;
  annualFee: string | null;
  signupBonus: string | null;
  apr: string | null;
  rewardsSummary: string | null;
  perks: string[];
  rawSummary: string;
  relevanceScore: number;
  matchedCriteria: string[];
  sourceUrl: string;
  sourceLabel: string | null;
  crawledAt: string;
}

export function offerFromDb(
  offer: {
    id: string;
    cardName: string;
    issuer: string;
    annualFee: string | null;
    signupBonus: string | null;
    apr: string | null;
    rewardsSummary: string | null;
    perks: string;
    rawSummary: string;
    relevanceScore: number;
    matchedCriteria: string;
    createdAt: Date;
    source: { url: string; label: string | null };
  }
): OfferResult {
  return {
    id: offer.id,
    cardName: offer.cardName,
    issuer: offer.issuer,
    annualFee: offer.annualFee,
    signupBonus: offer.signupBonus,
    apr: offer.apr,
    rewardsSummary: offer.rewardsSummary,
    perks: parseCriteria(offer.perks),
    rawSummary: offer.rawSummary,
    relevanceScore: offer.relevanceScore,
    matchedCriteria: parseCriteria(offer.matchedCriteria),
    sourceUrl: offer.source.url,
    sourceLabel: offer.source.label,
    crawledAt: offer.createdAt.toISOString(),
  };
}

export function formatOffersMarkdown(
  offers: OfferResult[],
  queryLabel: string
): string {
  if (offers.length === 0) {
    return `No offers found for: ${queryLabel}`;
  }

  const lines = [
    `# ${queryLabel}`,
    "",
    `Found **${offers.length}** offer${offers.length === 1 ? "" : "s"}.`,
    "",
  ];

  for (const offer of offers) {
    lines.push(`## ${offer.cardName}`);
    lines.push(`- **Issuer:** ${offer.issuer}`);
    lines.push(`- **Relevance score:** ${offer.relevanceScore}`);
    if (offer.signupBonus) lines.push(`- **Signup bonus:** ${offer.signupBonus}`);
    if (offer.annualFee) lines.push(`- **Annual fee:** ${offer.annualFee}`);
    if (offer.apr) lines.push(`- **APR:** ${offer.apr}`);
    if (offer.rewardsSummary) lines.push(`- **Rewards:** ${offer.rewardsSummary}`);
    if (offer.perks.length > 0) {
      lines.push(`- **Perks:** ${offer.perks.join("; ")}`);
    }
    if (offer.matchedCriteria.length > 0) {
      lines.push(`- **Matched:** ${offer.matchedCriteria.join(", ")}`);
    }
    lines.push(`- **Source:** ${offer.sourceLabel ?? offer.sourceUrl}`);
    lines.push(`- **URL:** ${offer.sourceUrl}`);
    lines.push(`- **Summary:** ${offer.rawSummary}`);
    lines.push("");
  }

  return lines.join("\n");
}
