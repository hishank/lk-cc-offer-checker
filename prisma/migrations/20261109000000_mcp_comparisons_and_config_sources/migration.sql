-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "category" TEXT;
ALTER TABLE "Offer" ADD COLUMN "offerUrl" TEXT;
ALTER TABLE "Offer" ADD COLUMN "validity" TEXT;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN "key" TEXT;

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "summary" TEXT,
    "pageOffers" TEXT NOT NULL DEFAULT '[]',
    "overlaps" TEXT NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CrawlRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL DEFAULT 'openai',
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "CrawlRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CrawlRun" ("error", "finishedAt", "id", "sourceId", "startedAt", "status") SELECT "error", "finishedAt", "id", "sourceId", "startedAt", "status" FROM "CrawlRun";
DROP TABLE "CrawlRun";
ALTER TABLE "new_CrawlRun" RENAME TO "CrawlRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

