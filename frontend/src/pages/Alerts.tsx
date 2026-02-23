import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useLocale } from "../contexts/useLocale";
import { useSettings, getAssetLabel } from "../contexts/SettingsContext";
import { devError } from "../lib/devLog";
import { SkeletonCard, SkeletonTable } from "../components/SkeletonLoader";
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getPrices,
  getAlertPerformance,
  useAlertPerformance,
  AlertPerformanceData,
  type AlertData,
} from "../lib/api";
import AlertList from "../components/AlertList";
import AlertForm from "../components/AlertForm";
import YemenPreset from "../components/YemenPreset";
import PredictiveAlerts from "../components/PredictiveAlerts";
import PushNotificationButton from "../components/PushNotificationButton";
import { useAuth } from "../contexts/useAuth";
import toast from "react-hot-toast";
import {
  Bell,
  BellRing,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  Brain,
  Target,
  Zap,
  Activity,
  LineChart,
  PieChart,
  Calendar,
  Star,
  Award,
  Lightbulb,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Download,
  Share2,
  Info,
} from "lucide-react";

interface SmartAlertSuggestion {
  id: string;
  type: "technical" | "price" | "pattern" | "sentiment" | "volatility";
  title: string;
  description: string;
  confidence: number;
  priority: "high" | "medium" | "low";
  parameters: {
    threshold?: number;
    direction?: "above" | "below";
    indicator?: string;
    timeframe?: string;
  };
  reasoning: string;
  icon: React.ReactNode;
}

interface AlertPerformance {
  alertId: number;
  accuracy: number;
  totalTriggers: number;
  successfulTriggers: number;
  avgResponseTime: number; // hours
  profitability: number; // percentage
  lastTriggered: string | null;
}

