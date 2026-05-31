<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CC Offers Crawler — Agent Instructions

When the user asks for credit card offers (e.g. "give me hotel offers", "find travel cards", "what bonuses are available"), **run the crawl CLI** and return the markdown output directly in chat.

## Commands

List configured source URLs:

```bash
npm run agent:crawl -- --list-sources
```

Crawl all saved sources and return matching offers (default — always re-crawl for fresh results):

```bash
npm run agent:crawl -- --keywords hotel
npm run agent:crawl -- --keywords hotel,travel,no annual fee
```

Use stored offers only (skip re-crawl, faster):

```bash
npm run agent:crawl -- --keywords hotel --cached
```

Filter to specific sources by label/URL:

```bash
npm run agent:crawl -- --keywords hotel --source chase
```

JSON output (for parsing):

```bash
npm run agent:crawl -- --keywords hotel --json
```

## Workflow

1. User asks for offers with keywords (hotel, travel, cashback, etc.)
2. Run `npm run agent:crawl -- --keywords <terms>` from the project root
3. Paste the CLI markdown output into your reply — summarize if long, but include key details (card name, bonus, fee, score)
4. If the command fails with "No sources configured", tell the user to add URLs at `/sources` in the app first
5. If `OPENAI_API_KEY` is missing, tell the user to add it to `.env.local`

## Notes

- Sources and criteria are persisted in SQLite — the user configures URLs once in the web UI
- `--keywords` merges with each source's saved criteria during crawl scoring
- Always prefer a fresh crawl (`--keywords` without `--cached`) unless the user asks for cached/stored results only
- General listing URLs (e.g. `/card-offers/`) work reliably: the crawler scans the full page for keyword matches and sends those sections to the AI, not just the top of the page
- Requires `OPENAI_API_KEY` in `.env.local` for fresh crawls
