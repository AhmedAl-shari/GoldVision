import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSpotPrice,
  useYemenSummary,
  getYemenPremium,
  getPrices,
} from "../lib/api";
import { useLocale } from "../contexts/useLocale";
import { useYemenSettings } from "../contexts/YemenSettingsContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import RegionalPricingTopBar from "../components/RegionalPricingTopBar";
import RegionalPriceCard from "../components/RegionalPriceCard";
import FXCard from "../components/FXCard";
import KpiChip from "../components/KpiChip";
import GoldShopsMap from "../components/GoldShopsMap";
import ErrorBoundary from "../components/ErrorBoundary";
import ZakatCalculator from "../components/ZakatCalculator";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Table as TableIcon,
  Activity,
  AlertTriangle,
  Bell,
  RefreshCw,
  DollarSign,
  MapPin,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

import { GRAMS_PER_OUNCE } from "../lib/constants";

type TabType = "summary" | "table" | "shops";

const RegionalPricing: React.FC = () => {
  const { t, locale, formatCurrency } = useLocale();
  const isArabic = locale === "ar";
  const { settings: yemenSettings, updateSettings } = useYemenSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL or default to "summary"
  // Redirect "trends" to "summary" if someone has it in URL
  const tabParam = searchParams.get("tab") || "summary";
  const activeTab = (tabParam === "trends" ? "summary" : tabParam) as TabType;
  
  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams, { replace: true });
  };
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [selectedKarat, setSelectedKarat] = useState<24 | 22 | 21 | 18>(24);
  const navigate = useNavigate();

  const {
    data: spotData,
    isLoading: spotLoading,
    error: spotError,
  } = useQuery({
    queryKey: ["spot-price", "regional-pricing"],
    queryFn: () => getSpotPrice(),
    refetchInterval: 60_000,
  });

  // Fetch Yemen summary data
  const { data: yemenData } = useYemenSummary(yemenSettings.region, "YER");

  const usdPerOunce = useMemo(() => {
    if (typeof spotData?.usdPerOunce === "number") {
      return spotData.usdPerOunce;
    }
    if (typeof spotData?.usdPerGram === "number") {
      return spotData.usdPerGram * GRAMS_PER_OUNCE;
    }
    return null;
  }, [spotData]);

  const usdPerGram = useMemo(() => {
    if (typeof spotData?.usdPerGram === "number") {
      return spotData.usdPerGram;
    }
    if (typeof spotData?.usdPerOunce === "number") {
      return spotData.usdPerOunce / GRAMS_PER_OUNCE;
    }
    return null;
  }, [spotData]);

  // Calculate FX rate based on selected source (Custom removed; only Market and Official)
  const fxRate = useMemo(() => {
    const source = yemenSettings.fxSource || "market";
    // Treat saved "custom" as market so old preferences still work
    const effectiveSource = source === "custom" ? "market" : source;

    if (effectiveSource === "official") {
      return 250; // Official government rate (~250 USD/YER)
    }

    // Market rate (parallel market rate)
    return yemenSettings.marketRate || yemenSettings.effectiveRate || 530;
  }, [
    yemenSettings.fxSource,
    yemenSettings.marketRate,
    yemenSettings.effectiveRate,
  ]);


  // Calculate prices for different karats
  const calculateKaratPrice = (karat: number, baseUsdPerGram: number) => {
    const karatFactor = karat / 24;
    const usdPrice = baseUsdPerGram * karatFactor;
    const yerPrice = usdPrice * fxRate;
    return { usdPrice, yerPrice, karatFactor };
  };

  // Fetch premium from market data
  const { data: premiumData } = useQuery({
    queryKey: ["yemen-premium", yemenSettings.region],
    queryFn: () => getYemenPremium(yemenSettings.region, 30),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000,
  });

  // Calculate premium vs international from market data
  const premiumPct = useMemo(() => {
    // Use calculated premium from market data if available
    if (premiumData?.success && premiumData.premium !== undefined) {
      return premiumData.premium;
    }
    // Fallback: calculate from region multiplier
    const regionMultiplier =
      yemenSettings.region === "ADEN"
        ? 1.02
        : yemenSettings.region === "SANAA"
        ? 1.0
        : yemenSettings.region === "TAIZ"
        ? 1.01
        : 1.0;
    return (regionMultiplier - 1) * 100;
  }, [premiumData, yemenSettings.region]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    if (!usdPerOunce || !usdPerGram) return null;

    const yerPerGram24 = usdPerGram * fxRate;
    const internationalUsdPerGram = usdPerGram; // Assuming spot is international

    return {
      spotUsdPerOunce: usdPerOunce,
      fxRate: fxRate,
      price24kUsd: usdPerGram,
      price24kYer: yerPerGram24,
      premium: premiumPct,
    };
  }, [usdPerOunce, usdPerGram, fxRate, premiumPct]);

  // Fetch historical prices for mini-series (last 7 days)
  const {
    data: historicalPricesData,
    isLoading: historicalPricesLoading,
    error: historicalPricesError,
  } = useQuery({
    queryKey: ["historical-prices-mini", "XAU", "USD"],
    queryFn: async () => {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
      
      const response = await getPrices({
        asset: "XAU",
        currency: "USD",
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
        limit: 7,
      });
      
      return response?.prices || [];
    },
    enabled: !!usdPerGram,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Generate price cards data for 24k, 22k, 21k, 18k
  const priceCardsData = useMemo(() => {
    if (!usdPerGram) return [];

    // Process historical prices to create mini-series for each karat
    const processHistoricalPrices = (karat: number): number[] => {
      if (!historicalPricesData || historicalPricesData.length === 0) {
        // Fallback: generate mock data if historical prices unavailable
        const { usdPrice } = calculateKaratPrice(karat, usdPerGram);
        return Array.from({ length: 7 }, (_, i) => {
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
          return usdPrice * (1 + variation);
        });
      }

      // Transform historical prices to per-gram prices for the specific karat
      const karatFactor = karat / 24;
      return historicalPricesData
        .slice(0, 7) // Ensure max 7 days
        .map((pricePoint) => {
          // Convert from per-ounce to per-gram, then apply karat factor
          const usdPerGramHistorical = (pricePoint.price || 0) / GRAMS_PER_OUNCE;
          return usdPerGramHistorical * karatFactor;
        })
        .reverse(); // Reverse to show oldest to newest (or keep as-is depending on API order)
    };

    return ([24, 22, 21, 18] as const).map((karat) => {
      const { usdPrice, yerPrice } = calculateKaratPrice(karat, usdPerGram);
      const miniSeries = processHistoricalPrices(karat);

      return {
        karat,
        usdPerGram: usdPrice,
        yerPerGram: yerPrice,
        premiumPct: karat === 24 ? premiumPct : premiumPct * (karat / 24),
        spread: 0.5, // Example spread
        miniSeries,
        region: yemenSettings.region,
        fxRate: fxRate,
        fxSource: yemenSettings.fxSource === "custom" ? "market" : (yemenSettings.fxSource || "market"),
        isHistoricalData: historicalPricesData && historicalPricesData.length > 0,
      };
    });
  }, [usdPerGram, fxRate, premiumPct, yemenSettings.region, yemenSettings.fxSource, historicalPricesData]);

  const handleCreateAlert = () => {
    // Navigate to alerts page with pre-filled data
    navigate("/alerts", {
      state: {
        prefill: {
          asset: "XAU",
          currency: "YER",
          region: yemenSettings.region,
          karat: yemenSettings.karat,
        },
      },
    });
  };

  const formatYER = (value: number) =>
    new Intl.NumberFormat(isArabic ? "ar-YE" : "en-US", {
      style: "currency",
      currency: "YER",
      maximumFractionDigits: 0,
    }).format(Math.round(value));

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 space-y-8"
      data-testid="regional-pricing"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {isArabic ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
        </Link>

        {/* Main Card - Matching News/Calculator Style */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-[1px] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20"></div>
          <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {t("Regional Pricing") || "Regional Pricing"}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {isArabic
                        ? "تحليل تسعير الذهب في اليمن، بما في ذلك العلاوات المحلية وحركة السوق وتقارير التدفق."
                        : "Dedicated workspace for Yemen market pricing, premiums, and flow intelligence."}
                    </p>
                  </div>
                </div>

                {/* Quick Stats - KPI Strip */}
                {kpiData && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Spot:{" "}
                        {kpiData.spotUsdPerOunce
                          ? formatCurrency(kpiData.spotUsdPerOunce)
                          : "—"}
                        /oz
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        USD↔YER: {formatYER(kpiData.fxRate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        24K: {formatCurrency(kpiData.price24kUsd)}/g
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Premium: {kpiData.premium > 0 ? "+" : ""}
                        {kpiData.premium.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                  {isArabic ? "تحديث" : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6 mt-6">
          {/* Sticky Top Bar */}
          <RegionalPricingTopBar
            onCreateAlert={handleCreateAlert}
            activeTab={activeTab}
          />

          {/* Modern Segmented Control Tabs */}
          <div className="relative bg-gradient-to-b from-gray-50/50 via-white to-white dark:from-gray-900/50 dark:via-gray-900 dark:to-gray-800/30 rounded-2xl border-2 border-emerald-100/60 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/5 overflow-hidden backdrop-blur-sm">
            <div className="px-3 sm:px-4 py-3">
              <div className="relative inline-flex items-center gap-2 p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 shadow-inner overflow-x-auto scrollbar-hide">
                {[
                  {
                    id: "summary",
                    label: isArabic ? "ملخص" : "Summary",
                    icon: Globe,
                  },
                  {
                    id: "table",
                    label: isArabic ? "جدول" : "Table",
                    icon: TableIcon,
                  },
                  {
                    id: "shops",
                    label: isArabic ? "المحلات" : "Shops",
                    icon: MapPin,
                  },
                ].map((tab, index, array) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as TabType)}
                      className={`relative flex items-center gap-2.5 px-5 sm:px-6 py-3 text-sm font-bold transition-all duration-300 whitespace-nowrap group overflow-hidden ${
                        isActive
                          ? "text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      } ${isFirst ? "rounded-l-lg" : ""} ${
                        isLast ? "rounded-r-lg" : ""
                      }`}
                    >
                      {/* Active state background with gradient */}
                      {isActive && (
                        <>
                          <span className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-lg shadow-lg shadow-emerald-500/40"></span>
                          <span className="absolute inset-0 bg-gradient-to-t from-emerald-600/50 to-transparent rounded-lg"></span>
                        </>
                      )}

                      {/* Hover effect for inactive tabs */}
                      {!isActive && (
                        <span className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      )}

                      {/* Icon with enhanced styling */}
                      <div
                        className={`relative z-10 flex items-center justify-center p-1.5 rounded-md transition-all duration-300 ${
                          isActive
                            ? "bg-white/20 backdrop-blur-sm scale-110"
                            : "bg-transparent group-hover:bg-gray-200/50 dark:group-hover:bg-gray-700/50 scale-100 group-hover:scale-105"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 transition-all duration-300 ${
                            isActive
                              ? "text-white drop-shadow-sm"
                              : "text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                          }`}
                        />
                      </div>

                      {/* Label with enhanced typography */}
                      <span
                        className={`relative z-10 font-bold tracking-wide ${
                          isActive ? "drop-shadow-sm text-white" : ""
                        }`}
                      >
                        {tab.label}
                      </span>

                      {/* Shine effect on active */}
                      {isActive && (
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shine rounded-lg"></span>
                      )}

                      {/* Glow effect */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-lg bg-emerald-400/20 blur-xl opacity-75 -z-10"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-6">
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Content - 2x2 Grid */}
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {priceCardsData.map((cardData) => (
                      <RegionalPriceCard key={cardData.karat} {...cardData} />
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                  {/* FX Card */}
                  <FXCard
                    region={yemenSettings.region}
                    rate={fxRate}
                    source={yemenSettings.fxSource === "custom" ? "market" : (yemenSettings.fxSource || "market")}
                    lastUpdated={spotData?.fetchedAt || spotData?.asOf || null}
                  />

                  {/* Zakat Calculator */}
                  <ZakatCalculator />
                </div>
              </div>
            )}

            {/* Table Tab - Enhanced */}
            {activeTab === "table" && (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 dark:border-slate-700/40 dark:bg-slate-900/40 shadow-xl backdrop-blur">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-indigo-500/3"></div>
                <div className="relative overflow-x-auto scrollbar-hide">
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30">
                      <tr>
                        <th className="sticky left-0 z-20 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r-2 border-blue-200 dark:border-blue-800 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                          {isArabic ? "العيار" : "Karat"}
                        </th>
                        {["SANAA", "ADEN", "TAIZ", "HODEIDAH"].map((region) => (
                          <th
                            key={region}
                            className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                          >
                            {region}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[24, 22, 21, 18].map((karat, idx) => {
                        const { usdPrice, yerPrice } = usdPerGram
                          ? calculateKaratPrice(karat, usdPerGram)
                          : { usdPrice: 0, yerPrice: 0 };
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={karat}
                            className={`transition-colors ${
                              isEven
                                ? "bg-white/80 dark:bg-gray-800/50"
                                : "bg-gray-50/50 dark:bg-gray-900/30"
                            } hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}
                          >
                            <td
                              className={`sticky left-0 z-10 bg-inherit px-6 py-4 font-bold text-gray-900 dark:text-white border-r-2 border-blue-200 dark:border-blue-800 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${
                                isEven
                                  ? "bg-white/80 dark:bg-gray-800/50"
                                  : "bg-gray-50/50 dark:bg-gray-900/30"
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {karat}K
                              </span>
                            </td>
                            {["SANAA", "ADEN", "TAIZ", "HODEIDAH"].map(
                              (region) => (
                                <td
                                  key={region}
                                  className="px-6 py-4 text-center border-l border-gray-200/50 dark:border-gray-700/50"
                                >
                                  <div className="space-y-2 min-w-[140px]">
                                    <div className="text-gray-900 dark:text-white font-bold text-lg">
                                      {formatCurrency(usdPrice)}/g
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                      {formatYER(yerPrice)}/g
                                    </div>
                                    <div className="flex items-center justify-center gap-2 pt-1">
                                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                        +{premiumPct.toFixed(1)}%
                                      </span>
                                      <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                                        0.5%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              )
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Shops Tab - Gold Shops Map */}
            {activeTab === "shops" && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 dark:border-slate-700/40 dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-teal-500/3"></div>
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isArabic
                              ? "البحث عن محلات الذهب القريبة"
                              : "Find Nearby Gold Shops"}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                          {isArabic
                            ? "ابحث عن محلات الذهب الموثوقة والمعتمدة في منطقتك. اعثر على أقرب المحلات بناءً على موقعك واحصل على التقييمات والمراجعات."
                            : "Find trusted and certified gold shops in your area. Discover the nearest shops based on your location and view ratings and reviews."}
                        </p>
                      </div>
                    </div>

                    {/* Map Component */}
                    <ErrorBoundary>
                      <GoldShopsMap region={yemenSettings.region} />
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State - Only show if no data available */}
            {spotLoading && !spotData && (
              <div className="flex items-center justify-center py-12">
                <Activity className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {isArabic ? "جارٍ التحميل..." : "Loading..."}
                </span>
              </div>
            )}

            {/* Error State */}
            {spotError && !spotData && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    {isArabic
                      ? "تعذر تحميل بيانات السعر. يرجى المحاولة مرة أخرى."
                      : "Unable to load price data. Please try again."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalPricing;
