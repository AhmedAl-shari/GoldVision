/**
 * Market-based default calculation service
 * Provides dynamic default values based on real market data
 */

import { useSpotRate, useTechnicalAnalysis, useMultiAssetData } from "./api";

export interface MarketBasedDefaults {
  // Investment Calculator defaults
  initialInvestment: number;
  monthlyContribution: number;
  timeHorizon: number;
  expectedReturn: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";

  // Portfolio allocation defaults
  goldAllocation: number;
  stocksAllocation: number;
  bondsAllocation: number;
  cashAllocation: number;

  // Risk calculator defaults
  portfolioValue: number;
  positionSize: number;
  stopLoss: number;
  riskPerTrade: number;
}

/**
 * Calculate market-based default values for investment calculator
 */
export function useMarketBasedDefaults(): MarketBasedDefaults {
  const { data: spotData } = useSpotRate();
  const { data: technicalData } = useTechnicalAnalysis({ period: 30 });
  const { data: multiAssetData } = useMultiAssetData(30);

  // Calculate expected return based on historical volatility and trend
  const calculateExpectedReturn = (): number => {
    if (!technicalData?.data) return 8; // Default fallback

    const { volatility, trend, momentum } = technicalData.data;

    // Base return from historical average (conservative estimate)
    let baseReturn = 6;

    // Adjust based on trend
    if (trend === "bullish") {
      baseReturn += 2;
    } else if (trend === "bearish") {
      baseReturn -= 1;
    }

    // Adjust based on momentum
    if (momentum > 2) {
      baseReturn += 1;
    } else if (momentum < -2) {
      baseReturn -= 1;
    }

    // Cap between 3% and 12%
    return Math.max(3, Math.min(12, baseReturn));
  };

  // Calculate risk tolerance based on market volatility
  const calculateRiskTolerance = ():
    | "conservative"
    | "moderate"
    | "aggressive" => {
    if (!technicalData?.data) return "moderate";

    const volatility = technicalData.data.volatility || 0;

    if (volatility > 8) return "conservative";
    if (volatility < 3) return "aggressive";
    return "moderate";
  };

  // Calculate portfolio allocation based on market conditions
  const calculatePortfolioAllocation = () => {
    const riskTolerance = calculateRiskTolerance();
    const volatility = technicalData?.data?.volatility || 5;

    // Base allocations
    let gold = 10;
    let stocks = 60;
    let bonds = 25;
    let cash = 5;

    // Adjust based on risk tolerance
    switch (riskTolerance) {
      case "conservative":
        gold = 15;
        stocks = 40;
        bonds = 35;
        cash = 10;
        break;
      case "aggressive":
        gold = 5;
        stocks = 75;
        bonds = 15;
        cash = 5;
        break;
    }

    // Adjust gold allocation based on volatility (higher volatility = more gold)
    if (volatility > 6) {
      gold += 5;
      stocks -= 3;
      bonds -= 2;
    }

    return { gold, stocks, bonds, cash };
  };

  // Calculate initial investment based on current gold price
  const calculateInitialInvestment = (): number => {
    if (!spotData?.usdPerOunce) return 10000;

    const goldPrice = spotData.usdPerOunce;

    // Suggest investment amount based on gold price
    // Higher gold price = suggest smaller initial investment
    if (goldPrice > 2000) {
      return 5000; // Conservative for high gold prices
    } else if (goldPrice > 1500) {
      return 7500; // Moderate
    } else {
      return 10000; // Standard
    }
  };

  // Calculate monthly contribution based on initial investment
  const calculateMonthlyContribution = (initialInvestment: number): number => {
    // Suggest 5-10% of initial investment as monthly contribution
    const percentage = initialInvestment > 20000 ? 0.05 : 0.08;
    return Math.round(initialInvestment * percentage);
  };

  // Calculate time horizon based on market cycle
  const calculateTimeHorizon = (): number => {
    if (!technicalData?.data) return 10;

    const { trend, momentum } = technicalData.data;

    // Longer horizon for bearish markets (buy and hold)
    if (trend === "bearish" || momentum < -2) {
      return 15;
    }

    // Shorter horizon for bullish markets (take profits)
    if (trend === "bullish" && momentum > 2) {
      return 7;
    }

    return 10; // Default
  };

  const portfolioAllocation = calculatePortfolioAllocation();
  const initialInvestment = calculateInitialInvestment();
  const monthlyContribution = calculateMonthlyContribution(initialInvestment);

  return {
    // Investment Calculator defaults
    initialInvestment,
    monthlyContribution,
    timeHorizon: calculateTimeHorizon(),
    expectedReturn: calculateExpectedReturn(),
    riskTolerance: calculateRiskTolerance(),

    // Portfolio allocation defaults
    goldAllocation: portfolioAllocation.gold,
    stocksAllocation: portfolioAllocation.stocks,
    bondsAllocation: portfolioAllocation.bonds,
    cashAllocation: portfolioAllocation.cash,

    // Risk calculator defaults (based on initial investment)
    portfolioValue: initialInvestment * 10, // Assume 10x portfolio
    positionSize: initialInvestment,
    stopLoss: calculateRiskTolerance() === "conservative" ? 3 : 5,
    riskPerTrade: calculateRiskTolerance() === "conservative" ? 1 : 2,
  };
}

/**
 * Calculate dynamic severity levels for market alerts
 */
export function calculateMarketSeverity(
  value: number,
  thresholds: { low: number; medium: number; high: number }
): "low" | "medium" | "high" {
  if (value >= thresholds.high) return "high";
  if (value >= thresholds.medium) return "medium";
  return "low";
}

/**
 * Calculate confidence level based on data quality and market conditions
 */
export function calculateConfidence(
  dataQuality: "excellent" | "good" | "fair" | "poor",
  marketStability: number // 0-1 scale
): number {
  const baseConfidence = {
    excellent: 95,
    good: 85,
    fair: 70,
    poor: 50,
  }[dataQuality];

  // Adjust based on market stability
  const stabilityAdjustment = marketStability * 10;

  return Math.max(50, Math.min(95, baseConfidence + stabilityAdjustment));
}
