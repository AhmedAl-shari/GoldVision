/**
 * News Price Impact Prediction Component
 * Shows predicted price impact from recent news headlines
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../lib/config";
import { useAuth } from "../contexts/useAuth";

export default function NewsPriceImpact() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const token = (() => {
    try {
      return localStorage.getItem("access_token");
    } catch {
      return null;
    }
  })();

  const { data, isLoading, error } = useQuery({
    queryKey: ["news-price-impact"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/ai/news/analyze-recent`, {
        params: { limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status === 200 || status === 401,
      });
      if (res.status === 401) return { success: false };
      return res.data;
    },
    refetchInterval: 120000, // Refresh every 2 minutes (more dynamic!)
    enabled: isAuthenticated && !authLoading && !!token,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-pulse text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Analyzing news impact on prices...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return null; // Silently fail - this is an enhancement feature
  }

  const { impacts, aggregated, currentPrice } = data;

  if (impacts.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            No significant news impact detected
          </span>
        </div>
      </div>
    );
  }

  // Determine overall sentiment color
  const sentimentConfig = {
    bullish: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-300 dark:border-green-700",
      text: "text-green-800 dark:text-green-200",
      icon: (
        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
      ),
    },
    bearish: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-200",
      icon: <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />,
    },
    neutral: {
      bg: "bg-gray-50 dark:bg-gray-800/50",
      border: "border-gray-300 dark:border-gray-700",
      text: "text-gray-800 dark:text-gray-200",
      icon: (
        <AlertCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
      ),
    },
  };

  const config = sentimentConfig[aggregated.netDirection];

  return (
    <div className={`rounded-lg p-5 border-2 ${config.bg} ${config.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {config.icon}
          <div>
            <h3
              className={`font-bold text-lg ${config.text} flex items-center gap-2`}
            >
              <Newspaper className="w-5 h-5" />
              News-Driven Price Impact Analysis
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI analyzed {impacts.length} recent headlines for market impact
              {data?.dataSource && (
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    data.dataSource === "live"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : data.dataSource === "database"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {data.dataSource === "live"
                    ? "🔴 LIVE"
                    : data.dataSource === "database"
                    ? "📁 DB"
                    : "📋 DEMO"}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Aggregated Impact */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Net Direction
            </p>
            <p
              className={`text-lg font-bold ${
                aggregated.netDirection === "bullish"
                  ? "text-green-600"
                  : aggregated.netDirection === "bearish"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {aggregated.netDirection.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Net Impact
            </p>
            <p
              className={`text-lg font-bold ${
                aggregated.netImpact > 0
                  ? "text-green-600"
                  : aggregated.netImpact < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {aggregated.netImpact > 0 ? "+" : ""}
              {aggregated.netImpact.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Confidence
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {aggregated.confidence}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Signals</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {aggregated.bullishSignals}↑ / {aggregated.bearishSignals}↓
            </p>
          </div>
        </div>
      </div>

      {/* Top Impactful News */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          📰 Most Impactful Headlines:
        </p>
        {impacts.slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {item.article.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.article.source} •{" "}
                  {new Date(item.article.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    item.impact.expectedChange?.expected > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {item.impact.expectedChange?.expected > 0 ? "+" : ""}
                  {item.impact.expectedChange?.expected}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.impact.confidence}% conf.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {item.impact.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
