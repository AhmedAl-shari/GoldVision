import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  postEnhancedForecast,
  postMarketRecommendation,
  useTechnicalAnalysis,
} from "../lib/api";
import { useLocale } from "../contexts/useLocale";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  BarChart3,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  Info,
  Sparkles,
  Calendar,
} from "lucide-react";
import ForecastChart from "./ForecastChart";
import type { PriceData } from "../lib/api";

interface EnhancedForecastPanelProps {
  historicalData: PriceData[];
  horizonDays?: number;
  onPeriodChange?: (period: number) => void;
}

interface ModelPrediction {
  model_name: string;
  predictions: number[];
  confidence: number;
  mae?: number;
  mape?: number;
  weight?: number;
}

interface FeatureImportance {
  feature_name: string;
  importance_score: number;
  contribution_percent: number;
}

interface EnhancedForecastResponse {
  success: boolean;
  generated_at: string;
  horizon_days: number;
  forecast: Array<{
    ds: string;
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
  }>;
  ensemble_prediction: number[];
  individual_models: ModelPrediction[];
  feature_importance: FeatureImportance[];
  market_regime: "bull" | "bear" | "volatile" | "stable";
  overall_confidence: number;
  model_version: string;
  latency_ms?: number;
}

interface MarketRecommendationResponse {
  success: boolean;
  recommendation: "buy" | "sell" | "hold" | "watch";
  confidence: number;
  summary: {
    en: string;
    ar: string;
  };
  keyPoints: {
    en: string[];
    ar: string[];
  };
  riskLevel: "low" | "medium" | "high";
  timeHorizon: "short" | "medium" | "long";
  priceTargets: {
    support: number;
    target: number;
    resistance: number;
  };
  marketContext: {
    regime: string;
    volatility: number;
    trend: string;
  };
  generatedAt: string;
}