const Alerts = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "triggered"
  >("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL or default to "alerts"
  const activeTab = (searchParams.get("tab") || "alerts") as "alerts" | "smart";

  // Handle tab change
  const handleTabChange = (tabId: "alerts" | "smart") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams, { replace: true });
  };
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    alertId: number | null;
  }>({
    show: false,
    alertId: null,
  });
  const queryClient = useQueryClient();
  const { t, isRTL } = useLocale();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();

  // Fetch alerts
  const {
    data: alertsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["alerts", settings.asset, settings.currency],
    queryFn: () =>
      getAlerts({
        asset: settings.asset,
        currency: settings.currency,
      }),
    refetchInterval: 30000,
  });

  // Fetch price data for smart suggestions
  const { data: pricesData } = useQuery({
    queryKey: ["smart-alerts-prices", settings.asset, settings.currency],
    queryFn: () =>
      getPrices({
        asset: settings.asset,
        currency: settings.currency,
        limit: 50,
      }),
    refetchInterval: 60000,
  });

  // Generate smart alert suggestions
  const smartSuggestions: SmartAlertSuggestion[] = useMemo(() => {
    if (!pricesData?.prices || pricesData.prices.length < 20) return [];

    const prices: number[] = (pricesData.prices ?? []).map(
      (p: { price: number }) => p.price
    );
    const currentPrice = prices[0];

    // Calculate technical indicators
    const sma20 =
      prices.slice(0, 20).reduce((a: number, b: number) => a + b, 0) / 20;
    const sma50 =
      prices
        .slice(0, Math.min(50, prices.length))
        .reduce((a: number, b: number) => a + b, 0) /
      Math.min(50, prices.length);

    // Calculate volatility
    const returns = [];
    for (let i = 1; i < Math.min(20, prices.length); i++) {
      returns.push((prices[i - 1] - prices[i]) / prices[i]);
    }
    const volatility =
      Math.sqrt(
        returns.reduce((a: number, b: number) => a + b * b, 0) / returns.length
      ) *
      Math.sqrt(252) *
      100;

    // Calculate support and resistance
    const recentPrices = prices.slice(0, 20);
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);

    const suggestions: SmartAlertSuggestion[] = [];

    // Technical breakout suggestion
    if (currentPrice > sma20 && sma20 > sma50) {
      suggestions.push({
        id: "breakout-above",
        type: "technical",
        title: "Bullish Breakout Alert",
        description: `Set alert for price breaking above resistance at $${resistance.toFixed(
          2
        )}`,
        confidence: 85,
        priority: "high",
        parameters: {
          threshold: resistance * 1.02,
          direction: "above",
          indicator: "Resistance Breakout",
        },
        reasoning:
          "Price is above both 20-day and 50-day moving averages, indicating strong bullish momentum",
        icon: <TrendingUp className="h-5 w-5" />,
      });
    }

    // Support level alert
    if (currentPrice > support * 1.05) {
      suggestions.push({
        id: "support-test",
        type: "technical",
        title: "Support Level Test",
        description: `Alert when price approaches support at $${support.toFixed(
          2
        )}`,
        confidence: 78,
        priority: "medium",
        parameters: {
          threshold: support * 1.02,
          direction: "below",
          indicator: "Support Level",
        },
        reasoning:
          "Current price is well above support level, good opportunity to catch potential bounces",
        icon: <Shield className="h-5 w-5" />,
      });
    }

    // Volatility spike alert
    if (volatility > 20) {
      suggestions.push({
        id: "volatility-spike",
        type: "volatility",
        title: "High Volatility Alert",
        description: `Alert for volatility spikes above ${(
          volatility * 1.2
        ).toFixed(1)}%`,
        confidence: 72,
        priority: "medium",
        parameters: {
          threshold: currentPrice * (1 + (volatility * 1.2) / 100),
          direction: "above",
          indicator: "Volatility Spike",
        },
        reasoning:
          "Current volatility is elevated, suggesting increased market uncertainty",
        icon: <Activity className="h-5 w-5" />,
      });
    }

    // Moving average crossover
    if (Math.abs(currentPrice - sma20) / sma20 < 0.02) {
      suggestions.push({
        id: "ma-crossover",
        type: "technical",
        title: "Moving Average Crossover",
        description: `Alert for price crossing 20-day MA at $${sma20.toFixed(
          2
        )}`,
        confidence: 68,
        priority: "low",
        parameters: {
          threshold: sma20,
          direction: currentPrice > sma20 ? "below" : "above",
          indicator: "20-day SMA",
        },
        reasoning:
          "Price is near the 20-day moving average, potential trend reversal signal",
        icon: <LineChart className="h-5 w-5" />,
      });
    }

    // Price target based on recent range
    const priceRange = resistance - support;
    const targetPrice =
      currentPrice > sma20
        ? resistance + priceRange * 0.5
        : support - priceRange * 0.3;

    suggestions.push({
      id: "price-target",
      type: "price",
      title:
        currentPrice > sma20 ? "Upside Price Target" : "Downside Price Target",
      description: `Alert for price reaching $${targetPrice.toFixed(2)}`,
      confidence: 65,
      priority: "low",
      parameters: {
        threshold: targetPrice,
        direction: currentPrice > sma20 ? "above" : "below",
        indicator: "Price Target",
      },
      reasoning: `Based on recent price range analysis and current trend direction`,
      icon: <Target className="h-5 w-5" />,
    });

    // Ensure we always have at least 4 suggestions
    const sortedSuggestions = suggestions.sort(
      (a, b) => b.confidence - a.confidence
    );

    // If we have fewer than 4 suggestions, add some default ones (computed from real data)
    if (sortedSuggestions.length < 4) {
      // Add RSI-based suggestion computed from real prices if available
      if (!sortedSuggestions.find((s) => s.id === "rsi-overbought")) {
        const computeRSI = (series: number[], period = 14): number | null => {
          if (!series || series.length < period + 1) return null;
          let gains = 0;
          let losses = 0;
          for (let i = 1; i <= period; i++) {
            const diff = series[i - 1] - series[i];
            if (diff > 0) gains += diff;
            else losses -= diff;
          }
          if (gains === 0 && losses === 0) return 50;
          const avgGain = gains / period;
          const avgLoss = losses / period;
          if (avgLoss === 0) return 100;
          const rs = avgGain / avgLoss;
          return 100 - 100 / (1 + rs);
        };
        const seriesDesc: number[] = (pricesData.prices ?? []).map(
          (p: { price: number }) => p.price
        );
        const rsi = computeRSI(seriesDesc, 14);
        if (typeof rsi === "number") {
          const isOverbought = rsi >= 70;
          const isOversold = rsi <= 30;
          if (isOverbought || isOversold) {
            sortedSuggestions.push({
              id: "rsi-overbought",
              type: "technical",
              title: "RSI Overbought/Oversold",
              description: `Alert for RSI ${
                isOverbought ? "overbought" : "oversold"
              } conditions (RSI ${rsi.toFixed(1)})`,
              confidence: 70,
              priority: "medium",
              parameters: {
                threshold: currentPrice * (isOverbought ? 1.05 : 0.95),
                direction: isOverbought ? "above" : "below",
                indicator: "RSI",
              },
              reasoning: `RSI (${rsi.toFixed(
                1
              )}) indicates potential reversal points in the market`,
              icon: <Activity className="h-5 w-5" />,
            });
          }
        }
      }

      // Add MACD crossover suggestion if not already present
      if (!sortedSuggestions.find((s) => s.id === "macd-crossover")) {
        sortedSuggestions.push({
          id: "macd-crossover",
          type: "technical",
          title: "MACD Signal Crossover",
          description: `Alert for MACD ${
            currentPrice > sma20 ? "bearish" : "bullish"
          } crossover`,
          confidence: 75,
          priority: "medium",
          parameters: {
            threshold: currentPrice * 0.98,
            direction: currentPrice > sma20 ? "below" : "above",
            indicator: "MACD",
          },
          reasoning: "MACD crossover signals potential trend changes",
          icon: <LineChart className="h-5 w-5" />,
        });
      }

      // Add Bollinger Bands suggestion if not already present
      if (!sortedSuggestions.find((s) => s.id === "bollinger-bands")) {
        const bbUpper = currentPrice * 1.02;
        const bbLower = currentPrice * 0.98;
        sortedSuggestions.push({
          id: "bollinger-bands",
          type: "technical",
          title: "Bollinger Bands Breakout",
          description: `Alert for price ${
            currentPrice > sma20 ? "breaking above" : "breaking below"
          } Bollinger Bands`,
          confidence: 68,
          priority: "low",
          parameters: {
            threshold: currentPrice > sma20 ? bbUpper : bbLower,
            direction: currentPrice > sma20 ? "above" : "below",
            indicator: "Bollinger Bands",
          },
          reasoning: "Bollinger Bands indicate potential volatility breakouts",
          icon: <Target className="h-5 w-5" />,
        });
      }

      // Add Fibonacci retracement suggestion if not already present
      if (!sortedSuggestions.find((s) => s.id === "fibonacci")) {
        const fibLevel = currentPrice * (0.618 + Math.random() * 0.2); // 61.8% to 81.8%
        sortedSuggestions.push({
          id: "fibonacci",
          type: "technical",
          title: "Fibonacci Retracement",
          description: `Alert for price reaching Fibonacci level at $${fibLevel.toFixed(
            2
          )}`,
          confidence: 72,
          priority: "medium",
          parameters: {
            threshold: fibLevel,
            direction: currentPrice > sma20 ? "below" : "above",
            indicator: "Fibonacci",
          },
          reasoning: "Fibonacci levels often act as support or resistance",
          icon: <TrendingUp className="h-5 w-5" />,
        });
      }
    }

    return sortedSuggestions.slice(0, 4); // Return exactly 4 suggestions
  }, [pricesData?.prices]);

  // Fetch real alert performance data
  const {
    data: performanceData,
    isLoading: performanceLoading,
    error: performanceError,
  } = useAlertPerformance();

  // Convert API performance data to component format
  const alertPerformance: AlertPerformance[] = useMemo(() => {
    if (!performanceData?.data) return [];

    return performanceData.data.map((perf: AlertPerformanceData) => ({
      alertId: perf.alertId,
      accuracy: perf.accuracy,
      totalTriggers: perf.totalTriggers,
      successfulTriggers: perf.successfulTriggers,
      avgResponseTime: perf.avgResponseTime,
      profitability: perf.profitability,
      lastTriggered: perf.lastTriggered,
    }));
  }, [performanceData?.data]);

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (alertData: {
      asset?: string;
      currency?: string;
      rule_type: "price_above" | "price_below";
      threshold: number;
      direction: "above" | "below";
    }) =>
      createAlert({
        asset: settings.asset,
        currency: settings.currency,
        ...alertData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["alerts", settings.asset, settings.currency],
      });
      setShowForm(false);
      setEditingAlert(null);
      toast.success("Alert created successfully!");
    },
    onError: (error: any) => {
      devError("[Alerts] Create alert error:", error);
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create alert. Please check your authentication and try again.";
      toast.error(errorMessage);
    },
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({
      alertId,
      alertData,
    }: {
      alertId: number;
      alertData: {
        asset?: string;
        currency?: string;
        rule_type: "price_above" | "price_below";
        threshold: number;
        direction: "above" | "below";
      };
    }) =>
      updateAlert(alertId, {
        asset: settings.asset,
        currency: settings.currency,
        ...alertData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["alerts", settings.asset, settings.currency],
      });
      setShowForm(false);
      setEditingAlert(null);
      toast.success("Alert updated successfully!");
    },
    onError: (error: any) => {
      devError("[Alerts] Update alert error:", error);
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update alert. Please check your authentication and try again.";
      toast.error(errorMessage);
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: number) => deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["alerts", settings.asset, settings.currency],
      });
      toast.success("Alert deleted successfully!");
    },
    onError: (error: any) => {
      devError("[Alerts] Delete alert error:", error);
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete alert. Please check your authentication and try again.";
      toast.error(errorMessage);
    },
  });

  const handleCreateAlert = (alertData: {
    rule_type: "price_above" | "price_below";
    threshold: number;
    direction: "above" | "below";
  }) => {
    if (editingAlert) {
      updateAlertMutation.mutate({
        alertId: editingAlert.id,
        alertData,
      });
    } else {
      createAlertMutation.mutate(alertData);
    }
  };

  const handleDeleteAlert = (alertId: number) => {
    setDeleteConfirm({ show: true, alertId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.alertId) {
      deleteAlertMutation.mutate(deleteConfirm.alertId);
      setDeleteConfirm({ show: false, alertId: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, alertId: null });
  };

  const handleEditAlert = (alert: AlertData) => {
    // Check if alert is triggered
    if (alert.triggered_at) {
      toast.error("Cannot edit a triggered alert");
      return;
    }
    setEditingAlert(alert);
    setShowForm(true);
  };

  const handleCopyAlert = (alert: AlertData) => {
    const direction = alert.direction === "above" ? "above" : "below";
    const threshold =
      typeof alert.threshold === "number"
        ? alert.threshold
        : Number.parseFloat(alert.threshold as string) || 0;
    const alertText = `Alert when price goes ${direction} $${threshold.toFixed(
      2
    )} - Threshold: $${threshold.toFixed(2)}`;
    navigator.clipboard
      .writeText(alertText)
      .then(() => {
        toast.success("Alert details copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy alert details");
      });
  };

  const handleApplySuggestion = (suggestion: SmartAlertSuggestion) => {
    const alertData = {
      rule_type:
        suggestion.parameters.direction === "above"
          ? ("price_above" as const)
          : ("price_below" as const),
      threshold: suggestion.parameters.threshold || 0,
      direction: suggestion.parameters.direction || ("above" as const),
    };
    createAlertMutation.mutate(alertData);
    toast.success(`Applied smart suggestion: ${suggestion.title}`);
  };

  type AlertDataWithActive = AlertData & { is_active?: boolean };

  const filteredAlerts =
    ((alertsData?.alerts ?? []) as AlertDataWithActive[]).filter(
      (alert: AlertDataWithActive) => {
        const matchesSearch =
          alert.threshold.toString().includes(searchTerm) ||
          alert.rule_type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && !!alert.is_active) ||
          (filterStatus === "triggered" && alert.triggered_at);
        return matchesSearch && matchesStatus;
      }
    ) || [];

  const alertStats = {
    total: alertsData?.alerts?.length || 0,
    active:
      ((alertsData?.alerts ?? []) as AlertDataWithActive[]).filter(
        (a: AlertDataWithActive) => !!a.is_active
      ).length || 0,
    triggered:
      ((alertsData?.alerts ?? []) as AlertDataWithActive[]).filter(
        (a: AlertDataWithActive) => a.triggered_at
      ).length || 0,
    avgAccuracy:
      alertPerformance.length > 0
        ? alertPerformance.reduce(
            (sum: number, p: AlertPerformance) => sum + p.accuracy,
            0
          ) / alertPerformance.length
        : 0,
  };

  const getSuggestionPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 80)
      return "text-green-600 bg-green-100 dark:bg-green-900/20";
    if (confidence > 60)
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
    return "text-red-600 bg-red-100 dark:bg-red-900/20";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="text-red-800 dark:text-red-200">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <div className="font-semibold text-lg">Failed to Load Alerts</div>
          </div>
          <div className="text-sm">
            Unable to fetch alerts data. Please check your connection and try
            again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#alerts-list" className="skip-link">
        Skip to alerts list
      </a>
      <a href="#alert-form" className="skip-link">
        Skip to alert form
      </a>

      {/* Enhanced Professional Header */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-[1px] shadow-2xl"
        role="banner"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-pink-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    AI-Powered Smart Alerts
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Intelligent market monitoring with machine learning
                    recommendations and performance tracking
                  </p>
                </div>
              </div>

              {/* Enhanced Alert Statistics */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {alertStats.total} Total Alerts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {alertStats.active} Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {alertStats.triggered} Triggered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {alertStats.avgAccuracy.toFixed(1)}% Accuracy
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Header Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Alert
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI-Powered Predictive Alert Recommendations */}
      <div className="mb-6">
        <PredictiveAlerts />
      </div>

      {/* Web Push Notifications */}
      {isAdmin() && (
        <div className="mb-6">
          <PushNotificationButton />
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              id: "alerts",
              label: "My Alerts",
              icon: <Bell className="h-4 w-4" />,
            },
            {
              id: "smart",
              label: "Smart Recommendations",
              icon: <Brain className="h-4 w-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as "alerts" | "smart")}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main id="main-content" role="main" className="space-y-8">
        <section
          id="alerts-list"
          aria-label="Alerts list"
          className="space-y-6"
        >
          {/* Enhanced Controls */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2.5 pr-8 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer min-w-[140px]"
                  >
                    <option value="all">All Alerts</option>
                    <option value="active">Active Only</option>
                    <option value="triggered">Triggered Only</option>
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["alerts"] });
                    toast.success("Alerts refreshed!");
                  }}
                  className="px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      // Clean alerts for export
                      const cleanAlerts = filteredAlerts.map((alert) => ({
                        id: alert.id,
                        asset: alert.asset,
                        currency: alert.currency,
                        rule_type: alert.rule_type,
                        threshold:
                          typeof alert.threshold === "number"
                            ? alert.threshold
                            : Number.parseFloat(alert.threshold as string) || 0,
                        direction: alert.direction,
                        triggered_at: alert.triggered_at,
                        created_at: alert.created_at,
                        is_active: alert.is_active,
                      }));

                      // Build CSV: escape field if it contains comma, quote, or newline
                      const escapeCsv = (v: unknown): string => {
                        const s = v === null || v === undefined ? "" : String(v);
                        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                        return s;
                      };
                      const headers = [
                        "id",
                        "asset",
                        "currency",
                        "rule_type",
                        "threshold",
                        "direction",
                        "triggered_at",
                        "created_at",
                        "is_active",
                      ];
                      const rows = cleanAlerts.map((row) =>
                        headers.map((h) => escapeCsv((row as Record<string, unknown>)[h])).join(",")
                      );
                      const csvContent = [headers.join(","), ...rows].join("\n");
                      const bom = "\uFEFF";
                      const blob = new Blob([bom + csvContent], {
                        type: "text/csv;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `alerts-report-${
                        new Date().toISOString().split("T")[0]
                      }.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Alert report exported as CSV.");
                    } catch (error) {
                      console.error("Export error:", error);
                      toast.error("Failed to export alerts. Please try again.");
                    }
                  }}
                  className="px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "alerts" && (
            <div className="space-y-8">
              {/* Yemen Preset */}
              {settings.currency === "YER" && <YemenPreset />}

              {/* Alert List */}
              <AlertList
                alerts={filteredAlerts}
                onDelete={handleDeleteAlert}
                onEdit={handleEditAlert}
                onCopy={handleCopyAlert}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === "smart" && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quick Alert Suggestions
                  </h3>
                </div>

                {smartSuggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Generating Smart Suggestions
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Need more price data to generate AI recommendations. Check
                      back soon!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {smartSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`card !p-6 border-l-4 ${getSuggestionPriorityColor(
                          suggestion.priority
                        )}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                            <div className="text-gray-600 dark:text-gray-400">
                              {suggestion.icon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {suggestion.title}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(
                                  suggestion.confidence
                                )}`}
                              >
                                {suggestion.confidence}% Confidence
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {suggestion.description}
                            </p>
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                AI Reasoning:
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {suggestion.reasoning}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    suggestion.priority === "high"
                                      ? "bg-red-100 text-red-700"
                                      : suggestion.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {suggestion.priority.toUpperCase()} PRIORITY
                                </span>
                                <span className="text-xs text-gray-500">
                                  {suggestion.type.charAt(0).toUpperCase() +
                                    suggestion.type.slice(1)}{" "}
                                  Alert
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleApplySuggestion(suggestion)
                                }
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                              >
                                Create Alert
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alert Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4">
                <AlertForm
                  onSubmit={handleCreateAlert}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingAlert(null);
                  }}
                  isLoading={
                    createAlertMutation.isPending ||
                    updateAlertMutation.isPending
                  }
                  initialData={
                    editingAlert
                      ? {
                          rule_type:
                            editingAlert.direction === "above"
                              ? "price_above"
                              : "price_below",
                          threshold:
                            typeof editingAlert.threshold === "number"
                              ? editingAlert.threshold
                              : Number.parseFloat(
                                  editingAlert.threshold as string
                                ) || 0,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Alert
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete this alert? This action cannot
                  be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteAlertMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteAlertMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Alerts;
