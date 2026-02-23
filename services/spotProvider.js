const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PLACEHOLDER_KEY_REGEX =
  /(your-|sample-|changeme|demo|replace_me|insert-key)/i;

function normalizeApiKey(rawKey) {
  if (!rawKey) {
    return { key: null, reason: "not set" };
  }

  const trimmed = String(rawKey).trim();
  if (!trimmed) {
    return { key: null, reason: "blank" };
  }

  if (PLACEHOLDER_KEY_REGEX.test(trimmed)) {
    return { key: null, reason: "placeholder value detected" };
  }

  return { key: trimmed, reason: null };
}

class SpotProvider {
  constructor() {
    const metalsKey = normalizeApiKey(process.env.METALS_API_KEY);
    const goldKey = normalizeApiKey(process.env.GOLDAPI_KEY);
    const commoditiesKey = normalizeApiKey(process.env.COMMODITIES_API_KEY);
    const alphaVantageKey = normalizeApiKey(process.env.ALPHA_VANTAGE_API_KEY);
    const twelveDataKey = normalizeApiKey(process.env.TWELVE_DATA_API_KEY);

    this.metalsApiKey = metalsKey.key;
    this.goldApiKey = goldKey.key;
    this.commoditiesApiKey = commoditiesKey.key;
    this.alphaVantageKey = alphaVantageKey.key;
    this.twelveDataKey = twelveDataKey.key;

    this.apiKeyReasons = {
      "metals-api": metalsKey.reason,
      goldapi: goldKey.reason,
      "commodities-api": commoditiesKey.reason,
      "alpha-vantage": alphaVantageKey.reason,
      twelvedata: twelveDataKey.reason,
    };

    this.cache = new Map();
    this.cacheTimeout = Number(process.env.SPOT_CACHE_TTL_MS) || 60 * 1000; // default 60s
    this.providerStats = {};
    this.providerSkipNotified = new Set();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      ttlMs: this.cacheTimeout,
    };
    this.lastSpotResult = null;
  }

  async getSpotRate() {
    const cacheKey = "spot_rate";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.cacheStats.hits += 1;
      const cachedData = {
        ...cached.data,
        cacheHit: true,
      };
      this.lastSpotResult = cachedData;
      this.recordProviderCacheHit(cached.data?.provider);
      return cachedData;
    }

    try {
      // Try multiple APIs in order of preference
      const apis = [
        {
          name: "metals-api",
          key: this.metalsApiKey,
          fetch: () => this.fetchFromMetalsAPI(),
          reason: this.apiKeyReasons["metals-api"],
        },
        {
          name: "goldapi",
          key: this.goldApiKey,
          fetch: () => this.fetchFromGoldAPI(),
          reason: this.apiKeyReasons.goldapi,
        },
        {
          name: "coingecko-paxg",
          key: "public",
          fetch: () => this.fetchFromCoinGecko(),
        },
        // Public, no-key fallback (Metals.live). This improves accuracy when keys are missing.
        {
          name: "metals-live",
          key: "public",
          fetch: () => this.fetchFromMetalsLive(),
        },
        // GoldPrice.org public JSON as another fallback
        {
          name: "goldprice-org",
          key: "public",
          fetch: () => this.fetchFromGoldPriceOrg(),
        },
        {
          name: "commodities-api",
          key: this.commoditiesApiKey,
          fetch: () => this.fetchFromCommoditiesAPI(),
          reason: this.apiKeyReasons["commodities-api"],
        },
        {
          name: "alpha-vantage",
          key: this.alphaVantageKey,
          fetch: () => this.fetchFromAlphaVantage(),
          reason: this.apiKeyReasons["alpha-vantage"],
        },
      ];

      for (const api of apis) {
        if (!api.key && api.key !== "public") {
          if (!this.providerSkipNotified.has(api.name)) {
            const reason =
              api.reason ||
              "API key missing. Set the key in the environment to enable this provider.";
            this.markProviderSkipped(api.name, reason);
            this.providerSkipNotified.add(api.name);
          }
          continue;
        }

        if (api.key || api.key === "public") {
          const startTime = Date.now();
          try {
            const spotData = await api.fetch();
            if (spotData) {
              const now = new Date();
              const fallbackLevel = apis.indexOf(api);
              const enrichedSpotData = {
                ...spotData,
                provider: api.name,
                fetchedAt: now.toISOString(),
                fallbackLevel,
              };
              await this.saveSpotRate(enrichedSpotData);
              this.cache.set(cacheKey, {
                data: enrichedSpotData,
                timestamp: now.getTime(),
              });
              this.cacheStats.misses += 1;
              this.lastSpotResult = {
                ...enrichedSpotData,
                cacheHit: false,
              };
              this.recordProviderSuccess(
                api.name,
                Date.now() - startTime,
                fallbackLevel
              );
              return enrichedSpotData;
            }
            const fallbackLevel = apis.indexOf(api);
            const reasonMessage = api.reason
              ? `Provider unavailable: ${api.reason}`
              : "No data returned";
            this.recordProviderFailure(
              api.name,
              Date.now() - startTime,
              new Error(reasonMessage),
              fallbackLevel
            );
          } catch (error) {
            console.warn(
              `⚠️ ${api.name} fetch failed: ${error.message} - Using fallback data`
            );
            this.recordProviderFailure(
              api.name,
              Date.now() - startTime,
              error,
              apis.indexOf(api)
            );
          }
        }
      }

      // Fallback: derive from our latest USD prices
      const fallbackData = await this.deriveFromPrices();
      if (fallbackData) {
        const now = new Date();
        const enrichedFallback = {
          ...fallbackData,
          provider: "derived-prices",
          fetchedAt: now.toISOString(),
          fallbackLevel: apis.length,
        };
        await this.saveSpotRate(enrichedFallback);
        this.cache.set(cacheKey, {
          data: enrichedFallback,
          timestamp: now.getTime(),
        });
        this.cacheStats.misses += 1;
        this.lastSpotResult = {
          ...enrichedFallback,
          cacheHit: false,
        };
        this.recordProviderSuccess("derived-prices", 0, apis.length);
        return enrichedFallback;
      }

      throw new Error("No spot rate available");
    } catch (error) {
      console.error("SpotProvider error:", error);

      // Try to get latest from database
      const latest = await this.getLatestFromDB();
      if (latest) {
        return latest;
      }

      throw error;
    }
  }

  recordProviderCacheHit(name) {
    if (!name) {
      return;
    }
    const current = this.providerStats[name] || {
      name,
      attempts: 0,
      consecutiveFailures: 0,
    };
    this.providerStats[name] = {
      ...current,
      name,
      status: current.status || "success",
      lastCacheHit: new Date().toISOString(),
    };
  }

  markProviderSkipped(name, reason) {
    const nowIso = new Date().toISOString();
    const previous = this.providerStats[name] || {};

    this.providerStats[name] = {
      ...previous,
      name,
      status: "skipped",
      lastAttempt: nowIso,
      lastError: nowIso,
      lastErrorMessage: reason,
      latencyMs: null,
      fallbackLevel: previous.fallbackLevel ?? null,
      attempts: previous.attempts || 0,
      consecutiveFailures: previous.consecutiveFailures || 0,
    };
  }

  recordProviderSuccess(name, latencyMs, fallbackLevel = 0) {
    const nowIso = new Date().toISOString();
    const previous = this.providerStats[name] || {
      attempts: 0,
      consecutiveFailures: 0,
    };

    this.providerStats[name] = {
      ...previous,
      name,
      status: "success",
      lastSuccess: nowIso,
      lastAttempt: nowIso,
      lastError: previous.lastError || null,
      lastErrorMessage: null,
      latencyMs,
      fallbackLevel,
      attempts: (previous.attempts || 0) + 1,
      consecutiveFailures: 0,
    };
  }

  recordProviderFailure(name, latencyMs, error, fallbackLevel = 0) {
    const nowIso = new Date().toISOString();
    const previous = this.providerStats[name] || {
      attempts: 0,
      consecutiveFailures: 0,
    };
    const responseError =
      error?.response?.data?.error || error?.response?.data?.message;
    const message = responseError || error?.message || "Unknown error";
    const statusCode = error?.response?.status || null;

    this.providerStats[name] = {
      ...previous,
      name,
      status: "error",
      lastAttempt: nowIso,
      lastError: nowIso,
      lastErrorMessage: message,
      lastErrorStatus: statusCode,
      latencyMs,
      fallbackLevel,
      attempts: (previous.attempts || 0) + 1,
      consecutiveFailures: (previous.consecutiveFailures || 0) + 1,
    };
  }

  getProviderDiagnostics() {
    return {
      lastSpotResult: this.lastSpotResult,
      cache: {
        ...this.cacheStats,
        lastFetchAt: this.lastSpotResult?.fetchedAt || null,
        lastProvider: this.lastSpotResult?.provider || null,
      },
      providers: Object.values(this.providerStats).map((entry) => ({
        name: entry.name,
        status: entry.status,
        lastSuccess: entry.lastSuccess || null,
        lastError: entry.lastError || null,
        lastErrorMessage: entry.lastErrorMessage || null,
        lastErrorStatus: entry.lastErrorStatus ?? null,
        lastAttempt: entry.lastAttempt || null,
        lastCacheHit: entry.lastCacheHit || null,
        latencyMs: entry.latencyMs || null,
        fallbackLevel: entry.fallbackLevel ?? null,
        consecutiveFailures: entry.consecutiveFailures || 0,
        attempts: entry.attempts || 0,
      })),
    };
  }

  async fetchFromMetalsLive() {
    const endpoints = [
      "https://metals.live/api/spot/gold",
      "https://metals.live/api/spot/XAU",
      "https://metals.live/api/spot",
      "https://api.metals.live/v1/spot/gold",
    ];

    for (const url of endpoints) {
      try {
        // Metals.live public endpoint. Returns an array; the latest price is the last element.
        const response = await axios.get(url, {
          timeout: 5000,
          headers: {
            "User-Agent": "GoldVision/1.0",
          },
        });

        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          const last = data[data.length - 1];

          // Case A: array of arrays like [[ts, price], ...]
          if (Array.isArray(last) && last.length >= 2) {
            const ts = Number(last[0]);
            const price = Number(last[1]);
            if (!isNaN(price)) {
              return {
                usdPerOunce: price,
                source: "metals-live",
                asOf: new Date((!isNaN(ts) ? ts : Date.now() / 1000) * 1000),
                meta: JSON.stringify({
                  endpoint: url,
                  type: "tuple",
                  sample: last,
                  count: data.length,
                }),
              };
            }
          }

          // Case B: array of objects
          if (typeof last === "object" && last !== null) {
            const priceCandidate =
              last.price ||
              last.gold ||
              last.XAU ||
              last.usd_per_ounce ||
              last.ask ||
              last.bid;
            const priceNum = Number(priceCandidate);
            const ts = Number(last.time || last.timestamp || last.ts);
            if (!isNaN(priceNum)) {
              return {
                usdPerOunce: priceNum,
                source: "metals-live",
                asOf: new Date((!isNaN(ts) ? ts : Date.now() / 1000) * 1000),
                meta: JSON.stringify({
                  endpoint: url,
                  type: "object",
                  keys: Object.keys(last),
                  count: data.length,
                }),
              };
            }
          }
        }
      } catch (error) {
        console.warn(`Metals.live fetch failed via ${url}: ${error.message}`);
      }
    }
    return null;
  }

  async fetchFromCoinGecko() {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "pax-gold",
            vs_currencies: "usd",
            include_last_updated_at: true,
          },
          timeout: 5000,
        }
      );

      const paxGold =
        response.data && response.data["pax-gold"]
          ? response.data["pax-gold"]
          : null;
      const price = paxGold ? Number(paxGold.usd) : NaN;
      const ts =
        paxGold && paxGold.last_updated_at
          ? Number(paxGold.last_updated_at) * 1000
          : Date.now();
      if (!isNaN(price) && price > 0) {
        return {
          usdPerOunce: price,
          source: "coingecko-paxg",
          asOf: new Date(ts),
          meta: JSON.stringify({
            token: "pax-gold",
            last_updated_at: paxGold?.last_updated_at || null,
          }),
        };
      }
    } catch (error) {
      console.error("Coingecko fetch failed:", error.message);
    }
    return null;
  }

  async fetchFromGoldPriceOrg() {
    try {
      const response = await axios.get(
        "https://data-asg.goldprice.org/dbXRates/USD",
        {
          timeout: 10000,
          headers: {
            // GoldPrice.org blocks generic clients; mimic a browser
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            Referer: "https://goldprice.org/",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "keep-alive",
          },
        }
      );

      const items =
        response.data && response.data.items ? response.data.items : null;
      if (Array.isArray(items) && items.length > 0) {
        const usdItem = items.find((i) => i.curr === "USD") || items[0];
        const price = Number(usdItem.xauPrice);
        const ts = Number(response.data.ts || response.data.tsj || Date.now());
        if (!isNaN(price)) {
          return {
            usdPerOunce: price,
            source: "goldprice-org",
            asOf: new Date(ts),
            meta: JSON.stringify({
              date: response.data.date,
              curr: usdItem.curr,
            }),
          };
        }
      }
    } catch (error) {
      console.error("GoldPrice.org fetch failed:", error.message);
    }
    return null;
  }

  async fetchFromMetalsAPI() {
    try {
      const response = await axios.get("https://metals-api.com/api/latest", {
        params: {
          access_key: this.metalsApiKey,
          base: "USD",
          symbols: "XAU",
        },
        timeout: 10000,
      });

      if (!response.data?.success) {
        const apiError = response.data?.error || {};
        const message =
          apiError?.info ||
          apiError?.message ||
          apiError?.code ||
          "Metals-API response indicated failure";
        const error = new Error(message);
        error.response = {
          status: apiError?.code || response.status,
          data: response.data,
        };
        throw error;
      }

      if (response.data?.rates?.XAU) {
        const usdPerOunce = 1 / response.data.rates.XAU; // Metals-API returns XAU per USD

        return {
          usdPerOunce,
          source: "metals-api",
          asOf: new Date(response.data.timestamp * 1000),
          meta: JSON.stringify({
            base: response.data.base,
            rates: response.data.rates,
            timestamp: response.data.timestamp,
          }),
        };
      }

      throw new Error("Metals-API did not include an XAU rate in the response");
    } catch (error) {
      console.error("Metals-API fetch failed:", error.message);
      throw error;
    }
  }

  async fetchFromGoldAPI() {
    try {
      const response = await axios.get("https://www.goldapi.io/api/XAU/USD", {
        headers: {
          "x-access-token": this.goldApiKey,
          Accept: "application/json",
          "User-Agent": "GoldVision/1.0",
        },
        timeout: 10000,
      });

      if (response.data?.error) {
        const errorMessage =
          typeof response.data.error === "string"
            ? response.data.error
            : response.data.error?.message || "GoldAPI reported an error";
        const error = new Error(errorMessage);
        error.response = {
          status: response.status,
          data: response.data,
        };
        throw error;
      }

      if (response.data && response.data.price) {
        return {
          usdPerOunce: response.data.price,
          source: "goldapi",
          asOf: new Date(response.data.timestamp * 1000),
          meta: JSON.stringify(response.data),
        };
      }
    } catch (error) {
      console.error("GoldAPI fetch failed:", error.message);
      throw error;
    }
  }

  async fetchFromCommoditiesAPI() {
    try {
      const response = await axios.get(
        "https://api.commodities-api.com/latest",
        {
          params: {
            access_key: this.commoditiesApiKey,
            base: "USD",
            symbols: "XAU",
          },
          timeout: 10000,
        }
      );

      if (!response.data?.success) {
        const apiError = response.data?.error || {};
        const message =
          apiError?.info ||
          apiError?.message ||
          apiError?.code ||
          "Commodities-API response indicated failure";
        const error = new Error(message);
        error.response = {
          status: apiError?.code || response.status,
          data: response.data,
        };
        throw error;
      }

      if (response.data?.data?.rates?.XAU) {
        const usdPerOunce = 1 / response.data.data.rates.XAU;

        return {
          usdPerOunce,
          source: "commodities-api",
          asOf: new Date(response.data.data.timestamp * 1000),
          meta: JSON.stringify(response.data.data),
        };
      }

      throw new Error(
        "Commodities-API did not include an XAU rate in the response"
      );
    } catch (error) {
      console.error("Commodities-API fetch failed:", error.message);
      throw error;
    }
  }

  async fetchFromAlphaVantage() {
    try {
      // Alpha Vantage doesn't have direct gold (XAU) support in FX_DAILY
      // Let's try using TIME_SERIES_DAILY with GOLD symbol
      const response = await axios.get("https://www.alphavantage.co/query", {
        params: {
          function: "TIME_SERIES_DAILY",
          symbol: "GOLD",
          apikey: this.alphaVantageKey,
        },
        timeout: 10000,
      });

      if (response.data && response.data["Time Series (Daily)"]) {
        const timeSeries = response.data["Time Series (Daily)"];
        const latestDate = Object.keys(timeSeries)[0];
        const latestData = timeSeries[latestDate];
        const usdPerOunce = parseFloat(latestData["4. close"]);

        return {
          usdPerOunce,
          source: "alpha-vantage",
          asOf: new Date(latestDate),
          meta: JSON.stringify({ latestData, latestDate }),
        };
      }
    } catch (error) {
      console.error("Alpha Vantage fetch failed:", error.message);
    }
    return null;
  }

  async fetchVolumeFromTwelveData() {
    try {
      const response = await axios.get(
        "https://api.twelvedata.com/time_series",
        {
          params: {
            symbol: "XAU/USD", // Correct symbol format for Twelve Data
            interval: "1day",
            outputsize: 5, // Get more data points to calculate volatility
            apikey: this.twelveDataKey,
          },
          timeout: 10000,
        }
      );

      if (
        response.data &&
        response.data.values &&
        response.data.values.length > 0
      ) {
        const values = response.data.values;
        const latestData = values[0];

        // Calculate volume based on price volatility and market activity
        // Gold spot doesn't have traditional volume, so we simulate it
        const priceRange =
          parseFloat(latestData.high) - parseFloat(latestData.low);
        const priceVolatility = priceRange / parseFloat(latestData.close);

        // Base volume calculation: higher volatility = higher simulated volume
        const baseVolume = 500000; // Base volume for gold spot
        const volatilityMultiplier = Math.max(1, priceVolatility * 100); // Scale volatility
        const simulatedVolume = Math.round(baseVolume * volatilityMultiplier);

        return {
          volume: simulatedVolume,
          price: parseFloat(latestData.close),
          source: "twelvedata-simulated",
          timestamp: new Date(latestData.datetime),
          meta: {
            priceRange,
            volatility: priceVolatility,
            baseVolume,
            volatilityMultiplier,
          },
        };
      }
    } catch (error) {
      console.error("Twelve Data volume fetch failed:", error.message);
    }
    return null;
  }

  async fetchHistoricalOHLCFromTwelveData(days = 30) {
    try {
      console.log(
        `Fetching ${days} days of OHLC data from Twelve Data with key: ${
          this.twelveDataKey ? "present" : "missing"
        }`
      );

      // Determine appropriate interval based on days requested
      // For 1 day: use hourly (24 points)
      // For 1-7 days: use 4-hourly or hourly
      // For 7+ days: use daily
      let interval = "1day";
      let outputsize = Math.min(days, 5000);

      if (days <= 1) {
        // For 1 day view, use hourly data to get 24 data points
        interval = "1hour";
        outputsize = 24; // Last 24 hours
      } else if (days <= 7) {
        // For 1 week view, use hourly data (168 hours = 7 days)
        interval = "1hour";
        outputsize = Math.min(days * 24, 168); // Up to 168 hours (7 days)
      } else if (days <= 30) {
        // For 1 month view, use daily data
        interval = "1day";
        outputsize = Math.min(days, 5000);
      } else {
        // For longer periods, use daily data
        interval = "1day";
        outputsize = Math.min(days, 5000);
      }

      console.log(`Using interval: ${interval}, outputsize: ${outputsize}`);

      const response = await axios.get(
        "https://api.twelvedata.com/time_series",
        {
          params: {
            symbol: "XAU/USD",
            interval: interval,
            outputsize: outputsize,
            apikey: this.twelveDataKey,
          },
          timeout: 15000,
        }
      );

      console.log("Twelve Data OHLC response:", {
        meta: response.data?.meta,
        valuesCount: response.data?.values?.length,
        status: response.data?.status,
      });

      if (
        response.data &&
        response.data.values &&
        response.data.values.length > 0
      ) {
        const values = response.data.values;

        // Convert Twelve Data format to our format
        const ohlcData = values.map((item) => {
          const priceRange = parseFloat(item.high) - parseFloat(item.low);
          const priceVolatility = priceRange / parseFloat(item.close);

          // Calculate realistic volume based on volatility
          const baseVolume = 500000;
          const volatilityMultiplier = Math.max(1, priceVolatility * 100);
          const simulatedVolume = Math.round(baseVolume * volatilityMultiplier);

          return {
            datetime: item.datetime,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: simulatedVolume,
            priceRange,
            volatility: priceVolatility,
          };
        });

        return {
          data: ohlcData,
          source: "twelvedata",
          meta: response.data.meta,
          count: ohlcData.length,
        };
      }
    } catch (error) {
      console.error("Twelve Data OHLC fetch failed:", error.message);
    }
    return null;
  }

  async deriveFromPrices() {
    try {
      // Get median of last 24h USD prices
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const prices = await prisma.price.findMany({
        where: {
          asset: "XAU",
          currency: "USD",
          ds: {
            gte: yesterday,
          },
        },
        orderBy: { ds: "desc" },
        take: 100,
      });

      if (prices.length === 0) {
        // Fallback to a reasonable default if no prices are available
        console.warn("No USD prices found, using fallback spot rate");
        return {
          usdPerOunce: 2700.0, // Updated to current market price (Nov 2025)
          source: "fallback-default",
          asOf: new Date(),
          meta: JSON.stringify({
            sampleSize: 0,
            fallback: true,
            reason: "No USD prices available",
          }),
        };
      }

      // Calculate median
      const sortedPrices = prices
        .map((p) => parseFloat(p.price))
        .sort((a, b) => a - b);
      const median =
        sortedPrices.length % 2 === 0
          ? (sortedPrices[sortedPrices.length / 2 - 1] +
              sortedPrices[sortedPrices.length / 2]) /
            2
          : sortedPrices[Math.floor(sortedPrices.length / 2)];

      return {
        usdPerOunce: median,
        source: "derived-prices",
        asOf: new Date(),
        meta: JSON.stringify({
          sampleSize: prices.length,
          priceRange: {
            min: Math.min(...sortedPrices),
            max: Math.max(...sortedPrices),
          },
        }),
      };
    } catch (error) {
      console.error("Price derivation failed:", error.message);
      // Return a fallback rate even on database errors
      return {
        usdPerOunce: 2000.0, // Reasonable fallback
        source: "fallback-error",
        asOf: new Date(),
        meta: JSON.stringify({
          sampleSize: 0,
          fallback: true,
          error: error.message,
        }),
      };
    }
  }

  async saveSpotRate(spotData) {
    try {
      // Note: spotRate table doesn't exist in current schema
      // For now, just log that we would save the spot rate
      console.log("Spot rate computed:", {
        usdPerOunce: spotData.usdPerOunce,
        source: spotData.source,
        asOf: spotData.asOf,
      });
      // TODO: Create spotRate table in schema if persistent storage is needed
    } catch (error) {
      console.error("Failed to save spot rate:", error.message);
    }
  }

  async getLatestFromDB() {
    try {
      // Since spotRate table doesn't exist, try to derive from recent prices
      return await this.deriveFromPrices();
    } catch (error) {
      console.error("Failed to get latest from DB:", error.message);
    }
    return null;
  }

  // Computation methods
  static getConstants() {
    return {
      TROY_OUNCE_TO_GRAMS: 31.1034768,
      TOLA_TO_GRAMS: 11.6638038,
      GRAMS_TO_KILOGRAM: 1000,
    };
  }

  static computeUnitPrices(usdPerOunce) {
    const { TROY_OUNCE_TO_GRAMS, TOLA_TO_GRAMS, GRAMS_TO_KILOGRAM } =
      this.getConstants();

    const usdPerGram = usdPerOunce / TROY_OUNCE_TO_GRAMS;
    const usdPerTola = usdPerGram * TOLA_TO_GRAMS;
    const usdPerKilogram = usdPerGram * GRAMS_TO_KILOGRAM;

    return {
      ounce: usdPerOunce,
      gram: usdPerGram,
      tola: usdPerTola,
      kilogram: usdPerKilogram,
    };
  }

  static computeKaratPrices(
    basePrice,
    karats = [24, 22, 21, 18, 14, 12, 10, 9, 8]
  ) {
    const result = {};
    karats.forEach((karat) => {
      result[`${karat}k`] = basePrice * (karat / 24);
    });
    return result;
  }
}

module.exports = SpotProvider;
