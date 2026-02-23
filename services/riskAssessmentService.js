const NodeCache = require("node-cache");

class RiskAssessmentService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
  }

  // Calculate Value at Risk (VaR)
  calculateVaR(returns, confidenceLevel = 0.05) {
    if (!returns || returns.length < 5) return null;

    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);

    // Calculate VaR using historical simulation
    const index = Math.floor(confidenceLevel * sortedReturns.length);
    const varValue = Math.abs(sortedReturns[index]);

    // Calculate VaR using parametric method (assuming normal distribution)
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);
    const parametricVaR = Math.abs(mean + zScore * stdDev);

    return {
      historical: varValue,
      parametric: parametricVaR,
      confidence: (1 - confidenceLevel) * 100,
      method: "historical_simulation",
      sampleSize: returns.length,
    };
  }

  // Calculate Conditional Value at Risk (CVaR) / Expected Shortfall
  calculateCVaR(returns, confidenceLevel = 0.05) {
    if (!returns || returns.length < 5) return null;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const tailCount = Math.floor(confidenceLevel * sortedReturns.length);

    if (tailCount === 0) return null;

    const tailReturns = sortedReturns.slice(0, tailCount);
    const cvar = Math.abs(
      tailReturns.reduce((sum, ret) => sum + ret, 0) / tailCount
    );

    return {
      cvar: cvar,
      confidence: (1 - confidenceLevel) * 100,
      tailCount: tailCount,
      averageLoss: cvar,
    };
  }

  // Get Z-score for confidence level
  getZScore(confidenceLevel) {
    const zScores = {
      0.01: -2.326, // 99% confidence
      0.025: -1.96, // 97.5% confidence
      0.05: -1.645, // 95% confidence
      0.1: -1.282, // 90% confidence
      0.2: -0.842, // 80% confidence
    };

    return zScores[confidenceLevel] || -1.645;
  }

  // Calculate portfolio risk metrics
  calculatePortfolioRisk(portfolio, correlationMatrix, riskFreeRate = 0.05) {
    if (!portfolio || !correlationMatrix) return null;

    const assets = Object.keys(portfolio);
    if (assets.length === 0) return null;

    // Calculate portfolio variance
    let portfolioVariance = 0;

    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        const weight1 = portfolio[asset1].weight;
        const weight2 = portfolio[asset2].weight;
        const volatility1 = portfolio[asset1].volatility;
        const volatility2 = portfolio[asset2].volatility;
        const correlation =
          (correlationMatrix[asset1] && correlationMatrix[asset1][asset2]) || 0;

        portfolioVariance +=
          weight1 * weight2 * volatility1 * volatility2 * correlation;
      }
    }

    const portfolioVolatility = Math.sqrt(portfolioVariance);
    const portfolioReturn = assets.reduce(
      (sum, asset) =>
        sum + portfolio[asset].weight * portfolio[asset].expectedReturn,
      0
    );

    // Calculate Sharpe ratio
    const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;

    // Calculate maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(portfolio);

    return {
      volatility: portfolioVolatility,
      expectedReturn: portfolioReturn,
      sharpeRatio: sharpeRatio,
      maxDrawdown: maxDrawdown,
      riskAdjustedReturn: portfolioReturn / portfolioVolatility,
    };
  }

  // Calculate maximum drawdown
  calculateMaxDrawdown(portfolio) {
    // Simplified calculation - in practice, you'd use historical portfolio values
    const volatilities = Object.values(portfolio).map(
      (asset) => asset.volatility
    );
    const maxVolatility = Math.max(...volatilities);

    // Rough estimate of max drawdown based on volatility
    return maxVolatility * 2; // Conservative estimate
  }

  // Calculate position sizing based on risk
  calculatePositionSizing(
    portfolioValue,
    riskPerTrade,
    stopLoss,
    currentPrice
  ) {
    if (!portfolioValue || !riskPerTrade || !stopLoss || !currentPrice)
      return null;

    const riskAmount = portfolioValue * (riskPerTrade / 100);
    const priceRisk = Math.abs(currentPrice - stopLoss);
    const positionSize = riskAmount / priceRisk;
    const positionValue = positionSize * currentPrice;

    return {
      positionSize: positionSize,
      positionValue: positionValue,
      riskAmount: riskAmount,
      riskPercentage: (riskAmount / portfolioValue) * 100,
      stopLoss: stopLoss,
      riskRewardRatio: this.calculateRiskRewardRatio(
        currentPrice,
        stopLoss,
        null
      ),
    };
  }

  // Calculate risk-reward ratio
  calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = takeProfit ? Math.abs(takeProfit - entryPrice) : risk * 2; // Default 1:2 ratio

    return {
      ratio: reward / risk,
      risk: risk,
      reward: reward,
      recommendation:
        reward / risk >= 2
          ? "good"
          : reward / risk >= 1
          ? "acceptable"
          : "poor",
    };
  }

  // Calculate portfolio diversification metrics
  calculateDiversificationMetrics(portfolio, correlationMatrix) {
    if (!portfolio || !correlationMatrix) return null;

    const assets = Object.keys(portfolio);
    const weights = assets.map((asset) => portfolio[asset].weight);

    // Calculate Herfindahl-Hirschman Index (HHI)
    const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0);

    // Calculate effective number of assets
    const effectiveAssets = 1 / hhi;

    // Calculate diversification ratio
    const weightedVolatility = assets.reduce(
      (sum, asset) =>
        sum + portfolio[asset].weight * portfolio[asset].volatility,
      0
    );

    const portfolioVolatility = this.calculatePortfolioVolatility(
      portfolio,
      correlationMatrix
    );
    const diversificationRatio = weightedVolatility / portfolioVolatility;

    return {
      hhi: hhi,
      effectiveAssets: effectiveAssets,
      diversificationRatio: diversificationRatio,
      concentrationRisk: hhi > 0.25 ? "high" : hhi > 0.15 ? "medium" : "low",
      recommendation: this.getDiversificationRecommendation(
        effectiveAssets,
        diversificationRatio
      ),
    };
  }

  // Calculate portfolio volatility
  calculatePortfolioVolatility(portfolio, correlationMatrix) {
    const assets = Object.keys(portfolio);
    let variance = 0;

    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        const weight1 = portfolio[asset1].weight;
        const weight2 = portfolio[asset2].weight;
        const volatility1 = portfolio[asset1].volatility;
        const volatility2 = portfolio[asset2].volatility;
        const correlation =
          (correlationMatrix[asset1] && correlationMatrix[asset1][asset2]) || 0;

        variance += weight1 * weight2 * volatility1 * volatility2 * correlation;
      }
    }

    return Math.sqrt(variance);
  }

  // Get diversification recommendation
  getDiversificationRecommendation(effectiveAssets, diversificationRatio) {
    if (effectiveAssets < 3) {
      return "Consider adding more assets to improve diversification";
    } else if (diversificationRatio < 1.2) {
      return "Portfolio is well diversified";
    } else {
      return "Diversification benefits are limited - consider rebalancing";
    }
  }

  // Calculate stress test scenarios
  calculateStressTest(portfolio, scenarios) {
    if (!portfolio || !scenarios) return null;

    const stressResults = {};

    for (const [scenarioName, scenario] of Object.entries(scenarios)) {
      let portfolioReturn = 0;
      let portfolioValue = 0;

      for (const [asset, allocation] of Object.entries(portfolio)) {
        const assetReturn = scenario[asset] || 0;
        portfolioReturn += allocation.weight * assetReturn;
        portfolioValue += allocation.weight * (1 + assetReturn);
      }

      stressResults[scenarioName] = {
        portfolioReturn: portfolioReturn,
        portfolioValue: portfolioValue,
        loss: Math.min(portfolioReturn, 0),
        severity: this.getStressSeverity(portfolioReturn),
      };
    }

    return stressResults;
  }

  // Get stress test severity
  getStressSeverity(returnValue) {
    if (returnValue < -0.2) return "extreme";
    if (returnValue < -0.1) return "severe";
    if (returnValue < -0.05) return "moderate";
    if (returnValue < 0) return "mild";
    return "positive";
  }

  // Generate risk recommendations
  generateRiskRecommendations(riskAnalysis, portfolio) {
    const recommendations = [];

    if (!riskAnalysis) return recommendations;

    // VaR recommendations
    if (riskAnalysis.var) {
      const varPercent = (riskAnalysis.var.historical * 100).toFixed(2);

      if (riskAnalysis.var.historical > 0.05) {
        // 5% VaR
        recommendations.push({
          type: "risk_reduction",
          message: `Portfolio VaR is ${varPercent}% - consider reducing risk exposure`,
          confidence: "high",
          action: "Reduce position sizes or add hedging instruments",
        });
      } else if (riskAnalysis.var.historical < 0.02) {
        // 2% VaR
        recommendations.push({
          type: "opportunity",
          message: `Low VaR (${varPercent}%) - potential for higher returns`,
          confidence: "medium",
          action: "Consider increasing risk exposure for higher returns",
        });
      }
    }

    // Sharpe ratio recommendations
    if (riskAnalysis.sharpeRatio !== undefined) {
      if (riskAnalysis.sharpeRatio < 0.5) {
        recommendations.push({
          type: "performance",
          message: `Low Sharpe ratio (${riskAnalysis.sharpeRatio.toFixed(
            2
          )}) - poor risk-adjusted returns`,
          confidence: "high",
          action: "Review portfolio allocation and risk management",
        });
      } else if (riskAnalysis.sharpeRatio > 1.5) {
        recommendations.push({
          type: "performance",
          message: `Excellent Sharpe ratio (${riskAnalysis.sharpeRatio.toFixed(
            2
          )}) - strong risk-adjusted returns`,
          confidence: "high",
          action: "Consider maintaining current strategy",
        });
      }
    }

    // Diversification recommendations
    if (riskAnalysis.diversification) {
      if (riskAnalysis.diversification.concentrationRisk === "high") {
        recommendations.push({
          type: "diversification",
          message: "High concentration risk detected",
          confidence: "high",
          action: "Diversify portfolio across more assets and sectors",
        });
      }
    }

    // Position sizing recommendations
    if (riskAnalysis.positionSizing) {
      const positionValue = riskAnalysis.positionSizing.positionValue;
      const portfolioValue = portfolio.totalValue || 100000; // Default
      const positionPercent = (positionValue / portfolioValue) * 100;

      if (positionPercent > 20) {
        recommendations.push({
          type: "position_sizing",
          message: `Large position size (${positionPercent.toFixed(
            1
          )}%) - consider reducing`,
          confidence: "medium",
          action: "Reduce position size to manage concentration risk",
        });
      }
    }

    return recommendations;
  }

  // Comprehensive risk assessment
  async getComprehensiveRiskAssessment(portfolio, prices, correlationMatrix) {
    const cacheKey = `risk_assessment_${Object.keys(portfolio).length}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!portfolio || Object.keys(portfolio).length === 0) {
      throw new Error("Portfolio data required for risk assessment");
    }

    // Calculate returns from prices
    const returns = [];
    if (prices && prices.length > 1) {
      for (let i = 1; i < prices.length; i++) {
        const ret =
          (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
        returns.push(ret);
      }
    }

    const analysis = {
      var: null,
      cvar: null,
      portfolioRisk: null,
      diversification: null,
      positionSizing: null,
      stressTest: null,
      recommendations: [],
    };

    // Calculate VaR and CVaR
    if (returns.length > 30) {
      analysis.var = this.calculateVaR(returns, 0.05);
      analysis.cvar = this.calculateCVaR(returns, 0.05);
    }

    // Calculate portfolio risk metrics
    if (correlationMatrix) {
      analysis.portfolioRisk = this.calculatePortfolioRisk(
        portfolio,
        correlationMatrix
      );
      analysis.diversification = this.calculateDiversificationMetrics(
        portfolio,
        correlationMatrix
      );
    }

    // Calculate position sizing (example for first asset)
    const firstAsset = Object.keys(portfolio)[0];
    if (firstAsset && prices && prices.length > 0) {
      const currentPrice = prices[prices.length - 1].price;
      analysis.positionSizing = this.calculatePositionSizing(
        100000, // Portfolio value
        2, // Risk per trade %
        currentPrice * 0.95, // Stop loss at 5% below current price
        currentPrice
      );
    }

    // Calculate stress test scenarios
    const scenarios = {
      market_crash: { [firstAsset]: -0.3, DXY: 0.1, BTC: -0.5 },
      inflation_spike: { [firstAsset]: 0.2, DXY: -0.15, BTC: -0.2 },
      recession: { [firstAsset]: -0.15, DXY: 0.2, BTC: -0.3 },
      gold_rally: { [firstAsset]: 0.3, DXY: -0.2, BTC: 0.1 },
    };

    analysis.stressTest = this.calculateStressTest(portfolio, scenarios);

    // Generate recommendations
    analysis.recommendations = this.generateRiskRecommendations(
      analysis,
      portfolio
    );

    this.cache.set(cacheKey, analysis);
    return analysis;
  }
}

module.exports = new RiskAssessmentService();
