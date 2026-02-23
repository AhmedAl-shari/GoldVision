import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getPrices, postForecast, useTechnicalAnalysis } from "../lib/api";
import { SkeletonChart, SkeletonCard } from "../components/SkeletonLoader";
import ForecastChart from "../components/ForecastChart";
import BacktestAnalysis from "../components/BacktestAnalysis";
import ModelComparison from "../components/ModelComparison";
import Simulator from "../components/Simulator";
import TimeSeriesExplorer from "../components/TimeSeriesExplorer";
import ChatDock from "../components/ChatDock";
import AccuracyTab from "../components/AccuracyTab";
import EnhancedForecastPanel from "../components/EnhancedForecastPanel";
import { useSettings, getAssetLabel } from "../contexts/SettingsContext";
import { useLocale } from "../contexts/useLocale";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  Gauge,
  Target,
  Zap,
  Brain,
  Settings,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import toast from "react-hot-toast";

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: "buy" | "sell" | "neutral";
  description: string;
  strength: "weak" | "moderate" | "strong";
}

interface MarketAnalysis {
  trend: "bullish" | "bearish" | "neutral";
  momentum: number;
  volatility: number;
  support: number;
  resistance: number;
  indicators: TechnicalIndicator[];
  sentiment: "fear" | "greed" | "neutral";
  recommendation: "buy" | "sell" | "hold";
}

