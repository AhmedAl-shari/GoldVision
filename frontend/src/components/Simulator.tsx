import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  runSimulation,
  useMarketConditions,
  MarketConditions,
} from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { Line } from "react-chartjs-2";
import "../lib/chartSetup"; // Register Chart.js components
import { format } from "date-fns";
import { getThemeColors } from "../lib/chartOptions";
import {
  Play,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  Settings,
  Info,
  Bookmark,
  Clock,
  Activity,
  DollarSign,
  Percent,
  Calendar,
  Shuffle,
  RotateCcw,
  Save,
  Layers,
  Eye,
  Brain,
  Gauge,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface SimulationPoint {
  ds: string;
  p01: number;
  p05: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

interface SimulationResponse {
  method: string;
  days?: number;
  n?: number;
  seed?: number;
  fan?: SimulationPoint[];
  var95?: number;
  cvar95?: number;
  asset?: string;
  currency?: string;
  paths?: number[][];
  dates?: string[];
  parameters?: {
    n_simulations?: number;
    annual_volatility?: number;
    drift_adjustment?: number;
    seed?: number;
  };
}

interface PresetScenario {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  params: {
    days: number;
    method: "gbm" | "bootstrap";
    annual_vol: number;
    drift_adj: number;
    n: number;
  };
  category: "conservative" | "moderate" | "aggressive" | "custom";
  riskLevel: "low" | "medium" | "high";
}

// Dynamic scenario generation based on real market conditions
const generateDynamicScenarios = (
  marketConditions: MarketConditions
): PresetScenario[] => {
  const {
    volatility,
    trend,
    sentiment,
    marketRegime,
    riskLevel,
    baseDrift,
    currentPrice,
  } = marketConditions;

  // Calculate dynamic parameters based on market conditions
  const baseVolatility = Math.max(10, Math.min(40, volatility));
  const trendDrift = trend === "bullish" ? 2 : trend === "bearish" ? -2 : 0;
  const sentimentMultiplier =
    sentiment === "greed" ? 1.2 : sentiment === "fear" ? 0.8 : 1.0;

  // Generate scenarios based on current market regime
  const scenarios: PresetScenario[] = [];

  // Conservative scenario - always available
  scenarios.push({
    id: "conservative_current",
    name: "Conservative Current",
    description: `Low-risk scenario based on current ${marketRegime} market conditions`,
    icon: <Shield className="h-5 w-5" />,
    params: {
      days: 14,
      method: "gbm",
      annual_vol: Math.max(8, baseVolatility * 0.6),
      drift_adj: Math.max(-2, Math.min(2, baseDrift * 0.3)),
      n: 5000,
    },
    category: "conservative",
    riskLevel: "low",
  });

  // Moderate scenario - balanced approach
  scenarios.push({
    id: "moderate_current",
    name: "Moderate Current",
    description: `Balanced scenario reflecting current ${trend} trend and ${sentiment} sentiment`,
    icon: <Target className="h-5 w-5" />,
    params: {
      days: 30,
      method: "gbm",
      annual_vol: baseVolatility,
      drift_adj: baseDrift,
      n: 10000,
    },
    category: "moderate",
    riskLevel: "medium",
  });

  // Market regime specific scenarios
  if (marketRegime === "euphoric" || marketRegime === "panic") {
    scenarios.push({
      id: "extreme_volatility",
      name: "Extreme Volatility",
      description: `High volatility scenario for ${marketRegime} market conditions`,
      icon: <Zap className="h-5 w-5" />,
      params: {
        days: 21,
        method: "gbm",
        annual_vol: Math.min(50, baseVolatility * 1.5),
        drift_adj: baseDrift * 1.5,
        n: 15000,
      },
      category: "aggressive",
      riskLevel: "high",
    });
  }

  // Trend-based scenarios
  if (trend === "bullish") {
    scenarios.push({
      id: "bullish_momentum",
      name: "Bullish Momentum",
      description: `Positive drift scenario for current bullish trend`,
      icon: <TrendingUp className="h-5 w-5" />,
      params: {
        days: 45,
        method: "gbm",
        annual_vol: baseVolatility * sentimentMultiplier,
        drift_adj: Math.max(0, baseDrift + 2),
        n: 12000,
      },
      category: "moderate",
      riskLevel: "medium",
    });
  } else if (trend === "bearish") {
    scenarios.push({
      id: "bearish_momentum",
      name: "Bearish Momentum",
      description: `Negative drift scenario for current bearish trend`,
      icon: <TrendingDown className="h-5 w-5" />,
      params: {
        days: 45,
        method: "gbm",
        annual_vol: baseVolatility * sentimentMultiplier,
        drift_adj: Math.min(0, baseDrift - 2),
        n: 12000,
      },
      category: "moderate",
      riskLevel: "medium",
    });
  }

  // High precision scenario for detailed analysis
  scenarios.push({
    id: "high_precision_current",
    name: "High Precision Current",
    description: `Maximum simulation paths for detailed analysis of current market`,
    icon: <Brain className="h-5 w-5" />,
    params: {
      days: 30,
      method: "gbm",
      annual_vol: baseVolatility,
      drift_adj: baseDrift,
      n: 50000,
    },
    category: "custom",
    riskLevel: "medium",
  });

  // Bootstrap scenario using historical patterns
  scenarios.push({
    id: "bootstrap_current",
    name: "Historical Bootstrap",
    description: `Bootstrap method using historical patterns for current market`,
    icon: <Activity className="h-5 w-5" />,
    params: {
      days: 30,
      method: "bootstrap",
      annual_vol: baseVolatility,
      drift_adj: baseDrift,
      n: 10000,
    },
    category: "moderate",
    riskLevel: "medium",
  });

  // Stress test scenario
  scenarios.push({
    id: "stress_test_current",
    name: "Stress Test Current",
    description: `Worst-case scenario based on current market volatility`,
    icon: <AlertTriangle className="h-5 w-5" />,
    params: {
      days: 30,
      method: "gbm",
      annual_vol: Math.min(60, baseVolatility * 2),
      drift_adj: baseDrift * -2,
      n: 20000,
    },
    category: "aggressive",
    riskLevel: "high",
  });

  return scenarios;
};

interface SimulatorProps {
  period?: number;
  pricesData?: any;
}

const Simulator: React.FC<SimulatorProps> = ({ period = 90, pricesData }) => {
  const { settings } = useSettings();

  // Fetch market conditions for dynamic scenario generation
  const {
    data: marketConditionsData,
    isLoading: marketConditionsLoading,
    error: marketConditionsError,
  } = useMarketConditions();

  // Generate fallback scenarios that always work
  const fallbackScenarios: PresetScenario[] = useMemo(
    () => [
      {
        id: "fallback_conservative",
        name: "Conservative",
        description: "Low-risk scenario with moderate volatility",
        icon: <Shield className="h-5 w-5" />,
        params: {
          days: 14,
          method: "gbm",
          annual_vol: 12,
          drift_adj: 0,
          n: 5000,
        },
        category: "conservative",
        riskLevel: "low",
      },
      {
        id: "fallback_moderate",
        name: "Moderate",
        description: "Balanced scenario with standard parameters",
        icon: <Target className="h-5 w-5" />,
        params: {
          days: 30,
          method: "gbm",
          annual_vol: 20,
          drift_adj: 0,
          n: 10000,
        },
        category: "moderate",
        riskLevel: "medium",
      },
      {
        id: "fallback_aggressive",
        name: "Aggressive",
        description: "High-risk scenario with increased volatility",
        icon: <Zap className="h-5 w-5" />,
        params: {
          days: 21,
          method: "gbm",
          annual_vol: 35,
          drift_adj: 2,
          n: 15000,
        },
        category: "aggressive",
        riskLevel: "high",
      },
      {
        id: "fallback_high_precision",
        name: "High Precision",
        description: "Maximum simulation paths for detailed analysis",
        icon: <Brain className="h-5 w-5" />,
        params: {
          days: 30,
          method: "gbm",
          annual_vol: 20,
          drift_adj: 0,
          n: 50000,
        },
        category: "custom",
        riskLevel: "medium",
      },
      {
        id: "fallback_bootstrap",
        name: "Historical Bootstrap",
        description: "Bootstrap method using historical patterns",
        icon: <Activity className="h-5 w-5" />,
        params: {
          days: 30,
          method: "bootstrap",
          annual_vol: 20,
          drift_adj: 0,
          n: 10000,
        },
        category: "moderate",
        riskLevel: "medium",
      },
      {
        id: "fallback_stress_test",
        name: "Stress Test",
        description: "Worst-case scenario with high volatility",
        icon: <AlertTriangle className="h-5 w-5" />,
        params: {
          days: 30,
          method: "gbm",
          annual_vol: 45,
          drift_adj: -3,
          n: 20000,
        },
        category: "aggressive",
        riskLevel: "high",
      },
    ],
    []
  );

  // Generate dynamic scenarios based on current market conditions
  const dynamicScenarios = useMemo(() => {
    if (!marketConditionsData?.data) {
      // Return fallback scenarios if market conditions are not available
      console.log("Market conditions not available, using fallback scenarios");
      return fallbackScenarios;
    }

    try {
      const scenarios = generateDynamicScenarios(marketConditionsData.data);
      console.log("Generated dynamic scenarios:", scenarios.length);
      return scenarios.length > 0 ? scenarios : fallbackScenarios;
    } catch (error) {
      console.error("Error generating dynamic scenarios:", error);
      return fallbackScenarios;
    }
  }, [marketConditionsData?.data, fallbackScenarios]);

  const [simulationParams, setSimulationParams] = useState({
    days: Math.min(30, period), // Use period but cap at 30 days for simulation
    method: "gbm" as "gbm" | "bootstrap",
    annual_vol: 20,
    drift_adj: 0,
    n: 10000,
  });

  const [simulationData, setSimulationData] =
    useState<SimulationResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<PresetScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load saved scenarios from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("goldvision_saved_scenarios");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore icon components for saved scenarios (icons can't be serialized)
        const restored = parsed.map((scenario: any) => ({
          ...scenario,
          icon: <Bookmark className="h-5 w-5" />,
        }));
        setSavedScenarios(restored);
      } catch (error) {
        console.error("Failed to load saved scenarios:", error);
        // Clear corrupted data
        localStorage.removeItem("goldvision_saved_scenarios");
      }
    }
  }, []);

  const runSimulationMutation = useMutation({
    mutationFn: (params: typeof simulationParams) =>
      runSimulation({
        asset: settings.asset,
        currency: settings.currency,
        ...params,
      }),
    onSuccess: (data: any) => {
      console.log("Simulation API Response:", data);
      // Normalize backend response: paths may be [{ id, series: [{ ds, price }, ...] }, ...]
      let paths: number[][] | undefined;
      let dates: string[] | undefined;
      if (data.paths && Array.isArray(data.paths) && data.paths.length > 0) {
        const first = data.paths[0];
        if (first.series && Array.isArray(first.series)) {
          paths = data.paths.map((p: { series: { price: number }[] }) =>
            p.series.map((s: { price: number }) => Number(s.price))
          );
          dates = first.series.map((s: { ds: string | Date }) => {
            const d = s.ds instanceof Date ? s.ds : new Date(s.ds);
            return d.toISOString().split("T")[0];
          });
        }
      }
      setSimulationData({
        ...data,
        ...(paths && dates ? { paths, dates } : {}),
      });
      setIsRunning(false);
      setShowResults(true);
      toast.success("Simulation completed successfully!");
    },
    onError: (error) => {
      console.error("Simulation Error:", error);
      setIsRunning(false);
      toast.error("Simulation failed. Please try again.");
    },
  });

  const handleRunSimulation = () => {
    console.log("Running simulation with params:", simulationParams);
    setIsRunning(true);
    setShowResults(false);
    runSimulationMutation.mutate(simulationParams);
  };

  const handlePresetSelect = (preset: PresetScenario) => {
    console.log("handlePresetSelect called with:", preset);
    try {
      console.log("Setting simulation params to:", preset.params);
      setSimulationParams(preset.params);
      setSelectedPreset(preset.id);
      console.log("Preset applied successfully");
      toast.success(`Applied ${preset.name} scenario`);
    } catch (error) {
      console.error("Error in handlePresetSelect:", error);
      toast.error("Failed to apply scenario. Please try again.");
    }
  };

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    const newScenario: PresetScenario = {
      id: `custom_${Date.now()}`,
      name: scenarioName,
      description: "Custom user-defined scenario",
      icon: <Bookmark className="h-5 w-5" />,
      params: { ...simulationParams },
      category: "custom",
      riskLevel:
        simulationParams.annual_vol > 25
          ? "high"
          : simulationParams.annual_vol > 15
          ? "medium"
          : "low",
    };

    const updated = [...savedScenarios, newScenario];
    setSavedScenarios(updated);
    // Only save serializable data (exclude React components)
    const serializable = updated.map(({ icon: _icon, ...rest }) => rest);
    localStorage.setItem(
      "goldvision_saved_scenarios",
      JSON.stringify(serializable)
    );
    setScenarioName("");
    toast.success("Scenario saved successfully!");
  };

  const handleResetToDefaults = () => {
    setSimulationParams({
      days: 30,
      method: "gbm",
      annual_vol: 20,
      drift_adj: 0,
      n: 10000,
    });
    setSelectedPreset(null);
    toast.success("Reset to default parameters");
  };

  const handleExportCSV = () => {
    if (!simulationData) {
      toast.error("No simulation data. Run a simulation first.");
      return;
    }
    const fanData = getFanData();
    if (!fanData || fanData.length === 0) {
      toast.error("No data to export. Run a simulation first.");
      return;
    }

    const csvContent = [
      "Date,p01,p05,p10,p50,p90,p95,p99",
      ...fanData.map((point) =>
        [
          point.ds,
          point.p01,
          point.p05,
          point.p10,
          point.p50,
          point.p90,
          point.p95,
          point.p99,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${settings.asset}_${settings.currency}_${simulationData.method}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Simulation data exported to CSV");
  };

  function percentile(sorted: number[], p: number) {
    if (sorted.length === 0) return NaN;
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  }

  const getFanData = (): SimulationPoint[] | null => {
    if (!simulationData) return null;

    // Check for fan data first (pre-computed percentiles from Prophet service)
    if (simulationData.fan && simulationData.fan.length > 0) {
      return simulationData.fan;
    }

    // Check for paths data (raw simulation paths)
    if (simulationData.paths && simulationData.dates) {
      const paths = simulationData.paths;
      const dates = simulationData.dates;

      if (!Array.isArray(paths) || paths.length === 0) {
        console.warn("Paths is not a valid array or is empty");
        return null;
      }

      if (!Array.isArray(dates) || dates.length === 0) {
        console.warn("Dates is not a valid array or is empty");
        return null;
      }

      const fanData: SimulationPoint[] = [];
      for (let i = 0; i < dates.length; i++) {
        const pricesAtDate = paths
          .map((path) => path[i])
          .filter((price) => !isNaN(price));
        if (pricesAtDate.length === 0) continue;

        pricesAtDate.sort((a, b) => a - b);
        fanData.push({
          ds: dates[i],
          p01: percentile(pricesAtDate, 0.01),
          p05: percentile(pricesAtDate, 0.05),
          p10: percentile(pricesAtDate, 0.1),
          p50: percentile(pricesAtDate, 0.5),
          p90: percentile(pricesAtDate, 0.9),
          p95: percentile(pricesAtDate, 0.95),
          p99: percentile(pricesAtDate, 0.99),
        });
      }
      return fanData;
    }

    return null;
  };

  // Calculate risk metrics
  const riskMetrics = useMemo(() => {
    const fanData = getFanData();
    if (!fanData || fanData.length === 0) return null;

    const finalPrices = fanData[fanData.length - 1];
    const initialPrice = fanData[0]?.p50 || 0;

    // Calculate returns
    const returns = {
      p01: ((finalPrices.p01 - initialPrice) / initialPrice) * 100,
      p05: ((finalPrices.p05 - initialPrice) / initialPrice) * 100,
      p10: ((finalPrices.p10 - initialPrice) / initialPrice) * 100,
      p50: ((finalPrices.p50 - initialPrice) / initialPrice) * 100,
      p90: ((finalPrices.p90 - initialPrice) / initialPrice) * 100,
      p95: ((finalPrices.p95 - initialPrice) / initialPrice) * 100,
      p99: ((finalPrices.p99 - initialPrice) / initialPrice) * 100,
    };

    // Calculate VaR and CVaR
    const var95 = Math.abs(returns.p05); // 95% VaR
    const cvar95 = Math.abs(returns.p01); // 95% CVaR (Expected Shortfall)

    // Calculate probability of loss
    const probLoss = returns.p50 < 0 ? 75 : returns.p10 < 0 ? 25 : 10;

    // Calculate maximum drawdown (simplified)
    let maxDrawdown = 0;
    let peak = initialPrice;
    fanData.forEach((point) => {
      if (point.p50 > peak) peak = point.p50;
      const drawdown = ((peak - point.p50) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      expectedReturn: returns.p50,
      var95,
      cvar95,
      probLoss,
      maxDrawdown,
      upside: returns.p95,
      downside: returns.p05,
      volatility: (returns.p95 - returns.p05) / 2,
    };
  }, [simulationData]);

  // Chart configuration
  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;
  const colors = getThemeColors(isDark);

  const chartData = useMemo(() => {
    const fanData = getFanData();
    if (!fanData || fanData.length === 0) return null;

    const labels = fanData.map((point) => format(new Date(point.ds), "MMM dd"));

    return {
      labels,
      datasets: [
        {
          label: "99th Percentile",
          data: fanData.map((point) => point.p99),
          borderColor: colors.error + "40",
          backgroundColor: colors.error + "10",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "95th Percentile",
          data: fanData.map((point) => point.p95),
          borderColor: colors.warning + "60",
          backgroundColor: colors.warning + "15",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "90th Percentile",
          data: fanData.map((point) => point.p90),
          borderColor: colors.warning + "80",
          backgroundColor: colors.warning + "20",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Median (50th)",
          data: fanData.map((point) => point.p50),
          borderColor: colors.primary,
          backgroundColor: colors.primary + "30",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 3,
        },
        {
          label: "10th Percentile",
          data: fanData.map((point) => point.p10),
          borderColor: colors.success + "80",
          backgroundColor: colors.success + "20",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "5th Percentile",
          data: fanData.map((point) => point.p05),
          borderColor: colors.success + "60",
          backgroundColor: colors.success + "15",
          fill: "+1",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "1st Percentile",
          data: fanData.map((point) => point.p01),
          borderColor: colors.success + "40",
          backgroundColor: colors.success + "10",
          fill: "origin",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    };
  }, [simulationData, colors]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `Monte Carlo Simulation - ${simulationParams.method.toUpperCase()} Method`,
        color: colors.text,
        font: { size: 16, weight: "bold" as const },
      },
      legend: {
        display: true,
        position: "top" as const,
        labels: { color: colors.text, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.border,
        borderWidth: 1,
        callbacks: {
          title: (context: any) => `Date: ${context[0].label}`,
          label: (context: any) => {
            const value = context.parsed.y;
            const currency = settings.currency === "YER" ? "YER" : "$";
            return `${
              context.dataset.label
            }: ${currency}${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: "Date", color: colors.text },
        ticks: { color: colors.text },
        grid: { color: colors.grid },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: `Price (${settings.currency})`,
          color: colors.text,
        },
        ticks: {
          color: colors.text,
          callback: function (value: any) {
            const currency = settings.currency === "YER" ? "" : "$";
            return `${currency}${value.toLocaleString()}`;
          },
        },
        grid: { color: colors.grid },
      },
    },
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "conservative":
        return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case "moderate":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "aggressive":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      default:
        return "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-[1px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Monte Carlo Risk Simulator
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Advanced probabilistic modeling for gold price forecasting
                    and risk assessment
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {simulationParams.days} Days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {simulationParams.n.toLocaleString()} Paths
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {simulationParams.annual_vol}% Vol
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {simulationParams.method.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  showPresets
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Bookmark className="h-4 w-4" />
                Presets
              </button>
              <button
                onClick={handleRunSimulation}
                disabled={isRunning}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Scenarios Panel */}
      {showPresets && (
        <section className="relative overflow-hidden rounded-3xl border border-green-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-green-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/12 via-teal-500/6 to-green-500/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-green-500/15 p-3 ring-1 ring-green-400/40">
                  <Layers className="h-5 w-5 text-green-600 dark:text-green-200" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preset Scenarios
                </h2>
              </div>
              <button
                onClick={() => setShowPresets(false)}
                className={`text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition ${
                  isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
                } rounded-lg p-1`}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {marketConditionsLoading ? (
                // Loading state for scenarios
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="card !p-4 animate-pulse">
                    <div className="h-5 w-5 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))
              ) : dynamicScenarios.length === 0 ? (
                // No scenarios available - show message
                <div className="col-span-4 text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-2">
                    <Activity className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Market Data Loading
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Waiting for real-time market conditions to generate dynamic
                    scenarios...
                  </p>
                  {marketConditionsError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Error loading market conditions. Please try again later.
                    </p>
                  )}
                </div>
              ) : (
                dynamicScenarios.map((preset) => {
                  const categoryPalette =
                    preset.category === "conservative"
                      ? isDark
                        ? "from-emerald-500/25 via-emerald-500/5 to-transparent"
                        : "from-emerald-100 via-emerald-50/5 to-transparent"
                      : preset.category === "moderate"
                      ? isDark
                        ? "from-blue-500/25 via-blue-500/5 to-transparent"
                        : "from-blue-100 via-blue-50/5 to-transparent"
                      : preset.category === "aggressive"
                      ? isDark
                        ? "from-rose-500/25 via-rose-500/5 to-transparent"
                        : "from-rose-100 via-rose-50/5 to-transparent"
                      : isDark
                      ? "from-purple-500/25 via-purple-500/5 to-transparent"
                      : "from-purple-100 via-purple-50/5 to-transparent";

                  return (
                    <article
                      key={preset.id}
                      className={`relative overflow-hidden rounded-2xl border p-4 cursor-pointer shadow-lg transition hover:-translate-y-0.5 hover:border-blue-400/40 ${
                        isDark
                          ? "border-slate-200/15 bg-white/70 dark:border-slate-700/40 dark:bg-slate-900/40"
                          : "border-slate-200/60 bg-white/95"
                      } ${
                        selectedPreset === preset.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "Preset card clicked:",
                          preset.id,
                          preset.name
                        );
                        handlePresetSelect(preset);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      style={{ position: "relative", zIndex: 10 }}
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${categoryPalette} z-0`}
                        aria-hidden
                      />
                      <div className="relative z-10">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                            <div className="text-gray-600 dark:text-gray-400">
                              {preset.icon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {preset.name}
                              </h3>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getRiskLevelColor(
                                  preset.riskLevel
                                )}`}
                              >
                                {preset.riskLevel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                              {preset.description}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-gray-500">
                                <span className="font-medium">
                                  {preset.params.days}d
                                </span>{" "}
                                •
                                <span className="font-medium">
                                  {" "}
                                  {preset.params.annual_vol}%
                                </span>
                              </div>
                              <div className="text-gray-500">
                                <span className="font-medium">
                                  {(preset.params.n / 1000).toFixed(0)}K
                                </span>{" "}
                                paths
                              </div>
                            </div>
                          </div>
                        </div>
                        {selectedPreset === preset.id && (
                          <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            <span>Selected</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Saved Scenarios */}
            {savedScenarios.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Saved Scenarios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {savedScenarios.map((scenario) => (
                    <article
                      key={scenario.id}
                      className={`relative overflow-hidden rounded-2xl border p-3 cursor-pointer shadow-lg transition hover:-translate-y-0.5 hover:border-purple-400/40 ${
                        isDark
                          ? "border-purple-500/40 bg-purple-900/30"
                          : "border-purple-200/60 bg-purple-50/80"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Saved scenario clicked:", scenario.id);
                        handlePresetSelect(scenario);
                      }}
                      onMouseDown={(e) => {
                        // Ensure click works even if there are pointer event issues
                        e.stopPropagation();
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent pointer-events-none z-0" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {scenario.name}
                          </h4>
                          <Bookmark className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {scenario.params.days}d • {scenario.params.annual_vol}
                          % • {(scenario.params.n / 1000).toFixed(0)}K paths
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Enhanced Parameter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Parameters */}
        <section className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-blue-500/15 p-2 ring-1 ring-blue-400/40">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Parameters
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Simulation Period
                </label>
                <select
                  value={simulationParams.days}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      days: Number(e.target.value),
                    })
                  }
                  className={`form-input w-full text-sm ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <option value={7}>1 Week</option>
                  <option value={14}>2 Weeks</option>
                  <option value={30}>1 Month</option>
                  <option value={60}>2 Months</option>
                  <option value={90}>3 Months</option>
                  <option value={180}>6 Months</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Brain className="inline h-4 w-4 mr-1" />
                  Simulation Method
                </label>
                <select
                  value={simulationParams.method}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      method: e.target.value as "gbm" | "bootstrap",
                    })
                  }
                  className={`form-input w-full text-sm ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <option value="gbm">Geometric Brownian Motion</option>
                  <option value="bootstrap">Historical Bootstrap</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {simulationParams.method === "gbm"
                    ? "Mathematical model assuming log-normal price distribution"
                    : "Resamples from historical price movements"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Activity className="inline h-4 w-4 mr-1" />
                  Number of Simulation Paths
                </label>
                <select
                  value={simulationParams.n}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      n: Number(e.target.value),
                    })
                  }
                  className={`form-input w-full text-sm ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <option value={1000}>1,000 (Fast)</option>
                  <option value={5000}>5,000 (Balanced)</option>
                  <option value={10000}>10,000 (Recommended)</option>
                  <option value={25000}>25,000 (High Precision)</option>
                  <option value={50000}>50,000 (Maximum)</option>
                </select>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  More paths = higher accuracy but longer computation time
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Parameters */}
        <section className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-orange-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-500/15 p-2 ring-1 ring-orange-400/40">
                  <Gauge className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Advanced Settings
                </h3>
              </div>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className={`text-sm transition ${
                  isDark
                    ? "text-blue-300 hover:text-blue-200"
                    : "text-blue-600 hover:text-blue-700"
                }`}
              >
                {showAdvancedSettings ? "Hide" : "Show"}
              </button>
            </div>

            <div
              className={`space-y-4 ${
                showAdvancedSettings ? "" : "opacity-50"
              }`}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Percent className="inline h-4 w-4 mr-1" />
                  Annual Volatility (%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={simulationParams.annual_vol}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      annual_vol: Number(e.target.value),
                    })
                  }
                  className="w-full"
                  disabled={!showAdvancedSettings}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (5%)</span>
                  <span className="font-medium">
                    {simulationParams.annual_vol}%
                  </span>
                  <span>High (50%)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  Drift Adjustment (%)
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={simulationParams.drift_adj}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      drift_adj: Number(e.target.value),
                    })
                  }
                  className="w-full"
                  disabled={!showAdvancedSettings}
                />
                <div
                  className={`flex justify-between text-xs mt-1 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  <span>Bearish (-20%)</span>
                  <span className="font-medium">
                    {simulationParams.drift_adj > 0 ? "+" : ""}
                    {simulationParams.drift_adj}%
                  </span>
                  <span>Bullish (+20%)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-white/95 px-5 py-5 shadow-lg backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-purple-500/15 p-2 ring-1 ring-purple-400/40">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scenario name..."
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className={`form-input flex-1 text-sm ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                />
                <button
                  onClick={handleSaveScenario}
                  className={`text-sm flex items-center gap-1 px-3 py-2 rounded-lg transition ${
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>

              <button
                onClick={handleResetToDefaults}
                className={`w-full text-sm flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${
                  isDark
                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>

              <button
                onClick={() => {
                  // Generate parameters based on real market conditions instead of random values
                  const marketData = marketConditionsData?.data;
                  if (!marketData) {
                    toast.error(
                      "Market data not available for parameter generation"
                    );
                    return;
                  }

                  const realParams = {
                    days:
                      marketData.volatility > 25
                        ? 60
                        : marketData.volatility > 15
                        ? 30
                        : 14,
                    method:
                      marketData.marketRegime === "euphoric" ||
                      marketData.marketRegime === "panic"
                        ? ("bootstrap" as const)
                        : ("gbm" as const),
                    annual_vol: Math.max(
                      10,
                      Math.min(40, Math.round(marketData.volatility))
                    ),
                    drift_adj: Math.round(marketData.baseDrift * 10), // Convert to percentage
                    n:
                      marketData.riskLevel === "high"
                        ? 15000
                        : marketData.riskLevel === "medium"
                        ? 10000
                        : 5000,
                  };
                  setSimulationParams(realParams);
                  setSelectedPreset(null);
                  toast.success("Applied market-based parameters");
                }}
                className={`w-full text-sm flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${
                  isDark
                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Shuffle className="h-4 w-4" />
                Market-Based
              </button>

              {simulationData && (
                <button
                  onClick={handleExportCSV}
                  className={`w-full text-sm flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${
                    isDark
                      ? "bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 border border-purple-400/40"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300/60"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Results Section */}
      {showResults && simulationData && (
        <>
          {/* Risk Metrics Dashboard */}
          {riskMetrics && (
            <section className="relative overflow-hidden rounded-3xl border border-red-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-red-500/30 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/12 via-orange-500/6 to-red-500/10" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-2xl bg-red-500/15 p-3 ring-1 ring-red-400/40">
                    <Shield className="h-5 w-5 text-red-600 dark:text-red-200" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Risk Assessment Dashboard
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <article
                    className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur ${
                      isDark
                        ? "border-blue-500/40 bg-blue-900/30"
                        : "border-blue-200/60 bg-blue-50/80"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Expected Return
                        </h3>
                        <Target className="h-4 w-4 text-blue-500" />
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          riskMetrics.expectedReturn >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {riskMetrics.expectedReturn > 0 ? "+" : ""}
                        {riskMetrics.expectedReturn.toFixed(2)}%
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Median projected return
                      </p>
                    </div>
                  </article>

                  <article
                    className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur ${
                      isDark
                        ? "border-red-500/40 bg-red-900/30"
                        : "border-red-200/60 bg-red-50/80"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className={`text-sm font-medium ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Value at Risk (95%)
                        </h3>
                        <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {riskMetrics.var95.toFixed(2)}%
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Maximum expected loss
                      </p>
                    </div>
                  </article>

                  <article
                    className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur ${
                      isDark
                        ? "border-orange-500/40 bg-orange-900/30"
                        : "border-orange-200/60 bg-orange-50/80"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className={`text-sm font-medium ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Max Drawdown
                        </h3>
                        <TrendingDown className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {riskMetrics.maxDrawdown.toFixed(2)}%
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Peak-to-trough decline
                      </p>
                    </div>
                  </article>

                  <article
                    className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur ${
                      isDark
                        ? "border-purple-500/40 bg-purple-900/30"
                        : "border-purple-200/60 bg-purple-50/80"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className={`text-sm font-medium ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Probability of Loss
                        </h3>
                        <Percent className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {riskMetrics.probLoss}%
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Chance of negative return
                      </p>
                    </div>
                  </article>
                </div>

                {/* Additional Risk Metrics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      Upside Potential
                    </h4>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      +{riskMetrics.upside.toFixed(2)}%
                    </div>
                    <p
                      className={`text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      95th percentile return
                    </p>
                  </div>
                  <div className="text-center">
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      Downside Risk
                    </h4>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {riskMetrics.downside.toFixed(2)}%
                    </div>
                    <p
                      className={`text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      5th percentile return
                    </p>
                  </div>
                  <div className="text-center">
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      Volatility Range
                    </h4>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ±{riskMetrics.volatility.toFixed(2)}%
                    </div>
                    <p
                      className={`text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Expected price range
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Enhanced Chart */}
          <section className="relative overflow-hidden rounded-3xl border border-green-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-green-500/30 dark:bg-slate-900/60">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/12 via-blue-500/6 to-green-500/10" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-green-500/15 p-3 ring-1 ring-green-400/40">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-200" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Monte Carlo Simulation Results
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Probabilistic price distribution over{" "}
                      {simulationParams.days} days using{" "}
                      {simulationParams.n.toLocaleString()} simulation paths
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    className={`text-sm flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              {chartData && (
                <div
                  style={{ height: `${Math.max(400, windowWidth * 0.3)}px` }}
                >
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}

              {/* Chart Legend */}
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  isDark
                    ? "bg-white/5 border-white/10"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4
                  className={`text-sm font-semibold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Understanding the Fan Chart
                </h4>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-xs ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <div className="space-y-2">
                    <p>
                      <strong>Dark Blue (Median):</strong> Most likely price
                      path based on historical patterns
                    </p>
                    <p>
                      <strong>Light Blue Bands:</strong> 80% confidence interval
                      (10th-90th percentiles)
                    </p>
                    <p>
                      <strong>Yellow Bands:</strong> 90% confidence interval
                      (5th-95th percentiles)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <strong>Red Bands:</strong> 98% confidence interval
                      (1st-99th percentiles)
                    </p>
                    <p>
                      <strong>Wider Bands:</strong> Indicate higher uncertainty
                      and volatility
                    </p>
                    <p>
                      <strong>Simulation Method:</strong>{" "}
                      {simulationParams.method === "gbm"
                        ? "Geometric Brownian Motion"
                        : "Historical Bootstrap"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Loading State */}
      {isRunning && (
        <section className="relative overflow-hidden rounded-3xl border border-purple-200/60 bg-white/95 px-6 py-6 shadow-xl backdrop-blur dark:border-purple-500/30 dark:bg-slate-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/12 via-purple-500/6 to-purple-500/10" />
          <div className="relative">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Running Monte Carlo Simulation
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Processing {simulationParams.n.toLocaleString()} simulation
                  paths over {simulationParams.days} days...
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Simulator;
