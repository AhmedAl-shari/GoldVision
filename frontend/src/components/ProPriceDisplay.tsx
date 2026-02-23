import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSpotPrice, useOHLCData, useYemenSummary, getPrices } from "../lib/api";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  DollarSign,
  BarChart3,
} from "lucide-react";

interface PriceData {
  bid: number;
  ask: number;
  last: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  change: number;
  changePercent: number;
}

const ProPriceDisplay = () => {
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"XAU/USD" | "USD/YER" | "XAU/YER">(
    "XAU/USD"
  );
  
  // Store previous prices for change calculation
  const previousPricesRef = useRef<{
    xauUsd?: number;
    yerUsd?: number;
    xauYer?: number;
  }>({});

  // Fetch real-time spot price from GoldAPI.io
  const {
    data: spotData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["spot-price"],
    queryFn: () => getSpotPrice(),
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Fetch Yemen summary data for USD/YER and XAU/YER
  const { data: yemenData } = useYemenSummary("ADEN", "USD");

  // Fetch OHLC for open/high/low/volume fallback (1 day, latest candle)
  const { data: ohlcData } = useOHLCData({ days: 1, limit: 1 });

  // Fetch historical prices for change calculation
  const { data: historicalPrices } = useQuery({
    queryKey: ["historical-prices-for-change", activeTab],
    queryFn: async () => {
      if (activeTab === "XAU/USD") {
        // Fetch historical XAU/USD prices (last 2 days to get previous day)
        const response = await getPrices({
          asset: "XAU",
          currency: "USD",
          limit: 2,
        });
        return response?.prices || [];
      } else if (activeTab === "USD/YER") {
        // Fetch historical FX rates (last 2 days to get previous day)
        const response = await getPrices({
          asset: "USD",
          currency: "YER",
          limit: 2,
        });
        return response?.prices || [];
      } else if (activeTab === "XAU/YER") {
        // Fetch historical XAU/YER prices
        const response = await getPrices({
          asset: "XAU",
          currency: "YER",
          limit: 2,
        });
        return response?.prices || [];
      }
      return [];
    },
    enabled: true, // Fetch for all tabs
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate price data based on active tab
  const priceData: PriceData | null = React.useMemo(() => {
    if (activeTab === "XAU/USD") {
      if (!spotData) return null;

      const currentPrice = spotData.usdPerOunce;

      // Use bid/ask from provider meta when available; otherwise mark unavailable (no heuristics)
      let bid =
        typeof spotData.meta?.bid === "number" ? spotData.meta.bid : undefined;
      let ask =
        typeof spotData.meta?.ask === "number" ? spotData.meta.ask : undefined;

      // Use high/low/open from provider meta if present; otherwise fallback to OHLC
      const lastCandle = ((): any => {
        const d: any = ohlcData as any;
        if (!d) return undefined;
        const list = d.candles || d.values || d.data || d.ohlc;
        if (Array.isArray(list) && list.length > 0) return list[0];
        return undefined;
      })();

      const high =
        typeof spotData.meta?.high_price === "number"
          ? spotData.meta.high_price
          : typeof spotData.meta?.high === "number"
          ? spotData.meta.high
          : typeof lastCandle?.high === "number"
          ? lastCandle.high
          : undefined;
      const low =
        typeof spotData.meta?.low_price === "number"
          ? spotData.meta.low_price
          : typeof spotData.meta?.low === "number"
          ? spotData.meta.low
          : typeof lastCandle?.low === "number"
          ? lastCandle.low
          : undefined;
      const open =
        typeof spotData.meta?.open_price === "number"
          ? spotData.meta.open_price
          : typeof spotData.meta?.open === "number"
          ? spotData.meta.open
          : typeof lastCandle?.open === "number"
          ? lastCandle.open
          : undefined;

      // Change and percent from API response (check both top-level and meta)
      const apiChange = typeof spotData.change === "number" ? spotData.change : 
                       (typeof spotData.meta?.ch === "number" ? spotData.meta.ch : undefined);
      const apiChangePercent = typeof spotData.changePercent === "number" ? spotData.changePercent :
                               (typeof spotData.meta?.chp === "number" ? spotData.meta.chp : undefined);
      
      let change = apiChange ?? 0;
      let changePercent = apiChangePercent ?? 0;
      
      // If API doesn't provide change data (undefined), calculate from historical prices
      if (apiChange === undefined || apiChangePercent === undefined) {
        if (historicalPrices && Array.isArray(historicalPrices) && historicalPrices.length >= 2) {
          // Historical prices are typically sorted newest first (prices[0] = most recent, prices[1] = previous)
          const historicalPrevious = historicalPrices[1]?.price;
          if (historicalPrevious && historicalPrevious > 0) {
            change = currentPrice - historicalPrevious;
            changePercent = (change / historicalPrevious) * 100;
          } else if (previousPricesRef.current.xauUsd) {
            // Fallback to stored previous value
            const previousPrice = previousPricesRef.current.xauUsd;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else if (previousPricesRef.current.xauUsd) {
          // Use stored previous value
          const previousPrice = previousPricesRef.current.xauUsd;
          change = currentPrice - previousPrice;
          changePercent = (change / previousPrice) * 100;
        }
      }
      
      // Update stored previous price
      if (currentPrice && currentPrice !== previousPricesRef.current.xauUsd) {
        previousPricesRef.current.xauUsd = currentPrice;
      }

      // Volume: prefer OHLC last candle's volume from backend if present in meta
      const volumeFromMeta = spotData.meta?.volume;
      const volumeFromOHLC =
        typeof lastCandle?.volume === "number" ? lastCandle.volume : undefined;
      const volume =
        typeof volumeFromMeta === "number"
          ? volumeFromMeta
          : typeof volumeFromOHLC === "number"
          ? volumeFromOHLC
          : 0;

      // Market cap: omit if unknown; display calculated placeholder only if explicitly present
      const marketCapRaw = spotData.meta?.market_cap;
      const marketCap = typeof marketCapRaw === "number" ? marketCapRaw : 0;

      // If provider didn't supply bid/ask, synthesize an indicative spread
      if (typeof bid !== "number" || typeof ask !== "number") {
        // Use intraday range as a guide; fall back to tiny fixed bps if needed
        const range =
          typeof high === "number" && typeof low === "number" && high > low
            ? high - low
            : currentPrice * 0.001; // 10 bps proxy when range missing

        // Indicative spread: 2% of intraday range, clamped to [2, 15] bps of price
        const minBps = 0.0002; // 2 bps
        const maxBps = 0.0015; // 15 bps
        const indicative = Math.min(
          Math.max(range * 0.02, currentPrice * minBps),
          currentPrice * maxBps
        );
        bid = currentPrice - indicative / 2;
        ask = currentPrice + indicative / 2;
      }

      return {
        bid: typeof bid === "number" ? parseFloat(bid.toFixed(2)) : NaN,
        ask: typeof ask === "number" ? parseFloat(ask.toFixed(2)) : NaN,
        last: parseFloat(currentPrice.toFixed(2)),
        open: typeof open === "number" ? parseFloat(open.toFixed(2)) : NaN,
        high: typeof high === "number" ? parseFloat(high.toFixed(2)) : NaN,
        low: typeof low === "number" ? parseFloat(low.toFixed(2)) : NaN,
        volume: volume > 0 ? `${volume.toLocaleString()} units` : "—",
        marketCap: marketCap > 0 ? `$${marketCap.toLocaleString()}` : "—",
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      };
    } else if (activeTab === "USD/YER") {
      if (!yemenData?.meta?.fxRate) return null;

      const currentPrice = yemenData.meta.fxRate;
      
      // Use change values from backend if available, otherwise calculate from historical data
      // Note: USD/YER is typically static (530), so change will usually be 0
      // Backend now returns 0 (not null) for static FX rates
      const backendChange = typeof yemenData.meta?.yerUsdChange === "number" ? yemenData.meta.yerUsdChange : null;
      const backendChangePercent = typeof yemenData.meta?.yerUsdChangePercent === "number" ? yemenData.meta.yerUsdChangePercent : null;
      
      let change = backendChange !== null ? backendChange : 0;
      let changePercent = backendChangePercent !== null ? backendChangePercent : 0;
      let previousPrice: number | undefined;
      
      // Only try to calculate from historical data if backend didn't provide values (null)
      // If backend provided 0, that means the FX rate is static and we should use 0
      if (backendChange === null && backendChangePercent === null && change === 0 && changePercent === 0) {
        if (historicalPrices && Array.isArray(historicalPrices) && historicalPrices.length >= 2) {
          // Historical prices are typically sorted newest first (prices[0] = most recent, prices[1] = previous)
          // Use the second item as previous day's price
          const historicalPrevious = historicalPrices[1]?.price;
          if (historicalPrevious && historicalPrevious > 0) {
            previousPrice = historicalPrevious;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          } else if (previousPricesRef.current.yerUsd) {
            // Fallback to stored previous value
            previousPrice = previousPricesRef.current.yerUsd;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else if (previousPricesRef.current.yerUsd) {
          // Use stored previous value
          previousPrice = previousPricesRef.current.yerUsd;
          change = currentPrice - previousPrice;
          changePercent = (change / previousPrice) * 100;
        }
      } else {
        // Calculate previous price from change for display purposes
        if (change !== 0 && changePercent !== 0) {
          previousPrice = currentPrice - change;
        }
      }
      
      // Update stored previous price
      if (currentPrice && currentPrice !== previousPricesRef.current.yerUsd) {
        previousPricesRef.current.yerUsd = currentPrice;
      }
      
      // Calculate synthetic bid/ask spread for USD/YER
      const spread = currentPrice * 0.001; // 0.1% spread
      const bid = currentPrice - spread / 2;
      const ask = currentPrice + spread / 2;

      return {
        bid: parseFloat(bid.toFixed(2)),
        ask: parseFloat(ask.toFixed(2)),
        last: parseFloat(currentPrice.toFixed(2)),
        open: previousPrice ? parseFloat(previousPrice.toFixed(2)) : parseFloat(currentPrice.toFixed(2)),
        high: parseFloat(currentPrice.toFixed(2)),
        low: parseFloat(currentPrice.toFixed(2)),
        volume: "N/A",
        marketCap: "—",
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      };
    } else if (activeTab === "XAU/YER") {
      if (!yemenData?.spotPrice?.localPerOunce) return null;

      const currentPrice = yemenData.spotPrice.localPerOunce;
      
      // Use change values from backend if available, otherwise calculate from historical data
      let change = typeof yemenData.meta?.xauYerChange === "number" ? yemenData.meta.xauYerChange : 0;
      let changePercent = typeof yemenData.meta?.xauYerChangePercent === "number" ? yemenData.meta.xauYerChangePercent : 0;
      let previousPrice: number | undefined;
      
      // If backend doesn't provide change, calculate from historical data
      if (change === 0 && changePercent === 0) {
        if (historicalPrices && Array.isArray(historicalPrices) && historicalPrices.length >= 2) {
          // Historical prices are typically sorted newest first (prices[0] = most recent, prices[1] = previous)
          // Use the second item as previous day's price
          const historicalPrevious = historicalPrices[1]?.price;
          if (historicalPrevious && historicalPrevious > 0) {
            previousPrice = historicalPrevious;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          } else if (previousPricesRef.current.xauYer) {
            // Fallback to stored previous value
            previousPrice = previousPricesRef.current.xauYer;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else if (previousPricesRef.current.xauYer) {
          // Use stored previous value
          previousPrice = previousPricesRef.current.xauYer;
          change = currentPrice - previousPrice;
          changePercent = (change / previousPrice) * 100;
        }
      } else {
        // Calculate previous price from change for display purposes
        if (change !== 0 && changePercent !== 0) {
          previousPrice = currentPrice - change;
        }
      }
      
      // Update stored previous price
      if (currentPrice && currentPrice !== previousPricesRef.current.xauYer) {
        previousPricesRef.current.xauYer = currentPrice;
      }
      
      // Calculate synthetic bid/ask spread for XAU/YER
      const spread = currentPrice * 0.001; // 0.1% spread
      const bid = currentPrice - spread / 2;
      const ask = currentPrice + spread / 2;

      return {
        bid: parseFloat(bid.toFixed(2)),
        ask: parseFloat(ask.toFixed(2)),
        last: parseFloat(currentPrice.toFixed(2)),
        open: previousPrice ? parseFloat(previousPrice.toFixed(2)) : parseFloat(currentPrice.toFixed(2)),
        high: parseFloat(currentPrice.toFixed(2)),
        low: parseFloat(currentPrice.toFixed(2)),
        volume: "N/A",
        marketCap: "—",
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      };
    }

    return null;
  }, [spotData, ohlcData, yemenData, activeTab, historicalPrices]);

  // Safe formatters to avoid rendering NaN
  const formatMoney = (value: number, fraction: number = 2) =>
    Number.isFinite(value)
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: fraction,
          maximumFractionDigits: fraction,
        })
      : "—";
  const formatNumber = (value: number, fraction: number = 2) =>
    Number.isFinite(value) ? value.toFixed(fraction) : "—";

  // Get tab-specific information
  const getTabInfo = (tab: string) => {
    switch (tab) {
      case "XAU/USD":
        return {
          title: "XAU/USD",
          subtitle: "Gold Spot Price • COMEX Benchmark",
          currency: "USD per Troy Ounce",
          formatPrice: (price: number) =>
            `$${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
        };
      case "USD/YER":
        return {
          title: "USD/YER",
          subtitle: "Yemeni Rial • Regional Exchange Rate",
          currency: "YER",
          formatPrice: (price: number) => `${price.toFixed(2)} YER`,
        };
      case "XAU/YER":
        return {
          title: "XAU/YER",
          subtitle: "Gold in Yemeni Rial • Local Market",
          currency: "YER per Troy Ounce",
          formatPrice: (price: number) =>
            `${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} YER`,
        };
      default:
        return {
          title: "",
          subtitle: "",
          currency: "",
          formatPrice: (price: number) => price.toString(),
        };
    }
  };

  const tabInfo = getTabInfo(activeTab);

  // Update last update time when data changes
  useEffect(() => {
    if (priceData) {
      setLastUpdate(new Date());

      // Trigger flash animation based on price change
      if (priceData.change > 0) {
        setPriceFlash("up");
      } else if (priceData.change < 0) {
        setPriceFlash("down");
      }

      // Clear flash after animation
      setTimeout(() => setPriceFlash(null), 500);
    }
  }, [priceData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !priceData) {
    return (
      <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="text-red-800 dark:text-red-200 text-center py-8">
          <Activity className="h-8 w-8 mx-auto mb-2" />
          <div className="font-semibold">Unable to Load Price Data</div>
          <div className="text-sm">
            Please check your connection and try again.
          </div>
        </div>
      </div>
    );
  }

  const spread =
    Number.isFinite(priceData.ask) && Number.isFinite(priceData.bid)
      ? priceData.ask - priceData.bid
      : NaN;
  const spreadPercent = Number.isFinite(spread)
    ? (spread / priceData.last) * 100
    : NaN;

  return (
    <div className="card">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {tabInfo.title}
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                <Activity className="w-3 h-3" />
                LIVE
              </span>
            </h2>

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["XAU/USD", "USD/YER", "XAU/YER"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted mt-1">{tabInfo.subtitle}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted mb-1">
            <Clock className="w-3 h-3" />
            <span>Last Updated</span>
          </div>
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
            {lastUpdate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Main Price Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Last Price */}
        <div>
          <div
            className={`transition-all duration-500 ${
              priceFlash === "up"
                ? "bg-green-50 dark:bg-green-900/20"
                : priceFlash === "down"
                ? "bg-red-50 dark:bg-red-900/20"
                : ""
            } rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted">Last Price</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {tabInfo.currency}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground">
                {tabInfo.formatPrice(priceData?.last || 0)}
              </span>
              <div className="flex items-center gap-1">
                {priceData.change >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <div className="flex flex-col">
                  <span
                    className={`text-lg font-bold ${
                      priceData.change >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {priceData.change >= 0 ? "+" : ""}
                    {priceData.change.toFixed(2)}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      priceData.changePercent >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    ({priceData.changePercent >= 0 ? "+" : ""}
                    {priceData.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bid/Ask Spread */}
        <div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bid / Ask Spread
              </span>
              <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {Number.isFinite(spread)
                  ? `Spread: ${
                      activeTab === "XAU/USD" ? "$" : ""
                    }${formatNumber(spread, 2)}${
                      activeTab !== "XAU/USD"
                        ? " " + activeTab.split("/")[1]
                        : ""
                    } (${formatNumber(spreadPercent, 3)}%)`
                  : "Spread: —"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-muted mb-1">BID</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {activeTab === "XAU/USD" ? "$" : ""}
                  {formatMoney(priceData?.bid || 0)}
                  {activeTab !== "XAU/USD" ? " " + activeTab.split("/")[1] : ""}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                  Selling price
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-muted mb-1">ASK</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {activeTab === "XAU/USD" ? "$" : ""}
                  {formatMoney(priceData?.ask || 0)}
                  {activeTab !== "XAU/USD" ? " " + activeTab.split("/")[1] : ""}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                  Buying price
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted text-xs mb-2">
            <DollarSign className="w-3 h-3" />
            <span>Open</span>
          </div>
          <div className="text-lg font-bold text-foreground">
            {activeTab === "XAU/USD" ? "$" : ""}
            {formatMoney(priceData?.open || 0)}
            {activeTab !== "XAU/USD" ? " " + activeTab.split("/")[1] : ""}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
            Today's opening price
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted text-xs mb-2">
            <TrendingUp className="w-3 h-3" />
            <span>High</span>
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {activeTab === "XAU/USD" ? "$" : ""}
            {formatMoney(priceData?.high || 0)}
            {activeTab !== "XAU/USD" ? " " + activeTab.split("/")[1] : ""}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
            24h high
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted text-xs mb-2">
            <TrendingDown className="w-3 h-3" />
            <span>Low</span>
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {activeTab === "XAU/USD" ? "$" : ""}
            {formatMoney(priceData?.low || 0)}
            {activeTab !== "XAU/USD" ? " " + activeTab.split("/")[1] : ""}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
            24h low
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted text-xs mb-2">
            <BarChart3 className="w-3 h-3" />
            <span>Volume</span>
          </div>
          <div className="text-lg font-bold text-foreground">
            {priceData?.volume || "—"}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
            24h trading volume
          </div>
        </div>
      </div>

      {/* Data Source Notice */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-500 dark:text-gray-500 text-center">
          Data provided by GoldVision Markets • Prices are indicative and
          subject to market conditions • Market data may be delayed by up to 15
          minutes • For professional use only
        </p>
      </div>
    </div>
  );
};

export default ProPriceDisplay;
