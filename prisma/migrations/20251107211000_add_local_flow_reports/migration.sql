-- CreateTable
CREATE TABLE "LocalFlowReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportDate" DATETIME NOT NULL,
    "region" TEXT NOT NULL,
    "netFlow" INTEGER NOT NULL DEFAULT 0,
    "supplyPressure" INTEGER NOT NULL DEFAULT 0,
    "demandPressure" INTEGER NOT NULL DEFAULT 0,
    "retailPremiumBps" INTEGER,
    "buybackDiscountBps" INTEGER,
    "makingChargeYER" REAL,
    "bullionArrivals" TEXT,
    "contributors" TEXT DEFAULT '[]',
    "notes" TEXT DEFAULT '',
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LocalFlowReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GoldPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ds" TEXT NOT NULL,
    "price" REAL NOT NULL
);
INSERT INTO "new_GoldPrice" ("ds", "id", "price") SELECT "ds", "id", "price" FROM "GoldPrice";
DROP TABLE "GoldPrice";
ALTER TABLE "new_GoldPrice" RENAME TO "GoldPrice";
CREATE UNIQUE INDEX "GoldPrice_ds_key" ON "GoldPrice"("ds");
CREATE INDEX "GoldPrice_ds_idx" ON "GoldPrice"("ds");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LocalFlowReport_region_reportDate_idx" ON "LocalFlowReport"("region", "reportDate");

-- CreateIndex
CREATE INDEX "LocalFlowReport_reportDate_idx" ON "LocalFlowReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "LocalFlowReport_region_reportDate_key" ON "LocalFlowReport"("region", "reportDate");