const EnhancedForecastPanel = ({
  historicalData,
  horizonDays = 7,
  onPeriodChange,
}: EnhancedForecastPanelProps) => {
  const { t, locale, isRTL } = useLocale();
  // Removed prevModeRef - React Query handles refetching automatically via queryKey
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(horizonDays);
  const [forecastMode, setForecastMode] = useState<"basic" | "advanced">(
    "advanced",
  );

  // Get technical analysis data
  const {
    data: technicalData,
    isLoading: technicalLoading,
    error: technicalError,
  } = useTechnicalAnalysis({ period: 14, limit: 50 });

  const {
    data: forecastData,
    isLoading,
    error,
    refetch,
  } = useQuery<EnhancedForecastResponse>({
    queryKey: [
      "enhanced-forecast",
      historicalData.length,
      selectedPeriod,
      forecastMode,
    ],
    queryFn: async () => {
      const useEnsemble = forecastMode === "advanced";
      console.log(
        `[Enhanced Forecast] Fetching forecast with use_ensemble=${useEnsemble}, mode=${forecastMode}`,
      );
      const response = await postEnhancedForecast({
        horizon_days: selectedPeriod,
        asset: "XAU",
        currency: "USD",
        use_ensemble: useEnsemble, // Use ensemble only in advanced mode
        include_feature_importance: forecastMode === "advanced",
        force_cold: true, // Force fresh forecast when mode changes to avoid cache issues
      });
      const modelsCount = response.individual_models?.length || 0;
      const expectedModelsCount = useEnsemble ? 6 : 1;
      console.log(`[Enhanced Forecast] Received forecast response:`, {
        overall_confidence: response.overall_confidence,
        individual_models_count: modelsCount,
        expected_models_count: expectedModelsCount,
        use_ensemble_requested: useEnsemble,
        use_ensemble_in_response: modelsCount > 1,
        model_names: response.individual_models?.map((m) => m.model_name) || [],
        models_match_expected: modelsCount === expectedModelsCount,
      });

      // Warn if response doesn't match expected mode
      if (useEnsemble && modelsCount < 6) {
        console.warn(
          `[Enhanced Forecast] ⚠️ Advanced mode requested but only ${modelsCount} model(s) returned. Expected 6 models.`,
        );
      } else if (!useEnsemble && modelsCount > 1) {
        console.warn(
          `[Enhanced Forecast] ⚠️ Basic mode requested but ${modelsCount} model(s) returned. Expected 1 model.`,
        );
      }

      return response;
    },
    enabled: true, // Always enabled - backend will handle data validation
    staleTime: 0, // No stale time - always refetch when queryKey changes (mode change)
    retry: 2, // Retry on failure
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  // Note: React Query will automatically refetch when queryKey changes (which includes forecastMode)
  // No need for manual useEffect refetch - it was causing duplicate requests
  // The staleTime: 0 ensures immediate refetch on queryKey change

  // Fetch market recommendation
  const {
    data: recommendationData,
    isLoading: recommendationLoading,
    error: recommendationError,
    refetch: refetchRecommendation,
  } = useQuery<MarketRecommendationResponse>({
    queryKey: ["market-recommendation", historicalData.length, locale],
    queryFn: async () => {
      try {
        const response = await postMarketRecommendation({
          asset: "XAU",
          currency: "USD",
        });
        console.log(
          "[Enhanced Forecast] Recommendation data received:",
          response,
        );
        return response;
      } catch (error) {
        console.error("[Enhanced Forecast] Recommendation error:", error);
        throw error;
      }
    },
    enabled: historicalData.length >= 5 && !!forecastData, // Only fetch after forecast is loaded
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry twice on failure
  });

  const getMarketRegimeColor = (regime: string) => {
    switch (regime) {
      case "bull":
        return "text-green-600 dark:text-green-400";
      case "bear":
        return "text-red-600 dark:text-red-400";
      case "volatile":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getMarketRegimeIcon = (regime: string) => {
    switch (regime) {
      case "bull":
        return TrendingUp;
      case "bear":
        return TrendingDown;
      case "volatile":
        return Activity;
      default:
        return Activity;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get localized text based on current locale
  const getRecommendationText = (action: string) => {
    switch (action) {
      case "buy":
        return t("recommendationBuy");
      case "sell":
        return t("recommendationSell");
      case "watch":
        return t("recommendationWatch");
      default:
        return t("recommendationHold");
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case "low":
        return t("riskLow");
      case "high":
        return t("riskHigh");
      default:
        return t("riskMedium");
    }
  };

  const getTimeHorizonText = (horizon: string) => {
    switch (horizon) {
      case "short":
        return t("timeHorizonShort");
      case "long":
        return t("timeHorizonLong");
      default:
        return t("timeHorizonMedium");
    }
  };

  // Get summary text based on locale
  const summaryText = recommendationData?.summary
    ? locale === "ar"
      ? recommendationData.summary.ar
      : recommendationData.summary.en
    : t("analyzingMarketConditions");

  const keyPoints = recommendationData?.keyPoints
    ? locale === "ar"
      ? recommendationData.keyPoints.ar
      : recommendationData.keyPoints.en
    : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>
            Failed to load enhanced forecast:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!forecastData && !isLoading) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <Info className="h-5 w-5" />
          <span>
            No forecast data available. Please ensure you have sufficient
            historical price data.
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const forecastChartData =
    forecastData.forecast?.map((f) => ({
      ds: f.ds,
      yhat: f.yhat,
      yhat_lower: f.yhat_lower,
      yhat_upper: f.yhat_upper,
    })) || [];

  const RegimeIcon = getMarketRegimeIcon(
    forecastData.market_regime || "stable",
  );

  const handlePeriodChange = (period: number) => {
    setSelectedPeriod(period);
    if (onPeriodChange) {
      onPeriodChange(period);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Controls Section */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/95 px-5 py-4 shadow-lg backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div
            className={`flex items-center gap-4 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`flex items-center gap-2 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              <label
                className={`text-sm font-medium ${
                  typeof document !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "text-slate-300"
                    : "text-slate-700"
                }`}
              >
                Forecast Horizon:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(Number(e.target.value))}
                className={`form-input text-sm ${
                  typeof document !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            {/* Forecast Mode Toggle */}
            <div
              className={`flex items-center gap-2 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <label
                className={`text-sm font-medium ${
                  typeof document !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "text-slate-300"
                    : "text-slate-700"
                }`}
              >
                Mode:
              </label>
              <div className="inline-flex rounded-lg border border-blue-200 bg-blue-50/80 p-1 shadow-sm dark:border-blue-500/30 dark:bg-blue-900/30">
                <button
                  onClick={() => {
                    console.log(
                      `[Mode Toggle] Clicked Basic, current mode: ${forecastMode}, isLoading: ${isLoading}`,
                    );
                    if (forecastMode !== "basic" && !isLoading) {
                      setForecastMode("basic");
                    }
                  }}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    forecastMode === "basic"
                      ? "bg-blue-600 text-white shadow dark:bg-blue-500"
                      : "text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/60"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Basic (Prophet)
                </button>
                <button
                  onClick={() => {
                    console.log(
                      `[Mode Toggle] Clicked Advanced, current mode: ${forecastMode}, isLoading: ${isLoading}`,
                    );
                    if (forecastMode !== "advanced" && !isLoading) {
                      setForecastMode("advanced");
                    }
                  }}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    forecastMode === "advanced"
                      ? "bg-blue-600 text-white shadow dark:bg-blue-500"
                      : "text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/60"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Advanced (Ensemble)
                </button>
              </div>
            </div>
            <div
              className={`text-xs ${
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("dark")
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {forecastMode === "advanced"
                ? "Multi-model ensemble prediction"
                : "Prophet-only forecast"}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Next Day Forecast - Prominent at Top */}
      {forecastData && forecastData.forecast.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-600 dark:via-purple-600 dark:to-pink-600 rounded-2xl shadow-xl border-2 border-blue-300 dark:border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/90 uppercase tracking-wide">
                  Next Day Forecast
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {new Date(forecastData.forecast[0].ds).toLocaleDateString(
                    locale === "ar" ? "ar-YE" : "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
            {recommendationData && (
              <div
                className={`px-4 py-2 rounded-lg font-bold text-lg backdrop-blur bg-white/20 ${
                  recommendationData.recommendation === "buy"
                    ? "text-green-100"
                    : recommendationData.recommendation === "sell"
                      ? "text-red-100"
                      : recommendationData.recommendation === "watch"
                        ? "text-yellow-100"
                        : "text-gray-100"
                }`}
              >
                {getRecommendationText(recommendationData.recommendation)}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-white drop-shadow-lg">
              ${forecastData.forecast[0].yhat.toFixed(2)}
            </span>
            <span className="text-lg text-white/80 font-medium">
              ({forecastData.forecast[0].yhat_lower.toFixed(2)} -{" "}
              {forecastData.forecast[0].yhat_upper.toFixed(2)})
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-4 text-white/90">
              <div>
                <span className="text-xs opacity-80">Confidence</span>
                <p className="text-sm font-semibold">
                  {forecastData.overall_confidence
                    ? `${(forecastData.overall_confidence * 100).toFixed(0)}%`
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-xs opacity-80">Market Regime</span>
                <p className="text-sm font-semibold capitalize">
                  {forecastData.market_regime}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {forecastData && (
        <div
          className={`flex items-center justify-between ${
            isRTL ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`flex items-center gap-3 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {forecastMode === "advanced"
                  ? "Enhanced Ensemble Forecast"
                  : "Prophet Forecast"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {forecastMode === "advanced"
                  ? `Multi-model ensemble with ${
                      forecastData?.individual_models?.length || 6
                    } models (Prophet, LSTM, XGBoost, Random Forest, ARIMA, News Sentiment)`
                  : `Prophet-only forecast (${
                      forecastData?.individual_models?.length || 1
                    } model, fast & lightweight)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Market Summary & Recommendations */}
      {recommendationError && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">
              Could not load market recommendations. Forecast data is still
              available.
            </span>
          </div>
        </div>
      )}
      {forecastData && recommendationLoading && (
        <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("todaysMarketSummary")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("analyzingMarketConditions")}
              </p>
            </div>
          </div>
        </div>
      )}
      {forecastData && !recommendationLoading && recommendationData && (
        <div
          className={`relative overflow-hidden rounded-2xl border-2 ${
            recommendationData.recommendation === "buy"
              ? "border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-900/20 dark:via-slate-900/60 dark:to-emerald-900/10"
              : recommendationData.recommendation === "sell"
                ? "border-rose-200 dark:border-rose-800/50 bg-gradient-to-br from-rose-50 via-white to-rose-50/50 dark:from-rose-900/20 dark:via-slate-900/60 dark:to-rose-900/10"
                : recommendationData.recommendation === "watch"
                  ? "border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 dark:from-amber-900/20 dark:via-slate-900/60 dark:to-amber-900/10"
                  : "border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-900/20 dark:via-slate-900/60 dark:to-slate-900/10"
          } shadow-xl backdrop-blur-sm ${isRTL ? "text-right" : "text-left"}`}
        >
          {/* Decorative gradient overlay */}
          <div
            className={`absolute inset-0 opacity-30 ${
              recommendationData.recommendation === "buy"
                ? "bg-gradient-to-br from-emerald-400/20 via-transparent to-emerald-600/10"
                : recommendationData.recommendation === "sell"
                  ? "bg-gradient-to-br from-rose-400/20 via-transparent to-rose-600/10"
                  : recommendationData.recommendation === "watch"
                    ? "bg-gradient-to-br from-amber-400/20 via-transparent to-amber-600/10"
                    : "bg-gradient-to-br from-slate-400/20 via-transparent to-slate-600/10"
            } pointer-events-none`}
          />

          <div className="relative p-5">
            {/* Premium Header with Recommendation Badge */}
            <div
              className={`flex items-start justify-between mb-4 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex items-center gap-3 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    recommendationData.recommendation === "buy"
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : recommendationData.recommendation === "sell"
                        ? "bg-rose-100 dark:bg-rose-900/40"
                        : recommendationData.recommendation === "watch"
                          ? "bg-amber-100 dark:bg-amber-900/40"
                          : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Brain
                    className={`h-6 w-6 ${
                      recommendationData.recommendation === "buy"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : recommendationData.recommendation === "sell"
                          ? "text-rose-600 dark:text-rose-400"
                          : recommendationData.recommendation === "watch"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-600 dark:text-slate-400"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                    {t("todaysMarketSummary")}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("aiPoweredAnalysis")}
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl font-bold text-lg shadow-lg ${
                  recommendationData.recommendation === "buy"
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white dark:from-emerald-600 dark:to-emerald-700"
                    : recommendationData.recommendation === "sell"
                      ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white dark:from-rose-600 dark:to-rose-700"
                      : recommendationData.recommendation === "watch"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white dark:from-amber-600 dark:to-amber-700"
                        : "bg-gradient-to-r from-slate-500 to-slate-600 text-white dark:from-slate-600 dark:to-slate-700"
                }`}
              >
                {getRecommendationText(recommendationData.recommendation)}
              </div>
            </div>

            {/* Summary Text with Better Typography */}
            <div className="mb-4 p-3.5 bg-white/60 dark:bg-slate-800/40 rounded-xl border border-white/50 dark:border-slate-700/50 backdrop-blur-sm">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-2">
                {summaryText}
              </p>
            </div>

            {/* Premium Price Targets Grid */}
            {recommendationData.priceTargets && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 border border-emerald-200/60 dark:border-emerald-700/40 p-3 text-center shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent" />
                  <div className="relative">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1 uppercase tracking-wide">
                      {t("support")}
                    </p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      ${recommendationData.priceTargets.support?.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200/60 dark:border-blue-700/40 p-3 text-center shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent" />
                  <div className="relative">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wide">
                      {t("target")}
                    </p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                      ${recommendationData.priceTargets.target?.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-800/20 border border-rose-200/60 dark:border-rose-700/40 p-3 text-center shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-400/10 to-transparent" />
                  <div className="relative">
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1 uppercase tracking-wide">
                      {t("resistance")}
                    </p>
                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                      ${recommendationData.priceTargets.resistance?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics - Compact Cards */}
            {keyPoints.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {keyPoints.slice(0, 2).map((point, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 bg-white/70 dark:bg-slate-800/50 rounded-lg border border-white/60 dark:border-slate-700/50 backdrop-blur-sm ${
                      isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                      {t("keyMetrics")}
                    </p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Premium Risk Indicators Bar */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${
                recommendationData.recommendation === "buy"
                  ? "border-emerald-200/60 dark:border-emerald-800/40"
                  : recommendationData.recommendation === "sell"
                    ? "border-rose-200/60 dark:border-rose-800/40"
                    : recommendationData.recommendation === "watch"
                      ? "border-amber-200/60 dark:border-amber-800/40"
                      : "border-slate-200 dark:border-slate-700"
              } ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex flex-wrap items-center gap-3 text-xs ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {t("riskLevel")}:
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                      recommendationData.riskLevel === "low"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : recommendationData.riskLevel === "high"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    {getRiskLevelText(recommendationData.riskLevel)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {t("modelConfidence")}:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {forecastData?.overall_confidence
                      ? `${(forecastData.overall_confidence * 100).toFixed(0)}%`
                      : recommendationData.confidence
                        ? `${recommendationData.confidence.toFixed(0)}%`
                        : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {t("timeHorizon")}:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {getTimeHorizonText(recommendationData.timeHorizon)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {forecastData && !recommendationLoading && !recommendationData && (
        /* Fallback when recommendationData is not available */
        <div
          className={`text-center py-8 ${isRTL ? "text-right" : "text-left"}`}
        >
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("todaysMarketSummary")}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Market recommendation data is being processed. Please refresh in a
            moment.
          </p>
          <button
            onClick={() => {
              refetchRecommendation();
              refetch();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Forecast Chart - Professional Design */}
      {forecastData && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 dark:from-slate-900/95 dark:via-blue-900/20 dark:to-purple-900/10 shadow-xl backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="relative p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Price Forecast Chart
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Historical prices and {selectedPeriod}-day forecast with
                      confidence intervals
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl p-4 border border-white/80 dark:border-slate-700/50 backdrop-blur-sm w-full min-w-0">
              <ForecastChart
                historicalData={historicalData}
                forecastData={forecastChartData}
              />
            </div>
          </div>
        </div>
      )}

      {/* Individual Models - Premium Style */}
      {forecastData.individual_models &&
        forecastData.individual_models.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-200/60 dark:border-cyan-800/50 bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 dark:from-slate-900/95 dark:via-cyan-900/20 dark:to-teal-900/10 shadow-xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 pointer-events-none" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {forecastMode === "advanced"
                        ? `Individual Model Predictions (${forecastData.individual_models.length} models)`
                        : `Model Details (${forecastData.individual_models.length} model)`}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {forecastMode === "advanced"
                        ? "Ensemble mode combines multiple models for improved accuracy"
                        : "Prophet-only forecasting for fast results"}
                    </p>
                  </div>
                </div>
                {forecastMode === "basic" && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg shadow-md">
                    Prophet-only mode
                  </span>
                )}
                {forecastMode === "advanced" && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg shadow-md">
                    Ensemble mode
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forecastData.individual_models.map((model, idx) => {
                  const colors = [
                    {
                      border: "border-blue-200/60 dark:border-blue-700/40",
                      bg: "from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20",
                      accent: "from-blue-400/20 to-blue-600/10",
                      text: "text-blue-700 dark:text-blue-300",
                    },
                    {
                      border: "border-purple-200/60 dark:border-purple-700/40",
                      bg: "from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20",
                      accent: "from-purple-400/20 to-purple-600/10",
                      text: "text-purple-700 dark:text-purple-300",
                    },
                    {
                      border:
                        "border-emerald-200/60 dark:border-emerald-700/40",
                      bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20",
                      accent: "from-emerald-400/20 to-emerald-600/10",
                      text: "text-emerald-700 dark:text-emerald-300",
                    },
                    {
                      border: "border-amber-200/60 dark:border-amber-700/40",
                      bg: "from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20",
                      accent: "from-amber-400/20 to-amber-600/10",
                      text: "text-amber-700 dark:text-amber-300",
                    },
                    {
                      border: "border-rose-200/60 dark:border-rose-700/40",
                      bg: "from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-800/20",
                      accent: "from-rose-400/20 to-rose-600/10",
                      text: "text-rose-700 dark:text-rose-300",
                    },
                    {
                      border: "border-indigo-200/60 dark:border-indigo-700/40",
                      bg: "from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-800/20",
                      accent: "from-indigo-400/20 to-indigo-600/10",
                      text: "text-indigo-700 dark:text-indigo-300",
                    },
                  ];
                  const colorScheme = colors[idx % colors.length];
                  return (
                    <div
                      key={model.model_name}
                      className={`relative overflow-hidden rounded-xl border-2 ${
                        colorScheme.border
                      } bg-gradient-to-br ${
                        colorScheme.bg
                      } p-4 cursor-pointer transition-all shadow-lg backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] ${
                        selectedModel === model.model_name
                          ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedModel(
                          selectedModel === model.model_name
                            ? null
                            : model.model_name,
                        )
                      }
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${colorScheme.accent} pointer-events-none`}
                      />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {model.model_name}
                          </span>
                          {forecastMode === "advanced" && model.weight && (
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 ${colorScheme.text}`}
                            >
                              {(model.weight * 100).toFixed(0)}% weight
                            </span>
                          )}
                          {forecastMode === "basic" && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              100% weight
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              Confidence:
                            </span>
                            <span
                              className={`font-bold text-base ${getConfidenceColor(
                                model.confidence,
                              )}`}
                            >
                              {(model.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          {forecastMode === "advanced" && model.mape && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">
                                MAPE:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {model.mape.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {model.predictions &&
                            model.predictions.length > 0 && (
                              <div className="pt-2 border-t border-white/40 dark:border-slate-700/40">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Next Day:
                                  </span>
                                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                                    ${model.predictions[0].toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {forecastMode === "basic" &&
                forecastData.individual_models.length === 1 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200/60 dark:border-blue-700/40 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Basic mode uses Prophet-only forecasting for faster
                        results. Switch to Advanced mode for ensemble
                        predictions with multiple models.
                      </span>
                    </p>
                  </div>
                )}
              {forecastMode === "advanced" &&
                forecastData.individual_models.length > 1 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20 border border-purple-200/60 dark:border-purple-700/40 rounded-xl">
                    <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Ensemble mode combines{" "}
                        {forecastData.individual_models.length} models (Prophet,
                        LSTM, XGBoost, Random Forest, ARIMA, News Sentiment) for
                        improved accuracy.
                      </span>
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
    </div>
  );
};

export default EnhancedForecastPanel;
