M## 4.3.2 Database Schema / Data Dictionary

This Data Dictionary is derived from the project’s Prisma schema (`prisma/schema.prisma`). It follows the lecturer’s sample format:

- **Name of Attribute**
- **Description**
- **Data Type**
- **Size**
- **PK/FK/NULL/NOT NULL**

### Type mapping used

- Prisma `Int` → **INTEGER**
- Prisma `String` → **VARCHAR** (default size **255**) or **TEXT** for JSON/long content
- Prisma `Boolean` → **BOOLEAN**
- Prisma `DateTime` → **DATETIME**
- Prisma `Decimal` → **DECIMAL**
- Prisma `Float` → **FLOAT**
- Prisma `enum` → **ENUM**

> Notes:
>
> - “FK” below refers to a **database foreign key constraint** (where present in Prisma with `@relation(fields:…, references:…)`).
> - Some fields are **logical references** only (no FK constraint in schema). These are explicitly marked as “(logical reference)”.

---

## Table: PRICE

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Historical price time-series, normalized by asset, currency, and date (`ds`).  
**Constraints:** `UNIQUE(asset, currency, ds)`

| Name of Attribute | Description                    | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------------ | --------- | ---- | ------------------- |
| id                | Price record identifier        | INTEGER   | —    | PK / NOT NULL       |
| asset             | Asset code (XAU)                | ENUM      | —    | NOT NULL            |
| currency          | Currency code (e.g., USD)      | VARCHAR   | 10   | NOT NULL            |
| ds                | Normalized date (UTC midnight) | DATETIME  | —    | NOT NULL            |
| price             | Price value                    | DECIMAL   | —    | NOT NULL            |

---

## Table: GOLDPRICE (Legacy)

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Legacy price table kept for backward compatibility during migration.  
**Constraints:** `UNIQUE(ds)`

| Name of Attribute | Description              | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------ | --------- | ---- | ------------------- |
| id                | Legacy record identifier | INTEGER   | —    | PK / NOT NULL       |
| ds                | Legacy date string       | VARCHAR   | 50   | UNIQUE / NOT NULL   |
| price             | Legacy price value       | FLOAT     | —    | NOT NULL            |

---

## Table: FORECAST

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Basic (Prophet) forecast outputs for asset/currency over forecast horizon.  
**Constraints:** `UNIQUE(asset, currency, generatedAt, ds)`

| Name of Attribute | Description                             | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | --------------------------------------- | --------- | ---- | ------------------- |
| id                | Forecast row identifier                 | INTEGER   | —    | PK / NOT NULL       |
| asset             | Asset code                              | ENUM      | —    | NOT NULL            |
| currency          | Currency code                           | VARCHAR   | 10   | NOT NULL            |
| generatedAt       | Forecast generation timestamp           | DATETIME  | —    | NOT NULL            |
| horizonDays       | Forecast horizon (days)                 | INTEGER   | —    | NOT NULL            |
| ds                | Forecasted date                         | DATETIME  | —    | NOT NULL            |
| yhat              | Predicted value                         | DECIMAL   | —    | NOT NULL            |
| yhatLower         | Lower bound                             | DECIMAL   | —    | NOT NULL            |
| yhatUpper         | Upper bound                             | DECIMAL   | —    | NOT NULL            |
| modelVersion      | Model version label                     | VARCHAR   | 50   | NOT NULL            |
| trainingWindow    | Training window (days)                  | INTEGER   | —    | NOT NULL            |
| holidaysEnabled   | Whether holidays are enabled            | BOOLEAN   | —    | NOT NULL            |
| seasonalityFlags  | Seasonality configuration (JSON string) | TEXT      | —    | NOT NULL            |

---

## Table: FORECASTRUN

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Metadata for a forecast run (settings/parameters).  
**Constraints:** `UNIQUE(generatedAt)`

