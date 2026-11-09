# CC Offers Crawler

A local web app to crawl credit card offer pages, extract structured deal details with AI, and filter results by your search criteria.

## Features

- Add offer page URLs (bank promos, comparison sites, etc.)
- Set optional keyword criteria (e.g. `travel`, `no annual fee`, `$500 bonus`)
- Crawl on demand — per source or all at once
- AI extracts card name, issuer, bonus, APR, annual fee, rewards, and perks
- Relevance scoring based on your criteria
- Browse offer history stored in local SQLite

## Prerequisites

- Node.js 22.22+ (or 24.15+)
- An OpenAI API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file and add your OpenAI key:

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

## Usage

1. Go to **Sources** and add a credit card offer page URL.
2. Optionally add comma-separated criteria to filter results.
3. Click **Crawl** on a source, or **Crawl all** from the dashboard.
4. Review extracted offers on the dashboard — click any offer for full details.

## Notes

- Crawling uses fetch + HTML parsing. JavaScript-heavy pages may fail with a clear error.
- General listing pages (e.g. a bank's `/card-offers/` index) are supported: when keywords are set, the crawler scans the full page and extracts sections matching those terms before sending to the AI.
- Always verify offer details on the source page — AI extraction can miss or misread details.
- Data is stored locally in `dev.db` at the project root (gitignored).

## Agent / Cursor CLI

Ask Cursor to find offers for you, or run manually from the terminal:

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

Cursor will run these commands when you ask things like "give me all hotel offers" — sources must be configured in the app first.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run agent:crawl` | Crawl saved sources and query offers (for agents/CLI) |
| `npx prisma studio` | Browse database in browser |
