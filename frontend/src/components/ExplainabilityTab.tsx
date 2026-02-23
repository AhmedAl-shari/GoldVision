import { useQuery } from "@tanstack/react-query";
import { Line, Bar } from "react-chartjs-2";
import "../lib/chartSetup"; // Register Chart.js components
import { useSettings } from "../contexts/SettingsContext";
import { postComponents } from "../lib/api";
import {
  getExplainabilityChartOptions,
  getThemeColorsForDatasets,
} from "../lib/chartOptions";

interface ComponentTrend {
  ds: string;
  value: number;
}

interface ComponentWeekly {
  dow: number;
  label: string;
  value: number;
}

interface ComponentYearly {
  doy: number;
  ds: string;
  value: number;
}

interface ComponentHoliday {
  ds: string;
  name: string;
  value: number;
}

interface ComponentsResponse {
  asset: string;
  currency: string;
  trend: ComponentTrend[];
  weekly: ComponentWeekly[];
  yearly: ComponentYearly[];
  holidays?: ComponentHoliday[];
  seasonality_mode: string;
  generated_at: string;
}

interface ExplainabilityTabProps {
  period?: number;
  pricesData?: any;
}

const ExplainabilityTab: React.FC<ExplainabilityTabProps> = ({
  period = 90,
  pricesData,
}) => {
  const { settings } = useSettings();

  const {
    data: componentsData,
    isLoading: componentsLoading,
    error: componentsError,
    refetch,
  } = useQuery({
    queryKey: ["components", settings.asset, settings.currency, period],
    queryFn: () =>
      postComponents({
        asset: settings.asset,
        currency: settings.currency,
        options: {
          yearly_seasonality: true,
          weekly_seasonality: true,
          holidays: false,
          seasonality_mode: "additive",
        },
      }),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const generateNarrative = (data: ComponentsResponse) => {
    const { weekly, yearly } = data;

    // Find strongest/weakest weekdays
    const weeklySorted = [...weekly].sort((a, b) => b.value - a.value);
    const strongestWeekday = weeklySorted[0]?.label;
    const weakestWeekday = weeklySorted[6]?.label;

    // Find top 2 months by average yearly effect
    const monthEffects = new Map();
    yearly.forEach((point) => {
      const month = new Date(point.ds).getMonth();
      if (!monthEffects.has(month)) {
        monthEffects.set(month, []);
      }
      monthEffects.get(month).push(point.value);
    });

    const monthAverages = Array.from(monthEffects.entries()).map(
      ([month, values]) => ({
        month,
        average:
          values.reduce((sum: number, val: number) => sum + val, 0) /
          values.length,
      })
    );

    monthAverages.sort((a, b) => b.average - a.average);
    const topMonths = monthAverages.slice(0, 2).map(({ month }) => {
      // Use proper i18n localization for month names
      const date = new Date(2024, month, 1); // Use any year, we just need the month
      return date.toLocaleDateString("en-US", { month: "short" });
    });

    let narrative = "";
    if (strongestWeekday && weakestWeekday) {
      narrative += `Prices tend to be higher on ${strongestWeekday} and softer on ${weakestWeekday}. `;
    }
    if (topMonths.length >= 2) {
      narrative += `Seasonal strength around ${topMonths.join("–")}.`;
    }

    return narrative || "No clear seasonal patterns detected.";
  };

  const downloadCSV = (data: any[], filename: string) => {
    const csvContent = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (componentsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (componentsError) {
    return (
      <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="text-red-800 dark:text-red-200 mb-4">
          Failed to load explainability data. Please try again.
        </div>
        <button onClick={() => refetch()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!componentsData) {
    return null;
  }

  const { trend, weekly, yearly, holidays } = componentsData;
  const colors = getThemeColorsForDatasets();

  // Chart configurations
  const trendChartData = {
    labels: trend.map((t: ComponentTrend) =>
      new Date(t.ds).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Trend Component",
        data: trend.map((t: ComponentTrend) => t.value),
        ...colors.trend,
        tension: 0.1,
      },
    ],
  };

  const weeklyChartData = {
    labels: weekly.map((w: ComponentWeekly) => w.label),
    datasets: [
      {
        label: "Weekly Seasonality",
        data: weekly.map((w: ComponentWeekly) => w.value),
        ...colors.weekly,
        borderWidth: 1,
      },
    ],
  };

  const yearlyChartData = {
    labels: yearly.map((y: ComponentYearly) => {
      const date = new Date(y.ds);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: "Yearly Seasonality",
        data: yearly.map((y: ComponentYearly) => y.value),
        ...colors.yearly,
        tension: 0.4,
      },
    ],
  };

  const trendOptions = getExplainabilityChartOptions("Trend Component");
  const weeklyOptions = getExplainabilityChartOptions("Weekly Seasonality");
  const yearlyOptions = getExplainabilityChartOptions("Yearly Seasonality");

  const narrative = generateNarrative(componentsData);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Prophet Model Explainability
        </h2>
        <p className="text-gray-600">
          Decomposed components showing trend, weekly, and yearly seasonality
          patterns.
        </p>
      </div>

      {/* Narrative */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="text-blue-800 dark:text-blue-200">
          <strong>Insights:</strong> {narrative}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Component */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Trend Component
            </h3>
            <button
              onClick={() =>
                downloadCSV(
                  trend,
                  `trend_${settings.asset}_${settings.currency}.csv`
                )
              }
              className="btn btn-sm btn-secondary"
            >
              CSV
            </button>
          </div>
          <div className="h-64">
            <Line data={trendChartData} options={trendOptions} />
          </div>
        </div>

        {/* Weekly Seasonality */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Weekly Seasonality
            </h3>
            <button
              onClick={() =>
                downloadCSV(
                  weekly,
                  `weekly_${settings.asset}_${settings.currency}.csv`
                )
              }
              className="btn btn-sm btn-secondary"
            >
              CSV
            </button>
          </div>
          <div className="h-64">
            <Bar data={weeklyChartData} options={weeklyOptions} />
          </div>
        </div>
      </div>

      {/* Yearly Seasonality */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Yearly Seasonality
          </h3>
          <button
            onClick={() =>
              downloadCSV(
                yearly,
                `yearly_${settings.asset}_${settings.currency}.csv`
              )
            }
            className="btn btn-sm btn-secondary"
          >
            CSV
          </button>
        </div>
        <div className="h-64">
          <Line data={yearlyChartData} options={yearlyOptions} />
        </div>
      </div>

      {/* Holidays */}
      {holidays && holidays.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Holiday Effects
          </h3>
          <div className="flex flex-wrap gap-2">
            {holidays.map((holiday: ComponentHoliday, index: number) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 rounded-full text-sm"
              >
                {holiday.name}: {holiday.value.toFixed(4)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Generated at: {new Date(componentsData.generated_at).toLocaleString()}
        <br />
        Seasonality mode: {componentsData.seasonality_mode}
      </div>
    </div>
  );
};

export default ExplainabilityTab;
