import React, { useState, useMemo, useRef } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Cell,
} from "recharts";
import { format, subDays } from "date-fns";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
} from "lucide-react";
import { useSpotRate } from "../lib/api";
import type { PriceData, ForecastData } from "../lib/api";

interface ForecastChartProps {
  historicalData: PriceData[];
  forecastData: ForecastData[];
}

const ForecastChart = ({
  historicalData,
  forecastData,
}: ForecastChartProps) => {
  const [brushIndex, setBrushIndex] = useState({ start: 0, end: 0 });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Get spot price as fallback
  const { data: spotData } = useSpotRate();

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Prepare comprehensive chart data (hooks must run unconditionally)
  const chartData = useMemo(() => {
    if (!historicalData?.length || !forecastData?.length) return [];
    const allData = [
      ...historicalData.map((item) => ({
        date: new Date(item.ds).getTime(),
        dateLabel: format(new Date(item.ds), "MMM dd"),
        dateFull: format(new Date(item.ds), "MMM dd, yyyy"),
        historical: item.price,
        forecast: null,
        upper: null,
        lower: null,
        isHistorical: true,
      })),
      ...forecastData.map((item) => ({
        date: new Date(item.ds).getTime(),
        dateLabel: format(new Date(item.ds), "MMM dd"),
        dateFull: format(new Date(item.ds), "MMM dd, yyyy"),
        historical: null,
        forecast: item.yhat,
        upper: item.yhat_upper,
        lower: item.yhat_lower,
        isHistorical: false,
      })),
    ].sort((a, b) => a.date - b.date);

    // Initialize brush to show last portion + forecast
    if (allData.length > 0 && brushIndex.end === 0) {
      const total = allData.length;
      const forecastStart = historicalData.length;
      setBrushIndex({
        start: Math.max(0, forecastStart - Math.floor(total * 0.3)),
        end: total - 1,
      });
    }

    return allData;
  }, [historicalData, forecastData]);

  // Windowed data based on brush
  const windowedData = useMemo(() => {
    return chartData.slice(brushIndex.start, brushIndex.end + 1);
  }, [chartData, brushIndex]);

  const splitIndex = historicalData?.length ?? 0;
  const splitDate = chartData[splitIndex - 1]?.date;

  // Early return after all hooks (no data UI)
  if (!historicalData?.length || !forecastData?.length) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Calculate key metrics with better fallback handling
  // PRIORITY: Live spot price first (most up-to-date), then historical data
  const getCurrentPrice = () => {
    // PRIORITY 1: Use live spot price first (most up-to-date)
    if (spotData?.usdPerOunce) {
      const spotPrice =
        typeof spotData.usdPerOunce === "number"
          ? spotData.usdPerOunce
          : parseFloat(String(spotData.usdPerOunce));
      if (!isNaN(spotPrice) && spotPrice > 0) {
        return spotPrice;
      }
    }
    // PRIORITY 2: Try to get the last historical price from database
    if (historicalData && historicalData.length > 0) {
      const lastItem = historicalData[historicalData.length - 1];
      if (lastItem?.price !== null && lastItem?.price !== undefined) {
        const price =
          typeof lastItem.price === "number"
            ? lastItem.price
            : parseFloat(String(lastItem.price));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    // PRIORITY 3: Fallback: try to get the most recent historical price from sorted data
    if (chartData.length > 0) {
      const lastHistorical = chartData.filter((d) => d.isHistorical).pop();
      if (
        lastHistorical?.historical !== null &&
        lastHistorical?.historical !== undefined
      ) {
        const price =
          typeof lastHistorical.historical === "number"
            ? lastHistorical.historical
            : parseFloat(String(lastHistorical.historical));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    // PRIORITY 4: Fallback: use first forecast as current price if no historical data
    if (forecastData && forecastData.length > 0) {
      const firstForecast = forecastData[0]?.yhat;
      if (firstForecast !== null && firstForecast !== undefined) {
        const price =
          typeof firstForecast === "number"
            ? firstForecast
            : parseFloat(String(firstForecast));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    return 0;
  };

  const currentPrice = getCurrentPrice();
  const firstForecast =
    forecastData && forecastData.length > 0
      ? typeof forecastData[0]?.yhat === "number"
        ? forecastData[0].yhat
        : parseFloat(String(forecastData[0]?.yhat || 0))
      : 0;
  const lastForecast =
    forecastData && forecastData.length > 0
      ? typeof forecastData[forecastData.length - 1]?.yhat === "number"
        ? forecastData[forecastData.length - 1].yhat
        : parseFloat(String(forecastData[forecastData.length - 1]?.yhat || 0))
      : 0;

  const forecastChange = firstForecast - currentPrice;
  const forecastChangePercent =
    currentPrice && currentPrice > 0
      ? (forecastChange / currentPrice) * 100
      : 0;
  const forecastEndChange = lastForecast - currentPrice;
  const forecastEndChangePercent =
    currentPrice && currentPrice > 0
      ? (forecastEndChange / currentPrice) * 100
      : 0;

  const trend =
    forecastChange > 0 ? "up" : forecastChange < 0 ? "down" : "neutral";
  const endTrend =
    forecastEndChange > 0 ? "up" : forecastEndChange < 0 ? "down" : "neutral";

  // Price statistics with safe parsing
  const historicalPrices =
    historicalData && historicalData.length > 0
      ? historicalData
          .map((d) => {
            const price = d?.price;
            return typeof price === "number"
              ? price
              : parseFloat(String(price || 0));
          })
          .filter((p) => !isNaN(p) && p > 0)
      : [];

  const allForecastPrices =
    forecastData && forecastData.length > 0
      ? forecastData
          .map((d) => {
            const price = d?.yhat;
            return typeof price === "number"
              ? price
              : parseFloat(String(price || 0));
          })
          .filter((p) => !isNaN(p) && p > 0)
      : [];

  const maxHistorical =
    historicalPrices.length > 0 ? Math.max(...historicalPrices) : 0;
  const minHistorical =
    historicalPrices.length > 0 ? Math.min(...historicalPrices) : 0;
  const maxForecast =
    allForecastPrices.length > 0 ? Math.max(...allForecastPrices) : 0;
  const minForecast =
    allForecastPrices.length > 0 ? Math.min(...allForecastPrices) : 0;
  const avgForecast =
    allForecastPrices.length > 0
      ? allForecastPrices.reduce((a, b) => a + b, 0) / allForecastPrices.length
      : 0;

  const textColor = isDark ? "#CBD5E1" : "#475569";
  const gridColor = isDark
    ? "rgba(255, 255, 255, 0.04)"
    : "rgba(0, 0, 0, 0.04)";
  const historicalColor = "#3B82F6";
  const forecastColor = "#EF4444";
  const bgColor = isDark ? "#0F172A" : "#FFFFFF";

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const historicalValue = payload.find(
      (p: any) => p.dataKey === "historical"
    )?.value;
    const forecastValue = payload.find(
      (p: any) => p.dataKey === "forecast"
    )?.value;
    const upperValue = payload.find((p: any) => p.dataKey === "upper")?.value;
    const lowerValue = payload.find((p: any) => p.dataKey === "lower")?.value;
    const isForecast = forecastValue !== null && forecastValue !== undefined;

    const dataPoint = chartData.find((d) => d.date === label);
    const value = historicalValue ?? forecastValue;

    // Helper function to safely format numbers
    const formatValue = (val: any): string => {
      if (val === null || val === undefined || isNaN(Number(val))) {
        return "N/A";
      }
      return Number(val).toFixed(2);
    };

    return (
      <div className="bg-slate-900/98 dark:bg-slate-950/98 border border-slate-700/50 rounded-xl shadow-2xl p-4 backdrop-blur-xl">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {dataPoint?.dateFull || format(new Date(label), "MMM dd, yyyy")}
        </div>
        <div className="space-y-2">
          {historicalValue !== null && historicalValue !== undefined && (
            <div className="flex items-center justify-between min-w-[200px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-300">Historical</span>
              </div>
              <span className="text-lg font-bold text-blue-400">
                ${formatValue(value)}
              </span>
            </div>
          )}
          {isForecast && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-300">Forecast</span>
                </div>
                <span className="text-lg font-bold text-red-400">
                  ${formatValue(forecastValue)}
                </span>
              </div>
              {upperValue !== null &&
                upperValue !== undefined &&
                lowerValue !== null &&
                lowerValue !== undefined && (
                  <div className="pt-2 mt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Upper:</span>
                        <span className="text-emerald-400">
                          ${formatValue(upperValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lower:</span>
                        <span className="text-rose-400">
                          ${formatValue(lowerValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 min-w-0" dir="ltr" style={{ width: '100%' }}>
      {/* Top Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 dark:from-slate-950/90 dark:to-slate-900/90 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Current Price
          </div>
          <div className="text-2xl font-bold text-white">
            {currentPrice > 0 ? (
              `$${currentPrice.toFixed(2)}`
            ) : (
              <span className="text-slate-500 text-lg">Loading...</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {currentPrice > 0 ? "Historical Close" : "Calculating price..."}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 dark:from-blue-950/40 dark:to-blue-900/40 border border-blue-700/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
            Initial Forecast
          </div>
          <div className="text-2xl font-bold text-blue-300">
            ${firstForecast.toFixed(2)}
          </div>
          <div
            className={`text-xs mt-1 flex items-center gap-1 ${
              forecastChangePercent > 0
                ? "text-emerald-400"
                : forecastChangePercent < 0
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {forecastChangePercent > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : forecastChangePercent < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {forecastChangePercent > 0 ? "+" : ""}
            {forecastChangePercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 dark:from-red-950/40 dark:to-red-900/40 border border-red-700/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="text-xs font-semibold text-red-300 uppercase tracking-wider mb-1">
            End Forecast
          </div>
          <div className="text-2xl font-bold text-red-300">
            ${lastForecast.toFixed(2)}
          </div>
          <div
            className={`text-xs mt-1 flex items-center gap-1 ${
              forecastEndChangePercent > 0
                ? "text-emerald-400"
                : forecastEndChangePercent < 0
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {forecastEndChangePercent > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : forecastEndChangePercent < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {forecastEndChangePercent > 0 ? "+" : ""}
            {forecastEndChangePercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 dark:from-purple-950/40 dark:to-purple-900/40 border border-purple-700/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">
            Avg Forecast
          </div>
          <div className="text-2xl font-bold text-purple-300">
            ${avgForecast.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Range: ${minForecast.toFixed(0)} - ${maxForecast.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 dark:from-slate-950/95 dark:to-slate-900/95 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm w-full min-w-0" style={{ width: '100%' }}>
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Price Forecast Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Historical vs. Predicted Prices
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              trend === "up"
                ? "bg-emerald-500/20 border border-emerald-500/30"
                : trend === "down"
                ? "bg-rose-500/20 border border-rose-500/30"
                : "bg-slate-700/50 border border-slate-600/50"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : trend === "down" ? (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            ) : (
              <Minus className="h-4 w-4 text-slate-400" />
            )}
            <span
              className={`text-xs font-bold ${
                trend === "up"
                  ? "text-emerald-300"
                  : trend === "down"
                  ? "text-rose-300"
                  : "text-slate-300"
              }`}
            >
              {trend === "up"
                ? "BULLISH"
                : trend === "down"
                ? "BEARISH"
                : "NEUTRAL"}
            </span>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-[400px] mb-4 min-h-[400px] w-full" style={{ minWidth: 0, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={400} minWidth={0} aspect={undefined}>
            <ComposedChart
              data={windowedData}
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <defs>
                <linearGradient id="historicalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={historicalColor}
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="100%"
                    stopColor={historicalColor}
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={forecastColor}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={forecastColor}
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="confidenceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={forecastColor}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={forecastColor}
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="2 2"
                stroke={gridColor}
                vertical={false}
              />

              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => format(new Date(value), "MMM dd")}
                stroke={textColor}
                style={{ fontSize: "11px", fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />

              <YAxis
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke={textColor}
                style={{ fontSize: "11px", fontWeight: 500 }}
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: textColor,
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />

              {splitDate &&
                splitDate >= windowedData[0]?.date &&
                splitDate <= windowedData[windowedData.length - 1]?.date && (
                  <ReferenceLine
                    x={splitDate}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: "FORECAST START",
                      position: "insideTopRight",
                      fill: "#94A3B8",
                      fontSize: "9px",
                      fontWeight: 700,
                    }}
                  />
                )}

              <Area
                type="monotone"
                dataKey="historical"
                fill="url(#historicalArea)"
                stroke="none"
                connectNulls={false}
              />

              <Area
                type="monotone"
                dataKey="forecast"
                fill="url(#forecastArea)"
                stroke="none"
                connectNulls={false}
              />

              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#confidenceArea)"
                connectNulls={false}
              />

              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="url(#confidenceArea)"
                connectNulls={false}
              />

              <Line
                type="monotone"
                dataKey="historical"
                stroke={historicalColor}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: historicalColor,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                connectNulls={false}
                filter="url(#glow)"
              />

              <Line
                type="monotone"
                dataKey="forecast"
                stroke={forecastColor}
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: forecastColor,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                connectNulls={false}
                filter="url(#glow)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Navigation Brush */}
        <div className="h-[80px] min-h-[80px] w-full" style={{ minWidth: 0, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={80} minWidth={0} aspect={undefined}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="brushArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                hide
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Area
                type="monotone"
                dataKey="historical"
                fill="url(#brushArea)"
                stroke={historicalColor}
                strokeWidth={1.5}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                fill="url(#brushArea)"
                stroke={forecastColor}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              <Brush
                dataKey="date"
                height={30}
                startIndex={brushIndex.start}
                endIndex={brushIndex.end}
                onChange={(e) => {
                  if (
                    e?.startIndex !== undefined &&
                    e?.endIndex !== undefined
                  ) {
                    setBrushIndex({ start: e.startIndex, end: e.endIndex });
                  }
                }}
                travellerWidth={10}
                tickFormatter={(value) => format(new Date(value), "MMM dd")}
                fill={isDark ? "#1E293B" : "#F1F5F9"}
                stroke={isDark ? "#475569" : "#CBD5E1"}
              />
              {splitDate && (
                <ReferenceLine
                  x={splitDate}
                  stroke="#94A3B8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ForecastChart;
