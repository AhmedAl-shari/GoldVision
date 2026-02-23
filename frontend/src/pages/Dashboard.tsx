import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  getSpotPrice,
  postForecast,
  postEnhancedForecast,
  fetchLatestPrice,
  useTechnicalAnalysis,
  useOHLCData,
  getAlerts,
  useYemenSummary,
} from "../lib/api";
import {
  calculateMarketSeverity,
  calculateConfidence,
} from "../lib/marketDefaults";
import PriceCard from "../components/PriceCard";
import CandlestickChart from "../components/CandlestickChart";
import DataSourceCard from "../components/DataSourceCard";
import ErrorBanner from "../components/ErrorBanner";
import LiveTicker from "../components/LiveTicker";
import ChatDock from "../components/ChatDock";
import RealTimeStreaming from "../components/RealTimeStreaming";
import ProPriceDisplay from "../components/ProPriceDisplay";
import TradingViewXauusdWidget from "../components/TradingViewXauusdWidget";
import TradingSignal from "../components/TradingSignal";
import AnomalyDetector from "../components/AnomalyDetector";
import NewsPriceImpact from "../components/NewsPriceImpact";
import { useAuth } from "../contexts/useAuth";
import { useSettings, getAssetLabel } from "../contexts/SettingsContext";
import { useYemenSettings } from "../contexts/YemenSettingsContext";
import { useLocale } from "../contexts/useLocale";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  BarChart3,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Globe,
  Shield,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Users,
  Database,
  Wifi,
  Bell,
  Settings,
  Info,
  ExternalLink,
  Download,
  Share2,
  Bookmark,
  Star,
  LineChart,
  PieChart,
  Gauge,
  TrendingUpDown,
  AlertCircle,
  Sparkles,
  Brain,
  Layers,
  Filter,
  MoreHorizontal,
  BookOpen,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { devLog, devWarn } from "../lib/devLog";
import { exportOHLCToCsv } from "../utils/csvExport";

interface TickData {
  asset: string;
  currency: string;
  ds: string;
  price: number;
}

interface MarketInsight {
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  icon: React.ReactNode;
  severity: "low" | "medium" | "high";
  timestamp: Date;
}

interface MarketMetrics {
  volatility: number;
  trend: "bullish" | "bearish" | "neutral";
  momentum: number;
  support: number;
  resistance: number;
  volume: number;
  rsi: number;
  macd: number;
  sentiment: "fear" | "greed" | "neutral";
  marketCap: number;
  liquidity: "high" | "medium" | "low";
}

