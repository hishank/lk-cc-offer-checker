/**
 * Offer pages to track. This file is the single place to change them.
 *
 * - `key` is a stable id. Keep it the same when a bank moves its offers page:
 *   just update `url` and the source's offer history is preserved.
 * - Removing an entry deletes that source (and its stored offers) on the next sync.
 * - `criteria` are optional default keywords used for relevance scoring.
 *
 * Changes are picked up automatically by the app, the CLI and the MCP server.
 */
export interface ConfiguredSource {
  key: string;
  label: string;
  url: string;
  criteria?: string[];
}

// Verified Nov 2026:
// - combank: plain HTML, all offers readable by fetch_page.
// - hnb / sampath: offers are loaded with JavaScript, so fetch_page sees an
//   empty page. Claude can only read them with a tool that renders JS.
export const SOURCES: ConfiguredSource[] = [
  {
    key: "combank",
    label: "Commercial Bank – Card offers",
    url: "https://www.combank.lk/rewards-promotions",
  },
  {
    key: "hnb",
    label: "HNB – Card promotions",
    url: "https://www.hnb.lk/personal/promotions/card-promotions",
  },
  {
    key: "sampath",
    label: "Sampath Bank – Card offers",
    url: "https://www.sampath.lk/en/sampath-cards/card-offers",
  },
];
