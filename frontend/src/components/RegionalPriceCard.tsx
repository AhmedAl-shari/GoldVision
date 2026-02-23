import React, { useState, useMemo } from "react";
import { Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import { useLocale } from "../contexts/useLocale";
import { copyToClipboard } from "../lib/clipboard";
import toast from "react-hot-toast";

interface RegionalPriceCardProps {
  karat: 24 | 22 | 21 | 18;
  usdPerGram: number;
  yerPerGram: number;
  premiumPct?: number;
  spread?: number;
  miniSeries?: number[];
  region?: string;
  fxRate?: number;
  fxSource?: string;
  onCopy?: () => void;
  isHistoricalData?: boolean;
}

const RegionalPriceCard: React.FC<RegionalPriceCardProps> = ({
  karat,
  usdPerGram,
  yerPerGram,
  premiumPct = 0,
  spread = 0,
  miniSeries = [],
  region,
  fxRate,
  fxSource = "market",
  onCopy,
  isHistoricalData = true,
}) => {
  const { locale, formatCurrency, formatNumber } = useLocale();
  const isArabic = locale === "ar";
  const [copied, setCopied] = useState(false);

  const formatYER = (value: number) =>
    new Intl.NumberFormat(isArabic ? "ar-YE" : "en-US", {
      style: "currency",
      currency: "YER",
      maximumFractionDigits: 0,
    }).format(Math.round(value));

  const handleCopy = async () => {
    const text = `${karat}K: ${formatCurrency(usdPerGram)}/g (${formatYER(yerPerGram)})`;
    const result = await copyToClipboard(text);
    if (result.success) {
      setCopied(true);
      toast.success(isArabic ? "تم النسخ" : "Copied!");
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }
  };

  const isPremiumPositive = premiumPct >= 0;
  const PremiumIcon = isPremiumPositive ? TrendingUp : TrendingDown;

  // Simple sparkline (7-day mini chart)
  const sparklinePoints = useMemo(() => {
    if (miniSeries.length === 0) return "";
    const maxValue = Math.max(...miniSeries);
    const minValue = Math.min(...miniSeries);
    const range = maxValue - minValue || 1;
    return miniSeries.map((val, i) => {
      const x = (i / (miniSeries.length - 1 || 1)) * 100;
      const y = 100 - ((val - minValue) / range) * 80; // 80% height for padding
      return `${x},${y}`;
    }).join(" ");
  }, [miniSeries]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {karat}K {isArabic ? "ذهب" : "Gold"}
          </h3>
          {region && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {region}
            </p>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isArabic ? "نسخ السعر" : "Copy price"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Prices */}
      <div className="space-y-2 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            USD/g
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(usdPerGram)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            YER/g
          </p>
          <p
            className="text-xl font-semibold text-gray-700 dark:text-gray-300 cursor-help"
            title={
              fxRate
                ? isArabic
                  ? `بناءً على معدل ${formatYER(fxRate)} من ${fxSource === "market" ? "السوق" : fxSource === "official" ? "الرسمي" : "المخصص"}`
                  : `Based on ${formatYER(fxRate)} rate from ${fxSource}`
                : undefined
            }
          >
            {formatYER(yerPerGram)}
          </p>
        </div>
      </div>

      {/* Premium Badge */}
      {premiumPct !== 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
              isPremiumPositive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            <PremiumIcon className="h-3 w-3" />
            {isPremiumPositive ? "+" : ""}
            {premiumPct.toFixed(1)}%
          </div>
          {spread > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Spread: {spread.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* Mini Sparkline */}
      {miniSeries.length > 0 && sparklinePoints && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-12 w-full relative">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-emerald-600 dark:text-emerald-400"
              />
            </svg>
            {!isHistoricalData && (
              <div className="absolute top-0 right-0 text-[8px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded">
                Demo
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionalPriceCard;