| Name of Attribute | Description                             | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | --------------------------------------- | --------- | ---- | ------------------- |
| id                | Forecast run identifier                 | INTEGER   | —    | PK / NOT NULL       |
| generatedAt       | Run timestamp                           | DATETIME  | —    | UNIQUE / NOT NULL   |
| horizonDays       | Forecast horizon (days)                 | INTEGER   | —    | NOT NULL            |
| modelVersion      | Model version label                     | VARCHAR   | 50   | NOT NULL            |
| params            | Parameters (JSON string)                | TEXT      | —    | NOT NULL            |
| trainingWindow    | Training window (days)                  | INTEGER   | —    | NOT NULL            |
| holidaysEnabled   | Whether holidays are enabled            | BOOLEAN   | —    | NOT NULL            |
| seasonalityFlags  | Seasonality configuration (JSON string) | TEXT      | —    | NOT NULL            |
| randomState       | Random seed for reproducibility         | INTEGER   | —    | NULL                |

---

## Table: ENHANCEDFORECAST

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Enhanced/ensemble forecast outputs including confidence and market regime.  
**Constraints:** `UNIQUE(asset, currency, generatedAt, ds)`

| Name of Attribute | Description                       | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | --------------------------------- | --------- | ---- | ------------------- |
| id                | Enhanced forecast identifier      | INTEGER   | —    | PK / NOT NULL       |
| asset             | Asset code                        | ENUM      | —    | NOT NULL            |
| currency          | Currency code                     | VARCHAR   | 10   | NOT NULL            |
| generatedAt       | Forecast generation timestamp     | DATETIME  | —    | NOT NULL            |
| horizonDays       | Forecast horizon (days)           | INTEGER   | —    | NOT NULL            |
| ds                | Forecasted date                   | DATETIME  | —    | NOT NULL            |
| ensembleYhat      | Ensemble predicted value          | DECIMAL   | —    | NOT NULL            |
| ensembleLower     | Ensemble lower bound              | DECIMAL   | —    | NOT NULL            |
| ensembleUpper     | Ensemble upper bound              | DECIMAL   | —    | NOT NULL            |
| marketRegime      | Market regime label (bull/bear/…) | VARCHAR   | 50   | NOT NULL            |
| overallConfidence | Overall confidence (0–1)          | FLOAT     | —    | NOT NULL            |
| modelVersion      | Model version label               | VARCHAR   | 50   | NOT NULL            |

---

## Table: ENHANCEDFORECASTMODEL

**Primary Key:** `id`  
**Foreign Key:** `enhancedForecastId → EnhancedForecast(id)`  
**Description:** Per-model predictions and metrics used in the ensemble.

| Name of Attribute  | Description                     | Data Type | Size | PK/FK/NULL/NOT NULL |
| ------------------ | ------------------------------- | --------- | ---- | ------------------- |
| id                 | Row identifier                  | INTEGER   | —    | PK / NOT NULL       |
| enhancedForecastId | Parent enhanced forecast id     | INTEGER   | —    | FK / NOT NULL       |
| modelName          | Model name (Prophet/LSTM/…)     | VARCHAR   | 50   | NOT NULL            |
| predictions        | Predictions (JSON array string) | TEXT      | —    | NOT NULL            |
| confidence         | Model confidence (0–1)          | FLOAT     | —    | NOT NULL            |
| mae                | Mean absolute error             | FLOAT     | —    | NULL                |
| mape               | Mean absolute percentage error  | FLOAT     | —    | NULL                |
| weight             | Ensemble weight                 | FLOAT     | —    | NOT NULL            |

---

## Table: FORECASTFEATURE

**Primary Key:** `id`  
**Foreign Key:** `enhancedForecastId → EnhancedForecast(id)`  
**Description:** Feature importance used by enhanced forecasts.

| Name of Attribute   | Description                        | Data Type | Size | PK/FK/NULL/NOT NULL |
| ------------------- | ---------------------------------- | --------- | ---- | ------------------- |
| id                  | Row identifier                     | INTEGER   | —    | PK / NOT NULL       |
| enhancedForecastId  | Parent enhanced forecast id        | INTEGER   | —    | FK / NOT NULL       |
| featureName         | Feature name (RSI/DXY/Sentiment/…) | VARCHAR   | 100  | NOT NULL            |
| importanceScore     | Importance score (0–1)             | FLOAT     | —    | NOT NULL            |
| contributionPercent | Contribution percent (0–100)       | FLOAT     | —    | NOT NULL            |

