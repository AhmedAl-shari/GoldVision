const axios = require("axios");

class AdvancedTechnicalAnalysis {
  constructor() {
    this.indicators = {
      sma: this.calculateSMA,
      ema: this.calculateEMA,
      rsi: this.calculateRSI,
      macd: this.calculateMACD,
      bollinger: this.calculateBollingerBands,
      stochastic: this.calculateStochastic,
      williams: this.calculateWilliamsR,
      atr: this.calculateATR,
      adx: this.calculateADX,
      obv: this.calculateOBV,
      vwap: this.calculateVWAP,
    };
  }

  // Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return null;

    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  // Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    const ema = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }

    return ema;
  }

  // Relative Strength Index
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = this.calculateSMA(gains, period);
    const avgLoss = this.calculateSMA(losses, period);

    const rsi = [];
    for (let i = 0; i < avgGain.length; i++) {
      const rs = avgGain[i] / avgLoss[i];
      rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
  }

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    if (!fastEMA || !slowEMA) return null;

    const macdLine = [];
    const minLength = Math.min(fastEMA.length, slowEMA.length);

    for (let i = 0; i < minLength; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }

    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];

    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram,
    };
  }

  // Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;

    const upperBand = [];
    const lowerBand = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance =
        slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        period;
      const standardDeviation = Math.sqrt(variance);

      upperBand.push(mean + stdDev * standardDeviation);
      lowerBand.push(mean - stdDev * standardDeviation);
    }

    return {
      upper: upperBand,
      middle: sma,
      lower: lowerBand,
    };
  }

  // Stochastic Oscillator
  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (highs.length < kPeriod) return null;

    const kValues = [];

    for (let i = kPeriod - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const currentClose = closes[i];

      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);

      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }

    const dValues = this.calculateSMA(kValues, dPeriod);

    return {
      k: kValues,
      d: dValues,
    };
  }

  // Williams %R
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period) return null;

    const williamsR = [];

    for (let i = period - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const currentClose = closes[i];

      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);

      const wr =
        ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      williamsR.push(wr);
    }

    return williamsR;
  }

  // Average True Range
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;

    const trueRanges = [];

    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return this.calculateSMA(trueRanges, period);
  }

  // Average Directional Index
  calculateADX(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;

    const plusDM = [];
    const minusDM = [];
    const trueRanges = [];

    for (let i = 1; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const plusDI = this.calculateSMA(plusDM, period);
    const minusDI = this.calculateSMA(minusDM, period);
    const atr = this.calculateSMA(trueRanges, period);

    const adx = [];
    for (let i = 0; i < plusDI.length; i++) {
      const dx =
        (Math.abs(plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])) * 100;
      adx.push(dx);
    }

    return this.calculateSMA(adx, period);
  }

  // On-Balance Volume
  calculateOBV(closes, volumes) {
    if (closes.length !== volumes.length) return null;

    const obv = [volumes[0]];

    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv.push(obv[i - 1] + volumes[i]);
      } else if (closes[i] < closes[i - 1]) {
        obv.push(obv[i - 1] - volumes[i]);
      } else {
        obv.push(obv[i - 1]);
      }
    }

    return obv;
  }

  // Volume Weighted Average Price
  calculateVWAP(highs, lows, closes, volumes) {
    if (highs.length !== volumes.length) return null;

    const vwap = [];
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;

    for (let i = 0; i < highs.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      const volumePrice = typicalPrice * volumes[i];

      cumulativeVolume += volumes[i];
      cumulativeVolumePrice += volumePrice;

      vwap.push(cumulativeVolumePrice / cumulativeVolume);
    }

    return vwap;
  }

  // Calculate all indicators
  calculateAllIndicators(priceData) {
    const prices = priceData.map((d) => d.y);
    const highs = priceData.map((d) => d.high || d.y);
    const lows = priceData.map((d) => d.low || d.y);
    const closes = priceData.map((d) => d.y);
    const volumes = priceData.map((d) => d.volume || 1000000); // Default volume if not provided

    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollinger: this.calculateBollingerBands(prices, 20, 2),
      stochastic: this.calculateStochastic(highs, lows, closes),
      williams: this.calculateWilliamsR(highs, lows, closes),
      atr: this.calculateATR(highs, lows, closes),
      adx: this.calculateADX(highs, lows, closes),
      obv: this.calculateOBV(closes, volumes),
      vwap: this.calculateVWAP(highs, lows, closes, volumes),
    };
  }

  // Generate trading signals
  generateSignals(indicators, currentPrice) {
    const signals = {
      buy: 0,
      sell: 0,
      neutral: 0,
      recommendations: [],
    };

    // RSI signals
    if (indicators.rsi && indicators.rsi.length > 0) {
      const currentRSI = indicators.rsi[indicators.rsi.length - 1];
      if (currentRSI < 30) {
        signals.buy++;
        signals.recommendations.push(
          "RSI indicates oversold condition - potential buy signal"
        );
      } else if (currentRSI > 70) {
        signals.sell++;
        signals.recommendations.push(
          "RSI indicates overbought condition - potential sell signal"
        );
      } else {
        signals.neutral++;
      }
    }

    // MACD signals
    if (indicators.macd && indicators.macd.macd && indicators.macd.signal) {
      const macdLine = indicators.macd.macd[indicators.macd.macd.length - 1];
      const signalLine =
        indicators.macd.signal[indicators.macd.signal.length - 1];

      if (macdLine > signalLine) {
        signals.buy++;
        signals.recommendations.push(
          "MACD line above signal line - bullish momentum"
        );
      } else {
        signals.sell++;
        signals.recommendations.push(
          "MACD line below signal line - bearish momentum"
        );
      }
    }

    // Bollinger Bands signals
    if (
      indicators.bollinger &&
      indicators.bollinger.lower &&
      indicators.bollinger.upper
    ) {
      const lowerBand =
        indicators.bollinger.lower[indicators.bollinger.lower.length - 1];
      const upperBand =
        indicators.bollinger.upper[indicators.bollinger.upper.length - 1];

      if (currentPrice <= lowerBand) {
        signals.buy++;
        signals.recommendations.push(
          "Price at lower Bollinger Band - potential bounce"
        );
      } else if (currentPrice >= upperBand) {
        signals.sell++;
        signals.recommendations.push(
          "Price at upper Bollinger Band - potential pullback"
        );
      } else {
        signals.neutral++;
      }
    }

    // Moving Average signals
    if (indicators.sma20 && indicators.sma50) {
      const sma20 = indicators.sma20[indicators.sma20.length - 1];
      const sma50 = indicators.sma50[indicators.sma50.length - 1];

      if (sma20 > sma50 && currentPrice > sma20) {
        signals.buy++;
        signals.recommendations.push("Price above both SMAs - bullish trend");
      } else if (sma20 < sma50 && currentPrice < sma20) {
        signals.sell++;
        signals.recommendations.push("Price below both SMAs - bearish trend");
      } else {
        signals.neutral++;
      }
    }

    return signals;
  }
}

module.exports = AdvancedTechnicalAnalysis;
