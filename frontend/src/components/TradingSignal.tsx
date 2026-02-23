import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Activity,
  Shield,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../lib/config";

interface TradingSignalProps {
  asset?: string;
  currency?: string;
}

const buildSignalConfig = (isDark: boolean) => ({
  BUY: {
    gradient: isDark
      ? "from-emerald-500 via-emerald-600 to-emerald-700"
      : "from-emerald-200 via-emerald-300 to-emerald-400",
    ring: isDark ? "ring-emerald-400/50" : "ring-emerald-200/60",
    progress: isDark ? "bg-emerald-300" : "bg-emerald-400",
    chip: isDark
      ? "bg-emerald-500/20 text-emerald-100"
      : "bg-emerald-100 text-emerald-700",
    icon: <TrendingUp className="h-7 w-7" />,
    iconBg: isDark
      ? "bg-white/15 text-white"
      : "bg-emerald-100 text-emerald-700",
    headerTone: isDark ? "text-white" : "text-emerald-800",
  },
  SELL: {
    gradient: isDark
      ? "from-rose-500 via-rose-600 to-rose-700"
      : "from-rose-200 via-rose-300 to-rose-400",
    ring: isDark ? "ring-rose-400/50" : "ring-rose-200/60",
    progress: isDark ? "bg-rose-300" : "bg-rose-400",
    chip: isDark
      ? "bg-rose-500/20 text-rose-100"
      : "bg-rose-100 text-rose-700",
    icon: <TrendingDown className="h-7 w-7" />,
    iconBg: isDark
      ? "bg-white/15 text-white"
      : "bg-rose-100 text-rose-700",
    headerTone: isDark ? "text-white" : "text-rose-800",
  },
  HOLD: {
    gradient: isDark
      ? "from-slate-500 via-slate-600 to-slate-700"
      : "from-slate-200 via-slate-300 to-slate-400",
    ring: isDark ? "ring-slate-300/50" : "ring-slate-200/60",
    progress: isDark ? "bg-slate-300" : "bg-slate-400",
    chip: isDark
      ? "bg-slate-500/20 text-slate-100"
      : "bg-slate-200 text-slate-700",
    icon: <Minus className="h-7 w-7" />,
    iconBg: isDark
      ? "bg-white/15 text-white"
      : "bg-slate-200 text-slate-700",
    headerTone: isDark ? "text-white" : "text-slate-800",
  },
});

