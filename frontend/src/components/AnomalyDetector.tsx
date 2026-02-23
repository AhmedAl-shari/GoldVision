/**
 * Real-Time Anomaly Detector Component
 * Displays anomaly alerts and auto-creates alerts when unusual movements detected
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Bell,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../lib/config";
import toast from "react-hot-toast";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/useAuth";

export default function AnomalyDetector() {
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const token = (() => {
    try {
      return localStorage.getItem("access_token");
    } catch {
      return null;
    }
  })();

  // Fetch current anomaly status
  const { data, isLoading } = useQuery({
    queryKey: ["anomaly-detect", settings.asset, settings.currency],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/ai/anomaly/detect`, {
        params: {
          asset: settings.asset,
          currency: settings.currency,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Treat 401 as a valid "logged out" response to avoid noisy console stacks
        validateStatus: (status) => status === 200 || status === 401,
      });
      if (res.status === 401) {
        return {
          anomaly: { detected: false },
          checkedAt: new Date().toISOString(),
        };
      }
      return res.data;
    },
    refetchInterval: 60000, // Check every minute
    enabled: isAuthenticated && !authLoading && !!token,
  });

  // Auto-create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async () => {
      // Get or create session ID
      let sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        sessionStorage.setItem("session_id", sessionId);
      }

      // Fetch fresh CSRF token
      const csrfRes = await axios.get(`${API_BASE_URL}/csrf`, {
        headers: { "x-session-id": sessionId },
      });
      const csrfToken = csrfRes.data.csrf_token;

      // Create alert with CSRF token
      const res = await axios.post(
        `${API_BASE_URL}/ai/anomaly/check-and-alert`,
        {
          asset: settings.asset,
          currency: settings.currency,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "x-csrf-token": csrfToken,
            "x-session-id": sessionId,
          },
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      const createdCount = data?.alertsCreated || 0;

      if (createdCount > 0) {
        toast.success(`Created ${createdCount} anomaly alert(s)!`);
        queryClient.invalidateQueries({
          queryKey: ["alerts", settings.asset, settings.currency],
        });
        queryClient.invalidateQueries({
          queryKey: ["alerts"],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["dashboard-alerts"],
          exact: false,
        });

        setTimeout(() => {
          queryClient.refetchQueries({
            queryKey: ["alerts", settings.asset, settings.currency],
          });
        }, 500);
      } else {
        toast.info("No new anomalies detected");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create alert");
    },
  });

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Checking for price anomalies...</span>
        </div>
      </div>
    );
  }

  const anomaly = data?.anomaly;
  const hasAnomaly = anomaly?.detected;

  if (!hasAnomaly) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                No Anomalies Detected
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Price within normal range (last checked:{" "}
                {data?.checkedAt
                  ? new Date(data.checkedAt).toLocaleTimeString()
                  : "—"}
                )
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Anomaly detected - show alert
  const severityConfig = {
    high: {
      bg: "bg-red-50 dark:bg-red-900/30",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-200",
      icon: (
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
      ),
    },
    medium: {
      bg: "bg-orange-50 dark:bg-orange-900/30",
      border: "border-orange-300 dark:border-orange-700",
      text: "text-orange-800 dark:text-orange-200",
      icon: (
        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
      ),
    },
    low: {
      bg: "bg-yellow-50 dark:bg-yellow-900/30",
      border: "border-yellow-300 dark:border-yellow-700",
      text: "text-yellow-800 dark:text-yellow-200",
      icon: (
        <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
      ),
    },
  };

  const config = severityConfig[anomaly.severity];
  const Icon = anomaly.type === "spike" ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-lg p-5 border-2 ${config.bg} ${config.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {config.icon}
          <div>
            <h3 className={`font-bold text-lg ${config.text}`}>
              {anomaly.severity.toUpperCase()} Severity Anomaly Detected!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <Icon className="w-4 h-4 inline mr-1" />
              {anomaly.description}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            config.text
          } ${config.bg.replace("50", "100")}`}
        >
          {anomaly.confidence}% Confidence
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current Price
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${anomaly.currentPrice}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            30-Day Average
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${anomaly.meanPrice}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Deviation</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {anomaly.zScore}σ
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            % From Mean
          </p>
          <p
            className={`text-lg font-bold ${
              anomaly.percentFromMean > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {anomaly.percentFromMean > 0 ? "+" : ""}
            {anomaly.percentFromMean.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          🤖 AI Recommendation:
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {anomaly.recommendation}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={() => createAlertMutation.mutate()}
        disabled={createAlertMutation.isPending}
        className="w-full btn btn-primary flex items-center justify-center gap-2"
      >
        <Bell className="w-4 h-4" />
        {createAlertMutation.isPending
          ? "Creating Alert..."
          : "Create Smart Alert for This Anomaly"}
      </button>

      {createAlertMutation.isSuccess && !createAlertMutation.isPending && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
          ✅ Alert created! You'll be notified of similar events.
        </p>
      )}
    </div>
  );
}
