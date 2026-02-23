import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../lib/config";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number | string | undefined) => {
  const amount =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : "—";
};

const formatPercent = (value: number | string | undefined) => {
  const amount =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)}%` : "—";
};

export default function PredictiveAlerts() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["predictive-alert-recommendations"],
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE_URL}/ai/alerts/recommendations`,
        {
        headers: { 
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "x-session-id":
              sessionStorage.getItem("session_id") || Date.now().toString(),
          },
        }
      );
      return res.data;
    },
    refetchInterval: 300000,
  });

  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  const createAlertsMutation = useMutation({
    mutationFn: async (maxAlerts: number) => {
      let sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        sessionStorage.setItem("session_id", sessionId);
        console.log("[PredictiveAlerts] Created session:", sessionId);
      }
      
      console.log("[PredictiveAlerts] Fetching fresh CSRF token:", sessionId);
      const csrfRes = await axios.get(`${API_BASE_URL}/csrf`, {
        headers: { "x-session-id": sessionId },
      });
      const csrfToken = csrfRes.data.csrf_token;
      localStorage.setItem("csrf_token", csrfToken);
      
      const res = await axios.post(
        `${API_BASE_URL}/ai/alerts/create-recommended`,
        { maxAlerts },
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
    onSuccess: (payload) => {
      toast.success(
        `Created ${payload.created} AI alert${payload.created === 1 ? "" : "s"}!`
      );
      queryClient.invalidateQueries({ queryKey: ["alerts"], exact: false });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-alerts"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["predictive-alert-recommendations"],
      });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["alerts"] });
      }, 500);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to create alerts");
    },
  });

  const recommendations = data?.recommendations ?? [];
  const currentPrice = data?.currentPrice;
  const bollinger = data?.bollinger;
  const volatility = data?.volatility;

  const statCards = useMemo(
    () => [
      {
        label: "Current Price",
        value: formatCurrency(currentPrice),
        accent: isDark
          ? "from-emerald-500/20 to-emerald-500/5"
          : "from-emerald-100 to-emerald-50",
        text: isDark ? "text-emerald-300" : "text-emerald-600",
      },
      {
        label: "Volatility",
        value: formatPercent(volatility),
        accent: isDark
          ? "from-sky-500/20 to-sky-500/5"
          : "from-sky-100 to-sky-50",
        text: isDark ? "text-sky-300" : "text-sky-600",
      },
      {
        label: "Bollinger Upper",
        value: formatCurrency(bollinger?.upper),
        accent: isDark
          ? "from-indigo-500/20 to-indigo-500/5"
          : "from-indigo-100 to-indigo-50",
        text: isDark ? "text-indigo-300" : "text-indigo-600",
      },
      {
        label: "Bollinger Lower",
        value: formatCurrency(bollinger?.lower),
        accent: isDark
          ? "from-rose-500/20 to-rose-500/5"
          : "from-rose-100 to-rose-50",
        text: isDark ? "text-rose-300" : "text-rose-600",
      },
    ],
    [bollinger?.lower, bollinger?.upper, currentPrice, volatility, isDark]
  );

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/10 bg-white/70 px-6 py-6 text-sm shadow-xl backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10" />
        <div className="relative flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          AI is analysing optimal alert levels…
        </div>
      </section>
    );
  }

  if (error || !data?.success || recommendations.length === 0) {
    console.error("[PredictiveAlerts] Recommendation error:", {
      error,
      payload: data,
    });
    return (
      <section className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-6 text-sm text-amber-100 shadow-lg backdrop-blur dark:border-amber-500/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-semibold">
              Unable to load AI recommendations right now.
            </p>
            <p className="mt-1 text-xs text-amber-200/90">
              Please refresh the page or try again later.
            </p>
            {error && (
              <p className="mt-2 text-xs opacity-70">
                Error: {(error as any)?.message ?? "Unknown"}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl px-6 py-6 shadow-lg backdrop-blur ${
        isDark
          ? "border border-slate-700/40 bg-slate-900/40"
          : "border border-slate-200/40 bg-white/95"
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10"
            : "bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100"
        }`}
      />
      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-2xl p-3 ring-1 ${
                isDark
                  ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-blue-400/40"
                  : "bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 ring-blue-200/60"
              }`}
            >
              <Sparkles
                className={`h-6 w-6 ${isDark ? "text-blue-200" : "text-blue-500"}`}
              />
            </div>
        <div>
              <p
                className={`text-xs uppercase tracking-[0.3em] ${
                  isDark ? "text-blue-200/70" : "text-slate-400"
                }`}
              >
                Forecast Lab
              </p>
              <h3
                className={`mt-1 text-2xl font-semibold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
            AI-Recommended Alert Levels
          </h3>
              <p
                className={`mt-1 max-w-2xl text-sm ${
                  isDark ? "text-slate-200/80" : "text-slate-600"
                }`}
              >
                Machine-learning recommendations derived from trend velocity,
                volatility, and probability models. Review the context below or
                one-click deploy the top picks.
          </p>
        </div>
          </div>

        <button
          onClick={() => createAlertsMutation.mutate(3)}
          disabled={createAlertsMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {createAlertsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {createAlertsMutation.isPending ? "Creating…" : "Create Top 3 Alerts"}
        </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((tile, index) => (
            <div
              key={index}
              className={`rounded-xl border bg-gradient-to-br ${tile.accent} px-4 py-3 text-sm shadow-sm backdrop-blur ${
                isDark ? "border-white/10" : "border-slate-200"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isDark ? "text-slate-200/80" : "text-slate-500"
                }`}
              >
                {tile.label}
              </p>
              <p className={`mt-1 text-lg font-semibold ${tile.text}`}>{tile.value}</p>
        </div>
          ))}
      </div>

      <div className="space-y-3">
          {recommendations.map((rec: any, index: number) => {
            const isResistance = rec.type === "resistance";
            const palette = isDark
              ? rec.priority === "high"
                ? "from-rose-500/25 via-rose-500/5 to-transparent"
                : rec.priority === "medium"
                ? "from-amber-500/25 via-amber-500/5 to-transparent"
                : "from-blue-500/25 via-blue-500/5 to-transparent"
              : rec.priority === "high"
              ? "from-rose-100 via-rose-50 to-transparent"
              : rec.priority === "medium"
              ? "from-amber-100 via-amber-50 to-transparent"
              : "from-blue-100 via-blue-50 to-transparent";

            const badge = isDark
              ? rec.priority === "high"
                ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40"
                : rec.priority === "medium"
                ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40"
                : "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/40"
              : rec.priority === "high"
              ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300/60"
              : rec.priority === "medium"
              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300/60"
              : "bg-blue-100 text-blue-700 ring-1 ring-blue-300/60";

            const iconWrapper = `${
              isDark
                ? "bg-slate-900/60 ring-white/10"
                : "bg-slate-100 ring-slate-200"
            } ${
              isResistance
                ? isDark
                  ? "text-rose-300"
                  : "text-rose-500"
                : isDark
                ? "text-emerald-300"
                : "text-emerald-500"
            }`;

            const probabilityCard = isDark
              ? "border-white/10 bg-slate-900/50"
              : "border-slate-200 bg-slate-100";

            const probabilityValue = isDark ? "text-blue-200" : "text-blue-600";
            const probabilityLabel = isDark
              ? "text-slate-300"
              : "text-slate-500";
            const probabilityMeta = isDark
              ? "text-slate-400"
              : "text-slate-600";
          
          return (
              <article
                key={rec.id ?? index}
                className={`relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-slate-700/40 bg-slate-900/40 hover:border-blue-400/40"
                    : "border-slate-200 bg-white hover:border-blue-200 shadow-sm"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${palette}`}
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-1 gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 backdrop-blur ${iconWrapper}`}>
                      {isResistance ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <h4
                          className={`text-base font-semibold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(rec.price)} {" "}
                          {isResistance ? "Resistance" : "Support"}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge}`}
                        >
                          {rec.priority.charAt(0).toUpperCase() +
                            rec.priority.slice(1)}
                        </span>
                      </div>
                      <p
                        className={`text-xs ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {rec.reasoning}
                      </p>
                      {rec.action && (
                        <p
                          className={`text-xs ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          💡 {rec.action}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`rounded-xl border px-4 py-3 text-right text-sm backdrop-blur ${probabilityCard}`}
                  >
                    <p className={`text-xs uppercase tracking-wide ${probabilityLabel}`}>
                      Probability
                    </p>
                    <p className={`text-2xl font-semibold ${probabilityValue}`}>
                      {rec.probability}%
                    </p>
                    <p className={`mt-1 text-xs ${probabilityMeta}`}>
                      ~{rec.expectedDays} days
                    </p>
                  </div>
                </div>
              </article>
          );
        })}
      </div>

      {createAlertsMutation.isSuccess && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-inner ${
              isDark
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Alerts created successfully. Check your Alerts list below.
            </div>
        </div>
      )}

        <footer
          className={`border-t pt-4 text-xs ${
            isDark
              ? "border-white/10 text-slate-400"
              : "border-slate-200 text-slate-500"
          }`}
        >
          🤖 Probabilities combine volatility regimes, historical pattern
          matching, and adaptive technical models. Refreshes every 5 minutes.
        </footer>
      </div>
    </section>
  );
}

