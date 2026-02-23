-- Add performance indexes for common queries
-- This migration improves query performance for frequently accessed data

-- GoldPrice indexes
CREATE INDEX IF NOT EXISTS idx_gold_price_ds_desc ON "GoldPrice"("ds" DESC);
CREATE INDEX IF NOT EXISTS idx_gold_price_currency ON "GoldPrice"("currency");

-- Forecast indexes
CREATE INDEX IF NOT EXISTS idx_forecast_generatedAt ON "Forecast"("generatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_asset_currency ON "Forecast"("asset", "currency");
CREATE INDEX IF NOT EXISTS idx_forecast_ds ON "Forecast"("ds" DESC);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alert_userId ON "Alert"("userId");
CREATE INDEX IF NOT EXISTS idx_alert_asset_currency ON "Alert"("asset", "currency");
CREATE INDEX IF NOT EXISTS idx_alert_triggeredAt ON "Alert"("triggeredAt" DESC);

-- News indexes
CREATE INDEX IF NOT EXISTS idx_news_publishedAt ON "News"("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON "News"("sentiment");
CREATE INDEX IF NOT EXISTS idx_news_source ON "News"("source");

-- ForecastRun indexes
CREATE INDEX IF NOT EXISTS idx_forecastRun_generatedAt ON "ForecastRun"("generatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_forecastRun_modelVersion ON "ForecastRun"("modelVersion");