---

## Table: FORECASTACCURACY

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Forecast evaluation records comparing predicted vs actual price.

| Name of Attribute | Description                | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | -------------------------- | --------- | ---- | ------------------- |
| id                | Row identifier             | INTEGER   | —    | PK / NOT NULL       |
| asset             | Asset code                 | ENUM      | —    | NOT NULL            |
| currency          | Currency code              | VARCHAR   | 10   | NOT NULL            |
| forecastDate      | Date forecast was made     | DATETIME  | —    | NOT NULL            |
| actualDate        | Date actual price occurred | DATETIME  | —    | NOT NULL            |
| predictedPrice    | Predicted price            | DECIMAL   | —    | NOT NULL            |
| actualPrice       | Actual price               | DECIMAL   | —    | NOT NULL            |
| error             | Absolute error             | DECIMAL   | —    | NOT NULL            |
| errorPercent      | Error percentage           | FLOAT     | —    | NOT NULL            |
| modelVersion      | Model version label        | VARCHAR   | 50   | NOT NULL            |
| createdAt         | Record creation timestamp  | DATETIME  | —    | NOT NULL            |

---

## Table: USER

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** System users (local login and Google OAuth).

| Name of Attribute | Description                | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | -------------------------- | --------- | ---- | ------------------- |
| id                | User identifier            | INTEGER   | —    | PK / NOT NULL       |
| email             | Email address              | VARCHAR   | 255  | UNIQUE / NOT NULL   |
| passwordHash      | Hashed password (bcrypt)   | VARCHAR   | 255  | NULL                |
| googleId          | Google OAuth identifier    | VARCHAR   | 255  | UNIQUE / NULL       |
| name              | User display name          | VARCHAR   | 255  | NULL                |
| role              | Role (user/admin)          | VARCHAR   | 50   | NOT NULL            |
| locale            | Preferred locale           | VARCHAR   | 10   | NOT NULL            |
| isVerified        | Verification status        | BOOLEAN   | —    | NOT NULL            |
| createdAt         | Account creation timestamp | DATETIME  | —    | NOT NULL            |
| updatedAt         | Account updated timestamp  | DATETIME  | —    | NOT NULL            |

---

## Table: ALERT

**Primary Key:** `id`  
**Foreign Key:** `userId → User(id)`  
**Description:** User price alert rules for specific assets/currencies.

| Name of Attribute | Description                         | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ----------------------------------- | --------- | ---- | ------------------- |
| id                | Alert identifier                    | INTEGER   | —    | PK / NOT NULL       |
| userId            | Owner user id                       | INTEGER   | —    | FK / NOT NULL       |
| asset             | Asset code                          | ENUM      | —    | NOT NULL            |
| currency          | Currency code                       | VARCHAR   | 10   | NOT NULL            |
| ruleType          | Rule type (price_above/price_below) | VARCHAR   | 50   | NOT NULL            |
| threshold         | Threshold value                     | DECIMAL   | —    | NOT NULL            |
| direction         | Trigger direction (above/below)     | VARCHAR   | 10   | NOT NULL            |
| triggeredAt       | Triggered timestamp                 | DATETIME  | —    | NULL                |
| createdAt         | Created timestamp                   | DATETIME  | —    | NOT NULL            |

---

## Table: ALERTPERFORMANCE

**Primary Key:** `id`  
**Foreign Key:** `alertId → Alert(id)`  
**Description:** Performance metrics for each alert (1:1 per alert).  
**Constraints:** `UNIQUE(alertId)`

