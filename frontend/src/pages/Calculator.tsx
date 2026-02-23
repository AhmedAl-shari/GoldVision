import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getPrices, useSpotRate } from "../lib/api";
import { useMarketBasedDefaults } from "../lib/marketDefaults";
import { useSettings } from "../contexts/SettingsContext";
import { useLocale } from "../contexts/useLocale";
import GoldRateCalculator from "../components/GoldRateCalculator";
import {
  Calculator as CalcIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  PieChart,
  BarChart3,
  Target,
  Shield,
  Zap,
  Clock,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Brain,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Download,
  Save,
  Eye,
  Settings,
} from "lucide-react";
import { Line, Pie, Bar } from "react-chartjs-2";
import "../lib/chartSetup"; // Register Chart.js components
import { getThemeColors } from "../lib/chartOptions";
import toast from "react-hot-toast";
import {
  exportCalculatorToCsv,
  type GoldRateCalculatorExportData,
} from "../utils/csvExport";

interface InvestmentCalculation {
  initialInvestment: number;
  monthlyContribution: number;
  timeHorizon: number; // years
  expectedReturn: number; // annual %
  riskTolerance: "conservative" | "moderate" | "aggressive";
  compoundFrequency: "monthly" | "quarterly" | "annually";
}

interface PortfolioAllocation {
  gold: number;
  stocks: number;
  bonds: number;
  cash: number;
}

interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  var95: number;
  expectedReturn: number;
  riskScore: number;
  projectedLoss: number;
  riskAmountPerTrade: number;
}

