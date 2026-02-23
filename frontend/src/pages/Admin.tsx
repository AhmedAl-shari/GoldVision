import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getDataSourceStatus,
  getMetricsSnapshot,
  getSchedulerStatus,
  getModelHealth,
  requestRetrain,
} from "../lib/api";
import { API_BASE_URL } from "../lib/config";
import { useAuth } from "../contexts/useAuth";
import { useLocale } from "../contexts/useLocale";
import { SkeletonTable, SkeletonCard } from "../components/SkeletonLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LiveMetrics from "../components/LiveMetrics";
import BuildInfoCard from "../components/BuildInfoCard";
import { useNetworkInfo } from "../hooks/useNetworkInfo";
import QRCodeGenerator from "../components/QRCodeGenerator";
import UserManagement from "../components/UserManagement";
import AlertAnalytics from "../components/AlertAnalytics";
import DatabaseStats from "../components/DatabaseStats";
import NewsAnalytics from "../components/NewsAnalytics";
import { devError } from "../lib/devLog";
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Zap,
  FileText,
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Wifi,
} from "lucide-react";

const Admin = () => {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const networkInfo = useNetworkInfo();

  const glassPanel =
    "relative overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 px-6 py-6 shadow-xl backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/45";

  // Fetch admin data with shorter intervals for real-time feel
  const {
    data: dataSourceData,
    isLoading: dataSourceLoading,
    error: dataSourceError,
    refetch: refetchDataSource,
  } = useQuery({
    queryKey: ["admin-data-source"],
    queryFn: getDataSourceStatus,
    refetchInterval: autoRefresh ? 10000 : false, // 10 seconds
    enabled: user?.role === "admin",
  });

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getMetricsSnapshot,
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: user?.role === "admin",
  });

  const {
    data: schedulerData,
    isLoading: schedulerLoading,
    error: schedulerError,
    refetch: refetchScheduler,
  } = useQuery({
    queryKey: ["admin-scheduler"],
    queryFn: getSchedulerStatus,
    refetchInterval: autoRefresh ? 15000 : false, // 15 seconds
    enabled: user?.role === "admin",
  });

  const {
    data: modelHealth,
    isLoading: modelHealthLoading,
    error: modelHealthError,
    refetch: refetchModelHealth,
  } = useQuery({
    queryKey: ["admin-model-health"],
    queryFn: getModelHealth,
    refetchInterval: autoRefresh ? 20000 : false, // 20 seconds
    enabled: user?.role === "admin",
  });

  // Mutations (Email mutation removed)

  const retrainMutation = useMutation({
    mutationFn: requestRetrain,
    onSuccess: () => {
      toast.success(t("retrainRequestSubmitted"));
    },
    onError: (error: unknown) => {
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "detail" in error.response.data
          ? (error.response.data as { detail: string }).detail
          : t("failedToSubmitRequest");
      toast.error(errorMessage);
    },
  });

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Update last refresh time
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Manual refresh function
  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await Promise.all([
      refetchDataSource(),
      refetchMetrics(),
      refetchScheduler(),
      refetchModelHealth(),
    ]);
    toast.success(t("allDataRefreshed"));
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  const isLoading =
    dataSourceLoading ||
    metricsLoading ||
    schedulerLoading ||
    modelHealthLoading;

  const hasError =
    dataSourceError ||
    metricsError ||
    schedulerError ||
    modelHealthError;

  const hasAnyData =
    dataSourceData ||
    metricsData ||
    schedulerData ||
    modelHealth;

  // Utility functions
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Extract metrics from the new JSON format
  const getMetricValue = (metricName: string) => {
    if (!metricsData?.metrics) return 0;
    const metric = metricsData.metrics.find((m) => m.name === metricName);
    if (!metric?.values || metric.values.length === 0) return 0;

    // For counters, sum all values; for gauges, take the first value
    if (metric.type === "counter") {
      return metric.values.reduce((sum, v) => sum + v.value, 0);
    } else {
      return metric.values[0]?.value || 0;
    }
  };

  const getUptimeSeconds = () => {
    if (!metricsData?.metrics) return 0;
    const startTimeMetric = metricsData.metrics.find(
      (m) => m.name === "process_start_time_seconds"
    );
    if (!startTimeMetric?.values || startTimeMetric.values.length === 0)
      return 0;

    const startTime = startTimeMetric.values[0].value;
    return Math.floor(Date.now() / 1000 - startTime);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return t("never");
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
      case "active":
      case "running":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20";
      case "degraded":
      case "warning":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20";
      case "error":
      case "failed":
      case "stopped":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getHealthScore = () => {
    let score = 100;
    let issues = 0;

    // Check data source
    if (dataSourceData?.status !== "active" && dataSourceData?.status !== "healthy") {
      score -= 20;
      issues++;
    }

    // Check scheduler
    if (schedulerData?.tasks?.price_fetch?.consecutive_failures > 0) {
      score -= 15;
      issues++;
    }

    // Check model health
    if (modelHealth?.retrain_suggested) {
      score -= 10;
      issues++;
    }

    return { score: Math.max(0, score), issues };
  };

  const refreshSchedulerNow = async () => {
    const toastId = toast.loading("Refreshing scheduler...");
    try {
      await refetchScheduler();
      toast.success("Scheduler status refreshed", { id: toastId });
    } catch (error) {
      devError("Failed to refresh scheduler", error);
      toast.error("Failed to refresh scheduler", { id: toastId });
    }
  };

  const healthScore = getHealthScore();

  if (isLoading && !hasAnyData) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonTable rows={3} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (hasError && !hasAnyData) {
    return (
      <div
        className={`${glassPanel} border-rose-200/60 bg-rose-50/80 dark:border-rose-800/60 dark:bg-rose-900/30`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent" />
        <div className="relative text-rose-800 dark:text-rose-200">
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 ring-1 ring-rose-400/40">
              <AlertTriangle className="h-5 w-5" />
          </div>
            <div className="text-lg font-semibold">System Unavailable</div>
          </div>
          <div className="mb-4 text-sm">
            Unable to connect to backend services. This could be due to:
          </div>
          <ul className="mb-6 list-disc list-inside space-y-1 text-sm">
            <li>Backend server is not running</li>
            <li>Network connectivity issues</li>
            <li>Database connection problems</li>
            <li>System resource constraints</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleRefresh} className="btn btn-primary btn-sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </button>
            <button
              onClick={() => window.open(`${API_BASE_URL}/health`, "_blank")}
              className="btn btn-secondary btn-sm"
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Check Backend Health
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12" data-testid="admin">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#system-status" className="skip-link">
        Skip to system status
      </a>
      <a href="#metrics" className="skip-link">
        Skip to metrics
      </a>

      {/* Enhanced Header */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-[1px] shadow-2xl"
        role="banner"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    System monitoring, operations, and observability tools
                  </p>
                </div>
              </div>

              {/* System Health Score */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      healthScore.score >= 90
                        ? "bg-green-500"
                        : healthScore.score >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    System Health: {healthScore.score}%
                  </span>
                </div>
                {healthScore.issues > 0 && (
                  <div className="flex items-center gap-1 text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {healthScore.issues} issue
                      {healthScore.issues > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    autoRefresh
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {autoRefresh ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {autoRefresh ? t("autoRefresh") : t("paused")}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Last Refresh Indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            {autoRefresh && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Live Metrics Dashboard */}
      <div className={`${glassPanel}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
        <div className="relative">
        <LiveMetrics />
        </div>
      </div>

      {/* Build Information */}
      <div className={`${glassPanel}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent" />
        <div className="relative">
        <BuildInfoCard />
        </div>
      </div>

      {/* LAN Access QR Code */}
      <div className={`${glassPanel}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent" />
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-400/30">
              <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                LAN Access QR Code
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Access GoldVision on your local network
              </p>
            </div>
          </div>

          {networkInfo.isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/60 bg-white/80 p-8 dark:border-slate-700/60 dark:bg-slate-900/60">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Detecting network...
              </span>
            </div>
          ) : networkInfo.error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-300/60 bg-rose-50/80 p-4 dark:border-rose-800/60 dark:bg-rose-900/30">
                <div className="flex items-start gap-3 text-sm text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Network detection failed</p>
                    <p className="mt-1 text-xs opacity-80">{networkInfo.error}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
                <QRCodeGenerator url="http://localhost:5173" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
              <QRCodeGenerator url={networkInfo.url} />
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" role="main" className="space-y-8">
        <section
          id="system-status"
          aria-label="System status"
          className="space-y-6"
        >
          {/* System Status Overview */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Data Source Status */}
            <div className={`${glassPanel}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-blue-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-500/15 p-2 ring-1 ring-blue-400/30">
                      <Database className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Data Source
                  </h2>
                </div>
                {dataSourceLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    Status
                  </span>
                  <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                      dataSourceData?.status || "unknown"
                    )}`}
                  >
                    {dataSourceData?.status || "Unknown"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        Last Fetch
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {dataSourceData?.last_fetch_at
                          ? new Date(dataSourceData.last_fetch_at).toLocaleString()
                          : "N/A"}
                    </div>
                  </div>
                  <div>
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        Provider
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {dataSourceData?.provider_type || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        Latency
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        {dataSourceData?.latency_ms || dataSourceData?.latencyMs
                          ? `${dataSourceData.latency_ms || dataSourceData.latencyMs}ms`
                          : "--"}
                    </div>
                  </div>
                  <div>
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        Success Rate
                    </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        {dataSourceData?.success_rate !== null && dataSourceData?.success_rate !== undefined
                          ? `${dataSourceData.success_rate}%`
                          : dataSourceData?.successRate !== null && dataSourceData?.successRate !== undefined
                          ? `${dataSourceData.successRate}%`
                          : "--"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        Last Price
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {dataSourceData?.last_price?.price
                          ? `$${dataSourceData.last_price.price.toFixed(2)}`
                          : "--"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <button
                        onClick={() => refetchDataSource()}
                        className="inline-flex items-center rounded-lg bg-blue-500/15 px-3 py-1.5 font-semibold text-blue-600 transition hover:bg-blue-500/25 dark:text-blue-200"
                      >
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        Refresh
                      </button>
                      <button
                        onClick={() =>
                          window.open(`${API_BASE_URL}/data-source`, "_blank")
                        }
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        View Raw
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduler */}
            <div className={`${glassPanel}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/15 p-2 ring-1 ring-amber-400/30">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Scheduler
                  </h2>
                </div>
                {schedulerLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-amber-500"></div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    Interval
                  </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {schedulerData?.interval_minutes
                        ? `${schedulerData.interval_minutes} min`
                        : schedulerData?.interval || "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                      Last Run
                  </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {schedulerData?.last_run
                        ? formatDateTime(schedulerData.last_run)
                        : schedulerData?.tasks?.price_fetch?.last_run
                        ? formatDateTime(schedulerData.tasks.price_fetch.last_run)
                        : "Never"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                      Next Run
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {schedulerData?.next_run
                        ? formatDateTime(schedulerData.next_run)
                        : schedulerData?.tasks?.price_fetch?.next_run
                        ? formatDateTime(schedulerData.tasks.price_fetch.next_run)
                        : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                      Status
                  </span>
                  <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        schedulerData?.status === "running"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-200"
                    }`}
                  >
                      {schedulerData?.status || "Unknown"}
                  </span>
                </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        Total Runs
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {schedulerData?.total_runs !== undefined 
                          ? schedulerData.total_runs 
                          : schedulerData?.totalRuns || 0}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <button
                        onClick={refreshSchedulerNow}
                        className="inline-flex items-center rounded-lg bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-200"
                      >
                        <Zap className="mr-2 h-3.5 w-3.5" />
                        Refresh Scheduler
                      </button>
                      <button
                        onClick={() =>
                          window.open(`${API_BASE_URL}/scheduler`, "_blank")
                        }
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        View Scheduler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Health */}
          <div className={`${glassPanel}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-400/30">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Model Health
                </h2>
              </div>
              {modelHealthLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-500"></div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    MAPE (7-day)
                  </span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                      {modelHealth?.mape_trend?.rolling_7_day || "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                      Drift Status
                  </span>
                  <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        modelHealth?.drift_status?.level === "red"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-200"
                          : modelHealth?.drift_status?.level === "yellow"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-200"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                    }`}
                  >
                    {(
                      modelHealth?.drift_status?.level || "green"
                    ).toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    Retrain Suggested
                  </span>
                  <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      modelHealth?.retrain_suggested
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-200"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                    }`}
                  >
                    {modelHealth?.retrain_suggested ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                    retrainMutation.mutate(
                      "Manual retrain request from admin"
                    )
                }
                disabled={retrainMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  <RotateCcw
                    className={`h-4 w-4 ${
                      retrainMutation.isPending ? "animate-spin" : ""
                    }`}
                  />
                  {retrainMutation.isPending
                    ? "Submitting..."
                    : "Request Retrain"}
              </button>
              </div>
            </div>
          </div>

        </section>

        {/* Alert Analytics Section */}
        <section
          id="alert-analytics"
          aria-label="Alert analytics"
          className="space-y-6"
        >
          <div className={`${glassPanel}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/12 via-orange-500/5 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-orange-500/15 p-2 ring-1 ring-orange-400/30">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Alert Analytics
                </h2>
              </div>
              <AlertAnalytics />
            </div>
          </div>
        </section>

        {/* Database Statistics Section */}
        <section
          id="database-stats"
          aria-label="Database statistics"
          className="space-y-6"
        >
          <div className={`${glassPanel}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/12 via-cyan-500/5 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/15 p-2 ring-1 ring-cyan-400/30">
                  <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Database Statistics
                </h2>
              </div>
              <DatabaseStats />
            </div>
          </div>
        </section>

        {/* News Analytics Section */}
        <section
          id="news-analytics"
          aria-label="News analytics"
          className="space-y-6"
        >
          <div className={`${glassPanel}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/12 via-pink-500/5 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-pink-500/15 p-2 ring-1 ring-pink-400/30">
                  <FileText className="h-5 w-5 text-pink-600 dark:text-pink-300" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  News Analytics
                </h2>
              </div>
              <NewsAnalytics />
            </div>
          </div>
        </section>

        {/* User Management Section */}
        <section
          id="user-management"
          aria-label="User management"
          className="space-y-6"
        >
          <div className={`${glassPanel}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/12 via-indigo-500/5 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-indigo-500/15 p-2 ring-1 ring-indigo-400/30">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  User Management
                </h2>
              </div>
              <UserManagement />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Admin;
