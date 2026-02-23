import React, { useState, useEffect, useMemo } from "react";
import { useSpotRate } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { useYemenSettings } from "../contexts/YemenSettingsContext";
import { copyToClipboard as copyToClipboardUtil } from "../lib/clipboard";
import { CONVERSION_FACTORS, KARAT_PURITY } from "../lib/constants";
import type { GoldRateCalculatorExportData } from "../utils/csvExport";
import { Calculator, RefreshCw, Copy, Check } from "lucide-react";

interface ConversionResult {
  unit: string;
  karat: number;
  weight: number;
  pricePerUnit: number;
  totalPrice: number;
  currency: string;
}

interface GoldRateCalculatorProps {
  /** Called when calculator data changes so parent can include it in suite export */
  onExportData?: (data: GoldRateCalculatorExportData) => void;
}

const GoldRateCalculator: React.FC<GoldRateCalculatorProps> = ({
  onExportData,
}) => {
  const { settings } = useSettings();
  const { settings: yemenSettings } = useYemenSettings();
  const [inputWeight, setInputWeight] = useState<string>("1");
  const [selectedUnit, setSelectedUnit] = useState<string>("gram");
  const [selectedKarat, setSelectedKarat] = useState<number>(24);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    settings.currency || "USD"
  );
  const [conversionResults, setConversionResults] = useState<
    ConversionResult[]
  >([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch current gold spot rate
  const { data: spotData, isLoading, error } = useSpotRate();

  // Use shared conversion constants
  const unitConversions = CONVERSION_FACTORS;
  const karatMultipliers = KARAT_PURITY;

  // Calculate FX rate based on selected source - same logic as Regional Pricing (Custom removed)
  const fxRate = useMemo(() => {
    if (selectedCurrency !== "YER") {
      return 1;
    }

    const source = yemenSettings.fxSource || "market";
    const effectiveSource = source === "custom" ? "market" : source;

    if (effectiveSource === "official") {
      return 250; // Official government rate
    }

    return yemenSettings.marketRate || yemenSettings.effectiveRate || 530;
  }, [
    selectedCurrency,
    yemenSettings.fxSource,
    yemenSettings.marketRate,
    yemenSettings.effectiveRate,
  ]);

  // Helper: currency conversion multiplier
  const getCurrencyMultiplier = (): number => {
    return fxRate;
  };

  // Calculate conversions
  useEffect(() => {
    if (!spotData || !spotData.usdPerOunce) return;

    const weight = parseFloat(inputWeight) || 0;
    if (weight <= 0) {
      setConversionResults([]);
      return;
    }

    const basePricePerGram24KUsd = spotData.usdPerGram; // Use usdPerGram from backend
    const karatFactor = karatMultipliers[selectedKarat] ?? 1;
    const currencyMult = getCurrencyMultiplier();

    const pricePerGramSelected =
      basePricePerGram24KUsd * karatFactor * currencyMult;

    const results: ConversionResult[] = [];

    // Calculate for different units across all karats
    Object.entries(unitConversions).forEach(([unit, gramsPerUnit]) => {
      Object.entries(karatMultipliers).forEach(([karatStr, purity]) => {
        const karat = parseInt(karatStr);
        const pricePerUnit =
          basePricePerGram24KUsd * Number(gramsPerUnit) * purity * currencyMult;
        const totalPrice = pricePerUnit * weight;

        results.push({
          unit,
          karat,
          weight,
          pricePerUnit,
          totalPrice,
          currency: selectedCurrency,
        });
      });
    });

    setConversionResults(results);

    onExportData?.({
      weight: weight || 0,
      unit: selectedUnit,
      karat: selectedKarat,
      currency: selectedCurrency,
      asOf: spotData?.asOf ?? null,
      conversionTable: results,
    });
  }, [
    inputWeight,
    selectedUnit,
    selectedKarat,
    selectedCurrency,
    spotData,
    fxRate,
    onExportData,
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: selectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const copyToClipboard = async (text: string, index: number) => {
    const result = await copyToClipboardUtil(text);
    if (result.success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: { [key: string]: string } = {
      gram: "Gram",
      ounce: "Ounce",
      tola: "Tola",
      kilogram: "Kilogram",
      pound: "Pound",
    };
    return labels[unit] || unit;
  };

  const filteredResults = conversionResults.filter(
    (result) => result.unit === selectedUnit && result.karat === selectedKarat
  );

  // Derived display values for the header box based on selected karat & currency
  const currencyMult = getCurrencyMultiplier();
  const karatFactorForHeader = karatMultipliers[selectedKarat] ?? 1;
  const perGram = spotData?.usdPerGram
    ? spotData.usdPerGram * karatFactorForHeader * currencyMult
    : NaN;
  const perOunce = spotData?.usdPerOunce
    ? spotData.usdPerOunce * karatFactorForHeader * currencyMult
    : NaN;
  const perTola = spotData?.usdPerGram
    ? spotData.usdPerGram * 11.6638038 * karatFactorForHeader * currencyMult // Convert grams to tola
    : NaN;
  const perKg = spotData?.usdPerGram
    ? spotData.usdPerGram * 1000 * karatFactorForHeader * currencyMult
    : NaN;

  if (isLoading) {
    return (
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">
            Loading gold rates...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden p-8">
        <div className="text-center py-8">
          <div className="text-red-600 dark:text-red-400 mb-2 font-medium">
            Failed to load gold rates
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Please try again later
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 dark:from-blue-500/20 dark:to-indigo-600/20 ring-1 ring-blue-500/20 dark:ring-blue-400/20">
                <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Gold Rate Calculator
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Calculate gold prices across different units and karats
                </p>
              </div>
            </div>
            {spotData && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Last updated:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {spotData.asOf
                    ? new Date(spotData.asOf).toLocaleString()
                    : "Unknown"}
                </span>
              </div>
            )}
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Weight
              </label>
              <input
                type="number"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter weight"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Unit
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {Object.keys(unitConversions).map((unit) => (
                  <option key={unit} value={unit}>
                    {getUnitLabel(unit)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Karat
              </label>
              <select
                value={selectedKarat}
                onChange={(e) => setSelectedKarat(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {Object.keys(karatMultipliers).map((karat) => (
                  <option key={karat} value={karat}>
                    {karat}K
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="USD">USD</option>
                <option value="YER">YER</option>
              </select>
            </div>
          </div>

          {/* Current Gold Rate Display (reflects selected karat & currency) */}
          {spotData && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Current Gold Rate ({selectedKarat}K)
                </div>
                {selectedCurrency === "YER" && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    FX Rate:{" "}
                    <span className="font-medium">
                      {getCurrencyMultiplier().toFixed(2)} USD/YER
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Per Gram
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(perGram)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Per Ounce
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(perOunce)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Per Tola
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(perTola)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Per Kilogram
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(perKg)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredResults.length > 0 && (
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/3 to-blue-500/5 pointer-events-none" />
          <div className="relative p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              Calculation Results
            </h3>

            <div className="space-y-3">
              {filteredResults.map((result, index) => (
                <div
                  key={`${result.unit}-${result.karat}`}
                  className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      {inputWeight} {getUnitLabel(result.unit)} of{" "}
                      {result.karat}K Gold
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                      {formatPrice(result.totalPrice)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Rate: {formatPrice(result.pricePerUnit)} per{" "}
                      {getUnitLabel(result.unit)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(formatPrice(result.totalPrice), index)
                    }
                    className="ml-4 p-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    aria-label="Copy price"
                    title="Copy price"
                  >
                    {copiedIndex === index ? (
                      <Check
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Conversions Table */}
      {conversionResults.length > 0 && (
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/3 to-blue-500/5 pointer-events-none" />
          <div className="relative p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              All Unit Conversions ({inputWeight} {getUnitLabel(selectedUnit)})
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Unit
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Karat
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Price per Unit
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Total Price
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  {conversionResults.map((result, index) => (
                    <tr
                      key={`${result.unit}-${result.karat}`}
                      className="bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {getUnitLabel(result.unit)}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900 dark:text-slate-100">
                        {result.karat}K
                      </td>
                      <td className="py-4 px-6 text-sm text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatPrice(result.pricePerUnit)}
                      </td>
                      <td className="py-4 px-6 text-sm text-right font-bold text-slate-900 dark:text-white">
                        {formatPrice(result.totalPrice)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              formatPrice(result.totalPrice),
                              index
                            )
                          }
                          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Copy price"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldRateCalculator;