const Calculator: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useLocale();

  // Get market-based defaults
  const marketDefaults = useMarketBasedDefaults();

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Gold Rate Calculator data for unified export (updated when user is on Gold Calculator tab)
  const [goldRateExportData, setGoldRateExportData] =
    useState<GoldRateCalculatorExportData | null>(null);

  // Get active tab from URL or default to "basic"
  const activeTab = (searchParams.get("tab") || "basic") as "basic" | "investment" | "risk" | "portfolio";
  
  // Handle tab change
  const handleTabChange = (tabId: "basic" | "investment" | "risk" | "portfolio") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams, { replace: true });
  };

  // Investment Calculator State
  const [investment, setInvestment] = useState<InvestmentCalculation>({
    initialInvestment: marketDefaults.initialInvestment,
    monthlyContribution: marketDefaults.monthlyContribution,
    timeHorizon: marketDefaults.timeHorizon,
    expectedReturn: marketDefaults.expectedReturn,
    riskTolerance: marketDefaults.riskTolerance,
    compoundFrequency: "monthly",
  });

  // Portfolio Allocation State
  const [portfolio, setPortfolio] = useState<PortfolioAllocation>({
    gold: marketDefaults.goldAllocation,
    stocks: marketDefaults.stocksAllocation,
    bonds: marketDefaults.bondsAllocation,
    cash: marketDefaults.cashAllocation,
  });

  // Risk Calculator State
  const [riskInputs, setRiskInputs] = useState({
    portfolioValue: marketDefaults.portfolioValue,
    positionSize: marketDefaults.positionSize,
    stopLoss: marketDefaults.stopLoss, // percentage
    riskPerTrade: marketDefaults.riskPerTrade, // percentage of portfolio
    leverage: 1,
  });

  // Fetch current gold price for calculations
  const { data: pricesData } = useQuery({
    queryKey: ["calculator-prices", settings.asset, settings.currency],
    queryFn: () =>
      getPrices({
        asset: settings.asset,
        currency: settings.currency,
        limit: 30,
      }),
    refetchInterval: 60000,
  });

  const { data: spotData } = useSpotRate();

  const priceSeries = useMemo(() => {
    const hasSufficientHistory =
      Array.isArray(pricesData?.prices) && pricesData.prices.length >= 10;

    if (hasSufficientHistory) {
      return [...(pricesData?.prices ?? [])]
        .filter((entry) => typeof entry?.price === "number")
        .sort((a, b) => {
          const aTime = a?.ds ? new Date(a.ds).getTime() : 0;
          const bTime = b?.ds ? new Date(b.ds).getTime() : 0;
          return aTime - bTime;
        });
    }

    const basePrice =
      typeof spotData?.price === "number"
        ? spotData.price
        : typeof spotData?.usdPerOunce === "number"
        ? spotData.usdPerOunce
        : null;

    if (!basePrice) {
      return [] as Array<{ ds: string; price: number }>;
    }

    return Array.from({ length: 30 }, (_, idx) => {
      const daysAgo = 29 - idx;
      const timestamp = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
      const seasonal = Math.sin(idx / 3) * 0.012 + Math.cos(idx / 5) * 0.008;
      const price = Math.max(basePrice * (1 + seasonal), 0.01);
      return {
        ds: new Date(timestamp).toISOString(),
        price,
      };
    });
  }, [pricesData?.prices, spotData?.price, spotData?.usdPerOunce]);

  // Investment Growth Calculation
  const investmentProjection = useMemo(() => {
    const {
      initialInvestment,
      monthlyContribution,
      timeHorizon,
      expectedReturn,
      compoundFrequency,
    } = investment;

    const monthlyRate = expectedReturn / 100 / 12;
    const totalMonths = timeHorizon * 12;
    const compoundsPerYear =
      compoundFrequency === "monthly"
        ? 12
        : compoundFrequency === "quarterly"
        ? 4
        : 1;
    const periodicRate = expectedReturn / 100 / compoundsPerYear;

    const projectionData = [];
    let currentValue = initialInvestment;
    let totalContributions = initialInvestment;

    for (let year = 0; year <= timeHorizon; year++) {
      if (year > 0) {
        // Compound growth
        currentValue =
          currentValue * Math.pow(1 + periodicRate, compoundsPerYear);

        // Add monthly contributions with growth
        const annualContributions = monthlyContribution * 12;
        const futureValueOfAnnuity =
          (annualContributions * (Math.pow(1 + monthlyRate, 12) - 1)) /
          monthlyRate;
        currentValue += futureValueOfAnnuity;
        totalContributions += annualContributions;
      }

      projectionData.push({
        year,
        value: Math.round(currentValue),
        contributions: Math.round(totalContributions),
        growth: Math.round(currentValue - totalContributions),
      });
    }

    return projectionData;
  }, [investment]);

  // Risk Metrics Calculation
  const riskMetrics: RiskMetrics = useMemo(() => {
    if (!priceSeries.length || priceSeries.length < 10) {
      return {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        var95: 0,
        expectedReturn: 0,
        riskScore: 0,
        projectedLoss: (riskInputs.portfolioValue * riskInputs.stopLoss) / 100,
        riskAmountPerTrade:
          (riskInputs.portfolioValue * riskInputs.riskPerTrade) / 100,
      } as RiskMetrics & {
        projectedLoss: number;
        riskAmountPerTrade: number;
      };
    }

    const prices = priceSeries.map((p) => p.price);
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const previous = prices[i - 1];
      const current = prices[i];
      returns.push((current - previous) / previous);
    }

    const stopLossFraction = Math.max(riskInputs.stopLoss, 0.25) / 100; // prevent divide-by-zero

    const adjustedReturns = returns.map((ret) =>
      Math.max(ret, -stopLossFraction)
    );

    const avgReturn =
      adjustedReturns.reduce((a, b) => a + b, 0) / adjustedReturns.length;
    const variance =
      adjustedReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) /
      adjustedReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    const sortedReturns = [...adjustedReturns].sort((a, b) => a - b);
    const var95 =
      Math.abs(sortedReturns[Math.floor(sortedReturns.length * 0.05)]) * 100;

    const riskFreeRate = 0.02; // 2% risk-free rate
    const excessReturn = avgReturn * 252 - riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / (volatility / 100) : 0;

    const adjustedPrices: number[] = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
      const prior = adjustedPrices[i - 1];
      adjustedPrices.push(prior * (1 + adjustedReturns[i - 1]));
    }

    let maxDrawdown = 0;
    let peak = adjustedPrices[0];

    for (let i = 1; i < adjustedPrices.length; i++) {
      if (adjustedPrices[i] > peak) peak = adjustedPrices[i];
      const drawdown = ((peak - adjustedPrices[i]) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const riskScore = Math.min(
      100,
      Math.max(
        0,
        100 -
          (volatility * 2 +
            var95 * 3 +
            maxDrawdown +
            riskInputs.riskPerTrade * 5)
      )
    );

    const projectedLoss =
      (riskInputs.portfolioValue * riskInputs.stopLoss) / 100;
    const riskAmountPerTrade =
      (riskInputs.portfolioValue * riskInputs.riskPerTrade) / 100;

    return {
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      var95: Math.round(var95 * 100) / 100,
      expectedReturn: Math.round(avgReturn * 252 * 100 * 100) / 100,
      riskScore: Math.round(riskScore),
      projectedLoss,
      riskAmountPerTrade,
    } as RiskMetrics & {
      projectedLoss: number;
      riskAmountPerTrade: number;
    };
  }, [
    priceSeries,
    riskInputs.portfolioValue,
    riskInputs.riskPerTrade,
    riskInputs.stopLoss,
  ]);

  // Position Size Calculator
  const positionSizing = useMemo(() => {
    const { portfolioValue, riskPerTrade, stopLoss } = riskInputs;
    const riskAmount = (portfolioValue * riskPerTrade) / 100;
    const maxPositionSize = (riskAmount / stopLoss) * 100;
    const recommendedSize = Math.min(maxPositionSize, portfolioValue * 0.1); // Max 10% of portfolio
    const latestPrice = priceSeries.at(-1)?.price;

    return {
      riskAmount,
      maxPositionSize: Math.round(maxPositionSize),
      recommendedSize: Math.round(recommendedSize),
      sharesAffordable:
        latestPrice && latestPrice > 0
          ? Math.floor(recommendedSize / latestPrice)
          : 0,
    };
  }, [riskInputs, priceSeries]);

  // Chart configurations
  const isDark = document.documentElement.classList.contains("dark");
  const colors = getThemeColors(isDark);

  const investmentChartData = {
    labels: investmentProjection.map((p) => `Year ${p.year}`),
    datasets: [
      {
        label: "Total Value",
        data: investmentProjection.map((p) => p.value),
        borderColor: colors.primary,
        backgroundColor: colors.primary + "20",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Total Contributions",
        data: investmentProjection.map((p) => p.contributions),
        borderColor: colors.secondary,
        backgroundColor: colors.secondary + "20",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const portfolioChartData = {
    labels: ["Gold", "Stocks", "Bonds", "Cash"],
    datasets: [
      {
        data: [
          portfolio.gold,
          portfolio.stocks,
          portfolio.bonds,
          portfolio.cash,
        ],
        backgroundColor: [
          "#F59E0B", // Gold
          "#10B981", // Green for stocks
          "#3B82F6", // Blue for bonds
          "#6B7280", // Gray for cash
        ],
        borderWidth: 2,
        borderColor: colors.background,
      },
    ],
  };

  const getRiskColor = (score: number) => {
    if (score > 70) return "text-green-600 bg-green-100 dark:bg-green-900/20";
    if (score > 40)
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
    return "text-red-600 bg-red-100 dark:bg-red-900/20";
  };

  const formatCurrency = (amount: number) => {
    return settings.currency === "YER"
      ? `${amount.toLocaleString()} YER`
      : `$${amount.toLocaleString()}`;
  };

  const glassPanel =
    "relative overflow-hidden rounded-3xl border border-slate-200/40 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/50";

  return (
    <div className="space-y-12">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#calculator" className="skip-link">
        Skip to calculator
      </a>
      <a href="#analysis" className="skip-link">
        Skip to analysis
      </a>

      {/* Enhanced Header */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-[1px] shadow-2xl"
        role="banner"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-teal-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg">
                  <CalcIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Investment & Risk Calculator Suite
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Professional-grade financial calculators for investment
                    planning, risk management, and portfolio optimization
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Gold:{" "}
                    {spotData?.usdPerOunce
                      ? formatCurrency(spotData.usdPerOunce)
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Risk Score: {riskMetrics.riskScore}/100
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sharpe Ratio: {riskMetrics.sharpeRatio}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    VaR 95%: {riskMetrics.var95}%
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const data = {
                    investment,
                    portfolio,
                    riskInputs,
                    riskMetrics,
                    timestamp: new Date().toISOString(),
                    goldRate: goldRateExportData ?? undefined,
                  };
                  const dateStr = new Date().toISOString().split("T")[0];
                  exportCalculatorToCsv(
                    data as Parameters<typeof exportCalculatorToCsv>[0],
                    `goldvision-calculations-${dateStr}.csv`
                  );
                  toast.success("Calculations exported as CSV!");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation - Glassmorphic Style */}
      <div className="flex justify-center">
        <div className="relative inline-flex rounded-2xl border border-slate-200/60 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/60 p-1.5 shadow-lg backdrop-blur-sm">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-emerald-500/5 pointer-events-none" />

          <div className="relative inline-flex gap-1 flex-wrap justify-center">
            {[
              {
                id: "basic",
                label: "Gold Calculator",
                icon: <CalcIcon className="h-4 w-4" />,
              },
              {
                id: "investment",
                label: "Investment Planner",
                icon: <TrendingUp className="h-4 w-4" />,
              },
              {
                id: "risk",
                label: "Risk Manager",
                icon: <Shield className="h-4 w-4" />,
              },
              {
                id: "portfolio",
                label: "Portfolio Optimizer",
                icon: <PieChart className="h-4 w-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as "basic" | "investment" | "risk" | "portfolio")}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                  activeTab === tab.id
                    ? "text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {activeTab === tab.id && (
                  <span
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 shadow-md"
                    aria-hidden="true"
                  />
                )}
                {activeTab !== tab.id && (
                  <span className="absolute inset-0 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" role="main" className="space-y-8">
        <section
          id="calculator"
          aria-label="Calculator tools"
          className="space-y-6"
        >
          {/* Tab Content */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div className={`${glassPanel}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/20 rounded-xl ring-1 ring-amber-400/40">
                      <CalcIcon className="h-5 w-5 text-amber-600 dark:text-amber-200" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Gold Rate Calculator
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("goldCalculatorDescription") ||
                          "Convert weights, units, and purity with live pricing."}
                      </p>
                    </div>
                  </div>
                  <GoldRateCalculator onExportData={setGoldRateExportData} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "investment" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Investment Parameters */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-blue-500/6 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-500/20 rounded-xl ring-1 ring-blue-400/40">
                        <Settings className="h-5 w-5 text-blue-600 dark:text-blue-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Investment Parameters
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Configure contributions, horizon, and risk tolerance.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Initial Investment
                        </label>
                        <input
                          type="number"
                          value={investment.initialInvestment}
                          onChange={(e) =>
                            setInvestment({
                              ...investment,
                              initialInvestment: Number(e.target.value),
                            })
                          }
                          className="form-input w-full"
                          min="0"
                          step="1000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Monthly Contribution
                        </label>
                        <input
                          type="number"
                          value={investment.monthlyContribution}
                          onChange={(e) =>
                            setInvestment({
                              ...investment,
                              monthlyContribution: Number(e.target.value),
                            })
                          }
                          className="form-input w-full"
                          min="0"
                          step="100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Time Horizon (Years)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          value={investment.timeHorizon}
                          onChange={(e) =>
                            setInvestment({
                              ...investment,
                              timeHorizon: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                          <span>1 year</span>
                          <span className="font-medium">
                            {investment.timeHorizon} years
                          </span>
                          <span>40 years</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Expected Annual Return (%)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={investment.expectedReturn}
                          onChange={(e) =>
                            setInvestment({
                              ...investment,
                              expectedReturn: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                          <span>1%</span>
                          <span className="font-medium">
                            {investment.expectedReturn}%
                          </span>
                          <span>20%</span>
                        </div>
                      </div>

                      {/* Risk Tolerance hidden - not in use */}
                    </div>
                  </div>
                </div>

                {/* Investment Projection */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-xl ring-1 ring-emerald-400/40">
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Investment Projection
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Visualize future value, growth, and contributions.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
                      <div className="text-center rounded-2xl border border-blue-200/60 bg-blue-50/70 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-200">
                          {formatCurrency(
                            investmentProjection[
                              investmentProjection.length - 1
                            ]?.value || 0
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Final Value
                        </p>
                      </div>
                      <div className="text-center rounded-2xl border border-green-200/60 bg-green-50/70 p-4 dark:border-green-800/50 dark:bg-green-900/20">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-200">
                          {formatCurrency(
                            investmentProjection[
                              investmentProjection.length - 1
                            ]?.growth || 0
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Growth
                        </p>
                      </div>
                      <div className="text-center rounded-2xl border border-purple-200/60 bg-purple-50/70 p-4 dark:border-purple-800/50 dark:bg-purple-900/20">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-200">
                          {formatCurrency(
                            investmentProjection[
                              investmentProjection.length - 1
                            ]?.contributions || 0
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Contributions
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                      <Line
                        data={investmentChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: "bottom" as const,
                            },
                          },
                          scales: {
                            x: {
                              grid: { color: "rgba(148, 163, 184, 0.15)" },
                            },
                            y: {
                              grid: { color: "rgba(148, 163, 184, 0.15)" },
                              ticks: {
                                callback: (value: number | string) =>
                                  formatCurrency(Number(value)),
                              },
                            },
                          },
                        }}
                        height={280}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "risk" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Management Tools */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/12 via-rose-500/5 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-rose-500/20 rounded-xl ring-1 ring-rose-400/40">
                        <Shield className="h-5 w-5 text-rose-600 dark:text-rose-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Risk Management Tools
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Size positions and set guardrails around capital at
                          risk.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Portfolio Value
                        </label>
                        <input
                          type="number"
                          value={riskInputs.portfolioValue}
                          onChange={(e) =>
                            setRiskInputs({
                              ...riskInputs,
                              portfolioValue: Number(e.target.value),
                            })
                          }
                          className="form-input w-full"
                          min="0"
                          step="1000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Risk Per Trade (%)
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="10"
                          step="0.5"
                          value={riskInputs.riskPerTrade}
                          onChange={(e) =>
                            setRiskInputs({
                              ...riskInputs,
                              riskPerTrade: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                          <span>0.5%</span>
                          <span className="font-medium">
                            {riskInputs.riskPerTrade}%
                          </span>
                          <span>10%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Stop Loss (%)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={riskInputs.stopLoss}
                          onChange={(e) =>
                            setRiskInputs({
                              ...riskInputs,
                              stopLoss: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                          <span>1%</span>
                          <span className="font-medium">
                            {riskInputs.stopLoss}%
                          </span>
                          <span>20%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-amber-500/20 rounded-xl ring-1 ring-amber-400/40">
                        <Activity className="h-5 w-5 text-amber-600 dark:text-amber-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Risk Analysis
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Key volatility metrics, drawdowns, and scenario tests.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {riskMetrics.volatility}%
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Volatility
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {riskMetrics.sharpeRatio}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Sharpe Ratio
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {riskMetrics.maxDrawdown}%
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Max Drawdown
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {riskMetrics.var95}%
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            VaR (95%)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/80 p-3 text-center shadow-sm dark:border-rose-700/60 dark:bg-rose-900/40">
                          <div className="text-lg font-bold text-rose-600 dark:text-rose-200">
                            {formatCurrency(riskMetrics.projectedLoss)}
                          </div>
                          <p className="text-xs text-rose-700 dark:text-rose-200">
                            Max Loss @ Stop ({riskInputs.stopLoss}%)
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-3 text-center shadow-sm dark:border-emerald-700/60 dark:bg-emerald-900/40">
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-200">
                            {formatCurrency(riskMetrics.riskAmountPerTrade)}
                          </div>
                          <p className="text-xs text-emerald-700 dark:text-emerald-200">
                            Risk Amount Per Trade ({riskInputs.riskPerTrade}%)
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                        <Bar
                          data={{
                            labels: ["Volatility", "Drawdown", "VaR"],
                            datasets: [
                              {
                                label: "Risk Factors",
                                data: [
                                  riskMetrics.volatility,
                                  riskMetrics.maxDrawdown,
                                  riskMetrics.var95,
                                ],
                                backgroundColor: [
                                  "rgba(59,130,246,0.6)",
                                  "rgba(234,179,8,0.6)",
                                  "rgba(239,68,68,0.6)",
                                ],
                                borderRadius: 10,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              x: {
                                grid: { color: "rgba(148, 163, 184, 0.15)" },
                              },
                              y: {
                                grid: { color: "rgba(148, 163, 184, 0.15)" },
                              },
                            },
                          }}
                          height={200}
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getRiskColor(
                              riskMetrics.riskScore
                            )}`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Risk Score: {riskMetrics.riskScore}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Higher scores indicate lower overall risk.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Portfolio Allocation */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/12 via-purple-500/5 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-500/20 rounded-xl ring-1 ring-purple-400/40">
                        <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Portfolio Allocation
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Adjust exposures across asset classes with live
                          totals.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(portfolio).map(([asset, percentage]) => (
                        <div key={asset}>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                              {asset}
                            </label>
                            <span className="text-sm font-medium">
                              {percentage}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={percentage}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              const total =
                                Object.values(portfolio).reduce(
                                  (a, b) => a + b,
                                  0
                                ) -
                                percentage +
                                newValue;
                              if (total <= 100) {
                                setPortfolio({
                                  ...portfolio,
                                  [asset]: newValue,
                                });
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                      ))}

                      <div className="mt-4 rounded-2xl border border-blue-200/60 bg-blue-50/70 p-3 dark:border-blue-800/50 dark:bg-blue-900/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Total Allocation:
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              Object.values(portfolio).reduce(
                                (a, b) => a + b,
                                0
                              ) === 100
                                ? "text-emerald-600"
                                : "text-rose-500"
                            }`}
                          >
                            {Object.values(portfolio).reduce(
                              (a, b) => a + b,
                              0
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Visualization */}
                  <div className={`${glassPanel}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/12 via-indigo-500/5 to-transparent" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-400/40">
                          <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-200" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Portfolio Visualization
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Review allocation mix and suggested portfolio
                            blends.
                          </p>
                        </div>
                      </div>

                      <div
                        style={{ height: "300px" }}
                        className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                      >
                        <Pie
                          data={portfolioChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              title: {
                                display: true,
                                text: "Asset Allocation",
                                color: colors.text,
                              },
                              legend: {
                                position: "bottom",
                                labels: { color: colors.text },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portfolio Recommendations */}
                <div className={`${glassPanel}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-xl ring-1 ring-emerald-400/40">
                        <Brain className="h-5 w-5 text-emerald-600 dark:text-emerald-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          AI Portfolio Recommendations
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          One-click allocation presets tuned for different risk
                          profiles.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-200/60 bg-white/80 p-4 shadow-sm dark:border-emerald-700/50 dark:bg-emerald-900/40">
                        <h4 className="mb-2 font-semibold text-emerald-700 dark:text-emerald-200">
                          Conservative Portfolio
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Gold:</span>
                            <span>30%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bonds:</span>
                            <span>40%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stocks:</span>
                            <span>20%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span>10%</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setPortfolio({
                              gold: 30,
                              stocks: 20,
                              bonds: 40,
                              cash: 10,
                            })
                          }
                          className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
                        >
                          Apply
                        </button>
                      </div>

                      <div className="rounded-2xl border border-blue-200/60 bg-white/80 p-4 shadow-sm dark:border-blue-700/50 dark:bg-blue-900/30">
                        <h4 className="mb-2 font-semibold text-blue-700 dark:text-blue-200">
                          Balanced Portfolio
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Gold:</span>
                            <span>25%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stocks:</span>
                            <span>50%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bonds:</span>
                            <span>20%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span>5%</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setPortfolio({
                              gold: 25,
                              stocks: 50,
                              bonds: 20,
                              cash: 5,
                            })
                          }
                          className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500"
                        >
                          Apply
                        </button>
                      </div>

                      <div className="rounded-2xl border border-rose-200/60 bg-white/80 p-4 shadow-sm dark:border-rose-700/50 dark:bg-rose-900/30">
                        <h4 className="mb-2 font-semibold text-rose-700 dark:text-rose-200">
                          Aggressive Portfolio
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Gold:</span>
                            <span>15%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stocks:</span>
                            <span>70%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bonds:</span>
                            <span>10%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span>5%</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setPortfolio({
                              gold: 15,
                              stocks: 70,
                              bonds: 10,
                              cash: 5,
                            })
                          }
                          className="mt-3 w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-rose-500"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Calculator;
