import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDataSourceStatus, getSpotPrice } from "../lib/api";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { useAuth } from "../contexts/useAuth";
import { useLocale } from "../contexts/useLocale";
import { Database } from "lucide-react";

interface ProviderStatus {
  last_fetch_at: string | null;
  last_price: { ds: string; price: number } | null;
  retries_last_run: number;
  fallback_used_last_run: boolean;
  scheduler_interval_min: number | null;
  provider_type: string | null;
  status: "healthy" | "degraded" | "error" | "unknown";
  last_request_id?: string;
}

const DataSourceCard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLocale();

  const {
    data: status,
    isLoading,
    error,
  } = useQuery<ProviderStatus>({
    queryKey: ["admin-data-source"],
    queryFn: getDataSourceStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: user?.role === "admin", // Only fetch if user is admin
  });

  // Fetch real-time spot price
  const { data: spotData, isLoading: spotLoading } = useQuery({
    queryKey: ["spot-price"],
    queryFn: () => getSpotPrice(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 dark:text-green-400";
      case "degraded":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return "✅";
      case "degraded":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "❓";
    }
  };

  const lastFetchTime = status?.last_fetch_at
    ? formatDistanceToNowStrict(parseISO(status.last_fetch_at), {
        addSuffix: true,
      })
    : "N/A";

  // Show access denied if user is not admin
  if (user?.role !== "admin") {
    return (
      <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-purple-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-base font-medium text-purple-600 dark:text-purple-300 mb-1">
              Data Source
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Admin access required to view data source information.
            </p>
          </div>
          <div className="rounded-xl p-3 bg-purple-500/15 ring-1 ring-purple-400/40">
            <Database className="h-6 w-6 text-purple-600 dark:text-purple-200" />
          </div>
        </div>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="rounded-xl p-3 bg-purple-500/15 ring-1 ring-purple-400/40">
            <Database className="h-6 w-6 text-purple-600 dark:text-purple-200" />
          </div>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-red-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-base font-medium text-red-600 dark:text-red-300 mb-1">
              Data Source Error
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Failed to load data source status.
            </p>
          </div>
          <div className="rounded-xl p-3 bg-red-500/15 ring-1 ring-red-400/40">
            <Database className="h-6 w-6 text-red-600 dark:text-red-200" />
          </div>
        </div>
      </article>
    );
  }

  const intervalLabel =
    status?.scheduler_interval_min && status.scheduler_interval_min > 0
      ? `${status.scheduler_interval_min} min`
      : "N/A";

  const providerTypeLabel = status?.provider_type || "Unknown";

  return (
    <article className="relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-purple-400/40 dark:border-slate-700/40 dark:bg-slate-900/40 border-slate-200/60 bg-white/95">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <p className="text-base font-medium text-purple-600 dark:text-purple-300 mb-1">
              {t("dataSource")}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-purple-500/15 ring-1 ring-purple-400/40">
            <Database className="h-6 w-6 text-purple-600 dark:text-purple-200" />
          </div>
        </div>
        {status?.fallback_used_last_run && (
          <div className="mb-3">
            <span className="bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {t("fallbackUsed")}
            </span>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t("status")}:
            </span>
            <span
              className={`text-xs font-semibold ${getStatusColor(
                status?.status || "unknown"
              )}`}
            >
              {getStatusIcon(status?.status || "unknown")}{" "}
              {status?.status || t("unknown")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t("lastFetch")}:
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {lastFetchTime}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t("lastPrice")}:
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {spotData?.usdPerOunce
                ? `$${spotData.usdPerOunce.toFixed(2)} (${spotData.source})`
                : status?.last_price?.price
                ? `$${status.last_price.price.toFixed(2)}`
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t("providerType")}:
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {providerTypeLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t("interval")}:
            </span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {intervalLabel}
            </span>
          </div>
          {(status?.retries_last_run ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Retries:
              </span>
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                {status.retries_last_run}
              </span>
            </div>
          )}
          {status?.last_request_id && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono text-center">
                ID: {status.last_request_id.substring(0, 8)}...
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default DataSourceCard;
