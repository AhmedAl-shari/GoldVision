/**
 * Forecast Service
 * Business logic for forecast generation
 */

const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ForecastService {
  constructor(dependencies) {
    this.prisma = dependencies.prisma || prisma;
    this.spotProvider = dependencies.spotProvider;
    this.prophetCircuitBreaker = dependencies.prophetCircuitBreaker;
    this.prophetUrl = dependencies.prophetUrl || process.env.PROPHET_URL || "http://localhost:8001";
    this.forecastCache = dependencies.forecastCache;
    this.featureCollector = dependencies.featureCollector;
    this.dataQuality = dependencies.dataQuality;
    this.metrics = dependencies.metrics;
    this.forecastLatencyCold = dependencies.forecastLatencyCold;
    this.forecastLatencyWarm = dependencies.forecastLatencyWarm;
  }

  /**
   * Normalize date to UTC date
   */
  normalizeDateToUTCDate(date) {
    if (typeof date === "string") {
      return new Date(date + "T00:00:00Z");
    }
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /**
   * Generate basic forecast
   */
  async generateForecast(params) {
    const {
      horizon_days = 14,
      force_cold = false,
      include_history = false,
      use_enhanced = true,
      use_ensemble = true,
    } = params;

    const startTime = Date.now();

    // Get historical data - use more data for enhanced forecast
    const prices = await this.prisma.goldPrice.findMany({
      orderBy: { ds: "desc" },
      take: use_enhanced ? 60 : 30,
    });

    // Check if we have recent data (within last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let recentPrices = prices.filter((p) => new Date(p.ds) >= sevenDaysAgo);

    // If we don't have recent data, use current spot price
    if (recentPrices.length < 2) {
      console.log(
        "Insufficient recent historical data, using current spot price for forecast"
      );

      const spotData = await this.spotProvider.getSpotRate();
      if (!spotData?.usdPerOunce) {
        throw new Error("Unable to get current spot price for forecasting");
      }

      return this._generateSpotBasedForecast(spotData.usdPerOunce, horizon_days);
    }

    // Validate and clean data quality
    const qualityScore = this.dataQuality.getQualityScore(recentPrices);
    console.log(`[Forecast] Data quality score: ${qualityScore}/100`);

    if (qualityScore < 50) {
      console.warn("[Forecast] Low data quality detected, cleaning data...");
      const cleaned = this.dataQuality.cleanPrices(recentPrices);
      if (cleaned.cleaned.length > 0) {
        recentPrices = cleaned.cleaned;
        console.log(
          `[Forecast] Cleaned ${cleaned.removed.length} outliers, ${cleaned.cleaned.length} valid points remaining`
        );
      }
    }

    // Fill missing data if needed
    recentPrices = this.dataQuality.fillMissingData(recentPrices);

    // If enhanced forecast is enabled and we have enough data, use enhanced endpoint
    if (use_enhanced && prices.length >= 5) {
      try {
        return await this._generateEnhancedForecast(
          prices,
          recentPrices,
          horizon_days,
          use_ensemble,
          include_history,
          force_cold,
          startTime
        );
      } catch (enhancedError) {
        console.warn(
          "[Forecast] Enhanced forecast failed, falling back to basic Prophet:",
          enhancedError.message
        );
        // Fall through to basic Prophet forecast
      }
    }

    // Basic Prophet forecast (fallback or if use_enhanced=false)
    return await this._generateBasicForecast(
      recentPrices,
      horizon_days,
      include_history,
      force_cold,
      startTime
    );
  }

  /**
   * Generate spot-based forecast when insufficient historical data
   */
  _generateSpotBasedForecast(currentPrice, horizon_days) {
    const forecast = [];

    for (let i = 1; i <= horizon_days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const dailyVariation = (Math.random() - 0.5) * 0.04;
      const trendFactor = 1 + dailyVariation * i * 0.1;
      const forecastPrice = currentPrice * trendFactor;
      const variance = forecastPrice * 0.02;

      forecast.push({
        ds: date.toISOString().split("T")[0],
        yhat: Math.round(forecastPrice * 100) / 100,
        yhat_lower: Math.round((forecastPrice - variance) * 100) / 100,
        yhat_upper: Math.round((forecastPrice + variance) * 100) / 100,
      });
    }

    return {
      generated_at: new Date().toISOString(),
      horizon_days: parseInt(horizon_days),
      forecast: forecast,
      model_version: "spot-based-1.0",
      training_window_days: 0,
      holidays_enabled: false,
      seasonality_flags: {},
      degraded: false,
      note: "Forecast based on current spot price due to insufficient historical data",
    };
  }

  /**
   * Generate enhanced forecast using ensemble models
   */
  async _generateEnhancedForecast(
    prices,
    pricesToUse,
    horizon_days,
    use_ensemble,
    include_history,
    force_cold,
    startTime
  ) {
    console.log("[Forecast] Using enhanced forecast for improved accuracy");

    // Prepare price data
    const priceRows = pricesToUse.reverse().map((p) => ({
      ds: typeof p.ds === "string" ? p.ds : p.ds.toISOString().split("T")[0],
      price: parseFloat(p.price || p),
    }));

    const dates = priceRows.map((r) => r.ds);
    const priceValues = priceRows.map((r) => r.price);

    // Collect external features for enhanced accuracy
    console.log(
      "[Forecast] Collecting external features for enhanced accuracy..."
    );
    const allFeatures = await this.featureCollector.collectFeatures(
      priceValues,
      dates,
      this.prisma
    );
    const externalFeatures =
      this.featureCollector.formatForEnhancedForecast(allFeatures);

    // Create cache key
    const lastPriceDate = dates[dates.length - 1];
    const cacheKey = `enhanced_${lastPriceDate}_${horizon_days}_ensemble`;

    // Check cache
    if (!force_cold) {
      const cached = this.forecastCache.get(cacheKey);
      if (cached) {
        console.log(`[Forecast] Enhanced cache HIT for key: ${cacheKey}`);
        this.metrics.recordForecastCacheHit("forecast");
        const warmLatency = Date.now() - startTime;
        this.forecastLatencyWarm.observe(warmLatency);
        return cached;
      }
    }

    console.log(`[Forecast] Generating enhanced forecast...`);

    // Call enhanced forecast service
    const enhancedResponse = await axios.post(
      `${this.prophetUrl}/forecast/enhanced`,
      {
        rows: priceRows,
        external_features: externalFeatures,
        horizon_days: parseInt(horizon_days),
        use_ensemble: use_ensemble,
        include_feature_importance: true,
      },
      {
        timeout: 30000,
      }
    );

    const enhancedData = enhancedResponse.data;

    // Format response
    const response = {
      generated_at: enhancedData.generated_at || new Date().toISOString(),
      horizon_days: parseInt(horizon_days),
      forecast: enhancedData.forecast || [],
      model_version: enhancedData.model_version || "enhanced-ensemble-2.0",
      training_window_days: prices.length,
      holidays_enabled: true,
      seasonality_flags: { daily: true, weekly: true, yearly: true },
      enhanced: true,
      ensemble_prediction: enhancedData.ensemble_prediction,
      individual_models: enhancedData.individual_models,
      feature_importance: enhancedData.feature_importance,
      market_regime: enhancedData.market_regime,
      overall_confidence: enhancedData.overall_confidence,
      ...(include_history && {
        history: prices.reverse().map((p) => ({
          date:
            typeof p.ds === "string"
              ? p.ds
              : p.ds.toISOString().split("T")[0],
          price: p.price,
          currency: p.currency || "USD",
        })),
      }),
    };

    // Cache the result
    this.forecastCache.set(cacheKey, response);
    console.log(`[Forecast] Enhanced forecast generated and cached`);

    // Record cold latency
    const coldLatency = Date.now() - startTime;
    this.forecastLatencyCold.observe(coldLatency);

    return response;
  }

  /**
   * Generate basic Prophet forecast
   */
  async _generateBasicForecast(
    pricesToUse,
    horizon_days,
    include_history,
    force_cold,
    startTime
  ) {
    const lastPrice = pricesToUse[0];
    const lastPriceDate =
      typeof lastPrice.ds === "string"
        ? lastPrice.ds
        : lastPrice.ds.toISOString().split("T")[0];
    const cacheKey = `${lastPriceDate}-${horizon_days}`;

    // Check cache
    if (!force_cold) {
      const cached = this.forecastCache.get(cacheKey);
      if (cached) {
        console.log(`[Forecast] Cache HIT for key: ${cacheKey}`);
        this.metrics.recordForecastCacheHit("forecast");
        const warmLatency = Date.now() - startTime;
        this.forecastLatencyWarm.observe(warmLatency);

        if (include_history && !cached.history) {
          cached.history = pricesToUse.reverse().map((p) => ({
            date: p.ds.toISOString().split("T")[0],
            price: p.price,
            currency: p.currency || "USD",
          }));
        }

        return cached;
      }
    }

    console.log(
      `[Forecast] Cache MISS for key: ${cacheKey} - Generating new forecast...`
    );
    this.metrics.recordForecastCacheMiss("forecast");

    // Prepare data for Prophet
    const prophetData = pricesToUse.reverse().map((p) => ({
      ds: new Date(p.ds).toISOString().split("T")[0],
      price: p.price,
    }));

    // Call Prophet service with circuit breaker
    const forecast = await this.prophetCircuitBreaker.execute(async () => {
      const response = await axios.post(
        `${this.prophetUrl}/forecast`,
        {
          rows: prophetData,
          horizon_days: parseInt(horizon_days),
        },
        {
          timeout: 10000,
        }
      );
      return response.data;
    });

    // Store forecast in database
    const generatedAt = new Date();
    await this.prisma.forecastRun.create({
      data: {
        generatedAt,
        horizonDays: parseInt(horizon_days),
        modelVersion: "prophet-1.1",
        params: JSON.stringify({
          trainingWindow: pricesToUse.length,
          holidaysEnabled: true,
          seasonalityFlags: { daily: true, weekly: true, yearly: true },
        }),
        trainingWindow: pricesToUse.length,
        holidaysEnabled: true,
        seasonalityFlags: JSON.stringify({
          daily: true,
          weekly: true,
          yearly: true,
        }),
        randomState: 42,
      },
    });

    // Store individual forecast points
    const forecastPoints = forecast.forecast.map((point) => ({
      asset: "XAU",
      currency: "USD",
      generatedAt,
      horizonDays: parseInt(horizon_days),
      ds: this.normalizeDateToUTCDate(point.ds),
      yhat: String(point.yhat),
      yhatLower: String(point.yhat_lower),
      yhatUpper: String(point.yhat_upper),
      modelVersion: "prophet-1.1",
      trainingWindow: pricesToUse.length,
      holidaysEnabled: true,
      seasonalityFlags: JSON.stringify({
        daily: true,
        weekly: true,
        yearly: true,
      }),
    }));

    await this.prisma.forecast.createMany({
      data: forecastPoints,
    });

    // Format response
    const response = {
      generated_at: generatedAt.toISOString(),
      horizon_days: parseInt(horizon_days),
      forecast: forecast.forecast,
      model_version: "prophet-1.1",
      training_window_days: pricesToUse.length,
      holidays_enabled: true,
      seasonality_flags: { daily: true, weekly: true, yearly: true },
      ...(include_history && {
        history: pricesToUse.reverse().map((p) => ({
          date:
            typeof p.ds === "string"
              ? p.ds
              : p.ds.toISOString().split("T")[0],
          price: p.price,
          currency: p.currency || "USD",
        })),
      }),
    };

    this.forecastCache.set(cacheKey, response);
    console.log(`[Forecast] Cached new forecast with key: ${cacheKey}`);

    const coldLatency = Date.now() - startTime;
    this.forecastLatencyCold.observe(coldLatency);

    return response;
  }
}

module.exports = ForecastService;

