import { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Activity,
  Clock,
  Shield,
} from "lucide-react";
import {
  getSpotPrice,
  useTechnicalAnalysis,
  getFxStatus,
  useMultiAssetData,
  useYemenSummary,
  getPrices,
} from "../lib/api";
import { API_BASE_URL } from "../lib/config";
import { useQuery } from "@tanstack/react-query";

interface MarketInstrument {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
  marketCap?: string;
}

const ProMarketTicker = () => {
  // Fetch real market data
  const {
    data: technicalData,
    isLoading: technicalLoading,
    error: technicalError,
  } = useTechnicalAnalysis();
  const [spotData, setSpotData] = useState<any>(null);
  const [spotLoading, setSpotLoading] = useState(true);
  const [spotError, setSpotError] = useState<Error | null>(null);
  const [fxData, setFxData] = useState<any>(null);
  const [fxError, setFxError] = useState<Error | null>(null);

  // Multi-asset data for dynamic instruments (Oil, etc.)
  const {
    data: multiAsset,
    isLoading: multiLoading,
    error: multiError,
  } = useMultiAssetData(30);

  // Yemen summary data for USD/YER and XAU/YER
  const {
    data: yemenData,
    isLoading: yemenLoading,
    error: yemenError,
  } = useYemenSummary("ADEN", "USD");

  // Store previous prices for change calculation
  const previousPricesRef = useRef<{
    xauUsd?: number;
    yerUsd?: number;
    xauYer?: number;
  }>({});

  // Fetch historical prices for XAU/USD change calculation
  const { data: historicalXauUsd } = useQuery({
    queryKey: ["historical-xau-usd"],
    queryFn: async () => {
      const response = await getPrices({
        asset: "XAU",
        currency: "USD",
        limit: 2,
      });
      return response?.prices || [];
    },
    enabled: !!spotData?.usdPerOunce,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch historical prices for USD/YER change calculation
  const { data: historicalYerUsd } = useQuery({
    queryKey: ["historical-yer-usd"],
    queryFn: async () => {
      const response = await getPrices({
        asset: "USD",
        currency: "YER",
        limit: 2,
      });
      return response?.prices || [];
    },
    enabled: !!yemenData?.meta?.fxRate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch historical prices for XAU/YER change calculation
  const { data: historicalXauYer } = useQuery({
    queryKey: ["historical-xau-yer"],
    queryFn: async () => {
      const response = await getPrices({
        asset: "XAU",
        currency: "YER",
        limit: 2,
      });
      return response?.prices || [];
    },
    enabled: !!yemenData?.spotPrice?.localPerOunce,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch spot price data
  useEffect(() => {
    const fetchSpotData = async () => {
      try {
        setSpotLoading(true);
        setSpotError(null);
        const data = await getSpotPrice();
        setSpotData(data);
      } catch (error) {
        setSpotError(error as Error);
        console.error("Failed to fetch spot data:", error);
      } finally {
        setSpotLoading(false);
      }
    };

    fetchSpotData();

    // Refresh spot data every 30 seconds
    const interval = setInterval(fetchSpotData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch FX status (DXY, YER, and possibly gold change meta)
  useEffect(() => {
    let mounted = true;
    const fetchFx = async () => {
      try {
        const fx = await getFxStatus();
        if (!mounted) return;
        setFxData(fx);
      } catch (e) {
        setFxError(e as Error);
      }
    };
    fetchFx();
    const interval = setInterval(fetchFx, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch unified instruments from backend (strict: no placeholders)
  const [apiInstruments, setApiInstruments] = useState<MarketInstrument[]>([]);
  const [apiInstrumentsLoading, setApiInstrumentsLoading] = useState(true);
  const [apiInstrumentsError, setApiInstrumentsError] = useState<Error | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    const fetchInstruments = async () => {
      try {
        setApiInstrumentsLoading(true);
        setApiInstrumentsError(null);
        const res = await fetch(`${API_BASE_URL}/market-data/instruments`);
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          const list = (json?.data || []) as any[];
          setApiInstruments(
            list.map((it) => ({
              symbol: it.symbol,
              name: it.name,
              price: Number(it.price) || 0,
              change: Number(it.change) || 0,
              changePercent: Number(it.changePercent) || 0,
              volume: it.volume,
              marketCap: it.marketCap,
            }))
          );
        } else {
          setApiInstruments([]);
        }
      } catch (e: any) {
        if (!mounted) return;
        setApiInstrumentsError(e);
        setApiInstruments([]);
      } finally {
        if (mounted) setApiInstrumentsLoading(false);
      }
    };
    fetchInstruments();
    const interval = setInterval(fetchInstruments, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Create dynamic market instruments from local sources (fallback if API list empty)
  const instruments: MarketInstrument[] = useMemo(() => {
    const items: MarketInstrument[] = [];

    // Gold (XAU/USD)
    if (spotData) {
      items.push({
        symbol: "XAU/USD",
        name: "Gold Spot",
        price: spotData.usdPerOunce || 0,
        change: typeof spotData.change === "number" ? spotData.change : 0,
        changePercent: typeof spotData.changePercent === "number" ? spotData.changePercent : 0,
      });
    }

    // DXY from FX status if available
    if (fxData?.dxy) {
      items.push({
        symbol: "DXY",
        name: "US Dollar Index",
        price: Number(fxData.dxy.value ?? 0),
        change: Number(fxData.dxy.change ?? 0),
        changePercent: Number(fxData.dxy.changePercent ?? 0),
      });
    }

    // Brent/Oil from multi-asset if available
    const oil = multiAsset?.assets?.OIL || multiAsset?.assets?.BRENT;
    if (oil?.currentPrice) {
      items.push({
        symbol: oil.symbol || "BRENT",
        name: oil.name || "Brent Crude",
        price: oil.currentPrice,
        change: oil.change ?? 0,
        changePercent: oil.changePercent ?? 0,
        volume:
          oil.data && oil.data.length
            ? `${Math.round(oil.data[0].volume)} units`
            : undefined,
      });
    }

    // USD/YER from Yemen summary data
    if (yemenData?.meta?.fxRate) {
      const currentPrice = yemenData.meta.fxRate;
      let change = yemenData.meta.yerUsdChange ?? 0;
      let changePercent = yemenData.meta.yerUsdChangePercent ?? 0;
      
      if (change === 0 && changePercent === 0) {
        if (historicalYerUsd && Array.isArray(historicalYerUsd) && historicalYerUsd.length >= 2) {
          const historicalPrevious = historicalYerUsd[1]?.price;
          if (historicalPrevious && historicalPrevious > 0) {
            change = currentPrice - historicalPrevious;
            changePercent = (change / historicalPrevious) * 100;
          } else if (previousPricesRef.current.yerUsd) {
            const previousPrice = previousPricesRef.current.yerUsd;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else if (previousPricesRef.current.yerUsd) {
          const previousPrice = previousPricesRef.current.yerUsd;
          change = currentPrice - previousPrice;
          changePercent = (change / previousPrice) * 100;
        }
      }
      
      if (currentPrice && currentPrice !== previousPricesRef.current.yerUsd) {
        previousPricesRef.current.yerUsd = currentPrice;
      }
      
      items.push({
        symbol: "USD/YER",
        name: "Yemeni Rial",
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      });
    }

    // XAU/YER from Yemen summary data
    if (yemenData?.spotPrice?.localPerOunce && yemenData?.meta?.fxRate) {
      const currentPrice = yemenData.spotPrice.localPerOunce;
      let change = yemenData.meta.xauYerChange ?? 0;
      let changePercent = yemenData.meta.xauYerChangePercent ?? 0;
      
      if (change === 0 && changePercent === 0) {
        if (historicalXauYer && Array.isArray(historicalXauYer) && historicalXauYer.length >= 2) {
          const historicalPrevious = historicalXauYer[1]?.price;
          if (historicalPrevious && historicalPrevious > 0) {
            change = currentPrice - historicalPrevious;
            changePercent = (change / historicalPrevious) * 100;
          } else if (previousPricesRef.current.xauYer) {
            const previousPrice = previousPricesRef.current.xauYer;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else if (previousPricesRef.current.xauYer) {
          const previousPrice = previousPricesRef.current.xauYer;
          change = currentPrice - previousPrice;
          changePercent = (change / previousPrice) * 100;
        }
      }
      
      if (currentPrice && currentPrice !== previousPricesRef.current.xauYer) {
        previousPricesRef.current.xauYer = currentPrice;
      }
      
      items.push({
        symbol: "XAU/YER",
        name: "Gold (YER)",
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      });
    }

    return items;
  }, [spotData, fxData, multiAsset, yemenData, historicalYerUsd, historicalXauYer]);

  // Calculate changes for Gold if we have technical data
  const instrumentsWithChanges: MarketInstrument[] = useMemo(() => {
    let mergedInstruments = [...instruments];

    apiInstruments.forEach((apiInstrument) => {
      const exists = mergedInstruments.some(
        (local) => local.symbol === apiInstrument.symbol
      );
      if (!exists) {
        mergedInstruments.push(apiInstrument);
      }
    });

    if (spotData) {
      mergedInstruments = mergedInstruments.map((inst) => {
        if (inst.symbol === "XAU/USD") {
          const currentPrice = spotData.usdPerOunce || inst.price || 0;
          
          const apiChange = typeof spotData.change === "number" ? spotData.change : undefined;
          const apiChangePercent = typeof spotData.changePercent === "number" ? spotData.changePercent : undefined;
          
          let change = apiChange ?? 0;
          let changePercent = apiChangePercent ?? 0;
          
          if (apiChange === undefined || apiChangePercent === undefined) {
            if (historicalXauUsd && Array.isArray(historicalXauUsd) && historicalXauUsd.length >= 2) {
              const historicalPrevious = historicalXauUsd[1]?.price;
              if (historicalPrevious && historicalPrevious > 0) {
                change = currentPrice - historicalPrevious;
                changePercent = (change / historicalPrevious) * 100;
              } else if (previousPricesRef.current.xauUsd) {
                const previousPrice = previousPricesRef.current.xauUsd;
                change = currentPrice - previousPrice;
                changePercent = (change / previousPrice) * 100;
              }
            } else if (previousPricesRef.current.xauUsd) {
              const previousPrice = previousPricesRef.current.xauUsd;
              change = currentPrice - previousPrice;
              changePercent = (change / previousPrice) * 100;
            }
          }
          
          if (currentPrice && currentPrice !== previousPricesRef.current.xauUsd) {
            previousPricesRef.current.xauUsd = currentPrice;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProMarketTicker] XAU/USD update:', {
              spotDataChange: spotData.change,
              spotDataChangePercent: spotData.changePercent,
              calculatedFromHistorical: apiChange === undefined,
              finalChange: change,
              finalChangePercent: changePercent,
              price: currentPrice
            });
          }
          
          return {
            ...inst,
            price: currentPrice,
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
          };
        }
        return inst;
      });
    }

    if (technicalData && !spotData) {
      mergedInstruments = mergedInstruments.map((inst) => {
        if (inst.symbol === "XAU/USD" && technicalData.data?.change !== undefined) {
          return {
            ...inst,
            change: technicalData.data.change,
            changePercent: technicalData.data.changePercent || 0,
          };
        }
        return inst;
      });
    }

    return mergedInstruments;
  }, [apiInstruments, instruments, technicalData, spotData, historicalXauUsd]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<"OPEN" | "CLOSED">("OPEN");

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());

      const hour = new Date().getHours();
      setMarketStatus(hour >= 9 && hour < 16 ? "OPEN" : "CLOSED");
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  const formatPrice = (symbol: string, price: number) => {
    if (symbol === "USD/YER") {
      return `${price.toFixed(2)} YER`;
    } else if (symbol.includes("/USD")) {
      return `$${price.toFixed(2)}`;
    } else if (symbol.includes("XAU/YER")) {
      return `${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} YER`;
    } else if (symbol.includes("YER")) {
      return `${price.toFixed(2)} YER`;
    }
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="w-full relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-b-2 border-indigo-500/30 dark:border-indigo-600/40 shadow-2xl">
      {/* Premium Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-blue-600/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.15),transparent_50%)] pointer-events-none" />
      
      {/* Premium Market Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2 bg-black/30 dark:bg-black/50 backdrop-blur-xl border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-6">
          {/* Market Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-3 h-3 rounded-full ${
                  marketStatus === "OPEN"
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse"
                    : "bg-red-500 shadow-lg shadow-red-500/50"
                }`}
              />
              {marketStatus === "OPEN" && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </div>
            <span className="text-white font-bold text-xs tracking-wide uppercase">
              MARKET {marketStatus}
            </span>
          </div>

          {/* Clock & Time */}
          <div className="flex items-center gap-2 text-white/80">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short",
              })}
            </span>
          </div>

          {/* Data Source */}
          <div className="hidden md:flex items-center gap-2 text-white/60 text-xs">
            <Activity className="w-3 h-3" />
            <span>Data provided by GoldVision Markets • Updated in real-time</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Loading/Error Status */}
          <div className="flex items-center gap-3">
            {(spotLoading || multiLoading || yemenLoading) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 dark:bg-white/5 rounded-lg backdrop-blur-sm border border-white/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span className="text-xs text-white/80 font-medium">Loading...</span>
              </div>
            )}
            {(spotError || fxError || multiError || yemenError) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 dark:bg-red-500/10 rounded-lg backdrop-blur-sm border border-red-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-medium">Data Error</span>
              </div>
            )}
          </div>

          {/* Risk Disclaimer */}
          <div className="hidden lg:flex items-center gap-2 text-amber-400/80 text-[10px] font-medium">
            <Shield className="w-3 h-3" />
            <span>Trading involves risk. Past performance does not guarantee future results.</span>
          </div>
        </div>
      </div>

      {/* Premium Scrolling Ticker */}
      {!spotLoading &&
        !technicalLoading &&
        !multiLoading &&
        !yemenLoading &&
        !spotError &&
        !technicalError &&
        !multiError &&
        !yemenError &&
        instrumentsWithChanges.length > 0 && (
          <div className="relative z-10 overflow-hidden py-2">
            <div className="flex animate-marquee hover:pause gap-6 px-6">
              {[...instrumentsWithChanges, ...instrumentsWithChanges].map(
                (inst, idx) => {
                  const isPositive = inst.change >= 0;
                  const changeIntensity = Math.abs(inst.changePercent);
                  const isHighVolatility = changeIntensity > 2;
                  
                  return (
                    <div
                      key={`${inst.symbol}-${idx}`}
                      className={`group relative flex items-center gap-3 min-w-max px-5 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                        isPositive
                          ? "bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-green-500/10 border border-emerald-400/30 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/20"
                          : "bg-gradient-to-br from-red-500/10 via-rose-600/5 to-red-500/10 border border-red-400/30 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/20"
                      } backdrop-blur-md hover:scale-105 hover:bg-opacity-20`}
                    >
                      {/* Gradient Border Glow */}
                      <div
                        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                          isPositive
                            ? "bg-gradient-to-r from-emerald-400/20 to-green-400/20"
                            : "bg-gradient-to-r from-red-400/20 to-rose-400/20"
                        }`}
                      />

                      {/* Content */}
                      <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Symbol & Name */}
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-bold text-base tracking-wide">
                            {inst.symbol}
                          </span>
                          <span className="text-white/60 text-xs font-medium">
                            {inst.name}
                          </span>
                        </div>

                        {/* Price & Change */}
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-white font-bold text-lg">
                            {formatPrice(inst.symbol, inst.price)}
                          </span>
                          <div className="flex items-center gap-2">
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-sm font-bold ${
                                  isPositive
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {inst.change.toFixed(2)}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                  isHighVolatility
                                    ? isPositive
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                      : "bg-red-500/20 text-red-300 border border-red-400/30"
                                    : isPositive
                                    ? "text-emerald-400/80"
                                    : "text-red-400/80"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {inst.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Volume (if available) */}
                        {inst.volume && (
                          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                            <Activity className="w-3 h-3 text-white/50" />
                            <span className="text-white/50 text-xs font-medium">
                              {inst.volume}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

      {/* Premium Loading State */}
      {(spotLoading || technicalLoading || multiLoading || yemenLoading) && (
        <div className="relative z-10 flex items-center justify-center py-12">
          <div className="flex items-center gap-4 px-6 py-4 bg-white/5 dark:bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-white/90 font-medium text-sm">
              Loading market data...
            </span>
          </div>
        </div>
      )}

      {/* Premium Error State */}
      {(spotError && technicalError && !instruments.length) && (
        <div className="relative z-10 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3 px-6 py-4 bg-yellow-500/10 dark:bg-yellow-500/5 rounded-xl backdrop-blur-md border border-yellow-500/30">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <div className="text-center space-y-1">
              <div className="text-white/90 text-sm font-semibold">
                Some market data unavailable
              </div>
              <div className="text-white/60 text-xs">
                {spotError?.message?.includes('timeout') 
                  ? 'Connection timeout - data may be delayed'
                  : 'Retrying...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 60s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
          @keyframes pulse-glow {
            0%, 100% {
              opacity: 1;
              box-shadow: 0 0 10px currentColor;
            }
            50% {
              opacity: 0.8;
              box-shadow: 0 0 20px currentColor;
            }
          }
        `,
        }}
      />
    </div>
  );
};

export default ProMarketTicker;
