/**
 * LocalPremiumBreakdown - Shows detailed price breakdown for Yemen market
 * Includes: Spot price, Local premium, Making charges, Total
 */

import { Info, TrendingUp, Hammer, DollarSign } from 'lucide-react';
import { useYemenSettings } from '../contexts/YemenSettingsContext';
import { GRAMS_PER_OUNCE } from '../lib/constants';

interface LocalPremiumBreakdownProps {
  spotPriceUSD: number;
  weightGrams?: number;
}

export default function LocalPremiumBreakdown({ 
  spotPriceUSD, 
  weightGrams = 1 
}: LocalPremiumBreakdownProps) {
  const { settings } = useYemenSettings();
  
  // Yemen market parameters (can be made configurable)
  const localPremiumPercent = 3.5; // 3.5% premium over spot
  const makingChargePerGram = settings.karat === 24 ? 2500 : 
                              settings.karat === 22 ? 2000 :
                              settings.karat === 21 ? 1500 : 1200; // YER per gram

  const fxRate = settings.effectiveRate || settings.marketRate || 530;
  
  // Calculate breakdown (per gram)
  const spotPricePerOunce = spotPriceUSD;
  const spotPricePerGram = spotPricePerOunce / GRAMS_PER_OUNCE;
  const spotPriceYER = spotPricePerGram * fxRate;
  
  const localPremiumYER = (spotPriceYER * localPremiumPercent) / 100;
  const makingFeeYER = makingChargePerGram;
  const totalPerGramYER = spotPriceYER + localPremiumYER + makingFeeYER;
  
  // For total weight
  const totalSpot = spotPriceYER * weightGrams;
  const totalPremium = localPremiumYER * weightGrams;
  const totalMaking = makingFeeYER * weightGrams;
  const grandTotal = totalPerGramYER * weightGrams;

  const formatYER = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border-2 border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Price Breakdown
        </h3>
        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
          {settings.karat}K {weightGrams}g
        </span>
      </div>

      {/* Breakdown Items */}
      <div className="space-y-3">
        {/* Spot Price */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Spot Price
              </div>
              <div className="text-xs text-gray-500">
                ${spotPricePerGram.toFixed(2)}/g @ {fxRate} USD/YER
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {formatYER(totalSpot)} YER
            </div>
            <div className="text-xs text-gray-500">
              {formatYER(spotPriceYER)}/g
            </div>
          </div>
        </div>

        {/* Local Premium */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Local Premium
              </div>
              <div className="text-xs text-gray-500">
                {localPremiumPercent}% market premium
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-amber-600 dark:text-amber-400">
              +{formatYER(totalPremium)} YER
            </div>
            <div className="text-xs text-gray-500">
              {formatYER(localPremiumYER)}/g
            </div>
          </div>
        </div>

        {/* Making Charges */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Making Charges
              </div>
              <div className="text-xs text-gray-500">
                Craftsmanship fee ({settings.karat}K)
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-purple-600 dark:text-purple-400">
              +{formatYER(totalMaking)} YER
            </div>
            <div className="text-xs text-gray-500">
              {formatYER(makingFeeYER)}/g
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
            Total Price
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatYER(grandTotal)} YER
            </div>
            <div className="text-xs text-gray-500">
              {formatYER(totalPerGramYER)}/g
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Prices are indicative and may vary by jeweller. Making charges depend on design complexity.
            Exchange rate: {settings.fxSource === 'official' ? 'CBY Official' : 
                          settings.fxSource === 'market' ? 'Market' : 'Custom'} ({fxRate} USD/YER).
          </span>
        </p>
      </div>
    </div>
  );
}