| Name of Attribute  | Description               | Data Type | Size | PK/FK/NULL/NOT NULL |
| ------------------ | ------------------------- | --------- | ---- | ------------------- |
| id                 | Performance identifier    | INTEGER   | —    | PK / NOT NULL       |
| alertId            | Related alert id          | INTEGER   | —    | FK / NOT NULL       |
| accuracy           | Accuracy percentage       | FLOAT     | —    | NOT NULL            |
| totalTriggers      | Total triggers            | INTEGER   | —    | NOT NULL            |
| successfulTriggers | Successful triggers       | INTEGER   | —    | NOT NULL            |
| avgResponseTime    | Avg response time (hours) | FLOAT     | —    | NOT NULL            |
| profitability      | Profitability percentage  | FLOAT     | —    | NOT NULL            |
| lastTriggered      | Last triggered timestamp  | DATETIME  | —    | NULL                |
| lastUpdated        | Last updated timestamp    | DATETIME  | —    | NOT NULL            |

---

## Table: PUSHSUBSCRIPTION

**Primary Key:** `id`  
**Foreign Key:** `userId → User(id)`  
**Description:** Stores web push subscription endpoints and keys per user.

| Name of Attribute | Description                     | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------------- | --------- | ---- | ------------------- |
| id                | Subscription identifier         | INTEGER   | —    | PK / NOT NULL       |
| userId            | User identifier                 | INTEGER   | —    | FK / NOT NULL       |
| endpoint          | Push endpoint URL               | TEXT      | —    | NOT NULL            |
| keys              | Subscription keys (JSON string) | TEXT      | —    | NOT NULL            |
| createdAt         | Created timestamp               | DATETIME  | —    | NOT NULL            |

---

## Table: INVALIDATEDTOKEN

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Token blacklist for stateless JWT logout/token revocation.

| Name of Attribute | Description            | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ---------------------- | --------- | ---- | ------------------- |
| id                | Row identifier         | INTEGER   | —    | PK / NOT NULL       |
| token             | Revoked token (unique) | TEXT      | —    | UNIQUE / NOT NULL   |
| createdAt         | Revocation timestamp   | DATETIME  | —    | NOT NULL            |

---

## Table: MODELCOMPARISON

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Stores metrics comparing forecasting models (benchmarking).

| Name of Attribute       | Description            | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------------- | ---------------------- | --------- | ---- | ------------------- |
| id                      | Row identifier         | INTEGER   | —    | PK / NOT NULL       |
| generatedAt             | Benchmark timestamp    | DATETIME  | —    | NOT NULL            |
| horizonDays             | Horizon (days)         | INTEGER   | —    | NOT NULL            |
| prophetMae              | Prophet MAE            | FLOAT     | —    | NOT NULL            |
| prophetMape             | Prophet MAPE           | FLOAT     | —    | NOT NULL            |
| prophetMase             | Prophet MASE           | FLOAT     | —    | NOT NULL            |
| naiveMae                | Naive MAE              | FLOAT     | —    | NOT NULL            |
| naiveMape               | Naive MAPE             | FLOAT     | —    | NOT NULL            |
| naiveMase               | Naive MASE             | FLOAT     | —    | NOT NULL            |
| seasonalMae             | Seasonal MAE           | FLOAT     | —    | NOT NULL            |
| seasonalMape            | Seasonal MAPE          | FLOAT     | —    | NOT NULL            |
| seasonalMase            | Seasonal MASE          | FLOAT     | —    | NOT NULL            |
| arimaMae                | ARIMA MAE              | FLOAT     | —    | NOT NULL            |
| arimaMape               | ARIMA MAPE             | FLOAT     | —    | NOT NULL            |
| arimaMase               | ARIMA MASE             | FLOAT     | —    | NOT NULL            |
| dmTestProphetVsNaive    | DM test value          | FLOAT     | —    | NOT NULL            |
| dmTestProphetVsSeasonal | DM test value          | FLOAT     | —    | NOT NULL            |
| dmTestProphetVsArima    | DM test value          | FLOAT     | —    | NOT NULL            |
| trainingWindow          | Training window (days) | INTEGER   | —    | NOT NULL            |

---

## Table: RETRAINTICKET

**Primary Key:** `id`  
**Foreign Key:** — _(requestedBy is a logical reference)_  
**Description:** Tracks retraining requests and lifecycle status.

