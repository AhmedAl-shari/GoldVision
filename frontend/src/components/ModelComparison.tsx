import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Clock,
  Info,
  Loader2,
  Play,
  Settings,
  Trophy,
} from "lucide-react";
import { postModelComparison } from "../lib/api";

interface ModelMetrics {
  model_name: string;
  mae: number;
  mape: number;
  mase: number;
}

interface ComparisonResult {
  prophet_metrics: ModelMetrics;
  naive_last_metrics: ModelMetrics;
  seasonal_naive_metrics: ModelMetrics;
  arima_metrics: ModelMetrics;
  dm_test_prophet_vs_naive: number;
  dm_test_prophet_vs_seasonal: number;
  dm_test_prophet_vs_arima: number;
  generated_at: string;
  horizon_days: number;
  training_window: number;
}

interface ModelComparisonProps {
  period?: number;
  pricesData?: any;
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  period = 365,
  pricesData,
}) => {
  const [horizonDays, setHorizonDays] = useState(7);
  const [holidaysEnabled, setHolidaysEnabled] = useState(true);
  const [weeklySeasonality, setWeeklySeasonality] = useState(true);
  const [yearlySeasonality, setYearlySeasonality] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const queryClient = useQueryClient();

  const runComparison = useMutation({
    mutationFn: (params: {
      horizon_days: number;
      holidays_enabled: boolean;
      weekly_seasonality: boolean;
      yearly_seasonality: boolean;
    }) => postModelComparison(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-comparison", period] });
    },
  });

  const handleRunComparison = async () => {
    setIsRunning(true);
    try {
      await runComparison.mutateAsync({
        horizon_days: horizonDays,
        holidays_enabled: holidaysEnabled,
        weekly_seasonality: weeklySeasonality,
        yearly_seasonality: yearlySeasonality,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const comparisonData = runComparison.data as ComparisonResult | undefined;

  const getSignificanceColor = (pValue: number) => {
    if (pValue < 0.05) return "text-green-600 font-semibold";
    if (pValue < 0.1) return "text-yellow-600 font-medium";
    return "text-gray-500";
  };

  const getSignificanceText = (pValue: number) => {
    if (pValue < 0.05) return "Significant";
    if (pValue < 0.1) return "Marginal";
    return "Not significant";
  };

  const models = [
    {
      key: "prophet",
      name: "Prophet",
      metrics: comparisonData?.prophet_metrics,
    },
    {
      key: "naive",
      name: "Naive Last",
      metrics: comparisonData?.naive_last_metrics,
    },
    {
      key: "seasonal",
      name: "Seasonal Naive",
      metrics: comparisonData?.seasonal_naive_metrics,
    },
    { key: "arima", name: "ARIMA", metrics: comparisonData?.arima_metrics },
  ];

  const maeBest = useMemo(() => {
    const values = models
      .map((model) => model.metrics?.mae ?? Number.POSITIVE_INFINITY)
      .filter((value) => Number.isFinite(value));
    return values.length ? Math.min(...values) : null;
  }, [models]);

  const mapeBest = useMemo(() => {
    const values = models
      .map((model) => model.metrics?.mape ?? Number.POSITIVE_INFINITY)
      .filter((value) => Number.isFinite(value));
    return values.length ? Math.min(...values) : null;
  }, [models]);

  const maseBest = useMemo(() => {
    const values = models
      .map((model) => model.metrics?.mase ?? Number.POSITIVE_INFINITY)
      .filter((value) => Number.isFinite(value));
    return values.length ? Math.min(...values) : null;
  }, [models]);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-blue-200/50 bg-gradient-to-br from-white via-blue-50/30 to-white px-8 py-8 shadow-xl dark:border-blue-500/30 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_70%)]"></div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 shadow-lg shadow-blue-500/30">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Forecast Lab
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                Model Comparison
              </h2>
              <p className="mt-2 max-w-2xl text-base text-gray-600 dark:text-gray-300">
                Benchmark Prophet against classical baselines with configurable
                horizons, holiday effects, and seasonality controls.
              </p>
            </div>
          </div>

          {comparisonData && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-4 shadow-md backdrop-blur dark:bg-slate-800/80">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Generated
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(comparisonData.generated_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Configuration */}
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 mb-6">
          <h3 className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
            <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/30">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Configuration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Tune the comparison experiment. Changes apply to the next run.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-slate-900/50">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Horizon
            </span>
            <div className="flex gap-2 rounded-xl bg-white p-1 shadow-inner dark:bg-slate-800">
              {[7, 14, 30].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHorizonDays(value)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    horizonDays === value
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
                  }`}
                  aria-pressed={horizonDays === value}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>

          {[
            {
              id: "holidays",
              label: "Holidays",
              checked: holidaysEnabled,
              setter: setHolidaysEnabled,
            },
            {
              id: "weekly",
              label: "Weekly Seasonality",
              checked: weeklySeasonality,
              setter: setWeeklySeasonality,
            },
            {
              id: "yearly",
              label: "Yearly Seasonality",
              checked: yearlySeasonality,
              setter: setYearlySeasonality,
            },
          ].map(({ id, label, checked, setter }) => (
            <button
              key={id}
              type="button"
              onClick={() => setter(!checked)}
              className={`group flex items-center justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                checked
                  ? "border-blue-500 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-slate-900/50 dark:hover:border-gray-600"
              }`}
              aria-pressed={checked}
            >
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {label}
              </span>
              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                  checked ? "bg-blue-600 shadow-lg" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-all ${
                    checked ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isRunning}
          className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-xl"
        >
          {isRunning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {isRunning ? "Running Comparison..." : "Run Model Comparison"}
        </button>
      </section>

      {/* Results */}
      {comparisonData && (
        <section className="grid gap-6">
          {/* Metrics Table */}
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-amber-100 p-2 dark:bg-amber-900/30">
                <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Model Performance Metrics
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Lower is better. Best values per column are highlighted.
                </p>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border-2 border-gray-100 shadow-inner dark:border-gray-700">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Model</th>
                    <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">MAE</th>
                    <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">MAPE (%)</th>
                    <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">MASE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-slate-800">
                  {models.map((model, index) => (
                    <tr
                      key={model.key}
                      className={`transition-all hover:bg-blue-50 dark:hover:bg-slate-700/50 ${
                        index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50/50 dark:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">
                        {model.name}
                      </td>
                      <td
                        className={`px-8 py-5 text-sm font-semibold ${
                          maeBest !== null &&
                          typeof model.metrics?.mae === "number" &&
                          model.metrics.mae === maeBest
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {typeof model.metrics?.mae === "number"
                          ? model.metrics.mae.toFixed(4)
                          : "–"}
                      </td>
                      <td
                        className={`px-8 py-5 text-sm font-semibold ${
                          mapeBest !== null &&
                          typeof model.metrics?.mape === "number" &&
                          model.metrics.mape === mapeBest
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {typeof model.metrics?.mape === "number"
                          ? model.metrics.mape.toFixed(2)
                          : "–"}
                      </td>
                      <td
                        className={`px-8 py-5 text-sm font-semibold ${
                          maseBest !== null &&
                          typeof model.metrics?.mase === "number" &&
                          model.metrics.mase === maseBest
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {typeof model.metrics?.mase === "number"
                          ? model.metrics.mase.toFixed(4)
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diebold-Mariano Tests */}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Prophet vs Naive Last",
                value: comparisonData.dm_test_prophet_vs_naive,
              },
              {
                title: "Prophet vs Seasonal Naive",
                value: comparisonData.dm_test_prophet_vs_seasonal,
              },
              {
                title: "Prophet vs ARIMA",
                value: comparisonData.dm_test_prophet_vs_arima,
              },
            ].map(({ title, value }) => {
              const significant =
                typeof value === "number" && value < 0.05 && value >= 0;
              return (
                <div
                  key={title}
                  className={`relative overflow-hidden rounded-3xl border-2 p-6 shadow-xl transition-all hover:shadow-2xl ${
                    significant
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 dark:border-emerald-500"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800"
                  }`}
                >
                  {significant && (
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400"></div>
                  )}
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">
                    {title}
                  </h4>
                  <p className={`text-4xl font-extrabold mb-3 ${
                    significant
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-900 dark:text-white"
                  }`}>
                    {typeof value === "number" ? value.toFixed(4) : "–"}
                  </p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                    significant
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {typeof value === "number"
                      ? getSignificanceText(value)
                      : "Not available"}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {significant
                      ? "Prophet outperforms the baseline at 95% confidence."
                      : "No statistically significant edge detected."}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Model Info */}
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/30">
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Experiment Details
              </h3>
            </div>
            <dl className="grid gap-5 text-sm md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Training Window
                </dt>
                <dd className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 font-bold text-gray-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                  {comparisonData.training_window} days
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Horizon Days
                </dt>
                <dd className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 font-bold text-gray-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                  {comparisonData.horizon_days}
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Seasonality
                </dt>
                <dd className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 font-bold text-gray-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                  Holidays: {holidaysEnabled ? "Enabled" : "Disabled"} • Weekly:{" "}
                  {weeklySeasonality ? "Enabled" : "Disabled"} • Yearly:{" "}
                  {yearlySeasonality ? "Enabled" : "Disabled"}
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 font-bold text-gray-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                  {new Date(comparisonData.generated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {/* Error State */}
      {runComparison.error && (
        <div className="rounded-2xl border border-red-200/50 bg-red-500/10 p-4 text-sm text-red-100">
            Failed to run model comparison. Please try again.
        </div>
      )}

      {/* Diebold-Mariano Test Explanation */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-xl dark:border-blue-500/40 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-500" />
        <div className="relative space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-blue-100">
            About the Diebold-Mariano Test
          </h3>
          <p className="text-base leading-relaxed text-gray-700 dark:text-blue-100/90">
            The Diebold-Mariano test compares the forecast accuracy of two models. It
            evaluates whether Prophet delivers a statistically meaningful improvement
            over the selected baseline.
          </p>
          <dl className="space-y-3 text-sm text-slate-600 dark:text-blue-100/80">
            <div className="space-y-1">
              <dt className="font-semibold text-slate-700 dark:text-blue-50">
                Interpretation
              </dt>
              <dd className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    p &lt; 0.05
                  </span>{" "}
                  Prophet is significantly better (reject the null hypothesis).
                </span>
              </dd>
              <dd className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                <span>
                  <span className="font-semibold text-blue-600 dark:text-blue-200">
                    p ≥ 0.05
                  </span>{" "}
                  No statistically significant difference between models.
                </span>
              </dd>
              <dd className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                <span>Lower p-values mean stronger evidence that Prophet outperforms the baseline.</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;
