-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "criteria" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawledAt" DATETIME
);

-- CreateTable
CREATE TABLE "CrawlRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "CrawlRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crawlRunId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "annualFee" TEXT,
    "signupBonus" TEXT,
    "apr" TEXT,
    "rewardsSummary" TEXT,
    "perks" TEXT NOT NULL DEFAULT '[]',
    "rawSummary" TEXT NOT NULL,
    "relevanceScore" INTEGER NOT NULL DEFAULT 0,
    "matchedCriteria" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_crawlRunId_fkey" FOREIGN KEY ("crawlRunId") REFERENCES "CrawlRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
