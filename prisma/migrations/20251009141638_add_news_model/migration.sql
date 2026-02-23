/*
  Warnings:

  - You are about to alter the column `threshold` on the `Alert` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `yhat` on the `Forecast` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `yhatLower` on the `Forecast` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `yhatUpper` on the `Forecast` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.

*/
-- CreateTable
CREATE TABLE "FxRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "region" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "asOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserPrefs" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "region" TEXT NOT NULL DEFAULT 'global',
    "unit" TEXT NOT NULL DEFAULT 'gram',
    "karat" INTEGER NOT NULL DEFAULT 24,
    "horizon" INTEGER NOT NULL DEFAULT 30,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpotRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asOf" DATETIME NOT NULL,
    "usdPerOunce" DECIMAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'metals-api',
    "meta" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "tickers" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "image" TEXT,
    "sentiment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "threshold" DECIMAL NOT NULL,
    "direction" TEXT NOT NULL,
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("asset", "createdAt", "currency", "direction", "id", "ruleType", "threshold", "triggeredAt", "userId") SELECT "asset", "createdAt", "currency", "direction", "id", "ruleType", "threshold", "triggeredAt", "userId" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE INDEX "Alert_userId_asset_currency_idx" ON "Alert"("userId", "asset", "currency");
CREATE INDEX "Alert_triggeredAt_idx" ON "Alert"("triggeredAt");
CREATE TABLE "new_Forecast" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asset" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "ds" DATETIME NOT NULL,
    "yhat" DECIMAL NOT NULL,
    "yhatLower" DECIMAL NOT NULL,
    "yhatUpper" DECIMAL NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'prophet-1.1',
    "trainingWindow" INTEGER NOT NULL DEFAULT 30,
    "holidaysEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seasonalityFlags" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_Forecast" ("asset", "currency", "ds", "generatedAt", "holidaysEnabled", "horizonDays", "id", "modelVersion", "seasonalityFlags", "trainingWindow", "yhat", "yhatLower", "yhatUpper") SELECT "asset", "currency", "ds", "generatedAt", "holidaysEnabled", "horizonDays", "id", "modelVersion", "seasonalityFlags", "trainingWindow", "yhat", "yhatLower", "yhatUpper" FROM "Forecast";
DROP TABLE "Forecast";
ALTER TABLE "new_Forecast" RENAME TO "Forecast";
CREATE INDEX "Forecast_asset_currency_ds_idx" ON "Forecast"("asset", "currency", "ds");
CREATE INDEX "Forecast_generatedAt_idx" ON "Forecast"("generatedAt");
CREATE UNIQUE INDEX "Forecast_asset_currency_generatedAt_ds_key" ON "Forecast"("asset", "currency", "generatedAt", "ds");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FxRate_date_idx" ON "FxRate"("date");

-- CreateIndex
CREATE INDEX "FxRate_region_idx" ON "FxRate"("region");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_date_region_key" ON "FxRate"("date", "region");

-- CreateIndex
CREATE INDEX "SpotRate_asOf_idx" ON "SpotRate"("asOf");

-- CreateIndex
CREATE INDEX "SpotRate_asOf_desc_idx" ON "SpotRate"("asOf" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
