/**
 * Trading Signal Service - Lightweight Buy/Sell/Hold recommendation
 * 
 * Algorithm:
 * - 7-day price slope (trend direction)
 * - RSI(14) (momentum oscillator)
 * - Bollinger Band position (volatility context)
 * 
 * Output: BUY / HOLD / SELL with rationale
 */

/**
 * Calculate trading signal based on technical indicators
 * @param {Array} prices - Historical price data (at least 14 days)
 * @param {Object} technicalData - Technical analysis data (RSI, Bollinger Bands)
 * @returns {Object} Signal object with recommendation
 */
const calculateTradingSignal = (prices, technicalData = {}) => {
  if (!prices || prices.length < 14) {
    return {
      signal: 'HOLD',
      rationale: 'Insufficient data for analysis (need at least 14 days)',
      confidence: 0,
      details: null
    };
  }

  // 1. Calculate 7-day slope (trend)
  const last7 = prices.slice(-7);
  const firstPrice = last7[0].price;
  const lastPrice = last7[last7.length - 1].price;
  const slope = (lastPrice - firstPrice) / 7; // Price change per day
  const slopePercent = (slope / firstPrice) * 100; // Percentage change
  
  // 2. Get RSI(14) from technical data
  const rsi = technicalData?.rsi || 50; // Default to neutral if not available
  
  // 3. Calculate Bollinger Band position
  const currentPrice = prices[prices.length - 1].price;
  const bb = technicalData?.bollinger_bands || {};
  
  let bbPosition = 0.5; // Default to middle
  if (bb.upper && bb.lower) {
    bbPosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);
  }
  
  // 4. Scoring system (100-point scale)
  let score = 0;
  let signals = [];
  
  // Trend component (±30 points)
  if (slopePercent > 0.5) {
    score += 30;
    signals.push('uptrend');
  } else if (slopePercent < -0.5) {
    score -= 30;
    signals.push('downtrend');
  } else {
    signals.push('neutral-trend');
  }
  
  // RSI component (±40 points)
  if (rsi < 30) {
    score += 40; // Oversold → Buy opportunity
    signals.push('oversold');
  } else if (rsi > 70) {
    score -= 40; // Overbought → Sell signal
    signals.push('overbought');
  } else if (rsi >= 45 && rsi <= 55) {
    signals.push('neutral-momentum');
  }
  
  // Bollinger Band component (±30 points)
  if (bbPosition < 0.2) {
    score += 30; // Near lower band → Buy opportunity
    signals.push('near-support');
  } else if (bbPosition > 0.8) {
    score -= 30; // Near upper band → Sell signal
    signals.push('near-resistance');
  } else {
    signals.push('mid-range');
  }
  
  // 5. Determine final signal based on score
  let signal, rationale, confidence;
  
  if (score >= 40) {
    signal = 'BUY';
    const bullishSignals = signals.filter(s => 
      ['uptrend', 'oversold', 'near-support'].includes(s)
    );
    rationale = `Bullish: ${bullishSignals.join(', ') || 'positive momentum'}`;
    confidence = Math.min(90, 50 + score);
  } else if (score <= -40) {
    signal = 'SELL';
    const bearishSignals = signals.filter(s => 
      ['downtrend', 'overbought', 'near-resistance'].includes(s)
    );
    rationale = `Bearish: ${bearishSignals.join(', ') || 'negative momentum'}`;
    confidence = Math.min(90, 50 + Math.abs(score));
  } else {
    signal = 'HOLD';
    rationale = `Mixed signals - 7d slope ${slopePercent.toFixed(2)}%, RSI ${rsi.toFixed(0)}`;
    confidence = 50;
  }
  
  return {
    signal,
    rationale,
    confidence,
    details: {
      slope: parseFloat(slopePercent.toFixed(2)),
      rsi: parseFloat(rsi.toFixed(1)),
      bbPosition: parseFloat(bbPosition.toFixed(2)),
      score,
      components: {
        trend: slopePercent > 0.5 ? 'bullish' : slopePercent < -0.5 ? 'bearish' : 'neutral',
        momentum: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral',
        bands: bbPosition < 0.2 ? 'lower' : bbPosition > 0.8 ? 'upper' : 'middle'
      }
    }
  };
};

module.exports = {
  calculateTradingSignal
};

