import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  extractMainText,
  fetchPage,
  selectRelevantText,
} from "./fetch-page";
import {
  extractionResultSchema,
  scoreOffers,
  type ScoredOffer,
} from "./score-offers";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractOffersFromUrl(
  url: string,
  criteria: string[]
): Promise<ScoredOffer[]> {
  const html = await fetchPage(url);
  const mainText = extractMainText(html, url);
  const { excerpt, keywordFocused } = selectRelevantText(mainText, criteria);

  const focusNote = keywordFocused
    ? `\nNote: This is a large listing page. Content below was selected from sections matching: ${criteria.join(", ")}. Extract every distinct offer visible in these sections.\n`
    : "";

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractionResultSchema,
    prompt: `You are extracting credit card offers and card-related promotions from a web page.

Source URL: ${url}
${focusNote}
Extract every distinct credit card offer or cardholder promotion found in the page content below.
For merchant discounts (hotels, dining, fuel, etc.), treat each as a separate offer and name it after the merchant or promotion title.
For each offer, extract accurate details only when explicitly stated.
Use null for fields not mentioned. Keep perks as a list of distinct benefits.
Write a concise summary for each offer in your own words based on the page text.

Page content:
${excerpt}`,
  });

  return scoreOffers(object.offers, criteria);
}
