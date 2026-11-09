const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractMainText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article?.textContent?.trim()) {
    return article.textContent.trim();
  }

  const bodyText = dom.window.document.body?.textContent?.trim();
  if (bodyText) {
    return bodyText.replace(/\s+/g, " ");
  }

  throw new Error(
    "Could not extract readable content from page. The site may require JavaScript rendering."
  );
}

import { selectRelevantText } from "./select-relevant-text";

export { selectRelevantText, truncateText } from "./select-relevant-text";

export interface PageTextOptions {
  keywords?: string[];
  maxChars?: number;
  /** "readable" uses Readability (article text); "full" keeps all visible text. */
  mode?: "readable" | "full";
}

/** Visible text of the whole document (scripts/styles/nav chrome removed). */
export function extractFullText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  doc.querySelectorAll("script, style, noscript, svg, iframe").forEach((el) => el.remove());
  const blocks = doc.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, th, dt, dd, a, span, div"
  );
  // Insert line breaks between block-ish elements so offers don't run together.
  blocks.forEach((el) => el.append(doc.createTextNode("\n")));
  return (doc.body?.textContent ?? "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Links on the page (useful for following individual offer detail pages). */
export function extractLinks(html: string, url: string, limit = 150) {
  const dom = new JSDOM(html, { url });
  const seen = new Set<string>();
  const links: { text: string; href: string }[] = [];
  for (const a of dom.window.document.querySelectorAll("a[href]")) {
    const href = (a as HTMLAnchorElement).href;
    const text = a.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!href.startsWith("http") || seen.has(href) || !text) continue;
    seen.add(href);
    links.push({ text: text.slice(0, 120), href });
    if (links.length >= limit) break;
  }
  return links;
}

/** Fetch a page and return its text, focused on keywords when large. */
export async function getPageText(
  url: string,
  keywordsOrOptions: string[] | PageTextOptions = []
) {
  const options = Array.isArray(keywordsOrOptions)
    ? { keywords: keywordsOrOptions }
    : keywordsOrOptions;
  const html = await fetchPage(url);
  const text =
    options.mode === "full" ? extractFullText(html, url) : extractMainText(html, url);
  const selected = selectRelevantText(text, options.keywords ?? [], options.maxChars);
  return { ...selected, totalChars: text.length, html };
}
