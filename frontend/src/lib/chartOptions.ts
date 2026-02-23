import type { ChartOptions } from "chart.js";

// Get theme-aware colors
export const getThemeColors = (isDark: boolean) => ({
  text: isDark ? "#E5E7EB" : "#374151",
  textSecondary: isDark ? "#9CA3AF" : "#6B7280",
  grid: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
  background: isDark ? "#1F2937" : "#FFFFFF",
  primary: isDark ? "#60A5FA" : "#3B82F6",
  primaryAlpha: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(59, 130, 246, 0.1)",
  secondary: isDark ? "#9CA3AF" : "#6B7280",
  danger: isDark ? "#F87171" : "#EF4444",
  dangerAlpha: isDark ? "rgba(248, 113, 113, 0.1)" : "rgba(239, 68, 68, 0.1)",
  error: isDark ? "#F87171" : "#EF4444",
  success: isDark ? "#34D399" : "#10B981",
  successAlpha: isDark ? "rgba(52, 211, 153, 0.1)" : "rgba(16, 185, 129, 0.1)",
  warning: isDark ? "#FBBF24" : "#F59E0B",
  warningAlpha: isDark ? "rgba(251, 191, 36, 0.1)" : "rgba(245, 158, 11, 0.1)",
  border: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
  tooltipBg: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(0, 0, 0, 0.8)",
  tooltipTitle: isDark ? "#E5E7EB" : "#FFFFFF",
  tooltipBody: isDark ? "#E5E7EB" : "#FFFFFF",
});

// Check if dark mode is active
const isDarkMode = () => {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

// Base chart options with theme support
export const getBaseChartOptions = (): ChartOptions => {
  const isDark = isDarkMode();
  const colors = getThemeColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
      title: {
        display: true,
        color: colors.text,
        font: {
          family: "Inter, system-ui, sans-serif",
          size: 16,
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.grid,
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            if (context.parsed.y !== null) {
              return `${label}: $${context.parsed.y.toFixed(2)}`;
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        ticks: {
          color: colors.textSecondary,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
          callback: function (value: any) {
            return `$${value}`;
          },
        },
        grid: {
          color: colors.grid,
        },
      },
      x: {
        title: {
          display: true,
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        ticks: {
          color: colors.textSecondary,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        grid: {
          color: colors.grid,
        },
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };
};

// Forecast chart specific options
export const getForecastChartOptions = (): ChartOptions<"line"> => {
  const isDark = isDarkMode();
  const colors = getThemeColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: "Gold Price Forecast with Confidence Intervals",
        color: colors.text,
        font: {
          size: 16,
          family: "Inter, system-ui, sans-serif",
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            if (context.parsed.y !== null) {
              return `${label}: $${context.parsed.y.toFixed(2)}`;
            }
            return label;
          },
          title: function (context) {
            if (context[0]?.parsed?.x !== undefined) {
              // Label now includes year (e.g., "Nov 04, 2025"), so parse it directly
              const date = new Date(context[0].label);
              // Validate date is correct
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              }
              // Fallback: just return the label as-is if parsing fails
              return context[0].label;
            }
            return "";
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Price (USD)",
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        ticks: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
          callback: function (value) {
            return `$${(value as number).toFixed(2)}`;
          },
        },
        grid: {
          color: colors.grid,
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        ticks: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        grid: {
          color: colors.grid,
        },
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };
};

// Explainability chart options
export const getExplainabilityChartOptions = (
  title: string
): ChartOptions<"line" | "bar"> => {
  const isDark = isDarkMode();
  const colors = getThemeColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: title,
        color: colors.text,
        font: {
          size: 14,
          family: "Inter, system-ui, sans-serif",
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            if (context.parsed.y !== null) {
              return `${label}: $${context.parsed.y.toFixed(2)}`;
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: false,
        },
        ticks: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
          callback: function (value) {
            return `$${(value as number).toFixed(2)}`;
          },
        },
        grid: {
          color: colors.grid,
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        ticks: {
          color: colors.text,
          font: {
            family: "Inter, system-ui, sans-serif",
          },
        },
        grid: {
          color: colors.grid,
        },
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };
};

// Get theme-aware dataset colors
export const getThemeColorsForDatasets = () => {
  const isDark = isDarkMode();
  const colors = getThemeColors(isDark);

  return {
    historical: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryAlpha,
    },
    forecast: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerAlpha,
    },
    confidence: {
      borderColor: `${colors.danger}4D`, // 30% opacity
      backgroundColor: colors.dangerAlpha,
    },
    trend: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryAlpha,
    },
    weekly: {
      borderColor: colors.success,
      backgroundColor: colors.successAlpha,
    },
    yearly: {
      borderColor: colors.warning,
      backgroundColor: colors.warningAlpha,
    },
  };
};
