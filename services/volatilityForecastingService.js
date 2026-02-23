const NodeCache = require("node-cache");

class VolatilityForecastingService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
  }

  // Calculate historical volatility
  calculateHistoricalVolatility(prices, period = 5) {
    if (prices.length < period + 1) return null;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
      returns.push(ret);
    }

    // Calculate rolling volatility
    const volatilities = [];
    for (let i = period; i < returns.length; i++) {
      const window = returns.slice(i - period, i);
      const mean = window.reduce((sum, ret) => sum + ret, 0) / window.length;
      const variance =
        window.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
        window.length;
      const volatility = Math.sqrt(variance * 252); // Annualized
      volatilities.push({
        date: prices[i].date,
        volatility: volatility,
        returns: window,
      });
    }

    // If no volatilities calculated, use simple price range volatility
    if (volatilities.length === 0 && returns.length > 0) {
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance =
        returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
        returns.length;
      const volatility = Math.sqrt(variance * 252);

      volatilities.push({
        date: prices[prices.length - 1].date,
        volatility: volatility,
        returns: returns,
      });
    }

    return {
      current: volatilities[volatilities.length - 1]?.volatility || 0,
      average:
        volatilities.reduce((sum, v) => sum + v.volatility, 0) /
        volatilities.length,
      max: Math.max(...volatilities.map((v) => v.volatility)),
      min: Math.min(...volatilities.map((v) => v.volatility)),
      data: volatilities,
    };
  }

  // Simple GARCH(1,1) model implementation
  calculateGARCH(prices, periods = 5) {
    if (prices.length < periods + 2) return null;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
      returns.push(ret);
    }

    // Initial parameters
    let omega = 0.000001; // Constant term
    let alpha = 0.1; // ARCH term
    let beta = 0.85; // GARCH term

    // Calculate initial variance
    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    let variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      returns.length;

    const volatilities = [];
    const variances = [variance];

    // GARCH(1,1) recursion
    for (let i = 1; i < returns.length; i++) {
      const returnSquared = Math.pow(returns[i - 1] - meanReturn, 2);
      variance = omega + alpha * returnSquared + beta * variance;
      variances.push(variance);

      const volatility = Math.sqrt(variance * 252); // Annualized
      volatilities.push({
        date: prices[i].date,
        volatility: volatility,
        variance: variance,
      });
    }

    // Forecast next period volatility
    const lastVariance = variances[variances.length - 1];
    const forecastVariance =
      omega +
      alpha * Math.pow(returns[returns.length - 1] - meanReturn, 2) +
      beta * lastVariance;
    const forecastVolatility = Math.sqrt(forecastVariance * 252);

    return {
      current: volatilities[volatilities.length - 1]?.volatility || 0,
      forecast: forecastVolatility,
      parameters: { omega, alpha, beta },
      data: volatilities,
      confidence: this.calculateGARCHConfidence(volatilities),
    };
  }

  // Calculate GARCH model confidence
  calculateGARCHConfidence(volatilities) {
    if (volatilities.length < 10) return 0.5;

    // Calculate prediction accuracy based on recent volatility stability
    const recent = volatilities.slice(-10);
    const volatility = recent.map((v) => v.volatility);
    const meanVol =
      volatility.reduce((sum, v) => sum + v, 0) / volatility.length;
    const variance =
      volatility.reduce((sum, v) => sum + Math.pow(v - meanVol, 2), 0) /
      volatility.length;
    const stability = 1 / (1 + Math.sqrt(variance));

    return Math.min(stability, 0.9);
  }

  // Calculate VIX-like volatility index
  calculateVolatilityIndex(prices, period = 5) {
    if (prices.length < period + 1) return null;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
      returns.push(ret);
    }

    // Calculate rolling volatility index
    const volatilityIndex = [];
    for (let i = period; i < returns.length; i++) {
      const window = returns.slice(i - period, i);
      const mean = window.reduce((sum, ret) => sum + ret, 0) / window.length;
      const variance =
        window.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
        window.length;
      const volatility = Math.sqrt(variance * 252) * 100; // As percentage

      volatilityIndex.push({
        date: prices[i].date,
        vix: volatility,
        level: this.getVolatilityLevel(volatility),
      });
    }

    return {
      current: volatilityIndex[volatilityIndex.length - 1]?.vix || 0,
      level: volatilityIndex[volatilityIndex.length - 1]?.level || "normal",
      average:
        volatilityIndex.reduce((sum, v) => sum + v.vix, 0) /
        volatilityIndex.length,
      data: volatilityIndex,
    };
  }

  // Get volatility level description
  getVolatilityLevel(volatility) {
    if (volatility > 30) return "extreme";
    if (volatility > 20) return "high";
    if (volatility > 15) return "elevated";
    if (volatility > 10) return "normal";
    if (volatility > 5) return "low";
    return "very_low";
  }

  // Calculate implied volatility (simplified)
  calculateImpliedVolatility(
    currentPrice,
    strikePrice,
    timeToExpiry,
    riskFreeRate = 0.05
  ) {
    // Simplified Black-Scholes implied volatility calculation
    // This is a basic implementation - in practice, you'd use numerical methods

    const moneyness = currentPrice / strikePrice;
    const timeValue = Math.sqrt(timeToExpiry);

    // Rough approximation based on moneyness and time
    let impliedVol = 0.2; // Base 20% volatility

    if (moneyness > 1.1) {
      impliedVol += 0.05; // Higher volatility for ITM calls
    } else if (moneyness < 0.9) {
      impliedVol += 0.03; // Higher volatility for OTM calls
    }

    // Adjust for time decay
    if (timeToExpiry < 0.1) {
      // Less than 1 month
      impliedVol += 0.1;
    } else if (timeToExpiry > 1) {
      // More than 1 year
      impliedVol -= 0.05;
    }

    return {
      impliedVolatility: impliedVol,
      level: this.getVolatilityLevel(impliedVol * 100),
      confidence: 0.6, // Simplified model confidence
    };
  }

  // Analyze volatility regimes
  analyzeVolatilityRegimes(volatilityData) {
    if (!volatilityData || volatilityData.length < 50) return null;

    const regimes = [];
    let currentRegime = null;
    let regimeStart = 0;

    for (let i = 1; i < volatilityData.length; i++) {
      const currentVol = volatilityData[i].volatility;
      const prevVol = volatilityData[i - 1].volatility;

      // Detect regime change (significant volatility shift)
      const regimeChange = Math.abs(currentVol - prevVol) > prevVol * 0.3;

      if (regimeChange || i === volatilityData.length - 1) {
        // End current regime
        if (currentRegime !== null) {
          const regimeData = volatilityData.slice(regimeStart, i);
          const avgVol =
            regimeData.reduce((sum, v) => sum + v.volatility, 0) /
            regimeData.length;

          regimes.push({
            start: volatilityData[regimeStart].date,
            end: volatilityData[i - 1].date,
            averageVolatility: avgVol,
            level: this.getVolatilityLevel(avgVol * 100),
            duration: i - regimeStart,
            maxVolatility: Math.max(...regimeData.map((v) => v.volatility)),
            minVolatility: Math.min(...regimeData.map((v) => v.volatility)),
          });
        }

        // Start new regime
        currentRegime = this.getVolatilityLevel(currentVol * 100);
        regimeStart = i;
      }
    }

    return {
      regimes: regimes,
      currentRegime: regimes[regimes.length - 1],
      regimeChanges: regimes.length - 1,
      averageRegimeDuration:
        regimes.reduce((sum, regime) => sum + regime.duration, 0) /
        regimes.length,
    };
  }

  // Generate volatility forecasts
  generateVolatilityForecast(volatilityData, horizon = 30) {
    if (!volatilityData || volatilityData.length < 20) return null;

    const recent = volatilityData.slice(-20);
    const volatilities = recent.map((v) => v.volatility);

    // Simple trend analysis
    const trend = this.calculateTrend(volatilities);
    const meanVol =
      volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    const volatility = this.calculateVolatility(volatilities);

    // Forecast based on trend and mean reversion
    const forecast = meanVol + (trend * horizon) / 30;

    // Confidence based on historical accuracy
    const confidence = this.calculateForecastConfidence(volatilities);

    return {
      forecast: Math.max(forecast, 0.01), // Minimum volatility
      confidence: confidence,
      trend: trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable",
      meanReversion: Math.abs(forecast - meanVol) / meanVol,
      scenarios: this.generateVolatilityScenarios(forecast, volatility),
    };
  }

  // Calculate trend
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  // Calculate volatility of volatility
  calculateVolatility(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  // Calculate forecast confidence
  calculateForecastConfidence(volatilities) {
    if (volatilities.length < 10) return 0.5;

    // Calculate stability of recent volatility
    const recent = volatilities.slice(-10);
    const volatility = this.calculateVolatility(recent);
    const meanVol = recent.reduce((sum, v) => sum + v, 0) / recent.length;

    // Higher confidence for more stable volatility
    const stability = 1 / (1 + volatility / meanVol);
    return Math.min(stability, 0.9);
  }

  // Generate volatility scenarios
  generateVolatilityScenarios(baseForecast, volatility) {
    return {
      optimistic: baseForecast - volatility,
      base: baseForecast,
      pessimistic: baseForecast + volatility,
      extreme: baseForecast + volatility * 2,
    };
  }

  // Generate volatility-based recommendations
  generateVolatilityRecommendations(volatilityAnalysis, currentPrice) {
    const recommendations = [];

    if (!volatilityAnalysis) return recommendations;

    const currentVol = volatilityAnalysis.current;
    const forecast = volatilityAnalysis.forecast;
    const level = this.getVolatilityLevel(currentVol * 100);

    // High volatility recommendations
    if (level === "high" || level === "extreme") {
      recommendations.push({
        type: "risk_management",
        message: `High volatility detected (${(currentVol * 100).toFixed(
          1
        )}%). Consider reducing position size.`,
        confidence: "high",
        action: "Reduce position size and tighten stop losses",
      });

      recommendations.push({
        type: "hedging",
        message: "High volatility environment - consider hedging strategies",
        confidence: "medium",
        action: "Consider options or inverse ETFs for hedging",
      });
    }

    // Low volatility recommendations
    if (level === "low" || level === "very_low") {
      recommendations.push({
        type: "opportunity",
        message: `Low volatility environment (${(currentVol * 100).toFixed(
          1
        )}%). Potential for volatility expansion.`,
        confidence: "medium",
        action: "Consider volatility expansion strategies",
      });
    }

    // Forecast-based recommendations
    if (forecast) {
      const forecastLevel = this.getVolatilityLevel(forecast.forecast * 100);

      if (forecastLevel !== level) {
        recommendations.push({
          type: "forecast",
          message: `Volatility forecast suggests ${forecastLevel} environment ahead`,
          confidence: forecast.confidence > 0.7 ? "high" : "medium",
          action: "Prepare for potential volatility regime change",
        });
      }
    }

    // Regime-based recommendations
    if (volatilityAnalysis.regimes) {
      const currentRegime = volatilityAnalysis.regimes.currentRegime;
      if (currentRegime && currentRegime.duration > 30) {
        recommendations.push({
          type: "regime",
          message: `Current volatility regime has lasted ${currentRegime.duration} days - potential for change`,
          confidence: "medium",
          action: "Monitor for regime change signals",
        });
      }
    }

    return recommendations;
  }

  // Comprehensive volatility analysis
  async getComprehensiveVolatilityAnalysis(prices) {
    const cacheKey = `volatility_analysis_${prices.length}_${
      prices[prices.length - 1]?.price
    }`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!prices || prices.length < 5) {
      throw new Error("Insufficient data for volatility analysis");
    }

    const analysis = {
      historical: this.calculateHistoricalVolatility(
        prices,
        Math.min(30, prices.length - 1)
      ),
      garch: this.calculateGARCH(prices, Math.min(30, prices.length - 1)),
      volatilityIndex: this.calculateVolatilityIndex(
        prices,
        Math.min(20, prices.length - 1)
      ),
      regimes: null,
      forecast: null,
      recommendations: [],
    };

    // Analyze volatility regimes
    if (analysis.historical && analysis.historical.data) {
      analysis.regimes = this.analyzeVolatilityRegimes(
        analysis.historical.data
      );
    }

    // Generate forecast
    if (analysis.historical && analysis.historical.data) {
      analysis.forecast = this.generateVolatilityForecast(
        analysis.historical.data,
        30
      );
    }

    // Generate recommendations
    analysis.recommendations = this.generateVolatilityRecommendations(
      analysis,
      prices[prices.length - 1].price
    );

    // Add fallback data if historical volatility is null
    if (!analysis.historical) {
      const currentPrice = prices[prices.length - 1].price;
      const priceRange =
        Math.max(...prices.map((p) => p.price)) -
        Math.min(...prices.map((p) => p.price));
      const estimatedVolatility = priceRange / currentPrice;

      analysis.historical = {
        current: estimatedVolatility,
        average: estimatedVolatility,
        max: estimatedVolatility,
        min: estimatedVolatility * 0.5,
        data: prices.map((p) => ({
          date: p.date,
          volatility: estimatedVolatility,
          returns: [],
        })),
      };
    }

    this.cache.set(cacheKey, analysis);
    return analysis;
  }
}

module.exports = new VolatilityForecastingService();
