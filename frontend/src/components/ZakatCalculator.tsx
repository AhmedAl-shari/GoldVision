/**
 * ZakatCalculator - Islamic Zakat calculation for gold
 * Nisab: 85 grams of gold (24K)
 * Zakat rate: 2.5% of total value if above nisab for 1 lunar year
 */

import { useState, useEffect } from 'react';
import { Calculator, Calendar, Info, Sparkles } from 'lucide-react';
import { useYemenSettings } from '../contexts/YemenSettingsContext';

export default function ZakatCalculator() {
  const { settings, formatPrice } = useYemenSettings();
  const [goldOwned, setGoldOwned] = useState<string>('100');
  const [ownedKarat, setOwnedKarat] = useState<24 | 22 | 21 | 18>(24);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [spotPricePerGram, setSpotPricePerGram] = useState<number>(80); // Example: $80/gram for 24K

  const NISAB_GRAMS = 85; // 85 grams of pure gold (24K)
  const ZAKAT_RATE = 0.025; // 2.5%

  // Convert Gregorian to Hijri (simplified approximation)
  useEffect(() => {
    const today = new Date();
    const hijriYear = Math.floor((today.getFullYear() - 622) * 1.030684);
    const hijriMonth = (today.getMonth() + 1) % 12 || 12;
    const hijriDay = today.getDate();
    setHijriDate(`${hijriDay} / ${hijriMonth} / ${hijriYear + 622}`);
  }, []);

  const goldGrams = parseFloat(goldOwned) || 0;
  
  // Convert owned gold to 24K equivalent
  const karatPurity = {
    24: 1.0,
    22: 22/24,
    21: 21/24,
    18: 18/24
  };
  
  const pureGoldEquivalent = goldGrams * karatPurity[ownedKarat];
  const isAboveNisab = pureGoldEquivalent >= NISAB_GRAMS;
  
  // Calculate Zakat
  const fxRate = settings.effectiveRate || settings.marketRate || 530;
  const totalValueYER = pureGoldEquivalent * spotPricePerGram * fxRate;
  const zakatAmountYER = isAboveNisab ? totalValueYER * ZAKAT_RATE : 0;
  const zakatInGrams = isAboveNisab ? pureGoldEquivalent * ZAKAT_RATE : 0;

  const formatYER = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-6 border-2 border-emerald-200 dark:border-emerald-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
            Zakat Calculator
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Hijri: {hijriDate}
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
            Gold Owned (grams)
          </label>
          <input
            type="number"
            value={goldOwned}
            onChange={(e) => setGoldOwned(e.target.value)}
            className="w-full px-4 py-2 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-emerald-900/30 dark:text-white"
            min="0"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
            Karat Purity
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[24, 22, 21, 18].map((k) => (
              <button
                key={k}
                onClick={() => setOwnedKarat(k as any)}
                className={`px-3 py-2 rounded-lg font-semibold transition ${
                  ownedKarat === k
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700'
                }`}
              >
                {k}K
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nisab Indicator */}
      <div className={`mb-5 p-4 rounded-lg border-2 ${
        isAboveNisab 
          ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600' 
          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className={`w-4 h-4 ${isAboveNisab ? 'text-emerald-700' : 'text-gray-600'}`} />
            <span className="text-sm font-medium">
              {isAboveNisab ? 'Above Nisab ✓' : 'Below Nisab'}
            </span>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Pure gold: {pureGoldEquivalent.toFixed(2)}g / {NISAB_GRAMS}g
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              isAboveNisab ? 'bg-emerald-600' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(100, (pureGoldEquivalent / NISAB_GRAMS) * 100)}%` }}
          />
        </div>
      </div>

      {/* Zakat Results */}
      <div className="space-y-3 pt-4 border-t-2 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-emerald-700 dark:text-emerald-300">
            Total Value:
          </span>
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            {formatYER(totalValueYER)} YER
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-emerald-900 dark:text-emerald-100">
              Zakat Due (2.5%):
            </span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {isAboveNisab ? formatYER(zakatAmountYER) : '0'} YER
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              {isAboveNisab ? `≈ ${zakatInGrams.toFixed(2)}g gold` : 'No Zakat due'}
            </div>
          </div>
        </div>
      </div>

      {/* Islamic Note */}
      <div className="mt-5 pt-4 border-t-2 border-emerald-200 dark:border-emerald-800">
        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
          <Info className="w-3 h-3 inline mr-1" />
          <strong>Note:</strong> Zakat is due if you've owned gold above Nisab (85g pure gold) for one full lunar year.
          Rate: 2.5% of total value. Consult a scholar for specific circumstances. This is for educational purposes.
        </p>
      </div>
    </div>
  );
}

