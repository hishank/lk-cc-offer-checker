<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CC Offers — Agent Instructions

This repo ships an MCP server (`cc-offers`, configured in `.mcp.json`). Claude does the research through it and the web app (`npm run dev`, http://localhost:3000) shows the results.

## Sources

Offer pages are constants in `src/config/sources.ts`. To add/remove/update a site, edit that file (keep `key` stable when only the URL changes). The DB is synced from it automatically.

## When the user asks to refresh / find offers

1. `list_sources`
2. For each source: `fetch_page` (use `mode: "full"` for listing pages if `readable` misses offers; `includeLinks: true` to follow detail pages), extract **every** offer on the page
3. `save_source_offers` once per source with the complete list (replaces that source's current offers)
4. Summarise in chat (card/offer, bank, benefit, validity) and point to http://localhost:3000/offers

To answer questions about stored offers without re-crawling, use `search_offers`.

## When the user gives a link to compare (or asks to process pending comparisons)

1. Links queued in the app: `list_comparison_requests`. A link pasted in chat: use it directly (no id).
2. `fetch_page` the link and list its offers
3. `search_offers` by merchant names, categories and banks to find related stored offers
4. `save_comparison` with `pageOffers` and every `overlap` (`same` / `similar` / `competing`, shared points, differences, verdict). Pass the request `id` when completing a queued request.
5. If the page can't be read: `mark_comparison_failed`
6. Reply with the key overlaps and the `viewAt` link

`fetch_page` does not run JavaScript; if a page comes back nearly empty, use your own web fetch tool instead and save results the same way.

Only record details stated on the page; use null when unknown.

## Without MCP (OpenAI fallback)

```bash
npm run agent:crawl -- --list-sources
npm run agent:crawl -- --keywords hotel,travel   # crawl with OpenAI (needs OPENAI_API_KEY)
npm run agent:crawl -- --keywords hotel --cached # stored offers only
npm run agent:crawl -- --keywords hotel --json
```