| Name of Attribute | Description                            | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | -------------------------------------- | --------- | ---- | ------------------- |
| id                | Ticket identifier                      | INTEGER   | —    | PK / NOT NULL       |
| requestedAt       | Request timestamp                      | DATETIME  | —    | NOT NULL            |
| reason            | Reason for retrain                     | TEXT      | —    | NOT NULL            |
| status            | pending/in_progress/completed/failed   | VARCHAR   | 50   | NOT NULL            |
| requestedBy       | Requesting user id (logical reference) | INTEGER   | —    | NOT NULL            |
| completedAt       | Completion timestamp                   | DATETIME  | —    | NULL                |
| notes             | Notes                                  | TEXT      | —    | NULL                |

---

## Table: FXRATE

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Exchange rate table for region-specific YER/USD rates.  
**Constraints:** `UNIQUE(date, region)`

| Name of Attribute | Description                    | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------------ | --------- | ---- | ------------------- |
| id                | Row identifier                 | INTEGER   | —    | PK / NOT NULL       |
| date              | Normalized date (UTC midnight) | DATETIME  | —    | NOT NULL            |
| region            | Region (ADEN/SANAA)            | ENUM      | —    | NOT NULL            |
| rate              | YER per USD                    | DECIMAL   | —    | NOT NULL            |
| source            | Rate source                    | VARCHAR   | 50   | NOT NULL            |
| asOf              | Last updated timestamp         | DATETIME  | —    | NOT NULL            |

---

## Table: USERPREFS

**Primary Key:** `userId`  
**Foreign Key:** — _(logical 1:1 with User)_  
**Description:** Stores user preferences for currency, region, units, and UI settings.

| Name of Attribute | Description                         | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ----------------------------------- | --------- | ---- | ------------------- |
| userId            | User identifier (logical reference) | INTEGER   | —    | PK / NOT NULL       |
| currency          | Preferred currency                  | VARCHAR   | 10   | NOT NULL            |
| region            | Preferred region                    | VARCHAR   | 50   | NOT NULL            |
| unit              | Preferred unit (gram/…)             | VARCHAR   | 20   | NOT NULL            |
| karat             | Preferred karat                     | INTEGER   | —    | NOT NULL            |
| horizon           | Forecast horizon (days)             | INTEGER   | —    | NOT NULL            |
| locale            | Preferred locale                    | VARCHAR   | 10   | NOT NULL            |
| theme             | UI theme                            | VARCHAR   | 20   | NOT NULL            |
| updatedAt         | Updated timestamp                   | DATETIME  | —    | NOT NULL            |

---

## Table: SPOTRATE

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Live spot price snapshots (USD per ounce) with metadata.

| Name of Attribute | Description            | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ---------------------- | --------- | ---- | ------------------- |
| id                | Row identifier         | INTEGER   | —    | PK / NOT NULL       |
| asOf              | Spot fetch timestamp   | DATETIME  | —    | NOT NULL            |
| usdPerOunce       | USD per troy ounce     | DECIMAL   | —    | NOT NULL            |
| source            | Data source            | VARCHAR   | 50   | NOT NULL            |
| meta              | Metadata (JSON string) | TEXT      | —    | NOT NULL            |

---

## Table: NEWS

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Real-time financial news items with optional sentiment label.  
**Constraints:** `UNIQUE(url)`

| Name of Attribute | Description               | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------- | --------- | ---- | ------------------- |
| id                | News identifier           | INTEGER   | —    | PK / NOT NULL       |
| title             | Article title             | VARCHAR   | 500  | NOT NULL            |
| summary           | Article summary           | TEXT      | —    | NULL                |
| url               | Article URL               | VARCHAR   | 1000 | UNIQUE / NOT NULL   |
| source            | Publisher/source          | VARCHAR   | 255  | NOT NULL            |
| publishedAt       | Publish timestamp         | DATETIME  | —    | NOT NULL            |
| tickers           | Ticker list (JSON string) | TEXT      | —    | NOT NULL            |
| tags              | Tags list (JSON string)   | TEXT      | —    | NOT NULL            |
| image             | Image URL                 | VARCHAR   | 500  | NULL                |
| video             | Video URL                 | VARCHAR   | 500  | NULL                |
| sentiment         | -1/0/1 sentiment          | INTEGER   | —    | NULL                |
| createdAt         | Created timestamp         | DATETIME  | —    | NOT NULL            |

