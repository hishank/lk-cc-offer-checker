import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { getPageText } from "./fetch-page";
import { extractionResultSchema, type ExtractedOffer } from "./score-offers";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_ID = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export async function extractOffersFromUrl(
  url: string,
  criteria: string[]
): Promise<ExtractedOffer[]> {
  const { excerpt, keywordFocused } = await getPageText(url, criteria);

  const focusNote = keywordFocused
    ? `\nNote: This is a large listing page. Content below was selected from sections matching: ${criteria.join(", ")}. Extract every distinct offer visible in these sections.\n`
    : "";

  const { output } = await generateText({
    model: openai(MODEL_ID),
    output: Output.object({ schema: extractionResultSchema }),
    prompt: `You are extracting credit card offers and card-related promotions from a web page.

Source URL: ${url}
${focusNote}
Extract every distinct credit card offer or cardholder promotion found in the page content below.
For merchant discounts (hotels, dining, fuel, etc.), treat each as a separate offer and name it after the merchant or promotion title.
For each offer, extract accurate details only when explicitly stated.
Set category to a short lowercase type (e.g. dining, hotel, travel, fuel, shopping, supermarket, cashback, card benefit).
Use null for fields not mentioned. Keep perks as a list of distinct benefits.
Write a concise summary for each offer in your own words based on the page text.

Page content:
${excerpt}`,
  });

  return output.offers;
}
