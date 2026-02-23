import { useQuery } from "@tanstack/react-query";
import { getDatabaseStats } from "../lib/api";
import { Database, FileText, Calendar, HardDrive } from "lucide-react";
import { SkeletonCard } from "./SkeletonLoader";

const DatabaseStats = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-database-stats"],
    queryFn: getDatabaseStats,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load database statistics. Please try again.
        </p>
      </div>
    );
  }

  const { tableCounts, totalRecords, databaseSize, dateRanges } = data || {};

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Records</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalRecords?.toLocaleString() || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Database Size</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {databaseSize?.mb || "0.00"} MB
              </p>
            </div>
            <HardDrive className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          {databaseSize?.bytes && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatBytes(databaseSize.bytes)}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Tables</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {tableCounts ? Object.keys(tableCounts).length : 0}
              </p>
            </div>
            <Database className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Table Counts */}
      <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Table Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tableCounts &&
            Object.entries(tableCounts)
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([table, count]: [string, any]) => (
                <div
                  key={table}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 capitalize">
                    {table.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {count.toLocaleString()}
                  </p>
                </div>
              ))}
        </div>
      </div>

      {/* Date Ranges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gold Price Range */}
        {dateRanges?.goldPrice && (
          <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gold Price Data
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Oldest Record</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.goldPrice.oldest)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Newest Record</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.goldPrice.newest)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* News Range */}
        {dateRanges?.news && (
          <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              News Data
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Oldest Article</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.news.oldest)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Newest Article</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.news.newest)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Users Range */}
        {dateRanges?.users && (
          <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              User Accounts
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">First User</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.users.oldest)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latest User</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(dateRanges.users.newest)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseStats;