export default function TradingSignal({
  asset = "XAU",
  currency = "USD",
}: TradingSignalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trading-signal", asset, currency],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/signal`, {
        params: { asset, currency },
      });
      return res.data;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  if (isLoading) {
    return (
      <div 
        className="flex items-center gap-3 rounded-2xl border border-slate-200/20 bg-white/60 px-4 py-4 text-sm text-slate-500 shadow-inner backdrop-blur dark:border-slate-800/40 dark:bg-slate-900/40 dark:text-slate-300"
        role="status"
        aria-live="polite"
        aria-label="Loading trading signal analysis"
      >
        <Activity className="h-5 w-5 animate-spin text-sky-400" aria-hidden="true" />
        <span>Analyzing market signals…</span>
      </div>
    );
  }

  if (error || !data?.signal) {
    return (
      <div
        className={`flex items-center gap-2 rounded-2xl border px-4 py-4 text-sm backdrop-blur ${
          isDark
            ? "border-slate-800/40 bg-slate-900/50 text-slate-300"
            : "border-slate-200/60 bg-slate-50 text-slate-600"
        }`}
        role="alert"
        aria-live="polite"
        aria-label="Trading signal unavailable"
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Signal unavailable</span>
      </div>
    );
  }

  const { signal, rationale, confidence, details } = data;
  const confidencePct = Math.max(
    0,
    Math.min(100, Number.parseFloat(confidence) || 0)
  );

  const palette = buildSignalConfig(isDark);
  const config =
    palette[(signal as keyof typeof palette) ?? "HOLD"] ?? palette.HOLD;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl px-6 py-6 shadow-lg backdrop-blur ${
        isDark
          ? "border border-slate-800/60 bg-slate-900/60"
          : "border border-slate-200/60 bg-white/95"
      }`}
      role="region"
      aria-labelledby="trading-signal-heading"
      aria-describedby="trading-signal-description"
    >
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-gradient-to-br from-sky-500/10 via-purple-500/5 to-emerald-500/10"
            : "bg-gradient-to-br from-sky-50 via-purple-50 to-emerald-100"
        }`}
        aria-hidden="true"
      />
      <div className="relative space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-2xl p-3 ring-1 ${config.iconBg} ${config.ring}`}
              aria-hidden="true"
            >
              <Activity
                className={`h-5 w-5 ${isDark ? "text-white" : "text-current"}`}
              />
            </div>
            <div>
              <h3
                id="trading-signal-heading"
                className={`text-sm font-semibold uppercase tracking-[0.2em] ${
                  isDark ? "text-slate-200" : "text-slate-500"
                }`}
              >
          7-Day Trading Signal
        </h3>
              <p
                id="trading-signal-description"
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Derived from 7d slope, RSI(14), and Bollinger Band position.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}
            aria-label={`Confidence level: ${confidencePct.toFixed(0)} percent`}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">{confidencePct.toFixed(0)}% confidence</span>
          </span>
        </header>

        <div
          className={`relative overflow-hidden rounded-2xl border px-5 py-4 shadow-lg ${
            isDark ? "border-white/20 text-white" : "border-slate-200 text-slate-900"
          } bg-gradient-to-r ${config.gradient}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`absolute inset-0 ${
              isDark ? "bg-white/5 mix-blend-overlay" : "bg-white/20"
            }`}
            aria-hidden="true"
          />
          <div className="relative flex items-start gap-4">
            <div className={`rounded-xl p-3 ${config.iconBg}`} aria-hidden="true">{config.icon}</div>
            <div className="space-y-1">
              <div
                className={`text-3xl font-semibold tracking-wide ${config.headerTone}`}
                aria-label={`Trading signal: ${signal}`}
              >
                <span aria-hidden="true">{signal}</span>
              </div>
              <p
                className={`text-sm ${
                  isDark ? "text-white/90" : "text-slate-700"
                }`}
                aria-label={`Signal rationale: ${rationale}`}
              >
                <span aria-hidden="true">{rationale}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2" role="progressbar" aria-valuenow={confidencePct} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence level: ${confidencePct.toFixed(0)} percent`}>
          <div
            className={`flex items-center justify-between text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <span>Confidence meter</span>
            <span aria-hidden="true">{confidencePct.toFixed(0)}%</span>
          </div>
          <div
            className={`h-2 w-full overflow-hidden rounded-full ${
              isDark ? "bg-white/10" : "bg-slate-200"
            }`}
            aria-hidden="true"
          >
            <div
              className={`h-full rounded-full ${config.progress}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {details && (
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3" role="group" aria-label="Technical indicators">
            <div
              className={`rounded-xl border px-4 py-3 text-center ${
                isDark
                  ? "border-white/10 bg-white/10 text-slate-200"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              role="group"
              aria-labelledby="slope-label"
            >
              <p
                id="slope-label"
                className={`text-xs uppercase tracking-wide ${
                  isDark ? "text-slate-300/80" : "text-slate-500"
                }`}
              >
                7d Slope
              </p>
              <p
                className={`text-lg font-semibold ${
                  details.slope > 0
                    ? isDark
                      ? "text-emerald-300"
                      : "text-emerald-600"
                    : isDark
                    ? "text-rose-300"
                    : "text-rose-600"
                }`}
                aria-label={`Seven day slope: ${details.slope > 0 ? 'positive' : 'negative'} ${Math.abs(details.slope).toFixed(2)} percent`}
              >
                <span aria-hidden="true">
                  {details.slope > 0 ? "+" : ""}
                  {details.slope.toFixed(2)}%
                </span>
              </p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 text-center ${
                isDark
                  ? "border-white/10 bg-white/10 text-slate-200"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              role="group"
              aria-labelledby="rsi-label"
            >
              <p
                id="rsi-label"
                className={`text-xs uppercase tracking-wide ${
                  isDark ? "text-slate-300/80" : "text-slate-500"
                }`}
              >
                RSI(14)
              </p>
              <p
                className={`text-lg font-semibold ${
                  details.rsi < 30
                    ? isDark
                      ? "text-emerald-300"
                      : "text-emerald-600"
                    : details.rsi > 70
                    ? isDark
                      ? "text-rose-300"
                      : "text-rose-600"
                    : isDark
                    ? "text-slate-200"
                    : "text-slate-700"
                }`}
                aria-label={`Relative Strength Index: ${details.rsi.toFixed(0)}${details.rsi < 30 ? ', oversold' : details.rsi > 70 ? ', overbought' : ''}`}
              >
                <span aria-hidden="true">{details.rsi.toFixed(0)}</span>
              </p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 text-center ${
                isDark
                  ? "border-white/10 bg-white/10 text-slate-200"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              role="group"
              aria-labelledby="bb-label"
            >
              <p
                id="bb-label"
                className={`text-xs uppercase tracking-wide ${
                  isDark ? "text-slate-300/80" : "text-slate-500"
                }`}
              >
                BB Position
              </p>
              <p
                className={`text-lg font-semibold ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
                aria-label={`Bollinger Band position: ${(details.bbPosition * 100).toFixed(0)} percent`}
              >
                <span aria-hidden="true">{(details.bbPosition * 100).toFixed(0)}%</span>
              </p>
          </div>
        </div>
      )}

        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          For educational purposes only. Not financial advice.
      </p>
    </div>
    </section>
  );
}

