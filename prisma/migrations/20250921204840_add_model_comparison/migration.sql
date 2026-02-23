-- CreateTable
CREATE TABLE "GoldPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ds" DATETIME NOT NULL,
    "price" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generatedAt" DATETIME NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "ds" DATETIME NOT NULL,
    "yhat" REAL NOT NULL,
    "yhatLower" REAL NOT NULL,
    "yhatUpper" REAL NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'prophet-1.1',
    "trainingWindow" INTEGER NOT NULL DEFAULT 30,
    "holidaysEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seasonalityFlags" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "ForecastRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generatedAt" DATETIME NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'prophet-1.1',
    "params" TEXT NOT NULL DEFAULT '{}',
    "trainingWindow" INTEGER NOT NULL DEFAULT 30,
    "holidaysEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seasonalityFlags" TEXT NOT NULL DEFAULT '{}',
    "randomState" INTEGER
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "ruleType" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvalidatedToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ModelComparison" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generatedAt" DATETIME NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "prophetMae" REAL NOT NULL,
    "prophetMape" REAL NOT NULL,
    "prophetMase" REAL NOT NULL,
    "naiveMae" REAL NOT NULL,
    "naiveMape" REAL NOT NULL,
    "naiveMase" REAL NOT NULL,
    "seasonalMae" REAL NOT NULL,
    "seasonalMape" REAL NOT NULL,
    "seasonalMase" REAL NOT NULL,
    "arimaMae" REAL NOT NULL,
    "arimaMape" REAL NOT NULL,
    "arimaMase" REAL NOT NULL,
    "dmTestProphetVsNaive" REAL NOT NULL,
    "dmTestProphetVsSeasonal" REAL NOT NULL,
    "dmTestProphetVsArima" REAL NOT NULL,
    "trainingWindow" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "RetrainTicket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestedAt" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" INTEGER NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "GoldPrice_ds_key" ON "GoldPrice"("ds");

-- CreateIndex
CREATE INDEX "GoldPrice_ds_idx" ON "GoldPrice"("ds");

-- CreateIndex
CREATE INDEX "Forecast_ds_idx" ON "Forecast"("ds");

-- CreateIndex
CREATE INDEX "Forecast_generatedAt_idx" ON "Forecast"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Forecast_generatedAt_ds_horizonDays_key" ON "Forecast"("generatedAt", "ds", "horizonDays");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastRun_generatedAt_key" ON "ForecastRun"("generatedAt");

-- CreateIndex
CREATE INDEX "ForecastRun_generatedAt_idx" ON "ForecastRun"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_triggeredAt_idx" ON "Alert"("triggeredAt");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvalidatedToken_token_key" ON "InvalidatedToken"("token");

-- CreateIndex
CREATE INDEX "InvalidatedToken_token_idx" ON "InvalidatedToken"("token");

-- CreateIndex
CREATE INDEX "ModelComparison_generatedAt_idx" ON "ModelComparison"("generatedAt");

-- CreateIndex
CREATE INDEX "RetrainTicket_requestedAt_idx" ON "RetrainTicket"("requestedAt");

-- CreateIndex
CREATE INDEX "RetrainTicket_status_idx" ON "RetrainTicket"("status");
