import React, { useMemo, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import "../lib/chartSetup"; // Register Chart.js components
import { format, subDays } from "date-fns";
import { getThemeColors } from "../lib/chartOptions";
import { useSettings } from "../contexts/SettingsContext";
import { useLocale } from "../contexts/useLocale";
import { useSpotRate } from "../lib/api";

interface PriceData {
  ds: string;
  price: number;
}

interface DailyOHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  historicalData?: PriceData[];
  dailyOHLC?: DailyOHLC[];
  onDateRangeChange?: (dateRange: { start: string; end: string; tradingDays: number }) => void;
}

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

const CandlestickChart = ({
  historicalData = [],
  dailyOHLC = [],
  onDateRangeChange,
}: CandlestickChartProps) => {
  const { settings } = useSettings();
  const { locale } = useLocale();
  const { data: spotData } = useSpotRate(); // Get real-time spot price
  const isDark = document.documentElement.classList.contains("dark");
  const colors = getThemeColors(isDark);

  // Currency formatting function
  const formatPrice = (price: number | undefined) => {
    const safePrice = price || 0;
    if (settings.currency === "YER") {
      return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safePrice);
    } else {
      return `$${safePrice.toFixed(2)}`;
    }
  };

  const getCurrencySymbol = () => {
    return settings.currency === "YER" ? "YER" : "USD";
  };

  // Enhanced candlestick data processing
  const candlestickData = useMemo(() => {
    // Prefer direct daily OHLC if provided
    if (dailyOHLC.length > 0) {
      const cleaned = dailyOHLC
        .map((c) => {
          // Get date field with fallback
          const rawDate = c.datetime || c.timestamp || c.date;

          // Validate and format date
          let validDate;
          try {
            const dateObj = new Date(rawDate);
            if (isNaN(dateObj.getTime())) {
              // If invalid, use current date as fallback
              validDate = new Date().toISOString().split("T")[0];
            } else {
              validDate = dateObj.toISOString().split("T")[0];
            }
          } catch (error) {
            // If any error, use current date as fallback
            validDate = new Date().toISOString().split("T")[0];
          }

          // Ensure all OHLC values are valid numbers with proper fallbacks
          const open = parseFloat(c.open) || 0;
          const close = parseFloat(c.close) || 0;
          const high = parseFloat(c.high) || Math.max(open, close) || 0;
          const low = parseFloat(c.low) || Math.min(open, close) || 0;
          const volume = parseFloat(c.volume) || 0;

          // If all values are zero, use spot price as fallback
          const fallbackPrice = spotData?.usdPerOunce || 4000;
          const finalOpen = open || fallbackPrice;
          const finalClose = close || fallbackPrice;
          const finalHigh = high || Math.max(finalOpen, finalClose);
          const finalLow = low || Math.min(finalOpen, finalClose);

          const processed = {
            date: validDate,
            open: finalOpen,
            high: finalHigh,
            low: finalLow,
            close: finalClose,
            volume: volume || 500000, // Use realistic volume if zero
            change: finalClose - finalOpen,
            changePercent:
              finalOpen > 0 ? ((finalClose - finalOpen) / finalOpen) * 100 : 0,
          };

          return processed;
        })
        .filter((c) => c.close > 0) // Only keep valid candles
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      // Synthesize minimal range if flat
      if (cleaned.length === 1) {
        const only = cleaned[0];
        const base = only.close || only.open || 0;
        const eps = base > 0 ? base * 0.001 : 1;

        // Safely create previous date
        let prev;
        try {
          const currentDate = new Date(only.date);
          if (isNaN(currentDate.getTime())) {
            // If invalid date, use current date minus 1 day
            prev = subDays(new Date(), 1).toISOString().split("T")[0];
          } else {
            prev = subDays(currentDate, 1).toISOString().split("T")[0];
          }
        } catch (error) {
          // Fallback to current date minus 1 day
          prev = subDays(new Date(), 1).toISOString().split("T")[0];
        }
        cleaned.unshift({
          date: prev,
          open: base,
          high: base + eps,
          low: base - eps,
          close: base,
          volume: 0,
          change: 0,
          changePercent: 0,
        });
        if (only.high === only.low) {
          only.high = base + eps;
          only.low = base - eps;
        }
      }

      return cleaned.slice(-30);
    }

    if (!historicalData || historicalData.length === 0) return [];

    // Group data by day with proper timezone handling
    const dailyData = new Map<string, PriceData[]>();

    historicalData.forEach((item) => {
      const date = new Date(item.ds);
      const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format

      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, []);
      }
      dailyData.get(dayKey)!.push(item);
    });

    // Create enhanced candlesticks
    const candlesticks: CandlestickData[] = [];

    dailyData.forEach((dayPrices, dayKey) => {
      if (dayPrices.length > 0) {
        // Sort by timestamp to get proper open/close
        const sortedPrices = dayPrices.sort(
          (a, b) => new Date(a.ds).getTime() - new Date(b.ds).getTime()
        );

        const prices = sortedPrices.map((p) => p.price);
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const change = close - open;
        const changePercent = (change / open) * 100;

        candlesticks.push({
          date: dayKey,
          open,
          high,
          low,
          close,
          volume: dayPrices.length, // Use data points as volume proxy
          change,
          changePercent,
        });
      }
    });

    // Guards: if we have only one candle, synthesize a prior day and a non-zero range
    if (candlesticks.length === 1) {
      const only = candlesticks[0];
      const base = only.close || only.open || only.high || only.low || 0;
      const epsilon = base > 0 ? base * 0.001 : 1; // 0.1% band (min 1)
      const prevDate = subDays(new Date(only.date), 1)
        .toISOString()
        .split("T")[0];
      candlesticks.unshift({
        date: prevDate,
        open: base,
        high: base + epsilon,
        low: base - epsilon,
        close: base,
        volume: 0,
        change: 0,
        changePercent: 0,
      });
      // Ensure the existing candle also has a visible range
      if (only.high === only.low) {
        only.high = base + epsilon;
        only.low = base - epsilon;
      }
    }

    // Sort by date and take last 30 days for better visualization
    return candlesticks
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Show last 30 days
  }, [dailyOHLC, historicalData, spotData?.usdPerOunce]);
  
  // Create validated candlestick data before using it
  // Filter out any invalid candles before creating chart data
  const validCandlestickData = useMemo(() => {
    return candlestickData.filter((candle) => {
      return (
        candle &&
        typeof candle.date === "string" &&
        typeof candle.open === "number" &&
        !isNaN(candle.open) &&
        typeof candle.close === "number" &&
        !isNaN(candle.close) &&
        typeof candle.high === "number" &&
        !isNaN(candle.high) &&
        typeof candle.low === "number" &&
        !isNaN(candle.low) &&
        candle.high >= candle.low &&
        candle.high >= candle.open &&
        candle.high >= candle.close &&
        candle.low <= candle.open &&
        candle.low <= candle.close
      );
    });
  }, [candlestickData]);
  
  // Calculate and notify date range in useEffect to avoid setState during render
  // Use useRef to track previous date range and prevent unnecessary updates
  const previousDateRangeRef = useRef<{
    start: string;
    end: string;
    tradingDays: number;
  } | null>(null);
  
  useEffect(() => {
    if (validCandlestickData.length > 0 && onDateRangeChange) {
      const startDate = validCandlestickData[0].date;
      const endDate = validCandlestickData[validCandlestickData.length - 1].date;
      const tradingDays = validCandlestickData.length;
      
      const newDateRange = {
        start: startDate,
        end: endDate,
        tradingDays,
      };
      
      // Only call onDateRangeChange if the date range has actually changed
      const previous = previousDateRangeRef.current;
      if (
        !previous ||
        previous.start !== newDateRange.start ||
        previous.end !== newDateRange.end ||
        previous.tradingDays !== newDateRange.tradingDays
      ) {
        previousDateRangeRef.current = newDateRange;
        onDateRangeChange(newDateRange);
      }
    }
  }, [validCandlestickData, onDateRangeChange]);

  // If no valid data after filtering, show empty state
  if (validCandlestickData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No valid price data available</p>
          <p className="text-sm mt-1">Please check back later</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: validCandlestickData.map((candle) => {
      try {
      return format(new Date(candle.date), "MMM dd");
      } catch (e) {
        return candle.date;
      }
    }),
    datasets: [
      // High-Low Range (Wicks)
      {
        label: "Daily Range",
        data: validCandlestickData.map((candle) => ({
          x: format(new Date(candle.date), "MMM dd"),
          y: candle.high || 0,
          low: candle.low || 0,
          open: candle.open || 0,
          close: candle.close || 0,
          change: candle.change || 0,
          changePercent: candle.changePercent || 0,
          volatility: candle.volatility || 0, // Add volatility
        })),
        borderColor: colors.primary,
        backgroundColor: colors.primaryAlpha,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.1,
      },
      // Close Price Line
      {
        label: "Close Price",
        data: validCandlestickData.map((candle) => ({
          x: format(new Date(candle.date), "MMM dd"),
          y: candle.close || 0,
          open: candle.open || 0,
          high: candle.high || 0,
          low: candle.low || 0,
          change: candle.change || 0,
          changePercent: candle.changePercent || 0,
          volatility: candle.volatility || 0, // Add volatility
        })),
        borderColor: colors.success,
        backgroundColor: colors.successAlpha,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: validCandlestickData.map((candle) =>
          candle.close >= candle.open ? colors.success : colors.danger
        ),
        pointBorderColor: validCandlestickData.map((candle) =>
          candle.close >= candle.open ? colors.success : colors.danger
        ),
        fill: true,
        tension: 0.2,
      },
    ],
  };

  // Memoize options to prevent recreation and ensure stable references
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
            weight: "500" as const,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        borderColor: colors.grid,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        titleFont: {
          family: "Inter, system-ui, sans-serif",
          size: 14,
          weight: "600" as const,
        },
        bodyFont: {
          family: "Inter, system-ui, sans-serif",
          size: 13,
        },
        enabled: true,
        filter: function (tooltipItem: any) {
          // Filter out tooltip items with null/undefined data
          return tooltipItem.raw != null && tooltipItem.parsed != null;
        },
        callbacks: {
          title: function (context: any) {
            if (!context || context.length === 0) return "";
            const firstContext = context[0];
            if (!firstContext || !firstContext.raw) return "";
            
            const data = firstContext.raw;
            // Fix: Use the actual date from the data instead of hardcoded 2024
            const dateStr = data?.x ? `${data.x}, 2025` : firstContext?.label;
            if (!dateStr) return "";
            
            try {
            const date = new Date(dateStr);
              if (isNaN(date.getTime())) return dateStr;
            return format(date, "EEEE, MMMM dd, yyyy");
            } catch (e) {
              return dateStr;
            }
          },
          label: function (context: any) {
            if (!context || context.dataIndex == null) return "";
            
            const datasetLabel = context.dataset?.label || "";
            const dataIndex = context.dataIndex;
            const raw = context.raw;
            
            // Access data from the raw object first, fallback to accessing from chart data
            if (!raw || typeof raw !== 'object') return "";
            
            // Extract candle data from raw object
            const candle = {
              high: raw.high ?? raw.y ?? 0,
              low: raw.low ?? 0,
              open: raw.open ?? 0,
              close: raw.close ?? raw.y ?? 0,
              change: raw.change ?? 0,
              changePercent: raw.changePercent ?? 0,
              };
            
            if (!candle || candle.close === 0) return "";

            const high = candle.high ?? 0;
            const low = candle.low ?? 0;
            const open = candle.open ?? 0;
            const close = candle.close ?? 0;
            const change = candle.change ?? close - open;
            const changePercent =
              candle.changePercent ??
              (open !== 0 ? ((close - open) / open) * 100 : 0);

            if (datasetLabel === "Daily Range") {
              return [
                `📊 Daily Range: ${formatPrice(low)} - ${formatPrice(high)}`,
                `📈 High: ${formatPrice(high)}`,
                `📉 Low: ${formatPrice(low)}`,
                `📏 Range: ${formatPrice(high - low)}`,
              ];
            } else if (datasetLabel === "Close Price") {
              const changeSymbol = change >= 0 ? "📈" : "📉";

              return [
                `💰 Close: ${formatPrice(close)}`,
                `🚪 Open: ${formatPrice(open)}`,
                `${changeSymbol} Change: ${formatPrice(change)} (${(
                  changePercent || 0
                ).toFixed(2)}%)`,
              ];
            }
            
            // Fallback for other dataset types
            const data = context.raw;
            if (data && typeof data.y === 'number') {
            return `${datasetLabel}: ${formatPrice(data.y)}`;
            }
            return "";
          },
          afterBody: function (context: any) {
            if (!context || context.length === 0) return [];
            
            const firstContext = context[0];
            if (!firstContext || !firstContext.raw) return [];
            
            const raw = firstContext.raw;
            if (!raw || typeof raw !== 'object') return [];
            
            // Extract candle data from raw object
            const candle = {
              high: raw.high ?? raw.y ?? 0,
              low: raw.low ?? 0,
              open: raw.open ?? 0,
              close: raw.close ?? raw.y ?? 0,
              change: raw.change ?? 0,
              changePercent: raw.changePercent ?? 0,
            };
            
            if (!candle || candle.close === 0) return [];
            
              const change = candle.change ?? candle.close - candle.open;
              const isBullish = change >= 0;
              const volatility =
                ((candle.high - candle.low) / (candle.open || 1)) * 100;
              return [
                "",
                `🎯 ${isBullish ? "Bullish" : "Bearish"} Day`,
                `📊 Volatility: ${volatility.toFixed(2)}%`,
              ];
          },
        },
      },
    },
    scales: {
      x: {
        type: "category" as const,
        grid: {
          color: colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: colors.textSecondary,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 11,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        title: {
          display: true,
          text: "Trading Days",
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
            weight: "500" as const,
          },
        },
      },
      y: {
        type: "linear" as const,
        beginAtZero: false,
        grid: {
          color: colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: colors.textSecondary,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 11,
          },
          callback: function (value: any) {
            return formatPrice(value);
          },
        },
        title: {
          display: true,
          text: `Price (${getCurrencySymbol()})`,
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
            weight: "500" as const,
          },
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
        hoverBorderColor: colors.background,
      },
      line: {
        tension: 0.1,
      },
    },
  }), [colors, formatPrice, getCurrencySymbol]);

  // Calculate summary statistics using validated data
  const summaryStats = useMemo(() => {
    if (validCandlestickData.length === 0) return null;

    const latest = validCandlestickData[validCandlestickData.length - 1];
    const previous = validCandlestickData[validCandlestickData.length - 2];

    // Use real-time spot price if available, otherwise use OHLC close price
    const currentPrice = spotData?.usdPerOunce || latest.close;

    const avgVolatility =
      validCandlestickData.reduce(
        (sum, candle) => sum + ((candle.high - candle.low) / (candle.open || 1)) * 100,
        0
      ) / validCandlestickData.length;
    const totalChange = currentPrice - validCandlestickData[0].open;
    const totalChangePercent = validCandlestickData[0].open > 0 
      ? (totalChange / validCandlestickData[0].open) * 100 
      : 0;

    // Calculate change from previous day (with null check)
    const change = previous ? currentPrice - previous.close : 0;
    const changePercent = previous && previous.close > 0 
      ? (change / previous.close) * 100 
      : 0;

    return {
      latest: {
        ...latest,
        close: currentPrice, // Override with real-time price
        change: change,
        changePercent: changePercent,
      },
      previous: previous || latest,
      avgVolatility,
      totalChange,
      totalChangePercent,
      period: `${validCandlestickData.length} days`,
    };
  }, [validCandlestickData, spotData]);

  return (
    <div className="w-full" dir="ltr">
      {/* Summary Stats */}
      {summaryStats && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current Price
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatPrice(summaryStats.latest.close)}
              {settings.currency === "YER" && (
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">
                  YER
                </span>
              )}
            </div>
            <div
              className={`text-xs ${
                summaryStats.latest.change >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {summaryStats.latest.change >= 0 ? "+" : ""}
              {formatPrice(summaryStats.latest.change)}(
              {(summaryStats.latest.changePercent || 0).toFixed(2)}%)
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Range
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatPrice(summaryStats.latest.low)} -{" "}
              {formatPrice(summaryStats.latest.high)}
            </div>
            <div className="text-xs text-gray-500">
              Range:{" "}
              {formatPrice(summaryStats.latest.high - summaryStats.latest.low)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Period Change
            </div>
            <div
              className={`text-lg font-semibold ${
                summaryStats.totalChange >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {summaryStats.totalChange >= 0 ? "+" : ""}
              {formatPrice(summaryStats.totalChange)}
            </div>
            <div
              className={`text-xs ${
                summaryStats.totalChange >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              ({(summaryStats.totalChangePercent || 0).toFixed(2)}%)
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg Volatility
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {(summaryStats.avgVolatility || 0).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              Over {summaryStats.period}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-96 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <Line
          key={`candlestick-${validCandlestickData.length}-${
            validCandlestickData[0]?.date || "empty"
          }-${
            validCandlestickData[validCandlestickData.length - 1]?.date || "empty"
          }`}
          data={chartData}
          options={options}
        />
      </div>

      {/* Chart Info */}
      <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          📊 Professional candlestick analysis • Last {summaryStats?.period} •
          Hover for detailed OHLC data
        </p>
      </div>
    </div>
  );
};

export default CandlestickChart;
