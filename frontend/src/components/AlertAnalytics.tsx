import { useQuery } from "@tanstack/react-query";
import { getAlertsAnalytics } from "../lib/api";
import { Bell, TrendingUp, CheckCircle, Users, BarChart3 } from "lucide-react";
import { SkeletonCard } from "./SkeletonLoader";

const AlertAnalytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-alerts-analytics"],
    queryFn: getAlertsAnalytics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load alert analytics. Please try again.
        </p>
      </div>
    );
  }

  const { summary, performance, topUsers, byAsset } = data || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Alerts</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.total || 0}
              </p>
            </div>
            <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Alerts</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary?.active || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Triggered</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summary?.triggered || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          {summary?.triggeredPercentage && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {summary.triggeredPercentage}% of total
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {performance?.successRate || 0}%
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Average Accuracy
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {performance?.avgAccuracy || "0.00"}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Avg Response Time
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {performance?.avgResponseTime || "0.00"}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Total Triggers
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {performance?.totalTriggers || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Successful Triggers
              </span>
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {performance?.successfulTriggers || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Users by Alerts
          </h3>
          <div className="space-y-2">
            {topUsers && topUsers.length > 0 ? (
              topUsers.map((user: any, idx: number) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {user.name || user.email}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {user.alertsCount} alerts
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No users found</p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts by Asset */}
      {byAsset && byAsset.length > 0 && (
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Alerts by Asset
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {byAsset.map((asset: any) => (
              <div
                key={asset.asset}
                className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{asset.asset}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {asset.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AlertAnalytics;
