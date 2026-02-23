/**
 * CSV Export Utilities
 * Helpers for downloading data as CSV files
 */

export interface ResidualsData {
  ds: string; // Date
  y_true: number; // Actual price
  y_pred: number; // Forecast price
  residual: number; // y_true - y_pred
  abs_error: number; // |residual|
  percent_error: number; // (residual / y_true) * 100
}

/**
 * Convert residuals data to CSV format
 */
export function residualsToCsv(data: ResidualsData[]): string {
  // CSV header
  const header =
    "Date,Actual Price,Forecast Price,Residual,Absolute Error,Percent Error (%)";

  // Check if data is empty
  if (!data || data.length === 0) {
    return header + "\n" + "No data available";
  }
  
  // CSV rows
  const rows = data.map((row) => {
    return [
      row.ds,
      row.y_true.toFixed(2),
      row.y_pred.toFixed(2),
      row.residual.toFixed(2),
      row.abs_error.toFixed(2),
      row.percent_error.toFixed(2),
    ].join(",");
  });
  
  return [header, ...rows].join("\n");
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Calculate residuals from actual and forecast data
 */
export function calculateResiduals(
  actual: { ds: string; price: number }[],
  forecast: { ds: string; yhat: number }[]
): ResidualsData[] {
  const residuals: ResidualsData[] = [];
  
  // Match actual and forecast by date
  for (const act of actual) {
    const pred = forecast.find((f) => f.ds === act.ds);
    if (pred) {
      const residual = act.price - pred.yhat;
      const abs_error = Math.abs(residual);
      const percent_error = (residual / act.price) * 100;
      
      residuals.push({
        ds: act.ds,
        y_true: act.price,
        y_pred: pred.yhat,
        residual,
        abs_error,
        percent_error,
      });
    }
  }
  
  return residuals;
}

/**
 * Export forecast comparison data
 */
export function exportForecastComparison(
  actual: { ds: string; price: number }[],
  forecast: { ds: string; yhat: number }[],
  filename: string = "forecast_comparison.csv"
): void {
  const residuals = calculateResiduals(actual, forecast);
  const csvContent = residualsToCsv(residuals);
  downloadCsv(csvContent, filename);
}

/**
 * Export OHLC (Open, High, Low, Close) data to CSV
 */
export function exportOHLCToCsv(
  ohlcData: Array<{
    datetime?: string;
    timestamp?: string;
    date?: string;
    open: number | string;
    high: number | string;
    low: number | string;
    close: number | string;
    volume?: number | string;
  }>,
  filename: string = "ohlc_data.csv"
): void {
  if (!ohlcData || ohlcData.length === 0) {
    return;
  }

  const header = "Date,Open,High,Low,Close,Volume";
  const rows = ohlcData.map((row) => {
    const date = row.datetime || row.timestamp || row.date || "N/A";
    const open = parseFloat(String(row.open)) || 0;
    const high = parseFloat(String(row.high)) || 0;
    const low = parseFloat(String(row.low)) || 0;
    const close = parseFloat(String(row.close)) || 0;
    const volume = parseFloat(String(row.volume)) || 0;

    return [
      date,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      volume.toFixed(0),
    ].join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  downloadCsv(csvContent, filename);
}

/**
 * Export price history data to CSV
 */
export function exportPriceHistoryToCsv(
  prices: Array<{ ds: string; price: number }>,
  filename: string = "price_history.csv"
): void {
  if (!prices || prices.length === 0) {
    return;
  }

  const header = "Date,Price";
  const rows = prices.map((row) => {
    return [row.ds, row.price.toFixed(2)].join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  downloadCsv(csvContent, filename);
}

/** Escape a CSV cell (quote if contains comma or newline) */
function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Gold Rate Calculator snapshot for export */
export interface GoldRateCalculatorExportData {
  weight: number;
  unit: string;
  karat: number;
  currency: string;
  asOf: string | null;
  conversionTable: Array<{
    unit: string;
    karat: number;
    weight: number;
    pricePerUnit: number;
    totalPrice: number;
    currency: string;
  }>;
}

/**
 * Calculator suite export payload (matches Calculator.tsx export shape)
 */
export interface CalculatorExportData {
  investment: {
    initialInvestment: number;
    monthlyContribution: number;
    timeHorizon: number;
    expectedReturn: number;
    riskTolerance: string;
    compoundFrequency: string;
    portfolio?: { gold: number; stocks: number; bonds: number; cash: number };
  };
  portfolio: { gold: number; stocks: number; bonds: number; cash: number };
  riskInputs: {
    portfolioValue: number;
    positionSize: number;
    stopLoss: number;
    riskPerTrade: number;
    leverage: number;
  };
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number;
    expectedReturn: number;
    riskScore: number;
    projectedLoss: number;
    riskAmountPerTrade: number;
  };
  timestamp: string;
  /** Optional: included when user has loaded Gold Rate Calculator tab */
  goldRate?: GoldRateCalculatorExportData;
}

/**
 * Convert Investment & Risk Calculator Suite data to CSV (Section, Metric, Value)
 */
export function calculatorDataToCsv(data: CalculatorExportData): string {
  const rows: string[] = [];
  const row = (section: string, metric: string, value: string | number) =>
    rows.push([section, metric, escapeCsvCell(value)].join(","));

  const inv = data.investment;
  row("Investment", "Initial Investment", inv.initialInvestment);
  row("Investment", "Monthly Contribution", inv.monthlyContribution);
  row("Investment", "Time Horizon (Years)", inv.timeHorizon);
  row("Investment", "Expected Return (%)", inv.expectedReturn);
  row("Investment", "Risk Tolerance", inv.riskTolerance);
  row("Investment", "Compound Frequency", inv.compoundFrequency);

  const port = data.portfolio;
  row("Portfolio", "Gold (%)", port.gold);
  row("Portfolio", "Stocks (%)", port.stocks);
  row("Portfolio", "Bonds (%)", port.bonds);
  row("Portfolio", "Cash (%)", port.cash);

  const riskIn = data.riskInputs;
  row("Risk Inputs", "Portfolio Value", riskIn.portfolioValue);
  row("Risk Inputs", "Position Size", riskIn.positionSize);
  row("Risk Inputs", "Stop Loss (%)", riskIn.stopLoss);
  row("Risk Inputs", "Risk Per Trade (%)", riskIn.riskPerTrade);
  row("Risk Inputs", "Leverage", riskIn.leverage);

  const riskMet = data.riskMetrics;
  row("Risk Metrics", "Volatility", riskMet.volatility);
  row("Risk Metrics", "Sharpe Ratio", riskMet.sharpeRatio);
  row("Risk Metrics", "Max Drawdown (%)", riskMet.maxDrawdown);
  row("Risk Metrics", "VaR 95% (%)", riskMet.var95);
  row("Risk Metrics", "Expected Return (%)", riskMet.expectedReturn);
  row("Risk Metrics", "Risk Score", riskMet.riskScore);
  row("Risk Metrics", "Projected Loss", riskMet.projectedLoss);
  row("Risk Metrics", "Risk Amount Per Trade", riskMet.riskAmountPerTrade);

  row("Export", "Timestamp", data.timestamp);

  // Gold Rate Calculator section (when available)
  if (data.goldRate) {
    const gr = data.goldRate;
    row("Gold Rate Calculator", "Weight", gr.weight);
    row("Gold Rate Calculator", "Unit", gr.unit);
    row("Gold Rate Calculator", "Karat", gr.karat);
    row("Gold Rate Calculator", "Currency", gr.currency);
    row("Gold Rate Calculator", "Spot As Of", gr.asOf ?? "");
    gr.conversionTable.forEach((r) => {
      const label = `${r.unit} ${r.karat}K`;
      row("Gold Rate Calculator", `${label} - Price Per Unit`, r.pricePerUnit.toFixed(2));
      row("Gold Rate Calculator", `${label} - Total Price`, r.totalPrice.toFixed(2));
    });
  }

  const header = "Section,Metric,Value";
  return [header, ...rows].join("\n");
}

/**
 * Export calculator suite data as CSV and trigger download
 */
export function exportCalculatorToCsv(
  data: CalculatorExportData,
  filename: string = "goldvision-calculations.csv"
): void {
  const csvContent = calculatorDataToCsv(data);
  downloadCsv(csvContent, filename);
}
