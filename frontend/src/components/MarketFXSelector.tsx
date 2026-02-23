/**
 * MarketFXSelector - Choose between Official, Market, or Custom USD/YER rates
 * For Yemen market where official and parallel market rates differ significantly
 */

import { useState } from 'react';
import { DollarSign, TrendingUp, Edit } from 'lucide-react';
import { useYemenSettings } from '../contexts/YemenSettingsContext';

export default function MarketFXSelector() {
  const { yemenSettings, updateSettings } = useYemenSettings();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRate, setCustomRate] = useState(yemenSettings.customRate?.toString() || '');

  const options = [
    {
      id: 'official',
      label: 'Official Rate',
      value: 'official',
      icon: <DollarSign className="w-4 h-4" />,
      rate: 250, // CBY official rate (example)
      description: 'Central Bank of Yemen rate'
    },
    {
      id: 'market',
      label: 'Market Rate',
      value: 'market',
      icon: <TrendingUp className="w-4 h-4" />,
      rate: yemenSettings.marketRate || 530, // Parallel market rate
      description: 'Current parallel market rate'
    },
    {
      id: 'custom',
      label: 'Custom Rate',
      value: 'custom',
      icon: <Edit className="w-4 h-4" />,
      rate: yemenSettings.customRate || 0,
      description: 'Set your own rate'
    }
  ];

  const handleSelect = (value: 'official' | 'market' | 'custom') => {
    if (value === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      updateSettings({ fxSource: value });
    }
  };

  const handleCustomSubmit = () => {
    const rate = parseFloat(customRate);
    if (rate > 0 && rate < 10000) {
      updateSettings({ fxSource: 'custom', customRate: rate });
      setShowCustomInput(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        USD/YER Exchange Rate
      </h3>

      <div className="space-y-2">
        {options.map(option => (
          <div key={option.id} className="relative">
            <button
              onClick={() => handleSelect(option.value as any)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition ${
                yemenSettings.fxSource === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`mt-0.5 ${
                yemenSettings.fxSource === option.value
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {option.icon}
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    yemenSettings.fxSource === option.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {option.label}
                  </span>
                  
                  {option.value !== 'custom' && (
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {option.rate.toLocaleString()} YER
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </div>
              </div>
            </button>

            {/* Custom Rate Input */}
            {option.value === 'custom' && showCustomInput && (
              <div className="mt-2 ml-7 flex items-center gap-2">
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="Enter rate..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="10000"
                  step="1"
                  autoFocus
                />
                <button
                  onClick={handleCustomSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
                >
                  Set
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Effective Rate Display */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Effective rate:
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
            1 USD = {yemenSettings.effectiveRate?.toLocaleString() || 'N/A'} YER
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Choose the exchange rate that matches your actual transaction rate. Market rates updated daily.
      </p>
    </div>
  );
}

