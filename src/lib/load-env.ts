import { config } from "dotenv";

// Load local env files for CLI entry points (Next.js loads them itself).
// `.env.local` takes precedence over `.env`; missing files are ignored.
config({ path: [".env.local", ".env"], quiet: true });
