import React from "react";
import { useQuery } from "@tanstack/react-query";
import { runBacktest } from "../lib/api";
import {
  Download,
  TrendingUp,
  Target,
  BarChart3,
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  RefreshCw,
} from "lucide-react";

interface BacktestAnalysisProps {
  showErrorAnalysis: boolean;
  period?: number;
  pricesData?: unknown;
}

interface BacktestResult {
  cutoff: string;
  mae: number;
  mape: number;
  n_points: number;
  actual_mean: number;
  predicted_mean: number;
  actual_std: number;
  predicted_std: number;
}

interface BacktestSummary {
  total_points: number;
  mae: number;
  mape: number;
  horizon_days: number;
  step_days: number;
  min_train_days: number;
}

interface BacktestParams {
  horizon: number;
  step: number;
  min_train: number;
  max_cutoffs: number | null;
}

interface BacktestData {
  rows: BacktestResult[];
  avg: BacktestSummary;
  params: BacktestParams;
}

const BacktestAnalysis: React.FC<BacktestAnalysisProps> = ({
  showErrorAnalysis,
  period = 180,
}) => {
  const {
    data: backtestData,
    isLoading,
    error,
    refetch,
  } = useQuery<BacktestData>({
    queryKey: ["backtest", period],
    queryFn: () =>
      runBacktest({
        horizon: 7,
        step: 7,
        min_train: Math.min(60, Math.floor(period / 3)), // Adjust min_train based on period
        max_cutoffs: 20,
      }),
    enabled: showErrorAnalysis,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (!showErrorAnalysis) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-blue-500/6 to-blue-500/10" />
        <div className="relative">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Running Backtest Analysis
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processing historical predictions...
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-red-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-red-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/12 via-red-500/6 to-red-500/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div className="text-red-800 dark:text-red-200 font-medium">
              Failed to load backtest analysis
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Please try again or check your connection.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Analysis
          </button>
        </div>
      </section>
    );
  }

  if (!backtestData) {
    return null;
  }

  const { avg: summary, rows, params } = backtestData;

  const handleDownload = () => {
    if (!backtestData || !summary || rows.length === 0) {
      console.error("No backtest data available to download");
      alert(
        "No backtest data available to download. Please wait for the analysis to complete."
      );
      return;
    }

    try {
      // Create CSV header
      const headers = [
        "Cutoff Date",
        "MAE",
        "MAPE",
        "Points",
        "Actual Mean",
        "Predicted Mean",
        "Actual Std",
        "Predicted Std",
      ];

      // Create CSV rows
      const csvRows = [
        headers.join(","),
        // Summary row
        `Summary,${summary.mae?.toFixed(2) || "N/A"},${
          summary.mape?.toFixed(2) || "N/A"
        }%,${summary.total_points || 0},,,,`,
        // Empty row for spacing
        "",
        // Column headers
        headers.join(","),
        // Data rows
        ...rows.map((row) => {
          return [
            new Date(row.cutoff).toISOString().split("T")[0],
            row.mae.toFixed(2),
            row.mape.toFixed(2),
            row.n_points.toString(),
            row.actual_mean.toFixed(2),
            row.predicted_mean.toFixed(2),
            row.actual_std?.toFixed(2) || "N/A",
            row.predicted_std?.toFixed(2) || "N/A",
          ].join(",");
        }),
        // Empty row
        "",
        // Configuration section
        "Configuration",
        `Horizon Days,${summary.horizon_days || params.horizon}`,
        `Step Days,${summary.step_days || params.step}`,
        `Min Training Days,${summary.min_train_days || params.min_train}`,
        `Total Cutoffs,${rows.length}`,
        `Total Points,${summary.total_points || 0}`,
      ];

      // Create CSV content
      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backtest_results_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate CSV:", error);
      alert("Failed to generate CSV file. Please try again.");
    }
  };

  if (!summary) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-amber-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-500/6 to-amber-500/10" />
        <div className="relative text-center py-12">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Backtest summary data is not available.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Average MAE
              </h3>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              ${summary.mae?.toFixed(2) || "N/A"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary.total_points || 0} predictions
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-green-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-green-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Average MAPE
              </h3>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {summary.mape?.toFixed(2) || "N/A"}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Horizon: {summary.horizon_days || 0} days
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cutoffs Evaluated
              </h3>
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {rows.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {params.horizon}d horizon
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-orange-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Total Points
              </h3>
            </div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {summary.total_points || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {params.step}d steps
            </div>
          </div>
        </article>
      </div>

      {/* Download Section */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/95 px-6 py-5 shadow-lg backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Download Results
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download the complete backtest results as CSV
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-md"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </section>

      {/* Backtest Configuration */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-white/95 px-6 py-6 shadow-lg backdrop-blur dark:border-indigo-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Backtest Configuration
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  Horizon
                </h4>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {summary.horizon_days || 0} days
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Forecast horizon
              </div>
            </div>

            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  Step Size
                </h4>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {summary.step_days || 0} days
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Evaluation interval
              </div>
            </div>

            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  Min Training
                </h4>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {summary.min_train_days || 0} days
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Minimum training period
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Cutoffs Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 px-6 py-6 shadow-lg backdrop-blur dark:border-slate-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
              <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Cutoff Results
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-white/60 dark:bg-gray-800/60">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cutoff Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    MAE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    MAPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actual Mean
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Predicted Mean
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.slice(-10).map((row, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0
                        ? "bg-white/40 dark:bg-gray-900/40 hover:bg-white/60 dark:hover:bg-gray-800/60"
                        : "bg-gray-50/40 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(row.cutoff).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        ${row.mae.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                        {row.mape.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                        {row.n_points}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="font-mono">
                        ${row.actual_mean.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="font-mono">
                        ${row.predicted_mean.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                Showing last 10 of {rows.length} cutoffs
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error Trend Chart */}
      <section className="relative overflow-hidden rounded-2xl border border-red-200/60 bg-white/95 px-6 py-6 shadow-lg backdrop-blur dark:border-red-500/30 dark:bg-slate-900/60">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Error Trend Over Time
            </h3>
          </div>
          <div className="h-40 flex items-end space-x-1 bg-white/40 dark:bg-gray-800/40 rounded-lg p-4">
            {rows.slice(-20).map((row, index) => {
              const maxMae = Math.max(...rows.map((r) => r.mae));
              const height = maxMae > 0 ? (row.mae / maxMae) * 100 : 0;
              const isAboveAverage = row.mae > (summary.mae || 0);
              const color = isAboveAverage
                ? "bg-red-500 dark:bg-red-600"
                : "bg-blue-500 dark:bg-blue-600";

              return (
                <div
                  key={index}
                  className={`${color} flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${new Date(
                    row.cutoff
                  ).toLocaleDateString()}: MAE $${row.mae.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span>Older</span>
            <span className="font-medium">MAE Trend (Last 20 Cutoffs)</span>
            <span>Newer</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BacktestAnalysis;