---

## Table: PORTFOLIOS (Model: Portfolio)

**Primary Key:** `id`  
**Foreign Key:** — _(userId is a logical reference, not enforced in schema)_  
**Description:** User portfolio containers for holdings and transactions.

| Name of Attribute | Description                       | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | --------------------------------- | --------- | ---- | ------------------- |
| id                | Portfolio identifier (cuid)       | VARCHAR   | 50   | PK / NOT NULL       |
| userId            | Owner user id (logical reference) | VARCHAR   | 50   | NOT NULL            |
| name              | Portfolio name                    | VARCHAR   | 255  | NOT NULL            |
| description       | Portfolio description             | TEXT      | —    | NULL                |
| createdAt         | Created timestamp                 | DATETIME  | —    | NOT NULL            |
| updatedAt         | Updated timestamp                 | DATETIME  | —    | NOT NULL            |

---

## Table: TRANSACTIONS (Model: Transaction)

**Primary Key:** `id`  
**Foreign Key:** `portfolioId → portfolios(id)`  
**Description:** Buy/Sell transaction entries for a portfolio.

| Name of Attribute | Description                   | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ----------------------------- | --------- | ---- | ------------------- |
| id                | Transaction identifier (cuid) | VARCHAR   | 50   | PK / NOT NULL       |
| portfolioId       | Portfolio identifier          | VARCHAR   | 50   | FK / NOT NULL       |
| type              | Transaction type (BUY/SELL)   | VARCHAR   | 10   | NOT NULL            |
| asset             | Asset code                    | ENUM      | —    | NOT NULL            |
| amount            | Amount (ounces)               | DECIMAL   | —    | NOT NULL            |
| price             | Price per ounce at time       | DECIMAL   | —    | NOT NULL            |
| totalValue        | amount \* price               | DECIMAL   | —    | NOT NULL            |
| fees              | Transaction fees              | DECIMAL   | —    | NULL                |
| currency          | Currency code                 | VARCHAR   | 10   | NOT NULL            |
| timestamp         | Transaction timestamp         | DATETIME  | —    | NOT NULL            |
| notes             | Notes                         | TEXT      | —    | NULL                |

---

## Table: HOLDINGS (Model: Holding)

**Primary Key:** `id`  
**Foreign Key:** `portfolioId → portfolios(id)`  
**Description:** Current holdings per portfolio and asset.  
**Constraints:** `UNIQUE(portfolioId, asset)`

| Name of Attribute | Description               | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ------------------------- | --------- | ---- | ------------------- |
| id                | Holding identifier (cuid) | VARCHAR   | 50   | PK / NOT NULL       |
| portfolioId       | Portfolio identifier      | VARCHAR   | 50   | FK / NOT NULL       |
| asset             | Asset code                | ENUM      | —    | NOT NULL            |
| amount            | Current amount held       | DECIMAL   | —    | NOT NULL            |
| avgCost           | Average cost per ounce    | DECIMAL   | —    | NOT NULL            |
| totalCost         | Total cost basis          | DECIMAL   | —    | NOT NULL            |
| currentValue      | Current market value      | DECIMAL   | —    | NOT NULL            |
| currency          | Currency code             | VARCHAR   | 10   | NOT NULL            |
| updatedAt         | Updated timestamp         | DATETIME  | —    | NOT NULL            |

---

## Table: GOLD_SHOPS (Model: GoldShop)

**Primary Key:** `id`  
**Foreign Key:** —  
**Description:** Gold shop directory (Yemen regions), metadata, and price range.

