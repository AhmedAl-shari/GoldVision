import React from "react";
import { Activity, Clock } from "lucide-react";
import { useLocale } from "../contexts/useLocale";

interface FXCardProps {
  region: string;
  rate: number;
  source: "market" | "official" | "custom";
  lastUpdated: Date | string | null;
}

const FXCard: React.FC<FXCardProps> = ({
  region,
  rate,
  source,
  lastUpdated,
}) => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  const formatYER = (value: number) =>
    new Intl.NumberFormat(isArabic ? "ar-YE" : "en-US", {
      style: "currency",
      currency: "YER",
      maximumFractionDigits: 0,
    }).format(Math.round(value));

  const sourceLabels = {
    market: isArabic ? "سوق موازية" : "Market Rate",
    official: isArabic ? "سعر رسمي" : "Official Rate",
    custom: isArabic ? "معدل مخصص" : "Custom Rate",
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return isArabic ? "غير متوفر" : "Not available";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(isArabic ? "ar-YE" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 dark:border-slate-700/40 dark:bg-slate-900/40 p-5 shadow-lg backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/2 to-transparent"></div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {isArabic ? "سعر الصرف" : "FX Rate"}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {region}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatYER(rate)}
            </p>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {sourceLabels[source]}
            </p>
          </div>

          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(lastUpdated)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FXCard;

