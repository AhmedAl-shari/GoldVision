import { useQuery } from "@tanstack/react-query";
import { getNewsAnalytics } from "../lib/api";
import { Newspaper, Image, Video, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { SkeletonCard } from "./SkeletonLoader";

const NewsAnalytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-news-analytics"],
    queryFn: getNewsAnalytics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load news analytics. Please try again.
        </p>
      </div>
    );
  }

  const { summary, bySource, sentiment } = data || {};

  const getSentimentColor = (label: string) => {
    switch (label.toLowerCase()) {
      case "positive":
        return "text-emerald-600 dark:text-emerald-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      case "neutral":
        return "text-slate-600 dark:text-slate-400";
      default:
        return "text-slate-500 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total News</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.total || 0}
              </p>
            </div>
            <Newspaper className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Last 24h</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.recent24h || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Last 7 Days</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.last7Days || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">With Images</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.withImages || 0}
              </p>
            </div>
            <Image className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">With Videos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.withVideos || 0}
              </p>
            </div>
            <Video className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News by Source */}
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            News by Source
          </h3>
          <div className="space-y-2">
            {bySource && bySource.length > 0 ? (
              bySource.slice(0, 10).map((source: any) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {source.source}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {source.percentage}%
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {source.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No sources found</p>
            )}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Sentiment Distribution
          </h3>
          <div className="space-y-3">
            {sentiment && sentiment.length > 0 ? (
              sentiment.map((s: any) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${getSentimentColor(s.label)}`}>
                      {s.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {s.count} ({s.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        s.label === "Positive"
                          ? "bg-emerald-500"
                          : s.label === "Negative"
                          ? "bg-red-500"
                          : s.label === "Neutral"
                          ? "bg-slate-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No sentiment data</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default NewsAnalytics;
