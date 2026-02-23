const NodeCache = require("node-cache");

class TechnicalAnalysisService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
  }

  // Calculate Fibonacci retracement levels
  calculateFibonacciRetracements(high, low) {
    const diff = high - low;
    return {
      level_0: high,
      level_236: high - diff * 0.236,
      level_382: high - diff * 0.382,
      level_500: high - diff * 0.5,
      level_618: high - diff * 0.618,
      level_786: high - diff * 0.786,
      level_100: low,
    };
  }

  // Calculate Fibonacci extension levels
  calculateFibonacciExtensions(high, low, retracement) {
    const diff = high - low;
    const retracementDiff = high - retracement;
    return {
      level_127: retracement + retracementDiff * 1.272,
      level_162: retracement + retracementDiff * 1.618,
      level_200: retracement + retracementDiff * 2.0,
      level_262: retracement + retracementDiff * 2.618,
      level_300: retracement + retracementDiff * 3.0,
    };
  }

  // Advanced support and resistance detection
  detectSupportResistanceLevels(prices, lookback = 20) {
    const levels = [];
    const highs = [];
    const lows = [];

    // Find local highs and lows
    for (let i = lookback; i < prices.length - lookback; i++) {
      const currentPrice = prices[i].price;
      let isHigh = true;
      let isLow = true;

      // Check if it's a local high
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && prices[j].price >= currentPrice) {
          isHigh = false;
          break;
        }
      }

      // Check if it's a local low
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && prices[j].price <= currentPrice) {
          isLow = false;
          break;
        }
      }

      if (isHigh)
        highs.push({ price: currentPrice, date: prices[i].date, strength: 1 });
      if (isLow)
        lows.push({ price: currentPrice, date: prices[i].date, strength: 1 });
    }

    // Cluster nearby levels
    const clusteredHighs = this.clusterLevels(highs, 0.005); // 0.5% clustering
    const clusteredLows = this.clusterLevels(lows, 0.005);

    // Calculate strength based on touches
    const resistanceLevels = clusteredHighs.map((level) => ({
      ...level,
      type: "resistance",
      touches: this.countTouches(prices, level.price, 0.01),
      strength: this.calculateLevelStrength(level.price, prices),
    }));

    const supportLevels = clusteredLows.map((level) => ({
      ...level,
      type: "support",
      touches: this.countTouches(prices, level.price, 0.01),
      strength: this.calculateLevelStrength(level.price, prices),
    }));

    return {
      support: supportLevels
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5),
      resistance: resistanceLevels
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5),
    };
  }

  // Cluster nearby price levels
  clusterLevels(levels, threshold) {
    const clustered = [];
    const used = new Set();

    for (let i = 0; i < levels.length; i++) {
      if (used.has(i)) continue;

      const cluster = [levels[i]];
      used.add(i);

      for (let j = i + 1; j < levels.length; j++) {
        if (used.has(j)) continue;

        const priceDiff =
          Math.abs(levels[i].price - levels[j].price) / levels[i].price;
        if (priceDiff <= threshold) {
          cluster.push(levels[j]);
          used.add(j);
        }
      }

      // Calculate average price for cluster
      const avgPrice =
        cluster.reduce((sum, level) => sum + level.price, 0) / cluster.length;
      clustered.push({
        price: avgPrice,
        strength: cluster.length,
        touches: cluster.length,
      });
    }

    return clustered;
  }

  // Count touches for a price level
  countTouches(prices, level, tolerance) {
    let touches = 0;
    const tolerancePrice = level * tolerance;

    for (const price of prices) {
      if (Math.abs(price.price - level) <= tolerancePrice) {
        touches++;
      }
    }

    return touches;
  }

  // Calculate level strength
  calculateLevelStrength(level, prices) {
    const recentPrices = prices.slice(-50); // Last 50 periods
    const touches = this.countTouches(recentPrices, level, 0.01);
    const timeSinceLastTouch = this.getTimeSinceLastTouch(
      recentPrices,
      level,
      0.01
    );

    // Strength based on touches and recency
    let strength = touches * 0.4;
    if (timeSinceLastTouch < 10) strength += 0.3;
    if (timeSinceLastTouch < 5) strength += 0.3;

    return Math.min(strength, 1.0);
  }

  // Get time since last touch
  getTimeSinceLastTouch(prices, level, tolerance) {
    const tolerancePrice = level * tolerance;

    for (let i = prices.length - 1; i >= 0; i--) {
      if (Math.abs(prices[i].price - level) <= tolerancePrice) {
        return prices.length - 1 - i;
      }
    }

    return prices.length;
  }

  // Technical pattern recognition
  recognizePatterns(prices) {
    const patterns = [];

    // Head and Shoulders pattern
    const headAndShoulders = this.detectHeadAndShoulders(prices);
    if (headAndShoulders) patterns.push(headAndShoulders);

    // Double Top/Bottom
    const doubleTop = this.detectDoubleTop(prices);
    if (doubleTop) patterns.push(doubleTop);

    const doubleBottom = this.detectDoubleBottom(prices);
    if (doubleBottom) patterns.push(doubleBottom);

    // Triangle patterns
    const ascendingTriangle = this.detectAscendingTriangle(prices);
    if (ascendingTriangle) patterns.push(ascendingTriangle);

    const descendingTriangle = this.detectDescendingTriangle(prices);
    if (descendingTriangle) patterns.push(descendingTriangle);

    return patterns;
  }

  // Detect Head and Shoulders pattern
  detectHeadAndShoulders(prices) {
    if (prices.length < 20) return null;

    const recent = prices.slice(-20);
    const highs = [];

    // Find local highs
    for (let i = 2; i < recent.length - 2; i++) {
      if (
        recent[i].price > recent[i - 1].price &&
        recent[i].price > recent[i + 1].price &&
        recent[i].price > recent[i - 2].price &&
        recent[i].price > recent[i + 2].price
      ) {
        highs.push({ index: i, price: recent[i].price });
      }
    }

    if (highs.length < 3) return null;

    // Check for H&S pattern
    const lastThree = highs.slice(-3);
    if (lastThree.length === 3) {
      const [leftShoulder, head, rightShoulder] = lastThree;

      // Head should be higher than shoulders
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Shoulders should be roughly equal
        const shoulderDiff =
          Math.abs(leftShoulder.price - rightShoulder.price) /
          leftShoulder.price;
        if (shoulderDiff < 0.02) {
          // 2% tolerance
          return {
            type: "head_and_shoulders",
            pattern: "bearish",
            confidence: 0.7,
            neckline: Math.min(leftShoulder.price, rightShoulder.price),
            target:
              Math.min(leftShoulder.price, rightShoulder.price) -
              (head.price - Math.min(leftShoulder.price, rightShoulder.price)),
          };
        }
      }
    }

    return null;
  }

  // Detect Double Top pattern
  detectDoubleTop(prices) {
    if (prices.length < 15) return null;

    const recent = prices.slice(-15);
    const highs = [];

    // Find local highs
    for (let i = 2; i < recent.length - 2; i++) {
      if (
        recent[i].price > recent[i - 1].price &&
        recent[i].price > recent[i + 1].price
      ) {
        highs.push({ index: i, price: recent[i].price });
      }
    }

    if (highs.length >= 2) {
      const lastTwo = highs.slice(-2);
      const priceDiff =
        Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price;

      if (priceDiff < 0.02) {
        // 2% tolerance
        return {
          type: "double_top",
          pattern: "bearish",
          confidence: 0.6,
          resistance: lastTwo[0].price,
          target:
            lastTwo[0].price -
            (lastTwo[0].price - Math.min(...recent.map((p) => p.price))),
        };
      }
    }

    return null;
  }

  // Detect Double Bottom pattern
  detectDoubleBottom(prices) {
    if (prices.length < 15) return null;

    const recent = prices.slice(-15);
    const lows = [];

    // Find local lows
    for (let i = 2; i < recent.length - 2; i++) {
      if (
        recent[i].price < recent[i - 1].price &&
        recent[i].price < recent[i + 1].price
      ) {
        lows.push({ index: i, price: recent[i].price });
      }
    }

    if (lows.length >= 2) {
      const lastTwo = lows.slice(-2);
      const priceDiff =
        Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price;

      if (priceDiff < 0.02) {
        // 2% tolerance
        return {
          type: "double_bottom",
          pattern: "bullish",
          confidence: 0.6,
          support: lastTwo[0].price,
          target:
            lastTwo[0].price +
            (Math.max(...recent.map((p) => p.price)) - lastTwo[0].price),
        };
      }
    }

    return null;
  }

  // Detect Ascending Triangle
  detectAscendingTriangle(prices) {
    if (prices.length < 20) return null;

    const recent = prices.slice(-20);
    const highs = [];
    const lows = [];

    // Find highs and lows
    for (let i = 2; i < recent.length - 2; i++) {
      if (
        recent[i].price > recent[i - 1].price &&
        recent[i].price > recent[i + 1].price
      ) {
        highs.push({ index: i, price: recent[i].price });
      }
      if (
        recent[i].price < recent[i - 1].price &&
        recent[i].price < recent[i + 1].price
      ) {
        lows.push({ index: i, price: recent[i].price });
      }
    }

    if (highs.length >= 2 && lows.length >= 2) {
      // Check for horizontal resistance and ascending support
      const resistanceLevel = highs[highs.length - 1].price;
      const resistanceTolerance = resistanceLevel * 0.01;

      const resistanceTouches = highs.filter(
        (h) => Math.abs(h.price - resistanceLevel) <= resistanceTolerance
      ).length;

      if (resistanceTouches >= 2) {
        // Check for ascending lows
        const recentLows = lows.slice(-3);
        let ascending = true;

        for (let i = 1; i < recentLows.length; i++) {
          if (recentLows[i].price <= recentLows[i - 1].price) {
            ascending = false;
            break;
          }
        }

        if (ascending) {
          return {
            type: "ascending_triangle",
            pattern: "bullish",
            confidence: 0.7,
            resistance: resistanceLevel,
            breakout_target:
              resistanceLevel +
              (resistanceLevel - Math.min(...recentLows.map((l) => l.price))),
          };
        }
      }
    }

    return null;
  }

  // Detect Descending Triangle
  detectDescendingTriangle(prices) {
    if (prices.length < 20) return null;

    const recent = prices.slice(-20);
    const highs = [];
    const lows = [];

    // Find highs and lows
    for (let i = 2; i < recent.length - 2; i++) {
      if (
        recent[i].price > recent[i - 1].price &&
        recent[i].price > recent[i + 1].price
      ) {
        highs.push({ index: i, price: recent[i].price });
      }
      if (
        recent[i].price < recent[i - 1].price &&
        recent[i].price < recent[i + 1].price
      ) {
        lows.push({ index: i, price: recent[i].price });
      }
    }

    if (highs.length >= 2 && lows.length >= 2) {
      // Check for horizontal support and descending highs
      const supportLevel = lows[lows.length - 1].price;
      const supportTolerance = supportLevel * 0.01;

      const supportTouches = lows.filter(
        (l) => Math.abs(l.price - supportLevel) <= supportTolerance
      ).length;

      if (supportTouches >= 2) {
        // Check for descending highs
        const recentHighs = highs.slice(-3);
        let descending = true;

        for (let i = 1; i < recentHighs.length; i++) {
          if (recentHighs[i].price >= recentHighs[i - 1].price) {
            descending = false;
            break;
          }
        }

        if (descending) {
          return {
            type: "descending_triangle",
            pattern: "bearish",
            confidence: 0.7,
            support: supportLevel,
            breakdown_target:
              supportLevel -
              (Math.max(...recentHighs.map((h) => h.price)) - supportLevel),
          };
        }
      }
    }

    return null;
  }

  // Comprehensive technical analysis
  async getComprehensiveAnalysis(prices) {
    const cacheKey = `tech_analysis_${prices.length}_${
      prices[prices.length - 1]?.price
    }`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!prices || prices.length < 20) {
      throw new Error("Insufficient data for technical analysis");
    }

    const currentPrice = prices[prices.length - 1].price;
    const high = Math.max(...prices.map((p) => p.price));
    const low = Math.min(...prices.map((p) => p.price));

    // Calculate all indicators
    const fibonacci = this.calculateFibonacciRetracements(high, low);
    const supportResistance = this.detectSupportResistanceLevels(prices);
    const patterns = this.recognizePatterns(prices);

    // Calculate basic technical indicators
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const bollingerBands = this.calculateBollingerBands(prices, 20, 2);

    const analysis = {
      current_price: currentPrice,
      fibonacci_levels: fibonacci,
      support_resistance: supportResistance,
      patterns: patterns,
      indicators: {
        rsi: rsi,
        macd: macd,
        bollinger_bands: bollingerBands,
      },
      summary: this.generateTechnicalSummary(
        currentPrice,
        fibonacci,
        supportResistance,
        patterns,
        rsi
      ),
    };

    this.cache.set(cacheKey, analysis);
    return analysis;
  }

  // Calculate RSI
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].price - prices[i - 1].price;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return {
      value: rsi,
      signal: rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral",
      strength: Math.abs(rsi - 50) / 50,
    };
  }

  // Calculate MACD
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;

    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);

    const macdLine = ema12 - ema26;

    // Calculate signal line (EMA of MACD)
    const macdValues = [
      { price: macdLine, date: prices[prices.length - 1].date },
    ];
    const signalLine = this.calculateEMA(macdValues, signalPeriod);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
      signal_type: macdLine > signalLine ? "bullish" : "bearish",
    };
  }

  // Calculate EMA
  calculateEMA(prices, period) {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = prices[0].price;

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i].price * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  // Calculate Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, p) => sum + p.price, 0) / period;

    const variance =
      recentPrices.reduce((sum, p) => sum + Math.pow(p.price - sma, 2), 0) /
      period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + standardDeviation * stdDev,
      middle: sma,
      lower: sma - standardDeviation * stdDev,
      position:
        (prices[prices.length - 1].price - (sma - standardDeviation * stdDev)) /
        (standardDeviation * stdDev * 2),
      squeeze: standardDeviation < sma * 0.02, // Low volatility
    };
  }

  // Generate technical summary
  generateTechnicalSummary(
    currentPrice,
    fibonacci,
    supportResistance,
    patterns,
    rsi
  ) {
    let summary = [];

    // Price position analysis
    if (currentPrice > fibonacci.level_618) {
      summary.push(
        "Price is in strong bullish territory above 61.8% retracement"
      );
    } else if (currentPrice < fibonacci.level_382) {
      summary.push(
        "Price is in strong bearish territory below 38.2% retracement"
      );
    } else {
      summary.push(
        "Price is in neutral territory between key Fibonacci levels"
      );
    }

    // RSI analysis
    if (rsi) {
      if (rsi.value > 70) {
        summary.push(
          "RSI indicates overbought conditions - potential reversal risk"
        );
      } else if (rsi.value < 30) {
        summary.push(
          "RSI indicates oversold conditions - potential bounce opportunity"
        );
      } else {
        summary.push("RSI is in neutral territory");
      }
    }

    // Pattern analysis
    if (patterns.length > 0) {
      const strongestPattern = patterns.reduce((prev, current) =>
        prev.confidence > current.confidence ? prev : current
      );
      summary.push(
        `${strongestPattern.type} pattern detected (${strongestPattern.pattern})`
      );
    }

    // Support/Resistance analysis
    const nearestSupport = supportResistance.support[0];
    const nearestResistance = supportResistance.resistance[0];

    if (
      nearestSupport &&
      currentPrice - nearestSupport.price < currentPrice * 0.02
    ) {
      summary.push(
        `Price near strong support at $${nearestSupport.price.toFixed(2)}`
      );
    }

    if (
      nearestResistance &&
      nearestResistance.price - currentPrice < currentPrice * 0.02
    ) {
      summary.push(
        `Price near strong resistance at $${nearestResistance.price.toFixed(2)}`
      );
    }

    return summary.join(". ");
  }
}

module.exports = new TechnicalAnalysisService();
