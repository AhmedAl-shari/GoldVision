/**
 * Feature Collector Service
 * Collects external features for enhanced forecasting:
 * - Technical indicators (RSI, MACD, etc.)
 * - External market factors (DXY, Bitcoin, Oil, etc.)
 * - News sentiment
 * - Economic indicators
 */

const axios = require("axios");

class FeatureCollector {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Calculate technical indicators from price history
   */
  calculateTechnicalIndicators(prices) {
    if (!prices || prices.length < 14) {
      return {
        rsi: null,
        macd: null,
        sma20: null,
        sma50: null,
        volatility: null,
      };
    }

    const priceArray = prices.map((p) => parseFloat(p.price || p));
    const returns = [];
    for (let i = 1; i < priceArray.length; i++) {
      returns.push((priceArray[i] - priceArray[i - 1]) / priceArray[i - 1]);
    }

    // RSI (14-period)
    let rsi = null;
    if (priceArray.length >= 14) {
      const gains = returns.map((r) => (r > 0 ? r : 0));
      const losses = returns.map((r) => (r < 0 ? -r : 0));

      let avgGain = 0;
      let avgLoss = 0;

      for (let i = returns.length - 14; i < returns.length; i++) {
        avgGain += gains[i] || 0;
        avgLoss += losses[i] || 0;
      }

      avgGain /= 14;
      avgLoss /= 14;

      if (avgLoss > 0) {
        const rs = avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
      } else {
        rsi = 100;
      }
    }

    // MACD (12, 26, 9)
    let macd = null;
    let macdSignal = null;
    if (priceArray.length >= 26) {
      // Simple EMA calculation
      const ema12 = this.calculateEMA(priceArray, 12);
      const ema26 = this.calculateEMA(priceArray, 26);
      macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];

      // Signal line (9-period EMA of MACD)
      const macdValues = ema12.map((val, i) => val - ema26[i]);
      const signalEMA = this.calculateEMA(macdValues, 9);
      macdSignal = signalEMA[signalEMA.length - 1];
    }

    // Moving Averages
    const sma20 =
      priceArray.length >= 20
        ? priceArray.slice(-20).reduce((a, b) => a + b, 0) / 20
        : priceArray[priceArray.length - 1];
    const sma50 =
      priceArray.length >= 50
        ? priceArray.slice(-50).reduce((a, b) => a + b, 0) / 50
        : priceArray[priceArray.length - 1];

    // Volatility (annualized)
    const volatility =
      returns.length >= 5
        ? Math.sqrt(
            returns
              .slice(-5)
              .reduce((sum, r) => sum + Math.pow(r, 2), 0) / 5
          ) * Math.sqrt(252)
        : 0.15;

    return {
      rsi: rsi || 50,
      macd: macd || 0,
      macdSignal: macdSignal || 0,
      sma20,
      sma50,
      volatility,
    };
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(values, period) {
    const multiplier = 2 / (period + 1);
    const ema = [values[0]];

    for (let i = 1; i < values.length; i++) {
      ema.push(values[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }

    return ema;
  }

  /**
   * Fetch external market features
   */
  async fetchExternalFeatures(date) {
    const cacheKey = `external_${date}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const features = {
        dxy: null,
        btc_price: null,
        oil_price: null,
        sp500: null,
        treasury_10y: null,
        sentiment_score: null,
      };

      // Fetch DXY from FRED provider
      try {
        const fredProvider = require("./fredProvider");
        const dxyData = await fredProvider.getDXY();
        if (dxyData?.rate) {
          features.dxy = parseFloat(dxyData.rate);
        }
      } catch (error) {
        console.warn("Failed to fetch DXY:", error.message);
      }

      // Fetch multi-asset data (Bitcoin, Oil, etc.)
      try {
        // Note: This would need to be adapted based on your multi-asset API
        // For now, we'll use placeholder logic
        const multiAssetResponse = await axios.get(
          `${process.env.API_BASE_URL || "http://localhost:3000"}/market-data/instruments`,
          { timeout: 5000 }
        ).catch(() => null);

        if (multiAssetResponse?.data?.data) {
          const instruments = multiAssetResponse.data.data;
          const btc = instruments.find((i) => i.symbol === "BTC/USD" || i.symbol === "BTC");
          const oil = instruments.find(
            (i) => i.symbol === "OIL" || i.symbol === "BRENT" || i.symbol === "WTI"
          );
          const sp500 = instruments.find((i) => i.symbol === "SPX" || i.symbol === "SP500");

          if (btc?.price) features.btc_price = parseFloat(btc.price);
          if (oil?.price) features.oil_price = parseFloat(oil.price);
          if (sp500?.price) features.sp500 = parseFloat(sp500.price);
        }
      } catch (error) {
        console.warn("Failed to fetch multi-asset data:", error.message);
      }

      // Fetch news sentiment from database
      // Note: This will be called from express-backend-enhanced.js which has prisma instance
      // For now, return neutral sentiment - will be enhanced when called with prisma context
      try {
        // This is a placeholder - actual sentiment will be fetched in collectFeatures
        // when called with prisma instance from express backend
        features.sentiment_score = 0;
      } catch (error) {
        console.warn("Failed to fetch sentiment:", error.message);
        features.sentiment_score = 0;
      }

      const result = {
        ...features,
        timestamp: Date.now(),
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error("Error fetching external features:", error);
      return {
        dxy: null,
        btc_price: null,
        oil_price: null,
        sp500: null,
        treasury_10y: null,
        sentiment_score: null,
      };
    }
  }

  /**
   * Collect all features for a given date range
   * @param {Array} prices - Array of price values or objects with price property
   * @param {Array} dates - Array of date strings
   * @param {Object} prismaInstance - Optional Prisma client instance for database access
   */
  async collectFeatures(prices, dates, prismaInstance = null) {
    if (!prices || prices.length === 0) {
      return [];
    }

    // Calculate technical indicators
    const technicalIndicators = this.calculateTechnicalIndicators(prices);

    // Fetch news sentiment if prisma instance is available
    let sentimentScore = 0;
    if (prismaInstance) {
      try {
        const recentNews = await prismaInstance.news.findMany({
          where: {
            publishedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: {
            publishedAt: "desc",
          },
          take: 20,
        });

        if (recentNews.length > 0) {
          const sentiments = recentNews
            .map((n) => n.sentiment)
            .filter((s) => s !== null);

          if (sentiments.length > 0) {
            const avgSentiment =
              sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
            sentimentScore = Math.max(-1, Math.min(1, avgSentiment));
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sentiment in collectFeatures:", error.message);
      }
    }

    // Collect external features for each date
    const features = [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const externalFeatures = await this.fetchExternalFeatures(date);

      features.push({
        ds: date,
        price: parseFloat(prices[i]?.price || prices[i]),
        ...technicalIndicators,
        ...externalFeatures,
        sentiment_score: sentimentScore, // Use calculated sentiment
      });
    }

    return features;
  }

  /**
   * Format features for enhanced forecast API
   */
  formatForEnhancedForecast(features) {
    return features.map((f) => ({
      ds: f.ds,
      dxy: f.dxy || null,
      btc_price: f.btc_price || null,
      oil_price: f.oil_price || null,
      sp500: f.sp500 || null,
      treasury_10y: f.treasury_10y || null,
      volatility: f.volatility || null,
      rsi: f.rsi || null,
      macd: f.macd || null,
      sentiment_score: f.sentiment_score || null,
      volume: f.volume || null,
    }));
  }
}

module.exports = new FeatureCollector();