const Dashboard = () => {
  const { t, formatCurrency, formatNumber, locale } = useLocale();
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { settings: yemenSettings } = useYemenSettings();
  const queryClient = useQueryClient();
  const [show403Error, setShow403Error] = React.useState(false);

  // Check if token exists in localStorage as additional safeguard
  const hasToken = (() => {
    try {
      return !!localStorage.getItem("access_token");
    } catch {
      return false;
    }
  })();
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [livePriceChange, setLivePriceChange] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "1D" | "1W" | "1M" | "3M" | "1Y"
  >("1M");
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL or default to "overview"
  const activeTab = (searchParams.get("tab") || "overview") as "overview" | "analysis";
  
  // Handle tab change
  const handleTabChange = (tabId: "overview" | "analysis") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams, { replace: true });
  };
  const [marketAlerts, setMarketAlerts] = useState<MarketInsight[]>([]);
  const [isRefreshingForecast, setIsRefreshingForecast] = useState(false);
  const [forecastRefreshKey, setForecastRefreshKey] = useState(0); // Force re-render key
  const [tutorialBannerDismissed, setTutorialBannerDismissed] = useState(
    typeof window !== "undefined" &&
      localStorage.getItem("tutorial_banner_dismissed") === "true"
  );
  const isArabic = locale === "ar";
  // Translate function that directly checks locale on each call
  const translate = (en: string, ar: string) => {
    return locale === "ar" ? ar : en;
  };

  // Handle live price updates from SSE
  const handleTick = useCallback(
    (tick: TickData) => {
      if (
        tick.asset === settings.asset &&
        tick.currency === settings.currency
      ) {
        setLivePrice((previousPrice) => {
          if (previousPrice !== null) {
            setLivePriceChange(tick.price - previousPrice);
          }
          return tick.price;
        });
        setLastUpdate(new Date());
      }
    },
    [settings.asset, settings.currency]
  );

  // Fetch real-time spot price from GoldAPI.io
  const {
    data: spotData,
    isLoading: pricesLoading,
    error: pricesError,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: ["spot-price"],
    queryFn: () => getSpotPrice(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get real technical analysis data
  const {
    data: technicalData,
    isLoading: technicalLoading,
    error: technicalError,
  } = useTechnicalAnalysis({ period: 14, limit: 50 });

  // Fetch multi-day OHLC for Professional Price Action Analysis (30 days as requested)
  const { data: ohlcResp } = useOHLCData({ days: 30, limit: 100 });

  // State for chart date range
  const [chartDateRange, setChartDateRange] = useState<{
    start: string;
    end: string;
    tradingDays: number;
  } | null>(null);

  // Memoize the date range change handler to prevent unnecessary re-renders
  const handleDateRangeChange = useCallback(
    (dateRange: { start: string; end: string; tradingDays: number }) => {
      setChartDateRange(dateRange);
    },
    []
  );

  const { data: yemenSummary } = useYemenSummary(yemenSettings.region, "YER");

  const formatYER = useCallback(
    (value: number) =>
      new Intl.NumberFormat(isArabic ? "ar-YE" : "en-US", {
        style: "currency",
        currency: "YER",
        maximumFractionDigits: 0,
      }).format(Math.round(value)),
    [isArabic]
  );

  // Generate enhanced forecast (more accurate ensemble model)
  const {
    data: forecastData,
    isLoading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useQuery({
    queryKey: [
      "enhanced-forecast",
      settings.asset,
      settings.currency,
      settings.region,
      settings.karat,
      settings.unit,
    ],
    queryFn: () =>
      postEnhancedForecast({
        asset: settings.asset,
        currency: settings.currency,
        horizon_days: 7,
        use_ensemble: true,
        include_feature_importance: true,
      }),
    enabled: isAuthenticated && !authLoading && hasToken, // Only fetch when authenticated
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch alerts for notification banner
  const { data: alertsData } = useQuery({
    queryKey: ["dashboard-alerts", settings.asset, settings.currency],
    queryFn: () =>
      getAlerts({
        asset: settings.asset,
        currency: settings.currency,
      }),
    enabled: isAuthenticated && !authLoading && hasToken, // Only fetch when authenticated, auth check complete, and token exists
    refetchInterval: 60000, // Check every minute
  });

  // Count triggered alerts
  const triggeredAlertsCount =
    alertsData?.alerts?.filter(
      (alert: { triggered_at: Date | null }) => alert.triggered_at
    ).length || 0;

  // Manual forecast refresh function
  const handleRefreshForecast = async () => {
    setIsRefreshingForecast(true);
    try {
      const queryKey = [
        "enhanced-forecast",
        settings.asset,
        settings.currency,
        settings.region,
        settings.karat,
        settings.unit,
      ];

      // Log old forecast before refresh
      const oldValue = forecastData?.forecast?.[0]?.yhat;
      const oldDate = forecastData?.forecast?.[0]?.ds;
      devLog("[Forecast Refresh] Starting refresh...", {
        oldForecast: oldValue,
        oldDate: oldDate,
        queryKey,
        currentForecastData: forecastData,
      });

      // Fetch fresh data directly with force_cold, bypassing backend cache
      devLog("[Forecast Refresh] Fetching with force_cold=true...");
      const freshData = await postEnhancedForecast({
        asset: settings.asset,
        currency: settings.currency,
        horizon_days: 7,
        use_ensemble: true,
        include_feature_importance: true,
        force_cold: true, // Force bypass backend cache
      });

      devLog("[Forecast Refresh] Received fresh data:", {
        forecastLength: freshData?.forecast?.length,
        firstForecast: freshData?.forecast?.[0],
        generatedAt: freshData?.generated_at,
        forceColdUsed: freshData?.force_cold_used,
        latencyMs: freshData?.latency_ms,
        fullResponse: freshData,
      });

      // Log if backend confirms force_cold was used
      if (freshData?.force_cold_used) {
        devLog(
          "[Forecast Refresh] ✅ Backend confirmed force_cold=true was used - fresh forecast generated!"
        );
      } else if (freshData?.generated_at) {
        // If we have a generated_at timestamp, it means a fresh forecast was generated
        // (even if the backend doesn't have the force_cold_used flag yet - needs restart)
        const generatedTime = new Date(freshData.generated_at);
        const now = new Date();
        const timeDiff = now.getTime() - generatedTime.getTime();
        const secondsAgo = Math.round(timeDiff / 1000);

        if (timeDiff < 10000) {
          // Generated within last 10 seconds
          devLog(
            `[Forecast Refresh] ✅ Fresh forecast generated ${secondsAgo}s ago (timestamp: ${freshData.generated_at})`
          );
          devLog(
            "[Forecast Refresh] ✅ Refresh is working! Backend generated a new forecast."
          );
        } else {
          devLog(
            `[Forecast Refresh] ℹ️ Forecast was generated ${secondsAgo}s ago (timestamp: ${freshData.generated_at})`
          );
        }

        // Only show warning if generated_at is very old (suggests cached response)
        if (timeDiff > 60000) {
          // More than 1 minute old
          devWarn(
            "[Forecast Refresh] ⚠️ Forecast timestamp is old - might be cached. " +
              "If you just updated the backend code, please restart the backend server."
          );
        }
      } else {
        devWarn(
          "[Forecast Refresh] ⚠️ No generated_at timestamp in response. " +
            "Backend might need to be restarted to include the force_cold_used flag."
        );
      }

      // Extract new forecast values before updating cache
      const newValue = freshData?.forecast?.[0]?.yhat;
      const newDate = freshData?.forecast?.[0]?.ds;

      // Add a refresh timestamp to the data to track when it was refreshed
      const freshDataWithTimestamp = {
        ...freshData,
        _refreshedAt: new Date().toISOString(),
        _refreshCount: ((freshData as any)?._refreshCount || 0) + 1,
      };

      // Update the cache with fresh data - this should trigger component re-render
      // setQueryData automatically notifies all subscribers (components using this query)
      queryClient.setQueryData(queryKey, (oldData: any) => {
        devLog(
          "[Forecast Refresh] Updating cache, old data:",
          oldData?.forecast?.[0]?.yhat
        );
        return freshDataWithTimestamp;
      });

      // Verify the cache was updated
      const cachedData = queryClient.getQueryData(queryKey);
      const cachedForecastValue = (cachedData as any)?.forecast?.[0]?.yhat;
      devLog("[Forecast Refresh] Cache verification:", {
        cacheHasData: !!cachedData,
        cachedForecast: cachedForecastValue,
        freshForecast: newValue,
        valuesMatch: cachedForecastValue === newValue,
        refreshedAt: (cachedData as any)?._refreshedAt,
        refreshCount: (cachedData as any)?._refreshCount,
        cacheStructure: cachedData ? Object.keys(cachedData) : "no cache",
      });
      const hasChanged = oldValue !== newValue || oldDate !== newDate;

      // Get the latest price data info from the response if available
      const dataInfo = freshData?.data_info || {};

      devLog("[Forecast Refresh] Results:", {
        oldForecast: oldValue,
        oldDate: oldDate,
        newForecast: newValue,
        newDate: newDate,
        changed: hasChanged,
        confidence: freshData?.forecast?.[0]
          ? `${freshData.forecast[0].yhat_lower} - ${freshData.forecast[0].yhat_upper}`
          : "N/A",
        dataPoints: dataInfo.dataPoints || "unknown",
        latestPriceDate: dataInfo.latestPriceDate || "unknown",
        latestPriceValue: dataInfo.latestPriceValue || "unknown",
      });

      // Force re-render by updating the refresh key
      // This will cause the component to re-render with the new data
      setForecastRefreshKey((prev) => prev + 1);

      // If values are the same, it means the backend returned the same forecast
      // (likely because there's no new price data)
      if (!hasChanged) {
        const latestPriceDate = dataInfo.latestPriceDate;
        const dataPoints = dataInfo.dataPoints;
        devWarn(
          "[Forecast Refresh] ⚠️ Forecast value unchanged. " +
            "This is expected if:\n" +
            "1. No new price data has arrived since last forecast\n" +
            "2. The model predicts minimal change (conservative settings)\n" +
            "3. The market is stable\n" +
            "4. The Prophet model is generating the same prediction based on the same input data"
        );
        devLog(
          `[Forecast Refresh] 💡 Forecast based on ${dataPoints} historical prices (latest: ${latestPriceDate}). ` +
            "If no new prices have been added since the last forecast, the prediction will be the same."
        );
        devLog(
          `[Forecast Refresh] 📊 Latest price data: $${dataInfo.latestPriceValue} on ${latestPriceDate}`
        );
      } else {
        devLog(
          "[Forecast Refresh] ✅ Forecast value changed! UI should update."
        );
        devLog(
          `[Forecast Refresh] 📊 New forecast based on ${dataInfo.dataPoints} prices (latest: ${dataInfo.latestPriceDate})`
        );
      }

      // Show detailed toast message
      if (hasChanged) {
        toast.success(
          translate(
            `Forecast updated! New value: ${formatCurrency(newValue)}`,
            `تم تحديث التوقع! القيمة الجديدة: ${formatCurrency(newValue)}`
          )
        );
      } else {
        toast.success(
          translate(
            "Forecast refreshed! (Value unchanged - no new price data)",
            "تم تحديث التوقع! (القيمة لم تتغير - لا توجد بيانات سعر جديدة)"
          ),
          { duration: 3000 }
        );
      }
    } catch (error) {
      toast.error(translate("Failed to refresh forecast", "تعذر تحديث التوقع"));
      devError("Forecast refresh error:", error);
    } finally {
      setIsRefreshingForecast(false);
    }
  };

  // Calculate days since last data point (enhanced forecast doesn't include history)
  const daysSinceLastData = useMemo(() => {
    // Enhanced forecast doesn't include history, so we can't calculate this
    // Return null to hide the warning banner
    return null;
  }, [forecastData]);

  // Calculate advanced market metrics
  // Use real technical analysis data instead of simulated metrics
  const marketMetrics: MarketMetrics = useMemo(() => {
    if (!technicalData?.data) {
      return {
        volatility: 0,
        trend: "neutral" as const,
        momentum: 0,
        support: 0,
        resistance: 0,
        volume: 0,
        rsi: 50,
        macd: 0,
        sentiment: "neutral" as const,
        marketCap: 0,
        liquidity: "medium" as const,
      };
    }

    // Use real technical analysis data
    const data = technicalData.data;
    return {
      volatility: typeof data.volatility === "number" ? data.volatility : 0,
      trend: data.trend || "neutral",
      momentum: typeof data.momentum === "number" ? data.momentum : 0,
      support: typeof data.support === "number" ? data.support : 0,
      resistance: typeof data.resistance === "number" ? data.resistance : 0,
      volume: typeof data.volume === "number" ? data.volume : 0,
      rsi: typeof data.rsi === "number" ? data.rsi : 50,
      macd: typeof data.macd === "number" ? data.macd : 0,
      sentiment: data.sentiment || "neutral",
      marketCap: typeof data.marketCap === "number" ? data.marketCap : 0,
      liquidity: data.liquidity || "medium",
    };
  }, [technicalData]);

  // Generate market insights with dynamic severity levels
  const marketInsights: MarketInsight[] = useMemo(() => {
    const insights: MarketInsight[] = [];
    const now = new Date();

    // Calculate data quality based on available data
    const dataQuality = technicalData?.data ? "good" : "fair";
    const marketStability = technicalData?.data?.volatility
      ? Math.max(0, 1 - technicalData.data.volatility / 20)
      : 0.5;

    if (marketMetrics.trend === "bullish") {
      const momentumThreshold = marketMetrics.momentum > 5 ? 5 : 3;
      const severity = calculateMarketSeverity(marketMetrics.momentum, {
        low: 1,
        medium: momentumThreshold,
        high: 8,
      });

      insights.push({
        title: "Strong Bullish Momentum",
        description: `Market showing strong upward momentum (${marketMetrics.momentum.toFixed(
          1
        )})`,
        impact: "positive",
        confidence: calculateConfidence(dataQuality, marketStability),
        severity,
        icon: <TrendingUp className="h-5 w-5" />,
        timestamp: now,
      });
    } else if (marketMetrics.trend === "bearish") {
      const momentumThreshold = marketMetrics.momentum < -5 ? -5 : -3;
      const severity = calculateMarketSeverity(
        Math.abs(marketMetrics.momentum),
        {
          low: 1,
          medium: Math.abs(momentumThreshold),
          high: 8,
        }
      );

      insights.push({
        title: "Bearish Pressure Alert",
        description: `Market showing downward pressure (${marketMetrics.momentum.toFixed(
          1
        )})`,
        impact: "negative",
        confidence: calculateConfidence(dataQuality, marketStability),
        severity,
        icon: <TrendingDown className="h-5 w-5" />,
        timestamp: now,
      });
    }

    if (marketMetrics.volatility > 5) {
      const severity = calculateMarketSeverity(marketMetrics.volatility, {
        low: 5,
        medium: 8,
        high: 12,
      });

      insights.push({
        title: "High Volatility Environment",
        description: `High volatility detected: ${marketMetrics.volatility.toFixed(
          1
        )}%`,
        impact: "neutral",
        confidence: calculateConfidence(dataQuality, marketStability),
        severity,
        icon: <Activity className="h-5 w-5" />,
        timestamp: now,
      });
    }

    if (marketMetrics.rsi > 70) {
      const severity = calculateMarketSeverity(marketMetrics.rsi, {
        low: 70,
        medium: 75,
        high: 80,
      });

      insights.push({
        title: "Overbought Conditions",
        description: `RSI indicates overbought conditions: ${marketMetrics.rsi.toFixed(
          1
        )}`,
        impact: "negative",
        confidence: calculateConfidence(dataQuality, marketStability),
        severity,
        icon: <Activity className="h-5 w-5" />,
        timestamp: now,
      });
    } else if (marketMetrics.rsi < 30) {
      const severity = calculateMarketSeverity(30 - marketMetrics.rsi, {
        low: 5,
        medium: 10,
        high: 15,
      });

      insights.push({
        title: "Oversold Opportunity",
        description: `RSI indicates oversold conditions: ${marketMetrics.rsi.toFixed(
          1
        )}`,
        impact: "positive",
        confidence: calculateConfidence(dataQuality, marketStability),
        severity,
        icon: <Target className="h-5 w-5" />,
        timestamp: now,
      });
    }

    return insights.slice(0, 4); // Limit to 4 most important insights
  }, [marketMetrics, technicalData]);

  // Update market alerts when insights change
  useEffect(() => {
    // Show exactly these three critical alerts in a single row
    const desiredTitles = new Set([
      "High Volatility Environment",
      "Oversold Opportunity",
      "Bearish Pressure Alert",
    ]);
    const selected = marketInsights.filter((i) => desiredTitles.has(i.title));
    setMarketAlerts(selected.slice(0, 3));
  }, [marketInsights]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchLatestPrice();
      await refetchPrices();
      await refetchForecast();
      setLastUpdate(new Date());
      toast.success(
        translate("Data refreshed successfully!", "تم تحديث البيانات بنجاح!")
      );
      setShow403Error(false);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response &&
        error.response.status === 403
      ) {
        setShow403Error(true);
        toast.error(
          translate(
            "Access denied. Admin role required.",
            "تم رفض الوصول. يتطلب صلاحية المشرف."
          )
        );
      } else {
        toast.error(t("failedToRefresh"));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "bullish":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "bearish":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "bullish":
        return "text-green-600 dark:text-green-400";
      case "bearish":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "greed":
        return "text-red-600 dark:text-red-400";
      case "fear":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  if (pricesLoading || forecastLoading || technicalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Loading Advanced Dashboard
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Analyzing market data and generating insights...
          </div>
        </div>
      </div>
    );
  }

  if (pricesError || forecastError) {
    return (
      <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="text-red-800 dark:text-red-200 mb-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <div className="font-semibold text-lg">
              Failed to Load Dashboard
            </div>
          </div>
          <div className="text-sm">
            Unable to fetch market data. Please check your connection and try
            again.
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleRefreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const fxRate =
    (yemenSummary as any)?.spotPrice?.fxRate ??
    (yemenSummary as any)?.fx_usd_yer ??
    (yemenSummary as any)?.meta?.fxRate ??
    yemenSettings.effectiveRate ??
    yemenSettings.marketRate ??
    530;

  const usdPerGramFromSpot =
    spotData?.usdPerGram ??
    (spotData?.usdPerOunce
      ? spotData.usdPerOunce / GRAMS_PER_OUNCE
      : undefined);

  const usdPerGramFromSummary =
    (yemenSummary as any)?.spotPrice?.usdPerGram ??
    (yemenSummary as any)?.usd_per_gram;

  const usdPerGram =
    typeof usdPerGramFromSpot === "number"
      ? usdPerGramFromSpot
      : typeof usdPerGramFromSummary === "number"
      ? usdPerGramFromSummary
      : undefined;

  let yerSpotPerGram24 =
    (yemenSummary as any)?.spotPrice?.localPerGram ??
    (yemenSummary as any)?.local_per_gram ??
    (yemenSummary as any)?.spotPrice?.perGramYER;

  if (
    typeof yerSpotPerGram24 !== "number" &&
    typeof usdPerGram === "number" &&
    typeof fxRate === "number"
  ) {
    yerSpotPerGram24 = usdPerGram * fxRate;
  }

  const karatFactor =
    typeof yemenSettings?.karat === "number" ? yemenSettings.karat / 24 : 1;

  const yerSpotForSelectedKarat =
    typeof yerSpotPerGram24 === "number"
      ? yerSpotPerGram24 * karatFactor
      : null;

  const yemenPriceLabel =
    yerSpotForSelectedKarat !== null
      ? formatYER(yerSpotForSelectedKarat)
      : translate("Data unavailable", "البيانات غير متوفرة");

  const yemenLastUpdatedRaw =
    (yemenSummary as any)?.meta?.timestamp ??
    (yemenSummary as any)?.lastUpdated ??
    (yemenSummary as any)?.spotPrice?.asOf ??
    spotData?.fetchedAt ??
    spotData?.asOf;

  const yemenLastUpdated =
    typeof yemenLastUpdatedRaw === "string" ||
    typeof yemenLastUpdatedRaw === "number"
      ? new Date(yemenLastUpdatedRaw)
      : yemenLastUpdatedRaw instanceof Date
      ? yemenLastUpdatedRaw
      : null;

  const yemenLastUpdatedLabel =
    yemenLastUpdated && !Number.isNaN(yemenLastUpdated.getTime())
      ? yemenLastUpdated.toLocaleString(isArabic ? "ar-YE" : "en-US")
      : null;

  const currentPrice = spotData ? { price: spotData.usdPerOunce } : null;
  const forecast = forecastData?.forecast?.[0];
  const tabOptions: Array<{
    id: "overview" | "analysis";
    label: string;
  }> = [
    { id: "overview", label: t("overview") || "Overview" },
    { id: "analysis", label: t("charts") || "Forecast & Charts" },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#price-cards" className="skip-link">
        Skip to price cards
      </a>
      <a href="#charts" className="skip-link">
        Skip to charts
      </a>

      {/* 1. GOLD MARKET INTELLIGENCE - Main Header (Primary Focus) */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-500 p-[1px] shadow-2xl"
        role="banner"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {getAssetLabel(settings.asset)} {t("marketIntelligence")}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {t("advancedAnalytics")}
                  </p>
                </div>
              </div>

              {/* Advanced Market Status */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      marketMetrics.trend === "bullish"
                        ? "bg-green-500"
                        : marketMetrics.trend === "bearish"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {marketMetrics.trend === "bullish"
                      ? t("bullish")
                      : marketMetrics.trend === "bearish"
                      ? t("bearish")
                      : t("neutral")}{" "}
                    Trend
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Activity className="h-4 w-4" />
                  <span>Vol: {marketMetrics.volatility.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <Gauge className="h-4 w-4" />
                  <span>RSI: {marketMetrics.rsi.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{lastUpdate.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Header Actions */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? t("refreshing") : t("refresh")}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    showAdvancedMetrics
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Brain className="h-4 w-4" />
                  {t("advanced")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Tabs - Glassmorphic Style */}
      <div className="mt-8 flex justify-center">
        <div className="relative inline-flex rounded-2xl border border-slate-200/60 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/60 p-1.5 shadow-lg backdrop-blur-sm">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />

          <div className="relative inline-flex gap-1">
            {tabOptions.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
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
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* 2. CRITICAL ALERTS - High Priority Notifications */}
          {triggeredAlertsCount > 0 && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-[1px] shadow-lg animate-pulse">
              <div className="rounded-xl bg-white dark:bg-gray-900 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <Bell className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {translate("Alert Triggered!", "تم تفعيل التنبيه!")}
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                          {triggeredAlertsCount}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isArabic
                          ? triggeredAlertsCount === 1
                            ? "لديك تنبيه مفعّل يحتاج إلى اهتمامك."
                            : `لديك ${triggeredAlertsCount} تنبيهات مفعّلة تحتاج إلى اهتمامك.`
                          : triggeredAlertsCount === 1
                          ? "You have a triggered alert that needs your attention."
                          : `You have ${triggeredAlertsCount} triggered alerts that need your attention.`}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/alerts"
                    className="flex-shrink-0 px-5 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                  >
                    {translate("View Alerts", "عرض التنبيهات")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 3. TRADING SIGNAL - AI Recommendation */}
          <TradingSignal asset={settings.asset} currency={settings.currency} />

          {/* 4. SYSTEM STATUS - Meta Information (Compact Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"></div>
        </>
      )}

      {/* Market Insights Grid */}
      <main id="main-content" role="main" className="space-y-8">
        {activeTab === "overview" && (
          <section
            id="price-cards"
            aria-label="Price cards"
            className="space-y-6"
          >
            {/* SECTION 0: Critical Market Insights */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-red-500/10" />
              <div className="relative space-y-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-red-500/15 p-3 ring-1 ring-red-400/40">
                    <Bell className="h-5 w-5 text-red-600 dark:text-red-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {translate(
                        "Critical Market Insights",
                        "أهم الرؤى السوقية"
                      )}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {translate(
                        "Real-time market alerts and key indicators",
                        "تنبيهات السوق في الوقت الفعلي والمؤشرات الرئيسية"
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {marketInsights.map((insight, index) => {
                    const isDark =
                      typeof document !== "undefined"
                        ? document.documentElement.classList.contains("dark")
                        : false;
                    const impactPalette =
                      insight.impact === "positive"
                        ? isDark
                          ? "from-emerald-500/25 via-emerald-500/5 to-transparent"
                          : "from-emerald-100 via-emerald-50/5 to-transparent"
                        : insight.impact === "negative"
                        ? isDark
                          ? "from-rose-500/25 via-rose-500/5 to-transparent"
                          : "from-rose-100 via-rose-50/5 to-transparent"
                        : isDark
                        ? "from-blue-500/25 via-blue-500/5 to-transparent"
                        : "from-blue-100 via-blue-50/5 to-transparent";
                    const badgeColor =
                      insight.severity === "high"
                        ? isDark
                          ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40"
                          : "bg-rose-100 text-rose-700 ring-1 ring-rose-300/60"
                        : insight.severity === "medium"
                        ? isDark
                          ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40"
                          : "bg-amber-100 text-amber-700 ring-1 ring-amber-300/60"
                        : isDark
                        ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/40"
                        : "bg-blue-100 text-blue-700 ring-1 ring-blue-300/60";

                    return (
                      <article
                        key={index}
                        className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-blue-400/40 ${
                          isDark
                            ? "border-slate-200/15 bg-white/70 dark:border-slate-700/40 dark:bg-slate-900/40"
                            : "border-slate-200/60 bg-white/95"
                        }`}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${impactPalette}`}
                          aria-hidden
                        />
                        <div className="relative flex items-start gap-3">
                          <div
                            className={`rounded-xl p-2.5 backdrop-blur ${
                              insight.impact === "positive"
                                ? isDark
                                  ? "bg-emerald-500/15 ring-1 ring-emerald-400/40"
                                  : "bg-emerald-100 ring-1 ring-emerald-300/60"
                                : insight.impact === "negative"
                                ? isDark
                                  ? "bg-rose-500/15 ring-1 ring-rose-400/40"
                                  : "bg-rose-100 ring-1 ring-rose-300/60"
                                : isDark
                                ? "bg-blue-500/15 ring-1 ring-blue-400/40"
                                : "bg-blue-100 ring-1 ring-blue-300/60"
                            }`}
                          >
                            <div
                              className={`${
                                insight.impact === "positive"
                                  ? "text-emerald-600 dark:text-emerald-200"
                                  : insight.impact === "negative"
                                  ? "text-rose-600 dark:text-rose-200"
                                  : "text-blue-600 dark:text-blue-200"
                              }`}
                            >
                              {insight.icon}
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className={`font-semibold text-sm ${
                                  isDark ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {insight.title}
                              </h3>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                              >
                                {insight.severity}
                              </span>
                            </div>
                            <p
                              className={`text-xs ${
                                isDark ? "text-slate-300" : "text-slate-600"
                              }`}
                            >
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                                  isDark ? "bg-white/10" : "bg-slate-200"
                                }`}
                              >
                                <div
                                  className={`h-full rounded-full ${
                                    insight.impact === "positive"
                                      ? isDark
                                        ? "bg-emerald-300"
                                        : "bg-emerald-400"
                                      : insight.impact === "negative"
                                      ? isDark
                                        ? "bg-rose-300"
                                        : "bg-rose-400"
                                      : isDark
                                      ? "bg-blue-300"
                                      : "bg-blue-400"
                                  }`}
                                  style={{ width: `${insight.confidence}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                {insight.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Tutorial Banner - Always visible with dismiss option */}
            {(() => {
              const tutorialCompleted =
                typeof window !== "undefined" &&
                localStorage.getItem("tutorial_completed") === "true";
              // Show banner if not dismissed, OR if tutorial is completed (always show review option)
              const shouldShow = !tutorialBannerDismissed || tutorialCompleted;

              if (!shouldShow) return null;

              return (
                <div className="relative overflow-hidden rounded-2xl border border-yellow-200/60 bg-gradient-to-r from-yellow-50/90 to-orange-50/90 px-5 py-4 shadow-lg backdrop-blur dark:border-yellow-500/40 dark:from-yellow-900/30 dark:to-orange-900/30 mt-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 p-2.5">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                          {tutorialCompleted
                            ? locale === "ar"
                              ? "تريد المراجعة؟"
                              : "Want to review?"
                            : locale === "ar"
                            ? "جديد في GoldVision؟"
                            : "New to GoldVision?"}
                        </h3>
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          {tutorialCompleted
                            ? locale === "ar"
                              ? "راجع الدورة التعليمية لتحديث معرفتك حول أسعار الذهب والتنبيهات والآلات الحاسبة."
                              : "Review the tutorial to refresh your knowledge about gold prices, alerts, and calculators."
                            : locale === "ar"
                            ? "خذ دورة تعليمية سريعة مدتها 5 دقائق للتعرف على أسعار الذهب والتنبيهات والآلات الحاسبة والمزيد!"
                            : "Take a quick 5-minute tutorial to learn about gold prices, alerts, calculators, and more!"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new Event("openTutorial"));
                        }}
                        className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg flex items-center gap-2 whitespace-nowrap transition shadow-md hover:shadow-lg"
                        title={translate(
                          "Start Tutorial",
                          "ابدأ الدورة التعليمية"
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        {translate("Start Tutorial", "ابدأ الدورة")}
                      </button>
                      {!tutorialCompleted && (
                        <button
                          onClick={() => {
                            localStorage.setItem(
                              "tutorial_banner_dismissed",
                              "true"
                            );
                            setTutorialBannerDismissed(true);
                          }}
                          className="p-2 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition"
                          title={translate("Dismiss", "إخفاء")}
                          aria-label="Dismiss banner"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stale Data Warning */}
            {daysSinceLastData !== null && daysSinceLastData > 1 && (
              <div className="relative overflow-hidden rounded-2xl border border-yellow-200/60 bg-yellow-50/80 px-5 py-4 shadow-lg backdrop-blur dark:border-yellow-500/40 dark:bg-yellow-900/30 mt-4">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent" />
                <div className="relative flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                      {translate(
                        "Data May Be Outdated",
                        "قد تكون البيانات قديمة"
                      )}
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {translate(
                        `The forecast is based on data from ${daysSinceLastData} days ago. Historical price data needs updating for more accurate predictions.`,
                        `يعتمد التوقع على بيانات منذ ${daysSinceLastData} يوم. تحتاج بيانات الأسعار التاريخية إلى التحديث للحصول على توقعات أدق.`
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshForecast}
                    disabled={isRefreshingForecast}
                    className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 whitespace-nowrap transition shadow-md"
                    title={translate(
                      "Refresh forecast with latest data",
                      "تحديث التوقع بأحدث البيانات"
                    )}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isRefreshingForecast ? "animate-spin" : ""
                      }`}
                    />
                    {isRefreshingForecast
                      ? translate("Refreshing...", "جارٍ التحديث...")
                      : translate("Refresh", "تحديث")}
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 1: Key Price Metrics */}
            <section className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-amber-500/30 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-500/6 to-orange-500/10" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-500/15 p-3 ring-1 ring-amber-400/40">
                      <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-200" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {translate("Price & Forecast", "السعر والتوقع")}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {translate(
                          "Current market prices and AI-powered forecasts",
                          "أسعار السوق الحالية وتوقعات مدعومة بالذكاء الاصطناعي"
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRefreshForecast}
                    disabled={isRefreshingForecast}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 transition ${
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains("dark")
                        ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                    title={translate(
                      "Refresh forecast with latest data",
                      "تحديث التوقع بأحدث البيانات"
                    )}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isRefreshingForecast ? "animate-spin" : ""
                      }`}
                    />
                    {isRefreshingForecast
                      ? translate("Refreshing...", "جارٍ التحديث...")
                      : translate("Refresh", "تحديث")}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {/* Current Price */}
                  <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-medium text-amber-600 dark:text-amber-300 mb-1">
                          {translate("Current Price", "السعر الحالي")}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {livePrice || currentPrice?.price
                            ? `${settings.currency === "YER" ? "" : "$"}${(
                                livePrice ||
                                currentPrice?.price ||
                                0
                              ).toLocaleString()}`
                            : "N/A"}
                        </p>
                        {livePriceChange !== null && (
                          <div
                            className={`text-sm flex items-center gap-1 font-medium ${
                              livePriceChange >= 0
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-rose-600 dark:text-rose-300"
                            }`}
                          >
                            {livePriceChange >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {Math.abs(livePriceChange).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl p-3 bg-emerald-500/15 ring-1 ring-emerald-400/40">
                        <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-200" />
                      </div>
                    </div>
                  </article>

                  {/* Next Day Forecast */}
                  {forecast && (
                    <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
                      <div
                        key={`forecast-${forecastRefreshKey}-${forecast.yhat}-${
                          forecast.ds
                        }-${(forecastData as any)?._refreshCount || 0}`}
                        className={`relative ${
                          forecastRefreshKey > 0
                            ? "transition-all duration-300"
                            : ""
                        } ${isRefreshingForecast ? "opacity-75" : ""}`}
                      >
                        {isRefreshingForecast && (
                          <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 text-center animate-pulse font-medium">
                            {translate(
                              "Refreshing forecast...",
                              "جاري تحديث التوقع..."
                            )}
                          </div>
                        )}
                        <PriceCard
                          title={t("nextDayForecast")}
                          price={forecast.yhat}
                          date={forecast.ds}
                          confidence={{
                            lower: forecast.yhat_lower,
                            upper: forecast.yhat_upper,
                          }}
                          isForecast={true}
                        />
                        {forecastRefreshKey > 0 &&
                          !isRefreshingForecast &&
                          (forecastData as any)?._refreshedAt && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                    {translate("Last refreshed:", "آخر تحديث:")}{" "}
                                    {new Date(
                                      (forecastData as any)._refreshedAt
                                    ).toLocaleTimeString()}
                                  </span>
                                  {(forecastData as any)?._refreshCount > 1 && (
                                    <span className="ml-1 text-blue-500 font-medium">
                                      ({translate("Refresh", "تحديث")} #
                                      {(forecastData as any)._refreshCount})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Explain why value might not change */}
                              <div className="text-xs text-gray-500 dark:text-gray-400 text-center italic px-2">
                                {translate(
                                  "Note: Forecast value only changes when new price data arrives",
                                  "ملاحظة: تتغير قيمة التوقع فقط عند وصول بيانات سعر جديدة"
                                )}
                              </div>
                            </div>
                          )}
                        {/* Show a brief flash animation when refresh completes */}
                        {forecastRefreshKey > 0 && !isRefreshingForecast && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div
                              key={`flash-${forecastRefreshKey}`}
                              className="absolute inset-0 bg-blue-500/10 rounded-xl animate-ping"
                              style={{ animation: "ping 0.5s ease-out" }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </article>
                  )}

                  {/* Data Source */}
                  <DataSourceCard />

                  {/* Regional Pricing */}
                  <Link
                    to="/regional"
                    className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95 group flex flex-col justify-between"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-base font-medium text-emerald-600 dark:text-emerald-300 mb-1">
                          {translate("Regional Pricing", "التسعير الإقليمي")}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {yemenPriceLabel}
                        </p>
                        {yemenLastUpdatedLabel && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {translate("Last updated", "آخر تحديث")}:{" "}
                            {yemenLastUpdatedLabel}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                          {translate(
                            "Tap to explore Yemen-specific pricing, premiums, and flow reports.",
                            "اضغط لاستكشاف تسعير اليمن، العلاوات، وتقارير التدفق."
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl p-3 bg-emerald-500/15 ring-1 ring-emerald-400/40">
                        <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-200" />
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-300 group-hover:underline">
                      {translate(
                        "View Regional Details",
                        "عرض التفاصيل الإقليمية"
                      )}
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </div>
                  </Link>
                </div>
              </div>
            </section>

            {/* SECTION 2: Market Overview */}
            <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-purple-500/6 to-blue-500/10" />
              <div className="relative space-y-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-500/15 p-3 ring-1 ring-blue-400/40">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {translate("Market Overview", "نظرة عامة على السوق")}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {translate(
                        "Key market indicators and sentiment analysis",
                        "مؤشرات السوق الرئيسية وتحليل المشاعر"
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Market Trend */}
                  <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                          {translate("Market Trend", "اتجاه السوق")}
                        </p>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(marketMetrics.trend)}
                          <span
                            className={`text-lg font-semibold ${getTrendColor(
                              marketMetrics.trend
                            )}`}
                          >
                            {marketMetrics.trend === "bullish"
                              ? translate("Bullish", "صعودي")
                              : marketMetrics.trend === "bearish"
                              ? translate("Bearish", "هبوطي")
                              : translate("Neutral", "محايد")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {translate("Momentum", "الزخم")}:{" "}
                          {typeof marketMetrics.momentum === "number" &&
                          marketMetrics.momentum > 0
                            ? "+"
                            : ""}
                          {typeof marketMetrics.momentum === "number"
                            ? marketMetrics.momentum.toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>
                      <div className="rounded-xl p-3 bg-purple-500/15 ring-1 ring-purple-400/40">
                        <TrendingUpDown className="h-6 w-6 text-purple-600 dark:text-purple-200" />
                      </div>
                    </div>
                  </article>

                  {/* Market Sentiment */}
                  <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-300">
                          {translate("Market Sentiment", "مزاج السوق")}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              marketMetrics.sentiment === "greed"
                                ? "bg-red-500"
                                : marketMetrics.sentiment === "fear"
                                ? "bg-blue-500"
                                : "bg-gray-500"
                            }`}
                          ></div>
                          <span
                            className={`text-lg font-semibold ${getSentimentColor(
                              marketMetrics.sentiment
                            )}`}
                          >
                            {marketMetrics.sentiment === "greed"
                              ? t("greed")
                              : marketMetrics.sentiment === "fear"
                              ? t("fear")
                              : t("neutral")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {translate("RSI", "مؤشر القوة النسبية")}:{" "}
                          {marketMetrics.rsi}
                        </p>
                      </div>
                      <div className="rounded-xl p-3 bg-green-500/15 ring-1 ring-green-400/40">
                        <Brain className="h-6 w-6 text-green-600 dark:text-green-200" />
                      </div>
                    </div>
                  </article>

                  {/* Volatility */}
                  <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                          {translate("Volatility", "التقلب")}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {typeof marketMetrics.volatility === "number"
                            ? marketMetrics.volatility.toFixed(3)
                            : "0.000"}
                          %
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {marketMetrics.volatility > 5
                            ? t("high")
                            : marketMetrics.volatility > 2
                            ? t("medium")
                            : t("low")}
                        </p>
                      </div>
                      <div className="rounded-xl p-3 bg-orange-500/15 ring-1 ring-orange-400/40">
                        <Activity className="h-6 w-6 text-orange-600 dark:text-orange-200" />
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            {/* Advanced Metrics Panel (Collapsible) */}
            {showAdvancedMetrics && (
              <section className="relative overflow-hidden rounded-3xl border border-purple-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60 mt-6 md:mt-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/12 via-indigo-500/6 to-purple-500/10" />
                <div className="relative space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-purple-500/15 p-3 ring-1 ring-purple-400/40">
                        <Layers className="h-5 w-5 text-purple-600 dark:text-purple-200" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {translate(
                            "Advanced Technical Analysis",
                            "تحليل فني متقدم"
                          )}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {translate(
                            "Detailed technical indicators and market metrics",
                            "مؤشرات تقنية مفصلة ومقاييس السوق"
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAdvancedMetrics(false)}
                      className={`rounded-lg p-2 transition ${
                        typeof document !== "undefined" &&
                        document.documentElement.classList.contains("dark")
                          ? "text-slate-400 hover:bg-white/10 hover:text-slate-200"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3
                        className={`font-medium ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {translate("Technical Indicators", "المؤشرات التقنية")}
                      </h3>
                      <div className="space-y-3">
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("RSI (14)", "مؤشر القوة النسبية (14)")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              marketMetrics.rsi > 70
                                ? "text-red-600 dark:text-red-400"
                                : marketMetrics.rsi < 30
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {marketMetrics.rsi.toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("MACD", "مؤشر MACD")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              marketMetrics.macd > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {marketMetrics.macd > 0 ? "+" : ""}
                            {marketMetrics.macd.toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("MACD Signal", "إشارة MACD")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              technicalData?.data?.signal > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {technicalData?.data?.signal > 0 ? "+" : ""}
                            {technicalData?.data?.signal?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("MACD Histogram", "مدرج MACD")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              technicalData?.data?.histogram > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {technicalData?.data?.histogram > 0 ? "+" : ""}
                            {technicalData?.data?.histogram?.toFixed(2) ||
                              "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("SMA 20", "متوسط متحرك 20")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {settings.currency === "YER" ? "" : "$"}
                            {technicalData?.data?.sma20?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("SMA 50", "متوسط متحرك 50")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {settings.currency === "YER" ? "" : "$"}
                            {technicalData?.data?.sma50?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Volatility", "التقلب")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {marketMetrics.volatility.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3
                        className={`font-medium ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {translate("Bollinger Bands", "قنوات بولينجر")}
                      </h3>
                      <div className="space-y-3">
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Upper Band", "الحد العلوي")}
                          </span>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {settings.currency === "YER" ? "" : "$"}
                            {technicalData?.data?.bollingerUpper?.toFixed(2) ||
                              "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Middle Band", "الحد الأوسط")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {settings.currency === "YER" ? "" : "$"}
                            {technicalData?.data?.bollingerMiddle?.toFixed(2) ||
                              "0.00"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Lower Band", "الحد السفلي")}
                          </span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {settings.currency === "YER" ? "" : "$"}
                            {technicalData?.data?.bollingerLower?.toFixed(2) ||
                              "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3
                        className={`font-medium ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {translate("Support & Resistance", "الدعم والمقاومة")}
                      </h3>
                      <div className="space-y-3">
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Resistance", "المقاومة")}
                          </span>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {settings.currency === "YER" ? "" : "$"}
                            {marketMetrics.resistance.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Support", "الدعم")}
                          </span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {settings.currency === "YER" ? "" : "$"}
                            {marketMetrics.support.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Range", "النطاق")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {settings.currency === "YER" ? "" : "$"}
                            {(
                              marketMetrics.resistance - marketMetrics.support
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3
                        className={`font-medium ${
                          typeof document !== "undefined" &&
                          document.documentElement.classList.contains("dark")
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {translate("Market Health", "صحة السوق")}
                      </h3>
                      <div className="space-y-3">
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Liquidity", "السيولة")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              marketMetrics.liquidity === "high"
                                ? "text-green-600 dark:text-green-400"
                                : marketMetrics.liquidity === "low"
                                ? "text-red-600 dark:text-red-400"
                                : "text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            {marketMetrics.liquidity === "high"
                              ? translate("High", "مرتفعة")
                              : marketMetrics.liquidity === "low"
                              ? translate("Low", "منخفضة")
                              : translate("Medium", "متوسطة")}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Data Points", "عدد النقاط")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {marketMetrics.volume}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${
                            typeof document !== "undefined" &&
                            document.documentElement.classList.contains("dark")
                              ? "bg-white/5 border border-white/10"
                              : "bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {translate("Last Update", "آخر تحديث")}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              typeof document !== "undefined" &&
                              document.documentElement.classList.contains(
                                "dark"
                              )
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {lastUpdate.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="real-time-streaming-wrapper mt-8">
              <RealTimeStreaming
                onPriceUpdate={(update) => {
                  setLivePrice(update.price);
                  setLivePriceChange(update.change);
                  setLastUpdate(new Date(update.timestamp));
                }}
                onConnectionChange={(connected) => {
                  if (connected) {
                    toast.success("Real-time price streaming connected");
                  }
                }}
                enableCollaboration={true}
                showMiniPlayer={false}
              />
            </div>

            <section className="relative overflow-hidden rounded-3xl border border-purple-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60 mt-10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/12 via-indigo-500/6 to-purple-500/10" />
              <div className="relative space-y-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-purple-500/15 p-3 ring-1 ring-purple-400/40">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      AI Market Intelligence
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {translate(
                        "AI-powered anomaly detection and news sentiment analysis",
                        "كشف الشذوذ المدعوم بالذكاء الاصطناعي وتحليل مشاعر الأخبار"
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnomalyDetector />
                  <NewsPriceImpact />
                </div>
              </div>
            </section>
          </section>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-8">
            {/* SECTION 3: Charts & Visualization */}
            <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-purple-500/6 to-blue-500/10" />
              <div className="relative">
                <div className="flex items-start gap-3 mb-6">
                  <div className="rounded-2xl bg-blue-500/15 p-3 ring-1 ring-blue-400/40">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Price Charts
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      XAU/USD Gold Spot Price - COMEX Benchmark
                    </p>
                  </div>
                </div>

                {/* Professional Price Display - Like Bloomberg/Reuters */}
                <div className="mb-6">
                  <ProPriceDisplay />
                </div>

                {/* TradingView-Style Chart */}
                <div className="mt-6">
                  <TradingViewXauusdWidget />
                </div>
              </div>
            </section>

            {/* Enhanced Professional Price Action Analysis */}
            <section className="relative overflow-hidden rounded-3xl border border-purple-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/12 via-blue-500/6 to-purple-500/10" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-purple-500/15 p-3 ring-1 ring-purple-400/40">
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-200" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Professional Price Action Analysis
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Advanced OHLC visualization with AI-powered insights and
                        technical indicators
                      </p>
                      {chartDateRange && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(chartDateRange.start),
                              "MMM dd, yyyy"
                            )}{" "}
                            -{" "}
                            {format(
                              new Date(chartDateRange.end),
                              "MMM dd, yyyy"
                            )}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            • {chartDateRange.tradingDays} trading days
                          </span>
                          <span
                            className="text-xs text-gray-400 dark:text-gray-500"
                            title="Weekends and market holidays are excluded"
                          >
                            ℹ️
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (ohlcResp?.data && ohlcResp.data.length > 0) {
                          const timestamp = new Date()
                            .toISOString()
                            .split("T")[0];
                          exportOHLCToCsv(
                            ohlcResp.data,
                            `gold_ohlc_${timestamp}.csv`
                          );
                          toast.success("OHLC data exported successfully!");
                        } else {
                          toast.error("No OHLC data available to export");
                        }
                      }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition ${
                        typeof document !== "undefined" &&
                        document.documentElement.classList.contains("dark")
                          ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                          : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>
                {ohlcResp?.data?.length ? (
                  <CandlestickChart
                    dailyOHLC={ohlcResp.data.map((c) => {
                      // Ensure all OHLC values are valid numbers
                      const open =
                        parseFloat(c.open) || spotData?.usdPerOunce || 0;
                      const close =
                        parseFloat(c.close) || spotData?.usdPerOunce || 0;
                      const high = parseFloat(c.high) || Math.max(open, close);
                      const low = parseFloat(c.low) || Math.min(open, close);
                      const volume = parseFloat(c.volume) || 500000; // Use realistic volume

                      return {
                        timestamp: c.timestamp || c.datetime || c.date,
                        open,
                        high,
                        low,
                        close,
                        volume,
                      };
                    })}
                    onDateRangeChange={handleDateRangeChange}
                  />
                ) : spotData ? (
                  <CandlestickChart
                    dailyOHLC={[
                      {
                        timestamp: spotData.asOf,
                        open: spotData.usdPerOunce,
                        high: spotData.usdPerOunce * 1.001, // Add small variation for realistic chart
                        low: spotData.usdPerOunce * 0.999,
                        close: spotData.usdPerOunce,
                        volume: 500000, // Use realistic volume
                      },
                    ]}
                    onDateRangeChange={handleDateRangeChange}
                  />
                ) : null}
              </div>
            </section>
          </div>
        )}

        <div className="hidden">
          <LiveTicker onTick={handleTick} />
        </div>

        {show403Error && (
          <ErrorBanner
            message="Access denied. You need admin privileges to refresh data."
            type="error"
            onDismiss={() => setShow403Error(false)}
          />
        )}

        <ChatDock
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          context={{
            currentPage: "dashboard",
            symbol: settings.asset,
            currency: settings.currency,
          }}
          initialMessage="Can you analyze the current market conditions and provide insights based on the technical indicators?"
        />
      </main>
    </div>
  );
};

export default Dashboard;
