const NodeCache = require("node-cache");

class CorrelationAnalysisService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache
  }

  // Calculate correlation coefficient between two price series
  calculateCorrelation(prices1, prices2) {
    if (prices1.length !== prices2.length || prices1.length < 2) {
      return null;
    }

    // Calculate returns
    const returns1 = [];
    const returns2 = [];

    for (let i = 1; i < prices1.length; i++) {
      const ret1 =
        (prices1[i].price - prices1[i - 1].price) / prices1[i - 1].price;
      const ret2 =
        (prices2[i].price - prices2[i - 1].price) / prices2[i - 1].price;
      returns1.push(ret1);
      returns2.push(ret2);
    }

    // Calculate means
    const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

    // Calculate correlation coefficient
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return {
      correlation: correlation,
      strength: this.getCorrelationStrength(correlation),
      direction: correlation > 0 ? "positive" : "negative",
      significance: this.calculateSignificance(correlation, returns1.length),
    };
  }

  // Get correlation strength description
  getCorrelationStrength(correlation) {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.8) return "very strong";
    if (absCorr >= 0.6) return "strong";
    if (absCorr >= 0.4) return "moderate";
    if (absCorr >= 0.2) return "weak";
    return "very weak";
  }

  // Calculate statistical significance
  calculateSignificance(correlation, sampleSize) {
    if (sampleSize < 3) return "insufficient data";

    const tStat =
      correlation *
      Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    const degreesOfFreedom = sampleSize - 2;

    // Approximate p-value calculation
    let pValue;
    if (Math.abs(tStat) > 2.576) pValue = 0.01; // 99% confidence
    else if (Math.abs(tStat) > 1.96) pValue = 0.05; // 95% confidence
    else if (Math.abs(tStat) > 1.645) pValue = 0.1; // 90% confidence
    else pValue = 0.2; // 80% confidence

    return {
      pValue: pValue,
      significant: pValue <= 0.05,
      confidence: (1 - pValue) * 100,
    };
  }

  // Calculate rolling correlation over time
  calculateRollingCorrelation(prices1, prices2, window = 30) {
    if (prices1.length < window || prices2.length < window) {
      return null;
    }

    const rollingCorrelations = [];
    const dates = [];

    for (let i = window; i < prices1.length; i++) {
      const window1 = prices1.slice(i - window, i);
      const window2 = prices2.slice(i - window, i);

      const correlation = this.calculateCorrelation(window1, window2);
      if (correlation) {
        rollingCorrelations.push(correlation.correlation);
        dates.push(prices1[i].date);
      }
    }

    return {
      correlations: rollingCorrelations,
      dates: dates,
      average:
        rollingCorrelations.reduce((sum, corr) => sum + corr, 0) /
        rollingCorrelations.length,
      volatility: this.calculateCorrelationVolatility(rollingCorrelations),
      trend: this.calculateCorrelationTrend(rollingCorrelations),
    };
  }

  // Calculate correlation volatility
  calculateCorrelationVolatility(correlations) {
    if (correlations.length < 2) return 0;

    const mean =
      correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
    const variance =
      correlations.reduce((sum, corr) => sum + Math.pow(corr - mean, 2), 0) /
      correlations.length;

    return Math.sqrt(variance);
  }

  // Calculate correlation trend
  calculateCorrelationTrend(correlations) {
    if (correlations.length < 10) return "insufficient data";

    const recent = correlations.slice(-10);
    const earlier = correlations.slice(0, 10);

    const recentAvg =
      recent.reduce((sum, corr) => sum + corr, 0) / recent.length;
    const earlierAvg =
      earlier.reduce((sum, corr) => sum + corr, 0) / earlier.length;

    const change = recentAvg - earlierAvg;

    if (change > 0.1) return "increasing";
    if (change < -0.1) return "decreasing";
    return "stable";
  }

  // Analyze correlation regime changes
  analyzeCorrelationRegimes(rollingCorrelation) {
    if (!rollingCorrelation || rollingCorrelation.correlations.length < 50) {
      return null;
    }

    const correlations = rollingCorrelation.correlations;
    const regimes = [];
    let currentRegime = null;
    let regimeStart = 0;

    for (let i = 1; i < correlations.length; i++) {
      const currentCorr = correlations[i];
      const prevCorr = correlations[i - 1];

      // Detect regime change
      const regimeChange = Math.abs(currentCorr - prevCorr) > 0.2;

      if (regimeChange || i === correlations.length - 1) {
        // End current regime
        if (currentRegime !== null) {
          const regimeData = correlations.slice(regimeStart, i);
          const avgCorr =
            regimeData.reduce((sum, corr) => sum + corr, 0) / regimeData.length;

          regimes.push({
            start: rollingCorrelation.dates[regimeStart],
            end: rollingCorrelation.dates[i - 1],
            averageCorrelation: avgCorr,
            strength: this.getCorrelationStrength(avgCorr),
            duration: i - regimeStart,
            volatility: this.calculateCorrelationVolatility(regimeData),
          });
        }

        // Start new regime
        currentRegime = this.getCorrelationStrength(currentCorr);
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

  // Generate correlation-based trading recommendations
  generateCorrelationRecommendations(
    asset1,
    asset2,
    correlationData,
    currentPrices
  ) {
    const recommendations = [];

    if (!correlationData || !currentPrices) {
      return recommendations;
    }

    const correlation = correlationData.correlation;
    const strength = correlationData.strength;
    const significance = correlationData.significance;

    // Only provide recommendations for significant correlations
    if (!significance.significant) {
      recommendations.push({
        type: "info",
        message: `Correlation between ${asset1} and ${asset2} is not statistically significant`,
        confidence: "low",
      });
      return recommendations;
    }

    // Strong positive correlation recommendations
    if (correlation > 0.6) {
      recommendations.push({
        type: "hedge",
        message: `${asset1} and ${asset2} are strongly positively correlated. Consider hedging strategies.`,
        confidence: "high",
        action: "Consider reducing position size or using hedging instruments",
      });

      recommendations.push({
        type: "diversification",
        message: "Strong positive correlation reduces diversification benefits",
        confidence: "high",
        action: "Consider adding uncorrelated assets to portfolio",
      });
    }

    // Strong negative correlation recommendations
    if (correlation < -0.6) {
      recommendations.push({
        type: "hedge",
        message: `${asset1} and ${asset2} are strongly negatively correlated. Good for hedging.`,
        confidence: "high",
        action: "Consider using one asset to hedge the other",
      });

      recommendations.push({
        type: "portfolio",
        message: "Negative correlation provides good diversification",
        confidence: "high",
        action: "Consider balanced allocation between both assets",
      });
    }

    // Weak correlation recommendations
    if (Math.abs(correlation) < 0.3) {
      recommendations.push({
        type: "diversification",
        message: `${asset1} and ${asset2} have weak correlation - good for diversification`,
        confidence: "medium",
        action: "Consider including both assets for portfolio diversification",
      });
    }

    // Trend-based recommendations
    if (correlationData.rolling) {
      const trend = correlationData.rolling.trend;

      if (trend === "increasing") {
        recommendations.push({
          type: "trend",
          message: `Correlation between ${asset1} and ${asset2} is increasing`,
          confidence: "medium",
          action: "Monitor for potential regime change",
        });
      } else if (trend === "decreasing") {
        recommendations.push({
          type: "trend",
          message: `Correlation between ${asset1} and ${asset2} is decreasing`,
          confidence: "medium",
          action: "Diversification benefits may be improving",
        });
      }
    }

    return recommendations;
  }

  // Calculate correlation matrix for multiple assets
  calculateCorrelationMatrix(assetData) {
    const assets = Object.keys(assetData);
    const matrix = {};

    // Initialize matrix
    for (const asset1 of assets) {
      matrix[asset1] = {};
      for (const asset2 of assets) {
        if (asset1 === asset2) {
          matrix[asset1][asset2] = 1.0;
        } else {
          matrix[asset1][asset2] = 0.0;
        }
      }
    }

    // Calculate correlations
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];

        const prices1 = assetData[asset1].prices || [];
        const prices2 = assetData[asset2].prices || [];

        if (prices1.length > 0 && prices2.length > 0) {
          const correlation = this.calculateCorrelation(prices1, prices2);
          if (correlation) {
            matrix[asset1][asset2] = correlation.correlation;
            matrix[asset2][asset1] = correlation.correlation;
          }
        }
      }
    }

    return matrix;
  }

  // Find most/least correlated pairs
  findCorrelationExtremes(correlationMatrix) {
    const pairs = [];

    for (const asset1 of Object.keys(correlationMatrix)) {
      for (const asset2 of Object.keys(correlationMatrix[asset1])) {
        if (asset1 !== asset2) {
          pairs.push({
            asset1: asset1,
            asset2: asset2,
            correlation: correlationMatrix[asset1][asset2],
            strength: this.getCorrelationStrength(
              correlationMatrix[asset1][asset2]
            ),
          });
        }
      }
    }

    // Sort by correlation strength
    pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return {
      strongest: pairs.slice(0, 3),
      weakest: pairs.slice(-3),
      mostPositive: pairs.filter((p) => p.correlation > 0).slice(0, 3),
      mostNegative: pairs.filter((p) => p.correlation < 0).slice(0, 3),
    };
  }

  // Comprehensive correlation analysis
  async getComprehensiveCorrelationAnalysis(assetData) {
    const cacheKey = `correlation_analysis_${Object.keys(assetData).length}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const analysis = {
      correlationMatrix: this.calculateCorrelationMatrix(assetData),
      extremes: null,
      rollingCorrelations: {},
      regimeAnalysis: {},
      recommendations: [],
    };

    // Calculate extremes
    analysis.extremes = this.findCorrelationExtremes(
      analysis.correlationMatrix
    );

    // Calculate rolling correlations for key pairs
    const keyPairs = [
      ["XAU", "BTC"],
      ["XAU", "DXY"],
      ["BTC", "DXY"],
    ];

    for (const [asset1, asset2] of keyPairs) {
      if (assetData[asset1] && assetData[asset2]) {
        const prices1 = assetData[asset1].prices || [];
        const prices2 = assetData[asset2].prices || [];

        if (prices1.length > 30 && prices2.length > 30) {
          const rolling = this.calculateRollingCorrelation(
            prices1,
            prices2,
            30
          );
          if (rolling) {
            analysis.rollingCorrelations[`${asset1}_${asset2}`] = rolling;

            // Analyze regimes
            const regimes = this.analyzeCorrelationRegimes(rolling);
            if (regimes) {
              analysis.regimeAnalysis[`${asset1}_${asset2}`] = regimes;
            }
          }
        }
      }
    }

    // Generate recommendations
    for (const [asset1, asset2] of keyPairs) {
      if (
        analysis.correlationMatrix[asset1] &&
        analysis.correlationMatrix[asset1][asset2] !== undefined
      ) {
        const correlationData = {
          correlation: analysis.correlationMatrix[asset1][asset2],
          strength: this.getCorrelationStrength(
            analysis.correlationMatrix[asset1][asset2]
          ),
          significance: this.calculateSignificance(
            analysis.correlationMatrix[asset1][asset2],
            30
          ),
          rolling: analysis.rollingCorrelations[`${asset1}_${asset2}`],
        };

        const recommendations = this.generateCorrelationRecommendations(
          asset1,
          asset2,
          correlationData,
          assetData
        );

        analysis.recommendations.push(...recommendations);
      }
    }

    this.cache.set(cacheKey, analysis);
    return analysis;
  }
}

module.exports = new CorrelationAnalysisService();
