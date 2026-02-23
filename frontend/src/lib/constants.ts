/**
 * Shared constants for GoldVision
 */

/**
 * Gold unit conversion factors (in grams)
 */
export const CONVERSION_FACTORS = {
  gram: 1,
  ounce: 31.1034768,
  tola: 11.6638038,
  mithqal: 4.25, // Traditional Islamic unit, approximately 4.25 grams
  kilogram: 1000,
  pound: 453.592,
} as const;

/**
 * Karat purity multipliers (relative to 24K)
 */
export const KARAT_PURITY = {
  24: 1.0,
  22: 22 / 24,
  21: 21 / 24,
  18: 18 / 24,
  14: 14 / 24,
  12: 12 / 24,
  10: 10 / 24,
  9: 9 / 24,
} as const;

/**
 * Common conversion constants (for convenience)
 */
export const GRAMS_PER_OUNCE = CONVERSION_FACTORS.ounce;
export const GRAMS_PER_TOLA = CONVERSION_FACTORS.tola;

