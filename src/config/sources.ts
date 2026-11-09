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

// TODO: replace these with the offer pages you want to track. The URLs below
// are placeholders and have not been verified; check each one in a browser.
export const SOURCES: ConfiguredSource[] = [
  {
    key: "combank",
    label: "Commercial Bank – Card offers",
    url: "https://www.combank.lk/rewards-promotion",
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