const Trends = () => {
  const { settings } = useSettings();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL or default to "accuracy"
  const activeTab = searchParams.get("tab") || "accuracy";
  const accuracySectionParam = searchParams.get("section") || "overview";

  // Initialize accuracySection from URL, but only when tab is "accuracy"
  const [accuracySection, setAccuracySection] = useState<
    "overview" | "backtest"
  >(accuracySectionParam === "backtest" ? "backtest" : "overview");

  // Sync accuracySection state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (activeTab === "accuracy") {
      const section =
        accuracySectionParam === "backtest" ? "backtest" : "overview";
      if (section !== accuracySection) {
        setAccuracySection(section);
      }
    }
  }, [activeTab, accuracySectionParam]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    // Reset section when switching tabs
    if (tabId === "accuracy") {
      newParams.set("section", "overview");
      setAccuracySection("overview");
    } else {
      newParams.delete("section");
    }
    setSearchParams(newParams, { replace: true });
  };

  // Handle accuracy section change
  const handleAccuracySectionChange = (section: "overview" | "backtest") => {
    setAccuracySection(section);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "accuracy");
    newParams.set("section", section);
    setSearchParams(newParams, { replace: true });
  };
  const [showChat, setShowChat] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    "RSI",
    "MACD",
    "BB",
  ]);
  const [showTechnicalAnalysis, setShowTechnicalAnalysis] = useState(false);
  const [analysisTimeframe, setAnalysisTimeframe] = useState<
    "1D" | "1W" | "1M"
  >("1W");

  // Feature-specific analysis periods
  const [forecastPeriod, setForecastPeriod] = useState(7); // 7 days for MVP Forecast
  const [accuracyPeriod, setAccuracyPeriod] = useState(180); // 6 months for Accuracy Analysis
  const [comparisonPeriod, setComparisonPeriod] = useState(365); // 1 year for Model Comparison
  const [simulatorPeriod, setSimulatorPeriod] = useState(90); // 3 months for Monte Carlo
  const [enhancedForecastPeriod, setEnhancedForecastPeriod] = useState(7); // 7 days for Enhanced Forecast

  // Get current period based on active tab
  const getCurrentPeriod = () => {
    switch (activeTab) {
      case "forecast":
        return forecastPeriod;
      case "accuracy":
        return accuracyPeriod;
      case "comparison":
        return comparisonPeriod;
      case "simulator":
        return simulatorPeriod;
      case "enhanced-forecast":
        return enhancedForecastPeriod;
      default:
        return forecastPeriod;
    }
  };

  // Set current period based on active tab
  const setCurrentPeriod = (period: number) => {
    switch (activeTab) {
      case "forecast":
        setForecastPeriod(period);
        break;
      case "accuracy":
        setAccuracyPeriod(period);
        break;
      case "comparison":
        setComparisonPeriod(period);
        break;
      case "simulator":
        setSimulatorPeriod(period);
        break;
      case "enhanced-forecast":
        setEnhancedForecastPeriod(period);
        break;
    }
  };

  // Fetch historical prices with configurable range
  const {
    data: pricesData,
    isLoading: pricesLoading,
    error: pricesError,
  } = useQuery({
    queryKey: [
      "prices-trends",
      getCurrentPeriod(),
      settings.asset,
      settings.currency,
    ],
    queryFn: () => {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - getCurrentPeriod());
      return getPrices({
        asset: settings.asset,
        currency: settings.currency,
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
        limit: 200,
      });
    },
    refetchInterval: 60000,
  });

  // Get technical analysis data for indicators
  const {
    data: technicalData,
    isLoading: technicalLoading,
    error: technicalError,
  } = useTechnicalAnalysis({ period: 14, limit: 50 });

  // Generate forecast with history
  const {
    data: forecastData,
    isLoading: forecastLoading,
    error: forecastError,
  } = useQuery({
    queryKey: [
      "forecast-trends",
      getCurrentPeriod(),
      settings.asset,
      settings.currency,
    ],
    queryFn: () => {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - getCurrentPeriod());
      return postForecast({
        asset: settings.asset,
        currency: settings.currency,
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
        horizon_days: 7,
        include_history: true,
      });
    },
    enabled: !!pricesData,
    refetchInterval: 300000,
  });

  // Calculate advanced technical analysis
  const marketAnalysis: MarketAnalysis = useMemo(() => {
    if (!pricesData?.prices || pricesData.prices.length < 5) {
      return {
        trend: "neutral",
        momentum: 0,
        volatility: 0,
        support: 0,
        resistance: 0,
        indicators: [],
        sentiment: "neutral",
        recommendation: "hold",
      };
    }

    const prices = pricesData.prices.map((p) => p.price);
    const availablePrices = Math.min(prices.length, 20);
    const recentPrices = prices.slice(0, availablePrices); // Use available data (up to 20 days)

    // Calculate basic metrics
    const avg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const variance =
      recentPrices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) /
      recentPrices.length;
    const volatility = (Math.sqrt(variance) / avg) * 100;
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);

    // Calculate RSI (adapt period to available data, minimum 2 periods)
    const rsiPeriod = Math.min(14, recentPrices.length - 1);
    let rsi = 50; // Default neutral RSI

    if (recentPrices.length >= 2 && rsiPeriod >= 2) {
      let gains = 0;
      let losses = 0;

      // Calculate initial average gain and loss
      const actualPeriod = Math.min(rsiPeriod, recentPrices.length - 1);
      for (let i = 1; i <= actualPeriod; i++) {
        const change = recentPrices[i - 1] - recentPrices[i];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }

      if (actualPeriod > 0) {
        let avgGain = gains / actualPeriod;
        let avgLoss = losses / actualPeriod;

        // Calculate smoothed averages for remaining periods
        for (let i = actualPeriod + 1; i < recentPrices.length; i++) {
          const change = recentPrices[i - 1] - recentPrices[i];
          const gain = change > 0 ? change : 0;
          const loss = change < 0 ? Math.abs(change) : 0;

          avgGain = (avgGain * (actualPeriod - 1) + gain) / actualPeriod;
          avgLoss = (avgLoss * (actualPeriod - 1) + loss) / actualPeriod;
        }

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
      }
    }

    // Calculate MACD (adapt to available data)
    const ema12Period = Math.min(12, recentPrices.length);
    const ema26Period = Math.min(26, recentPrices.length);
    const ema12 =
      recentPrices.slice(0, ema12Period).reduce((a, b) => a + b, 0) /
      ema12Period;
    const ema26 =
      recentPrices.slice(0, ema26Period).reduce((a, b) => a + b, 0) /
      ema26Period;
    const macd = ema12 - ema26;

    // Calculate Bollinger Bands (adapt to available data)
    const smaPeriod = Math.min(20, recentPrices.length);
    const sma20 =
      recentPrices.slice(0, smaPeriod).reduce((a, b) => a + b, 0) / smaPeriod;
    const stdDev = Math.sqrt(
      recentPrices
        .slice(0, smaPeriod)
        .reduce((a, b) => a + Math.pow(b - sma20, 2), 0) / smaPeriod,
    );
    const upperBB = sma20 + 2 * stdDev;
    const lowerBB = sma20 - 2 * stdDev;
    const currentPrice = recentPrices[0];
    const bbPosition =
      upperBB - lowerBB !== 0
        ? (currentPrice - lowerBB) / (upperBB - lowerBB)
        : 0.5;

    // Calculate Stochastic Oscillator (adapt to available data)
    const stochPeriod = Math.min(14, recentPrices.length);
    const highestHigh = Math.max(...recentPrices.slice(0, stochPeriod));
    const lowestLow = Math.min(...recentPrices.slice(0, stochPeriod));
    const stochastic =
      highestHigh - lowestLow !== 0
        ? ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100
        : 50;

    // Calculate Williams %R
    const williamsR =
      highestHigh - lowestLow !== 0
        ? ((highestHigh - currentPrice) / (highestHigh - lowestLow)) * -100
        : -50;

    // Calculate momentum (adapt to available data)
    const momentumPeriod = Math.min(9, recentPrices.length - 1);
    const momentum =
      momentumPeriod > 0 && recentPrices[momentumPeriod] !== 0
        ? ((recentPrices[0] - recentPrices[momentumPeriod]) /
            recentPrices[momentumPeriod]) *
          100
        : 0;

    // Determine trend
    let trend: "bullish" | "bearish" | "neutral" = "neutral";
    if (momentum > 2 && rsi > 50) trend = "bullish";
    else if (momentum < -2 && rsi < 50) trend = "bearish";

    // Determine sentiment
    let sentiment: "fear" | "greed" | "neutral" = "neutral";
    if (rsi > 70 && volatility > 5) sentiment = "greed";
    else if (rsi < 30 && volatility > 5) sentiment = "fear";

    // Create technical indicators array
    const indicators: TechnicalIndicator[] = [
      {
        name: "RSI",
        value: Math.round(rsi * 100) / 100,
        signal: rsi > 70 ? "sell" : rsi < 30 ? "buy" : "neutral",
        description:
          rsi > 70
            ? "Overbought - potential sell signal"
            : rsi < 30
              ? "Oversold - potential buy signal"
              : "Neutral territory",
        strength:
          Math.abs(rsi - 50) > 20
            ? "strong"
            : Math.abs(rsi - 50) > 10
              ? "moderate"
              : "weak",
      },
      {
        name: "MACD",
        value: Math.round(macd * 100) / 100,
        signal: macd > 0 ? "buy" : macd < 0 ? "sell" : "neutral",
        description: macd > 0 ? "Bullish momentum" : "Bearish momentum",
        strength:
          Math.abs(macd) > 10
            ? "strong"
            : Math.abs(macd) > 5
              ? "moderate"
              : "weak",
      },
      {
        name: "Bollinger Bands",
        value: Math.round(bbPosition * 100),
        signal:
          bbPosition > 0.8 ? "sell" : bbPosition < 0.2 ? "buy" : "neutral",
        description:
          bbPosition > 0.8
            ? "Near upper band - overbought"
            : bbPosition < 0.2
              ? "Near lower band - oversold"
              : "Within normal range",
        strength:
          bbPosition > 0.9 || bbPosition < 0.1
            ? "strong"
            : bbPosition > 0.7 || bbPosition < 0.3
              ? "moderate"
              : "weak",
      },
      {
        name: "Stochastic",
        value: Math.round(stochastic * 100) / 100,
        signal: stochastic > 80 ? "sell" : stochastic < 20 ? "buy" : "neutral",
        description:
          stochastic > 80
            ? "Overbought conditions"
            : stochastic < 20
              ? "Oversold conditions"
              : "Neutral momentum",
        strength:
          stochastic > 90 || stochastic < 10
            ? "strong"
            : stochastic > 70 || stochastic < 30
              ? "moderate"
              : "weak",
      },
      {
        name: "Williams %R",
        value: Math.round(williamsR * 100) / 100,
        signal: williamsR > -20 ? "sell" : williamsR < -80 ? "buy" : "neutral",
        description:
          williamsR > -20
            ? "Overbought territory"
            : williamsR < -80
              ? "Oversold territory"
              : "Normal range",
        strength:
          williamsR > -10 || williamsR < -90
            ? "strong"
            : williamsR > -30 || williamsR < -70
              ? "moderate"
              : "weak",
      },
    ];

    // Determine overall recommendation
    const buySignals = indicators.filter((i) => i.signal === "buy").length;
    const sellSignals = indicators.filter((i) => i.signal === "sell").length;
    let recommendation: "buy" | "sell" | "hold" = "hold";
    if (buySignals > sellSignals && buySignals >= 3) recommendation = "buy";
    else if (sellSignals > buySignals && sellSignals >= 3)
      recommendation = "sell";

    return {
      trend,
      momentum: Math.round(momentum * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      support,
      resistance,
      indicators,
      sentiment,
      recommendation,
    };
  }, [pricesData?.prices]);

  // Map historical data from forecast response or prices data
  const historicalData =
    forecastData?.history?.map((item) => ({
      ds: item.date || item.ds,
      price: item.price,
    })) ||
    pricesData?.prices?.map((item) => ({
      ds: item.ds,
      price: item.price,
    })) ||
    [];

  // Map forecast data
  const forecast =
    forecastData?.forecast?.map((item) => ({
      ds: item.ds,
      yhat: item.yhat,
      yhat_lower: item.yhat_lower,
      yhat_upper: item.yhat_upper,
    })) || [];

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "buy":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20";
      case "sell":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "border-l-4 border-l-red-500";
      case "moderate":
        return "border-l-4 border-l-yellow-500";
      default:
        return "border-l-4 border-l-gray-300";
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "buy":
        return "bg-green-600 text-white";
      case "sell":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  if (pricesLoading || forecastLoading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (pricesError || forecastError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error loading data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {pricesError?.message || forecastError?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#charts" className="skip-link">
        Skip to charts
      </a>
      <a href="#analysis" className="skip-link">
        Skip to analysis
      </a>

      {/* Enhanced Header */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-[1px] shadow-2xl"
        role="banner"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Advanced Market Trends & Analysis
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Professional-grade technical analysis with AI-powered
                    forecasting and market insights
                  </p>
                </div>
              </div>

              {/* Market Summary */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      (technicalData?.data?.trend ?? marketAnalysis.trend) ===
                      "bullish"
                        ? "bg-green-500"
                        : (technicalData?.data?.trend ??
                              marketAnalysis.trend) === "bearish"
                          ? "bg-red-500"
                          : "bg-gray-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {(technicalData?.data?.trend ?? marketAnalysis.trend)
                      .charAt(0)
                      .toUpperCase() +
                      (
                        technicalData?.data?.trend ?? marketAnalysis.trend
                      ).slice(1)}{" "}
                    Trend
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Activity className="h-4 w-4" />
                  <span>
                    Vol:{" "}
                    {(
                      technicalData?.data?.volatility ??
                      marketAnalysis.volatility
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <Target className="h-4 w-4" />
                  <span>
                    RSI:{" "}
                    {(
                      technicalData?.data?.rsi ??
                      marketAnalysis.indicators.find((i) => i.name === "RSI")
                        ?.value ??
                      0
                    ).toFixed(1)}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${getRecommendationColor(
                    marketAnalysis.recommendation,
                  )}`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{marketAnalysis.recommendation.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowTechnicalAnalysis(!showTechnicalAnalysis)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  showTechnicalAnalysis
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Brain className="h-4 w-4" />
                Technical Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Technical Analysis Panel */}
      {showTechnicalAnalysis && (
        <section className="relative overflow-hidden rounded-3xl border border-green-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-green-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/12 via-blue-500/6 to-green-500/10" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-green-500/15 p-3 ring-1 ring-green-400/40">
                  <Gauge className="h-5 w-5 text-green-600 dark:text-green-200" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Technical Indicators Dashboard
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Comprehensive technical analysis with real-time indicators
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={analysisTimeframe}
                  onChange={(e) =>
                    setAnalysisTimeframe(e.target.value as "1D" | "1W" | "1M")
                  }
                  className={`form-input text-sm ${
                    typeof document !== "undefined" &&
                    document.documentElement.classList.contains("dark")
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <option value="1D">1 Day</option>
                  <option value="1W">1 Week</option>
                  <option value="1M">1 Month</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketAnalysis.indicators.map((indicator, index) => {
                const isDark =
                  typeof document !== "undefined"
                    ? document.documentElement.classList.contains("dark")
                    : false;
                const signalPalette =
                  indicator.signal === "buy"
                    ? isDark
                      ? "from-emerald-500/25 via-emerald-500/5 to-transparent"
                      : "from-emerald-100 via-emerald-50/5 to-transparent"
                    : indicator.signal === "sell"
                      ? isDark
                        ? "from-rose-500/25 via-rose-500/5 to-transparent"
                        : "from-rose-100 via-rose-50/5 to-transparent"
                      : isDark
                        ? "from-slate-500/25 via-slate-500/5 to-transparent"
                        : "from-slate-100 via-slate-50/5 to-transparent";

                return (
                  <article
                    key={index}
                    className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/40 ${
                      isDark
                        ? "border-slate-200/15 bg-white/70 dark:border-slate-700/40 dark:bg-slate-900/40"
                        : "border-slate-200/60 bg-white/95"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${signalPalette}`}
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          className={`font-semibold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {indicator.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            indicator.signal === "buy"
                              ? isDark
                                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40"
                                : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/60"
                              : indicator.signal === "sell"
                                ? isDark
                                  ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40"
                                  : "bg-rose-100 text-rose-700 ring-1 ring-rose-300/60"
                                : isDark
                                  ? "bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/40"
                                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-300/60"
                          }`}
                        >
                          {indicator.signal.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className={`text-2xl font-bold mb-2 ${
                          isDark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {indicator.value}
                        {indicator.name === "Bollinger Bands" && "%"}
                      </div>
                      <p
                        className={`text-sm mb-3 ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {indicator.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            indicator.strength === "strong"
                              ? isDark
                                ? "bg-red-500/15 text-red-200 ring-1 ring-red-400/40"
                                : "bg-red-100 text-red-700 ring-1 ring-red-300/60"
                              : indicator.strength === "moderate"
                                ? isDark
                                  ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40"
                                  : "bg-amber-100 text-amber-700 ring-1 ring-amber-300/60"
                                : isDark
                                  ? "bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/40"
                                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-300/60"
                          }`}
                        >
                          {indicator.strength.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          {indicator.signal === "buy" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : indicator.signal === "sell" ? (
                            <ArrowDownRight className="h-4 w-4 text-rose-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Market Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
                <div className="relative">
                  <h3
                    className={`font-semibold mb-3 ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    Support & Resistance
                  </h3>
                  <div className="space-y-2">
                    <div
                      className={`flex justify-between p-2 rounded-lg ${
                        typeof document !== "undefined" &&
                        document.documentElement.classList.contains("dark")
                          ? "bg-white/5"
                          : "bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        Resistance
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {settings.currency === "YER" ? "" : "$"}
                        {marketAnalysis.resistance.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between p-2 rounded-lg ${
                        typeof document !== "undefined" &&
                        document.documentElement.classList.contains("dark")
                          ? "bg-white/5"
                          : "bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        Support
                      </span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {settings.currency === "YER" ? "" : "$"}
                        {marketAnalysis.support.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
                <div className="relative text-center">
                  <h3
                    className={`font-semibold mb-3 ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    Market Sentiment
                  </h3>
                  <div
                    className={`text-2xl font-bold mb-2 ${
                      marketAnalysis.sentiment === "greed"
                        ? "text-red-600 dark:text-red-400"
                        : marketAnalysis.sentiment === "fear"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {marketAnalysis.sentiment.charAt(0).toUpperCase() +
                      marketAnalysis.sentiment.slice(1)}
                  </div>
                  <p
                    className={`text-sm ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {marketAnalysis.sentiment === "greed"
                      ? "Market showing signs of excessive optimism"
                      : marketAnalysis.sentiment === "fear"
                        ? "Market showing fear-driven behavior"
                        : "Market sentiment is balanced"}
                  </p>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent" />
                <div className="relative text-center">
                  <h3
                    className={`font-semibold mb-3 ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    AI Recommendation
                  </h3>
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-bold ${getRecommendationColor(
                      marketAnalysis.recommendation,
                    )}`}
                  >
                    <Sparkles className="h-5 w-5" />
                    {marketAnalysis.recommendation.toUpperCase()}
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    Based on {marketAnalysis.indicators.length} technical
                    indicators
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {/* Main content */}
      <main id="main-content" role="main" className="space-y-8">
        <section
          id="charts"
          aria-label="Charts and forecasts"
          className="space-y-6"
        >
          {/* Tab Navigation - Glassmorphic Style */}
          <div className="flex justify-center">
            <div className="relative inline-flex rounded-2xl border border-slate-200/60 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/60 p-1.5 shadow-lg backdrop-blur-sm">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />

              <div className="relative inline-flex gap-1 flex-wrap justify-center">
                {[
                  {
                    id: "accuracy",
                    label: "Accuracy Analysis",
                    icon: <Target className="h-4 w-4" />,
                  },
                  {
                    id: "comparison",
                    label: "Model Comparison",
                    icon: <BarChart3 className="h-4 w-4" />,
                  },
                  {
                    id: "simulator",
                    label: "Monte Carlo",
                    icon: <Zap className="h-4 w-4" />,
                  },
                  {
                    id: "enhanced-forecast",
                    label: "AI Forecast",
                    icon: <Brain className="h-4 w-4" />,
                  },
                ]
                  .filter((tab) => tab.id !== "forecast") // Remove AI Forecast tab
                  .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? "text-white shadow-lg"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      }`}
                    >
                      {activeTab === tab.id && (
                        <span
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md"
                          aria-hidden="true"
                        />
                      )}
                      {activeTab !== tab.id && (
                        <span className="absolute inset-0 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">
                          {tab.label.split(" ")[0]}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {activeTab === "accuracy" && (
                <div className="inline-flex rounded-xl border border-blue-200 bg-blue-50/80 p-1 shadow-sm dark:border-blue-500/30 dark:bg-blue-900/30">
                  <button
                    onClick={() => handleAccuracySectionChange("overview")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      accuracySection === "overview"
                        ? "bg-blue-600 text-white shadow dark:bg-blue-500 dark:text-white"
                        : "text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/60"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => handleAccuracySectionChange("backtest")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      accuracySection === "backtest"
                        ? "bg-blue-600 text-white shadow dark:bg-blue-500 dark:text-white"
                        : "text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/60"
                    }`}
                  >
                    Backtest Details
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Tab Content */}
          {activeTab === "accuracy" && (
            <>
              {/* New: Prophet vs LSTM Model Accuracy Evaluation */}
              {accuracySection === "overview" && (
                <AccuracyTab
                  asset={settings.asset}
                  currency={settings.currency}
                />
              )}

              {accuracySection === "backtest" && (
                <>
                  <section className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/95 px-5 py-4 shadow-lg backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                          <label
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark",
                              )
                                ? "text-slate-300"
                                : "text-slate-700"
                            }`}
                          >
                            Backtest Period:
                          </label>
                          <select
                            value={accuracyPeriod}
                            onChange={(e) =>
                              setAccuracyPeriod(Number(e.target.value))
                            }
                            className={`form-input text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark",
                              )
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <option value={90}>90 days</option>
                            <option value={180}>6 months</option>
                            <option value={365}>1 year</option>
                            <option value={730}>2 years</option>
                          </select>
                        </div>
                        <div
                          className={`text-xs ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                        >
                          Advanced backtest analysis (optional)
                        </div>
                      </div>
                      <button
                        onClick={() => handleAccuracySectionChange("overview")}
                        className={`btn btn-secondary text-sm flex items-center gap-2 ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                            : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        Back to Overview
                      </button>
                    </div>
                  </section>
                  <BacktestAnalysis
                    showErrorAnalysis={true}
                    period={accuracyPeriod}
                    pricesData={pricesData}
                  />
                </>
              )}
            </>
          )}

          {activeTab === "comparison" && (
            <ModelComparison
              period={comparisonPeriod}
              pricesData={pricesData}
            />
          )}

          {activeTab === "simulator" && (
            <Simulator period={simulatorPeriod} pricesData={pricesData} />
          )}

          {activeTab === "enhanced-forecast" && (
            <div className="space-y-6">
              <EnhancedForecastPanel
                historicalData={pricesData?.prices || []}
                horizonDays={enhancedForecastPeriod}
                onPeriodChange={(period) => setEnhancedForecastPeriod(period)}
              />
            </div>
          )}

          {/* Enhanced Chat Dock */}
          <ChatDock
            isOpen={showChat}
            onClose={() => setShowChat(false)}
            context={{
              currentPage: "trends",
              symbol: settings.asset,
              currency: settings.currency,
              marketAnalysis: marketAnalysis,
              technicalIndicators: marketAnalysis.indicators,
              dateRange: getCurrentPeriod(),
              activeTab: activeTab,
            }}
            initialMessage="Can you analyze the current technical indicators and provide insights on the market trend and potential price movements?"
          />
        </section>
      </main>
    </div>
  );
};

export default Trends;
