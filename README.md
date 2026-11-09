# CC Offers Crawler

A local web app that tracks credit card offers from a fixed list of bank pages. Claude does the research through an MCP server; the app shows every current offer in one view and lets you queue links for Claude to compare against what you track.

## Features

- Sources defined as constants in `src/config/sources.ts` — edit the file when a bank changes its site
- **All offers** view (`/offers`): every current offer across sources, with search, source and category filters
- **Compare** (`/compare`): give a link; Claude surveys the page and shows which offers overlap with the ones you track (same / similar / competing), what differs, and a verdict
- MCP server so Claude (Claude Code or Claude Desktop) does the fetching, extraction and comparison
- Optional in-app crawling with OpenAI (`Crawl` / `Crawl all`)
- History stored in local SQLite

## Prerequisites

- Node.js 22.22+ (or 24.15+)
- An OpenAI API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file (the OpenAI key is only needed for in-app crawling):

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL="file:./dev.db"
# Optional: override the extraction model (default: gpt-4o-mini)
# OPENAI_MODEL=gpt-4o-mini
```

3. Run database migration:

```bash
npx prisma migrate dev
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuring sources

Edit `src/config/sources.ts`:

```ts
export const SOURCES: ConfiguredSource[] = [
  { key: "hnb", label: "HNB – Card promotions", url: "https://www.hnb.lk/...", criteria: ["hotel"] },
];
```

- Change `url` (keep `key`) when a bank moves its page — offer history is kept.
- Removing an entry removes that source and its offers.
- The app, CLI and MCP server pick up changes automatically.

## Using Claude (MCP)

The MCP server lives in `scripts/mcp-server.ts` and exposes these tools:

| Tool | Purpose |
|------|---------|
| `list_sources` | Configured sources |
| `fetch_page` | Fetch a page's text (readable or full, optional links) |
| `save_source_offers` | Save the current offers Claude extracted for a source |
| `search_offers` | Query current offers |
| `list_comparison_requests` | Links queued from the Compare page |
| `save_comparison` / `mark_comparison_failed` | Store a comparison result |

It also provides two prompts, `refresh_offers` and `compare_link`.

**Claude Code:** open this repo — `.mcp.json` registers the server (approve it when prompted). Then ask:

- "Refresh my credit card offers"
- "Process my pending offer comparisons"
- "Compare the offers on https://… with mine"

**Claude Desktop:** add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cc-offers": {
      "command": "npm",
      "args": ["--prefix", "/absolute/path/to/lk-cc-offer-checker", "run", "--silent", "mcp"]
    }
  }
}
```

Keep `npm run dev` running to see the results at http://localhost:3000.

## Notes

- Crawling uses fetch + HTML parsing. JavaScript-heavy pages may fail with a clear error.
- General listing pages (e.g. a bank's `/card-offers/` index) are supported: when keywords are set, the crawler scans the full page and extracts sections matching those terms before sending to the AI.
- Always verify offer details on the source page — AI extraction can miss or misread details.
- Data is stored locally in `dev.db` at the project root (gitignored).

## CLI (OpenAI fallback)

Run manually from the terminal:

```bash
# List saved source URLs
npm run agent:crawl -- --list-sources

# Crawl all sources and return hotel-related offers
npm run agent:crawl -- --keywords hotel

# Multiple keywords
npm run agent:crawl -- --keywords hotel,travel,no annual fee

# Use stored results only (no re-crawl)
npm run agent:crawl -- --keywords hotel --cached
```

Fresh crawls need `OPENAI_API_KEY`; `--cached` works without it.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run agent:crawl` | Crawl sources with OpenAI and query offers (CLI) |
| `npm run mcp` | Start the MCP server (stdio) |
| `npx prisma studio` | Browse database in browser |
