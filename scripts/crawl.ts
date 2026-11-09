import "../src/lib/load-env";
import {
  listSourcesMarkdown,
  runAgentQuery,
} from "../src/lib/crawl/agent-query";

function printUsage() {
  console.log(`Usage:
  npm run agent:crawl -- --keywords hotel,travel
  npm run agent:crawl -- --keywords hotel --cached
  npm run agent:crawl -- --list-sources

Options:
  --keywords, -k   Comma-separated search terms (e.g. hotel, no annual fee)
  --source, -s     Filter sources by label/URL/criteria substring
  --cached         Skip re-crawl; query stored offers only
  --json           Output JSON instead of markdown
  --list-sources   List configured source URLs
`);
}

function parseArgs(argv: string[]) {
  const keywords: string[] = [];
  let sourceFilter: string | undefined;
  let fresh = true;
  let json = false;
  let listSources = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--keywords" || arg === "-k") {
      const value = argv[i + 1];
      if (value) {
        keywords.push(...value.split(",").map((k) => k.trim()).filter(Boolean));
        i += 1;
      }
    } else if (arg === "--source" || arg === "-s") {
      sourceFilter = argv[i + 1];
      i += 1;
    } else if (arg === "--cached") {
      fresh = false;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--list-sources") {
      listSources = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return { keywords, sourceFilter, fresh, json, listSources };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listSources) {
    console.log(await listSourcesMarkdown());
    return;
  }

  if (args.keywords.length === 0 && !args.sourceFilter) {
    printUsage();
    process.exit(1);
  }

  const result = await runAgentQuery({
    keywords: args.keywords,
    fresh: args.fresh,
    sourceFilter: args.sourceFilter,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.markdown);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Error: ${message}`);
  process.exit(1);
});
