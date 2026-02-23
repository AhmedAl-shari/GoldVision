/**
 * AccuracyTab Component - Prophet vs LSTM model comparison
 * Shows MAE, RMSE, MAPE metrics with cross-validation results
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import { Chip } from "./Chip";
import {
  Target,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
  Download,
  Calendar,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  getPrices,
  postForecast,
  postForecastEvaluate,
  postLstmEvaluate,
  ForecastPointLite,
  ForecastEvaluationResponse,
  LstmEvaluationResponse,
} from "../lib/api";
import {
  calculateResiduals,
  residualsToCsv,
  downloadCsv,
} from "../utils/csvExport";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

type PricePoint = {
  ds: string;
  price: number;
};

const horizons = [7, 14, 30] as const;
const models = ["Prophet", "LSTM"] as const;

const normalizeDate = (value?: string) => {
  if (!value) return value;
  const str = value.toString();
  return str.includes("T") ? str.split("T")[0] : str;
};

const normalizePrice = (value: unknown) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizePriceSeries = (series: unknown[]): PricePoint[] => {
  return series
    .map((entry) => {
      const record = entry as {
        ds?: string;
        date?: string; // Backend returns 'date' in history field
        timestamp?: string;
        price?: number;
        y?: number;
      };
      // Backend history uses 'date', forecast uses 'ds', prices API uses 'ds'
      const ds = normalizeDate(record.date ?? record.timestamp ?? record.ds);
      const price = normalizePrice(record.price ?? record.y);
      if (!ds || typeof price !== "number") {
        return null;
      }
      return { ds, price };
    })
    .filter((row): row is PricePoint => row !== null);
};

interface AccuracyTabProps {
  asset?: string;
  currency?: string;
}

export default function AccuracyTab({
  asset = "XAU",
  currency = "USD",
}: AccuracyTabProps) {
  const [h, setH] = useState<(typeof horizons)[number]>(7);
  const [model, setModel] = useState<(typeof models)[number]>("Prophet");
  const [showDetails, setShowDetails] = useState(true);

  // Fetch Prophet cross-validation results
  const cvQuery = useQuery<ForecastEvaluationResponse>({
    queryKey: ["cv-eval", h, asset, currency],
    queryFn: async () => {
      // Fetch historical prices for evaluation
      // For longer horizons, fetch more data to meet minimum requirements
      // Backend requires: max(40, horizon_days * 3 + 20) data points
      // So for 30 days: need at least 110 data points
      // Backend API limit is 500, so request maximum available data for 30-day horizon
      // For 30-day horizon: fetch maximum (500) to get all available historical data
      // For 14-day horizon: fetch 180 days should be sufficient (62 required, ~126 available)
      // For 7-day horizon: fetch 180 days should be sufficient (41 required, ~126 available)
      const fetchLimit = h >= 30 ? 500 : 180;

      const pricesData = await getPrices({
        asset,
        currency,
        limit: fetchLimit,
      });

      const prices = pricesData.prices || pricesData;
      const rows = sanitizePriceSeries(prices as unknown[]);

      // Log data count for debugging
      if (h >= 30) {
        console.log(
          `[AccuracyTab] Fetched ${prices?.length || 0} prices, sanitized to ${
            rows.length
          } rows for ${h}-day horizon`
        );
      }

      return postForecastEvaluate({
        rows,
        horizon_days: h,
        asset,
        currency,
      });
    },
    enabled: model === "Prophet",
    staleTime: 3600000, // 1 hour
  });

  // Fetch LSTM results
  const lstmQuery = useQuery<LstmEvaluationResponse>({
    queryKey: ["lstm-eval", h, asset, currency],
    queryFn: async () => {
      // Fetch historical prices
      const pricesData = await getPrices({
        asset,
        currency,
        limit: 180,
      });

      const prices = pricesData.prices || pricesData;
      const rows = sanitizePriceSeries(prices as unknown[]);

      return postLstmEvaluate({
        rows,
        horizon_days: h,
      });
    },
    enabled: model === "LSTM",
    staleTime: 3600000, // 1 hour
  });

  const metrics =
    model === "Prophet" ? cvQuery.data?.metrics : lstmQuery.data?.metrics;
  const isLoading =
    model === "Prophet" ? cvQuery.isLoading : lstmQuery.isLoading;
  const error = model === "Prophet" ? cvQuery.error : lstmQuery.error;
  // All horizons (7d, 14d, 30d) are now fully supported for both models
  // No need to show experimental warning since all horizons work correctly
  const experimental = false;

  // Check if error is 503 (service unavailable) for better UX
  const isLstmUnavailable =
    model === "LSTM" && error && (error as any).response?.status === 503;

  // Fetch latest forecast with history (history includes today's price)
  // Only fetch when Prophet model is selected
  const {
    data: forecastWithHistory,
    error: forecastError,
    isLoading: isForecastLoading,
    isFetching: isForecastFetching,
    status: forecastStatus,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["latest-forecast-with-history", asset, currency, h],
    queryFn: async () => {
      try {
        console.log(`[AccuracyTab] Fetching forecast for ${h}d horizon...`);
        const response = await postForecast({
          asset,
          currency,
          horizon_days: h, // Use selected horizon instead of hardcoded 7
          include_history: true, // This ensures history includes today's price
        });
        console.log(`[AccuracyTab] Forecast response received:`, {
          hasForecast: !!response?.forecast,
          forecastLength: response?.forecast?.length || 0,
          hasHistory: !!response?.history,
          historyLength: response?.history?.length || 0,
          keys: Object.keys(response || {}),
          modelVersion: response?.model_version,
          responseType: typeof response,
          isArray: Array.isArray(response),
        });

        // Validate response structure
        if (!response) {
          console.error(`[AccuracyTab] Response is null/undefined`);
          throw new Error("Forecast response is null or undefined");
        }
        if (!Array.isArray(response.forecast)) {
          console.error(
            `[AccuracyTab] Forecast is not an array:`,
            typeof response.forecast,
            response.forecast
          );
          throw new Error("Forecast is not an array");
        }

        return response;
      } catch (error: any) {
        console.error(`[AccuracyTab] Forecast fetch error for ${h}d:`, {
          error: error?.message || error,
          response: error?.response?.data,
          status: error?.response?.status,
          stack: error?.stack?.substring(0, 500),
        });
        throw error; // Re-throw so React Query can handle it
      }
    },
    enabled: model === "Prophet", // Only fetch for Prophet model
    staleTime: 60000, // 1 minute - reduced for fresher data
    retry: 1, // Only retry once on failure
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Log query status for debugging
  console.log(`[AccuracyTab] Query status (${h}d):`, {
    status: forecastStatus,
    isLoading: isForecastLoading,
    isFetching: isForecastFetching,
    hasData: !!forecastWithHistory,
    hasError: !!forecastError,
    errorMessage: forecastError?.message,
    dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
    model: model,
    enabled: model === "Prophet",
  });

  // Use history from forecast response (includes today's price)
  const historicalPrices = useMemo<PricePoint[] | undefined>(() => {
    if (forecastWithHistory?.history) {
      const sanitized = sanitizePriceSeries(
        forecastWithHistory.history as unknown[]
      );
      console.log(
        `[AccuracyTab] Historical prices from forecast (${h}d):`,
        sanitized?.length,
        "points"
      );
      return sanitized;
    }

    // Don't warn if query is still loading - this is expected during initial render
    if (isForecastLoading || isForecastFetching) {
      return undefined; // Return undefined silently while loading
    }

    // Only warn if query has finished but history is still missing
    console.warn(
      `[AccuracyTab] No history in forecast response for ${h}d horizon`,
      {
        hasForecastResponse: !!forecastWithHistory,
        queryStatus: forecastStatus,
        hasError: !!forecastError,
      }
    );
    // Fallback to separate API call if history not available
    return undefined;
  }, [
    forecastWithHistory,
    h,
    isForecastLoading,
    isForecastFetching,
    forecastStatus,
    forecastError,
  ]);

  // Fallback: Fetch historical prices if forecast history not available
  const { data: fallbackHistoricalPrices } = useQuery<PricePoint[]>({
    queryKey: ["historical-prices-fallback", asset, currency],
    queryFn: async () => {
      const pricesData = await getPrices({ asset, currency, limit: 90 });
      const prices = pricesData.prices || pricesData;
      return sanitizePriceSeries(prices as unknown[]);
    },
    enabled: !historicalPrices, // Only fetch if forecast history not available
    staleTime: 60000, // 1 minute
  });

  // Use forecast history if available, otherwise use fallback
  const finalHistoricalPrices = historicalPrices || fallbackHistoricalPrices;

  // Extract forecast from response - with detailed inspection
  // Use useMemo to ensure it updates when forecastWithHistory changes
  const latestForecast = useMemo(() => {
    if (!forecastWithHistory) {
      return [];
    }

    if (Array.isArray(forecastWithHistory.forecast)) {
      return forecastWithHistory.forecast;
    } else if (forecastWithHistory.forecast) {
      console.warn(
        `[AccuracyTab] Forecast is not an array:`,
        typeof forecastWithHistory.forecast,
        forecastWithHistory.forecast
      );
      return [];
    } else {
      console.warn(
        `[AccuracyTab] Forecast field is missing or null in response. Available keys:`,
        Object.keys(forecastWithHistory)
      );
      return [];
    }
  }, [forecastWithHistory]);

  // Debug logging - detailed inspection
  console.log(`[AccuracyTab] Forecast data (${h}d):`, {
    hasForecastResponse: !!forecastWithHistory,
    forecastResponseKeys: forecastWithHistory
      ? Object.keys(forecastWithHistory)
      : [],
    forecastFieldType: forecastWithHistory?.forecast
      ? typeof forecastWithHistory.forecast
      : "undefined",
    forecastIsArray: Array.isArray(forecastWithHistory?.forecast),
    forecastRaw: forecastWithHistory?.forecast
      ? Array.isArray(forecastWithHistory.forecast)
        ? `Array(${forecastWithHistory.forecast.length})`
        : typeof forecastWithHistory.forecast
      : "null",
    hasHistory: !!historicalPrices,
    historyLength: historicalPrices?.length,
    hasFallback: !!fallbackHistoricalPrices,
    fallbackLength: fallbackHistoricalPrices?.length,
    finalHistoryLength: finalHistoricalPrices?.length,
    latestForecastLength: latestForecast.length,
    latestForecastIsArray: Array.isArray(latestForecast),
    forecastArray: latestForecast.slice(0, 3), // Show first 3 forecast points
    model: model,
    forecastError: forecastError ? forecastError.message : null,
    // Log the actual forecast structure
    forecastStructure: forecastWithHistory?.forecast
      ? {
          type: typeof forecastWithHistory.forecast,
          isArray: Array.isArray(forecastWithHistory.forecast),
          length: Array.isArray(forecastWithHistory.forecast)
            ? forecastWithHistory.forecast.length
            : "N/A",
          firstItem:
            Array.isArray(forecastWithHistory.forecast) &&
            forecastWithHistory.forecast.length > 0
              ? forecastWithHistory.forecast[0]
              : null,
        }
      : null,
  });

  // Chart data for LSTM forecast visualization
  const chartData = useMemo(() => {
    if (model !== "LSTM" || !lstmQuery.data?.forecast) return null;

    const forecastSeries = lstmQuery.data.forecast;

    return {
      labels: forecastSeries.map((f) => f.ds),
      datasets: [
        {
          label: "LSTM Forecast (Recursive)",
          data: forecastSeries.map((f) => f.yhat),
          borderColor: "rgb(147, 51, 234)",
          backgroundColor: "rgba(147, 51, 234, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: "Lower Bound",
          data: forecastSeries.map((f) => f.yhat_lower),
          borderColor: "rgb(147, 51, 234)",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
        },
        {
          label: "Upper Bound",
          data: forecastSeries.map((f) => f.yhat_upper),
          borderColor: "rgb(147, 51, 234)",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  }, [model, lstmQuery.data]);

  // Forecast-vs-Actual overlay chart data
  const overlayChartData = useMemo(() => {
    // Don't warn if query is still loading - this is expected during initial render
    if (isForecastLoading || isForecastFetching) {
      return null; // Return null silently while loading
    }

    if (
      !finalHistoricalPrices ||
      finalHistoricalPrices.length === 0 ||
      !latestForecast ||
      latestForecast.length === 0
    ) {
      // Only warn if query has finished but data is still missing
      console.warn(`[AccuracyTab] Cannot render chart (${h}d):`, {
        hasHistory: !!finalHistoricalPrices,
        historyLength: finalHistoricalPrices?.length,
        forecastLength: latestForecast?.length,
        queryStatus: forecastStatus,
        hasError: !!forecastError,
      });
      return null;
    }

    // Take last 60 days of historical data
    const last60Days = finalHistoricalPrices.slice(-60);

    // Combine dates
    const historicalDates = last60Days.map((p: any) => p.ds);
    const forecastDates = latestForecast.map((f) => f.ds);
    const allDates = [...historicalDates, ...forecastDates];

    return {
      labels: allDates,
      datasets: [
        {
          label: "Actual Price (السعر الفعلي)",
          data: [
            ...last60Days.map((p: any) => p.price),
            ...new Array(latestForecast.length).fill(null),
          ],
          borderColor: "rgb(16, 185, 129)", // Green
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Forecast (التوقع)",
          data: [
            ...new Array(last60Days.length).fill(null),
            ...latestForecast.map((f) => f.yhat),
          ],
          borderColor: "rgb(59, 130, 246)", // Blue
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          borderDash: [8, 4],
          fill: false,
          tension: 0.2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: "Confidence Range (نطاق الثقة)",
          data: [
            ...new Array(last60Days.length).fill(null),
            ...latestForecast.map((f) => f.yhat_upper),
          ],
          borderColor: "rgba(59, 130, 246, 0.3)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 1,
          borderDash: [2, 2],
          fill: "+1",
          tension: 0.2,
          pointRadius: 0,
        },
        {
          label: "Confidence Lower",
          data: [
            ...new Array(last60Days.length).fill(null),
            ...latestForecast.map((f) => f.yhat_lower),
          ],
          borderColor: "rgba(59, 130, 246, 0.3)",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderDash: [2, 2],
          fill: false,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    };
  }, [
    finalHistoricalPrices,
    latestForecast,
    h,
    isForecastLoading,
    isForecastFetching,
    forecastStatus,
    forecastError,
  ]);

  // CSV download handler
  const handleDownloadResiduals = () => {
    try {
      let csvContent: string;
      const timestamp = new Date().toISOString().split("T")[0];

      // For Prophet: use CV residuals if available
      if (
        model === "Prophet" &&
        cvQuery.data?.residuals &&
        cvQuery.data.residuals.length > 0
      ) {
        csvContent = residualsToCsv(cvQuery.data.residuals);
      }
      // For LSTM: use residuals from response if available
      else if (
        model === "LSTM" &&
        lstmQuery.data?.residuals &&
        lstmQuery.data.residuals.length > 0
      ) {
        csvContent = residualsToCsv(lstmQuery.data.residuals);
      }
      // Fallback: try to calculate from forecast vs actual (old logic)
      else if (
        model === "LSTM" &&
        lstmQuery.data?.forecast &&
        historicalPrices
      ) {
        const forecastData = lstmQuery.data.forecast.map((f) => ({
          ds: f.ds,
          yhat: f.yhat,
        }));
        const residuals = calculateResiduals(historicalPrices, forecastData);
        if (residuals.length === 0) {
          toast.error(
            "No matching dates found between historical prices and forecast. Cannot calculate residuals."
          );
          return;
        }
        csvContent = residualsToCsv(residuals);
      }
      // Fallback: try to calculate from historical vs latest forecast
      else if (
        historicalPrices &&
        latestForecast &&
        latestForecast.length > 0
      ) {
        const forecastData = latestForecast.map((f) => ({
          ds: f.ds,
          yhat: f.yhat,
        }));
        const residuals = calculateResiduals(historicalPrices, forecastData);
        if (residuals.length === 0) {
          toast.error(
            "No matching dates found. Please ensure forecast dates overlap with historical prices."
          );
          return;
        }
        csvContent = residualsToCsv(residuals);
      } else {
        toast.error(
          "No residuals data available. Please generate a forecast evaluation first."
        );
        return;
      }

      // Validate CSV content has data (more than just header)
      const lines = csvContent.split("\n");
      if (
        lines.length <= 1 ||
        (lines.length === 2 && lines[1].includes("No data"))
      ) {
        toast.error(
          "No data to export. The evaluation may not have completed successfully."
        );
        return;
      }

      downloadCsv(
        csvContent,
        `forecast_residuals_${model}_${h}d_${timestamp}.csv`
      );
      toast.success(`Downloaded residuals CSV for ${model} (${h} days)`);
    } catch (error) {
      console.error("CSV download error:", error);
      toast.error("Failed to download CSV: " + (error as Error).message);
    }
  };

  const evaluationDate =
    model === "Prophet"
      ? cvQuery.data?.evaluation_date
      : lstmQuery.data?.evaluation_date;
  const formattedEvaluationDate = evaluationDate
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(evaluationDate))
    : "Live";

  const evaluatedPoints =
    model === "Prophet"
      ? cvQuery.data?.residuals?.length ?? 0
      : lstmQuery.data?.forecast?.length ?? 0;

  const modelOptions = useMemo(
    () => [
      {
        value: "Prophet",
        label: "Prophet",
        description: "Production-grade model",
      },
      {
        value: "LSTM",
        label: "LSTM",
        description: "Research baseline (beta)",
      },
    ],
    []
  );

  const horizonOptions = useMemo(
    () =>
      horizons.map((value) => ({
        value,
        label: `${value} days`,
        description:
          value === 7
            ? "Weekly horizon"
            : value === 14
            ? "Bi-weekly outlook"
            : "Monthly lens",
      })),
    []
  );

  const summaryMetrics = [
    {
      label: "Model",
      value: model,
      icon: <Sparkles className="h-4 w-4 text-blue-500" />,
    },
    {
      label: "Horizon",
      value: `${h} days`,
      icon: <Clock className="h-4 w-4 text-indigo-500" />,
    },
    {
      label: "Evaluated",
      value: formattedEvaluationDate,
      icon: <Calendar className="h-4 w-4 text-emerald-500" />,
    },
    {
      label: "Data Points",
      value: evaluatedPoints ? `${evaluatedPoints.toLocaleString()} pts` : "—",
      icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
    },
  ];

  const metricsReady =
    !isLoading && !error && !(isLstmUnavailable && model === "LSTM");

  return (
    <div className="space-y-6">
      {/* Experience Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Accuracy Control Center
            </p>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Forecast Accuracy Intelligence
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              Compare production Prophet forecasts with the experimental LSTM
              baseline, track error trends across horizons, and export evidence
              for stakeholder reporting.
            </p>
            {experimental && (
              <Chip
                label="Non-standard horizon · metrics in preview"
                tone="experimental"
              />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              {summaryMetrics.map((item) => (
                <MetadataBadge
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <SegmentedControl
              label="Model"
              value={model}
              onChange={(value) => setModel(value as (typeof models)[number])}
              options={modelOptions}
            />
            <SegmentedControl
              label="Forecast Horizon"
              value={h}
              onChange={(value) =>
                setH(Number(value) as (typeof horizons)[number])
              }
              options={horizonOptions}
              columns={3}
            />
            <button
              onClick={handleDownloadResiduals}
              disabled={!metricsReady}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                metricsReady
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400"
                  : "cursor-not-allowed bg-emerald-900/20 text-emerald-200"
              )}
              title="Download residuals as CSV"
            >
              <Download className="h-4 w-4" />
              <span>
                {metricsReady ? "Download Accuracy CSV" : "Preparing…"}
              </span>
            </button>
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {showDetails ? "Hide context" : "Show context"}
            </button>
          </div>
        </div>
      </section>

      {showDetails && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-xs text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
          <p>
            Prophet metrics use rolling cross-validation on historical prices.
            LSTM metrics represent one-step loss with recursive forecasts for
            illustration. Educational use only. Not investment advice.
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Evaluating {model} model...
          </span>
        </div>
      ) : isLstmUnavailable ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                LSTM Model Not Available
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                The LSTM baseline requires TensorFlow, which is currently not
                installed on the Prophet service (Python 3.13 compatibility
                issue).
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                <strong>
                  The Prophet model is fully functional and is the primary
                  evaluation method.
                </strong>
                Please switch to "Prophet" to view accuracy metrics.
              </p>
              <button
                onClick={() => setModel("Prophet")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Switch to Prophet Model
              </button>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Failed to load accuracy metrics</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {(error as Error).message || "An error occurred"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="MAE"
              title="Mean Absolute Error"
              value={metrics?.MAE}
              description="Average prediction error"
              icon={<Target className="w-5 h-5" />}
            />
            <MetricCard
              label="RMSE"
              title="Root Mean Square Error"
              value={metrics?.RMSE}
              description="Prediction variance"
              icon={<Activity className="w-5 h-5" />}
            />
            <MetricCard
              label="MAPE"
              title="Mean Absolute Percentage Error"
              value={metrics?.MAPE}
              description="Relative accuracy"
              icon={<TrendingUp className="w-5 h-5" />}
              isPercentage
            />
          </div>

          {/* Forecast-vs-Actual Overlay Chart (For Prophet) */}
          {model === "Prophet" && overlayChartData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                  Forecast vs Actual Comparison (مقارنة التوقع بالفعلي)
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Last 60 days + {h}-day forecast
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Green line shows actual historical prices. Blue dashed line
                shows {h}-day forecast. Shaded area represents confidence
                interval.
              </p>
              <div className="h-96">
                <Line
                  data={overlayChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: "index" as const,
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: "top" as const,
                        labels: {
                          usePointStyle: true,
                          padding: 15,
                          font: { size: 11 },
                        },
                      },
                      tooltip: {
                        mode: "index" as const,
                        intersect: false,
                        callbacks: {
                          title: (context) => {
                            return `Date: ${context[0].label}`;
                          },
                          label: (context) => {
                            const label = context.dataset.label || "";
                            const value = context.parsed.y;
                            if (value === null) return "";
                            return `${label}: $${value.toFixed(2)}`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: "Date (التاريخ)",
                          font: { size: 12, weight: "bold" },
                        },
                        grid: {
                          display: false,
                        },
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: "Gold Price - USD per oz (سعر الذهب)",
                          font: { size: 12, weight: "bold" },
                        },
                        grid: {
                          color: "rgba(0, 0, 0, 0.05)",
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>📊 Chart Interpretation:</strong> The transition from
                  solid line (actual) to dashed line (forecast) shows where
                  historical data ends and predictions begin. The shaded area
                  indicates forecast uncertainty.
                </p>
              </div>
            </div>
          )}

          {/* LSTM Forecast Chart */}
          {model === "LSTM" && chartData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-semibold mb-4 text-gray-900 dark:text-white">
                {model} {h}-Day Forecast (Recursive)
              </h4>
              <div className="h-80">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "top" as const,
                      },
                      tooltip: {
                        mode: "index" as const,
                        intersect: false,
                      },
                    },
                    scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: "Date",
                        },
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: "Price (USD)",
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Disclaimer */}
          {!showDetails && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Note:</strong>{" "}
                {model === "Prophet"
                  ? "Prophet metrics use rolling cross-validation on historical data."
                  : "LSTM metrics are one-step test loss; multi-step forecasts are recursive and illustrative."}{" "}
                Educational use only. Not financial advice.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  title: string;
  value?: number;
  description: string;
  icon: React.ReactNode;
  isPercentage?: boolean;
}

function MetricCard({
  label,
  title,
  value,
  description,
  icon,
  isPercentage,
}: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-800">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/10 opacity-70 pointer-events-none" />
      <div className="relative flex items-center justify-between mb-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="relative text-3xl font-bold text-gray-900 dark:text-white">
        {value !== undefined
          ? isPercentage
            ? `${value.toFixed(2)}%`
            : `$${value.toFixed(2)}`
          : "—"}
      </div>
      <div className="relative mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        {title}
      </div>
      <div className="relative mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </div>
    </div>
  );
}

interface SegmentedControlProps {
  label: string;
  value: string | number;
  options: Array<{
    value: string | number;
    label: string;
    description?: string;
  }>;
  onChange: (value: string | number) => void;
  columns?: 2 | 3 | 4;
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: SegmentedControlProps) {
  const columnClass =
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : columns === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <div
        role="radiogroup"
        className={cn("grid gap-2", columnClass)}
        aria-label={label}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400",
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-200"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-200"
              )}
            >
              <span className="block font-medium">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MetadataBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetadataBadge({ icon, label, value }: MetadataBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </p>
      </div>
    </div>
  );
}
