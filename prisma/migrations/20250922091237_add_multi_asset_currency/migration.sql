-- CreateTable
CREATE TABLE "Price" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asset" TEXT NOT NULL CHECK ("asset" IN ('XAU', 'XAG', 'XPT')),
    "currency" TEXT NOT NULL,
    "ds" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Price_asset_currency_ds_key" ON "Price"("asset", "currency", "ds");

-- CreateIndex
CREATE INDEX "Price_asset_currency_ds_idx" ON "Price"("asset", "currency", "ds");

-- CreateIndex
CREATE INDEX "Price_ds_idx" ON "Price"("ds");

-- Add columns to existing tables with default values
ALTER TABLE "Alert" ADD COLUMN "asset" TEXT NOT NULL DEFAULT 'XAU' CHECK ("asset" IN ('XAU', 'XAG', 'XPT'));
ALTER TABLE "Alert" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Add columns to Forecast table with default values
ALTER TABLE "Forecast" ADD COLUMN "asset" TEXT NOT NULL DEFAULT 'XAU' CHECK ("asset" IN ('XAU', 'XAG', 'XPT'));
ALTER TABLE "Forecast" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Create new indexes
CREATE INDEX "Alert_userId_asset_currency_idx" ON "Alert"("userId", "asset", "currency");
CREATE INDEX "Forecast_asset_currency_ds_idx" ON "Forecast"("asset", "currency", "ds");

-- Migrate existing data from GoldPrice to Price table
INSERT INTO "Price" ("asset", "currency", "ds", "price")
SELECT 'XAU', 'USD', "ds", "price" FROM "GoldPrice";

-- Update unique constraints
DROP INDEX "Forecast_generatedAt_ds_horizonDays_key";
CREATE UNIQUE INDEX "Forecast_asset_currency_generatedAt_ds_key" ON "Forecast"("asset", "currency", "generatedAt", "ds");