| Name of Attribute | Description                | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | -------------------------- | --------- | ---- | ------------------- |
| id                | Shop identifier (cuid)     | VARCHAR   | 50   | PK / NOT NULL       |
| name              | Shop name                  | VARCHAR   | 255  | NOT NULL            |
| nameAr            | Arabic name                | VARCHAR   | 255  | NULL                |
| region            | Yemen region               | ENUM      | —    | NOT NULL            |
| lat               | Latitude                   | FLOAT     | —    | NOT NULL            |
| lng               | Longitude                  | FLOAT     | —    | NOT NULL            |
| address           | Address                    | VARCHAR   | 500  | NOT NULL            |
| addressAr         | Arabic address             | VARCHAR   | 500  | NULL                |
| rating            | Rating                     | FLOAT     | —    | NOT NULL            |
| reviewCount       | Cached review count        | INTEGER   | —    | NOT NULL            |
| certified         | Certified flag             | BOOLEAN   | —    | NOT NULL            |
| verified          | Verified flag              | BOOLEAN   | —    | NOT NULL            |
| trustScore        | Trust score (0–100)        | INTEGER   | —    | NULL                |
| phone             | Phone number               | VARCHAR   | 50   | NULL                |
| email             | Email                      | VARCHAR   | 255  | NULL                |
| website           | Website                    | VARCHAR   | 255  | NULL                |
| openingHours      | Opening hours              | TEXT      | —    | NULL                |
| openingHoursAr    | Arabic opening hours       | TEXT      | —    | NULL                |
| description       | Description                | TEXT      | —    | NULL                |
| descriptionAr     | Arabic description         | TEXT      | —    | NULL                |
| priceMin          | Min price (YER/gram)       | DECIMAL   | —    | NULL                |
| priceMax          | Max price (YER/gram)       | DECIMAL   | —    | NULL                |
| services          | Services list (enum array) | ENUM[]    | —    | NOT NULL            |
| createdAt         | Created timestamp          | DATETIME  | —    | NOT NULL            |
| updatedAt         | Updated timestamp          | DATETIME  | —    | NOT NULL            |
| lastUpdated       | Last updated timestamp     | DATETIME  | —    | NULL                |

---

## Table: SHOP_PHOTOS (Model: ShopPhoto)

**Primary Key:** `id`  
**Foreign Key:** `shopId → gold_shops(id)`  
**Description:** Photo records for shops.

| Name of Attribute | Description             | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | ----------------------- | --------- | ---- | ------------------- |
| id                | Photo identifier (cuid) | VARCHAR   | 50   | PK / NOT NULL       |
| shopId            | Shop identifier         | VARCHAR   | 50   | FK / NOT NULL       |
| url               | Photo URL               | VARCHAR   | 500  | NOT NULL            |
| thumbnail         | Thumbnail URL           | VARCHAR   | 500  | NULL                |
| caption           | Caption                 | VARCHAR   | 255  | NULL                |
| createdAt         | Created timestamp       | DATETIME  | —    | NOT NULL            |

---

## Table: SHOP_REVIEWS (Model: ShopReview)

**Primary Key:** `id`  
**Foreign Key:** `shopId → gold_shops(id)`, `userId → User(id)` (nullable, ON DELETE SET NULL)  
**Description:** Shop reviews with optional link to a user account.

| Name of Attribute | Description                | Data Type | Size | PK/FK/NULL/NOT NULL |
| ----------------- | -------------------------- | --------- | ---- | ------------------- |
| id                | Review identifier (cuid)   | VARCHAR   | 50   | PK / NOT NULL       |
| shopId            | Shop identifier            | VARCHAR   | 50   | FK / NOT NULL       |
| userId            | User identifier (optional) | INTEGER   | —    | FK / NULL           |
| userName          | Display name for review    | VARCHAR   | 255  | NOT NULL            |
| rating            | Rating (1–5)               | INTEGER   | —    | NOT NULL            |
| comment           | Review comment             | TEXT      | —    | NOT NULL            |
| verified          | Verified review flag       | BOOLEAN   | —    | NOT NULL            |
| createdAt         | Created timestamp          | DATETIME  | —    | NOT NULL            |
