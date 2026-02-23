/*
  Warnings:

  - You are about to alter the column `sentiment` on the `News` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "AlertPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertId" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "totalTriggers" INTEGER NOT NULL DEFAULT 0,
    "successfulTriggers" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL NOT NULL,
    "profitability" REAL NOT NULL,
    "lastTriggered" DATETIME,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertPerformance_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "tickers" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "image" TEXT,
    "sentiment" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_News" ("createdAt", "id", "image", "publishedAt", "sentiment", "source", "summary", "tags", "tickers", "title", "url") SELECT "createdAt", "id", "image", "publishedAt", "sentiment", "source", "summary", "tags", "tickers", "title", "url" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");
CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
CREATE INDEX "News_sentiment_idx" ON "News"("sentiment");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AlertPerformance_lastUpdated_idx" ON "AlertPerformance"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "AlertPerformance_alertId_key" ON "AlertPerformance"("alertId");
