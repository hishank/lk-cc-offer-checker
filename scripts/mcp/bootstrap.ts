import path from "node:path";

// MCP clients may launch the server from any directory: run from the project
// root so .env files and the relative SQLite path resolve correctly.
process.chdir(path.resolve(__dirname, "../.."));

// stdout carries the MCP protocol; route stray logging to stderr.
console.log = console.error;
console.info = console.error;
console.debug = console.error;
