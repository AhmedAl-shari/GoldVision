import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocale } from "../contexts/useLocale";

interface KpiChipProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
}

const KpiChip: React.FC<KpiChipProps> = ({
  label,
  value,
  unit,
  trend = "neutral",
  trendValue,
}) => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
      ? TrendingDown
      : Minus;

  const trendColor =
    trend === "up"
      ? "text-green-600 dark:text-green-400"
      : trend === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {unit && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          )}
        </div>
      </div>
      {trend !== "neutral" && (
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          {trendValue !== undefined && (
            <span className="text-xs font-medium">
              {trend > 0 ? "+" : ""}
              {trendValue.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KpiChip;

