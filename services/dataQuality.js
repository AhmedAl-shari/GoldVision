/**
 * Data Quality Service
 * Validates and cleans price data for improved forecast accuracy
 * Implements outlier detection and data validation
 */

class DataQualityService {
  constructor() {
    this.outlierThreshold = 3.0; // Z-score threshold for outliers
    this.maxPriceChange = 0.15; // Maximum 15% daily change (sanity check)
  }

  /**
   * Detect outliers using Z-score method
   * @param {Array} prices - Array of price values
   * @returns {Array} Array of outlier indices
   */
  detectOutliers(prices) {
    if (!prices || prices.length < 3) return [];

    const priceArray = prices.map(p => parseFloat(p.price || p));
    const mean = priceArray.reduce((a, b) => a + b, 0) / priceArray.length;
    const std = Math.sqrt(
      priceArray.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceArray.length
    );

    if (std === 0) return [];

    const outliers = [];
    for (let i = 0; i < priceArray.length; i++) {
      const zScore = Math.abs((priceArray[i] - mean) / std);
      if (zScore > this.outlierThreshold) {
        outliers.push(i);
      }
    }

    return outliers;
  }

  /**
   * Detect outliers using IQR (Interquartile Range) method
   * @param {Array} prices - Array of price values
   * @returns {Array} Array of outlier indices
   */
  detectOutliersIQR(prices) {
    if (!prices || prices.length < 4) return [];

    const priceArray = prices.map(p => parseFloat(p.price || p)).sort((a, b) => a - b);
    const q1Index = Math.floor(priceArray.length * 0.25);
    const q3Index = Math.floor(priceArray.length * 0.75);
    const q1 = priceArray[q1Index];
    const q3 = priceArray[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = [];
    const originalPrices = prices.map(p => parseFloat(p.price || p));
    
    for (let i = 0; i < originalPrices.length; i++) {
      if (originalPrices[i] < lowerBound || originalPrices[i] > upperBound) {
        outliers.push(i);
      }
    }

    return outliers;
  }

  /**
   * Validate price data
   * @param {Array} prices - Array of price objects or values
   * @returns {Object} Validation result
   */
  validatePrices(prices) {
    if (!prices || prices.length === 0) {
      return {
        valid: false,
        errors: ['No price data provided'],
        cleaned: [],
      };
    }

    const errors = [];
    const cleaned = [];
    const originalIndices = [];

    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      const priceValue = parseFloat(price.price || price);
      
      // Check for invalid values
      if (isNaN(priceValue) || !isFinite(priceValue)) {
        errors.push(`Invalid price at index ${i}: ${priceValue}`);
        continue;
      }

      // Check for negative or zero prices
      if (priceValue <= 0) {
        errors.push(`Invalid price at index ${i}: ${priceValue} (must be positive)`);
        continue;
      }

      // Check for extreme values (sanity check)
      if (priceValue < 100 || priceValue > 10000) {
        errors.push(`Suspicious price at index ${i}: ${priceValue} (outside expected range)`);
        // Don't skip, but flag as suspicious
      }

      // Check for extreme daily changes
      if (i > 0) {
        const prevPrice = parseFloat(cleaned[cleaned.length - 1]?.price || cleaned[cleaned.length - 1]);
        if (prevPrice > 0) {
          const change = Math.abs((priceValue - prevPrice) / prevPrice);
          if (change > this.maxPriceChange) {
            errors.push(`Large price change at index ${i}: ${(change * 100).toFixed(2)}%`);
            // Don't skip, but flag as suspicious
          }
        }
      }

      cleaned.push(typeof price === 'object' ? price : { price: priceValue });
      originalIndices.push(i);
    }

    return {
      valid: errors.length === 0,
      errors,
      cleaned,
      originalIndices,
    };
  }

  /**
   * Clean price data by removing outliers
   * @param {Array} prices - Array of price objects
   * @param {string} method - Outlier detection method ('zscore' or 'iqr')
   * @returns {Object} Cleaned data
   */
  cleanPrices(prices, method = 'zscore') {
    const validation = this.validatePrices(prices);
    
    if (!validation.valid && validation.cleaned.length === 0) {
      return {
        cleaned: [],
        removed: [],
        stats: null,
      };
    }

    const outlierIndices = method === 'iqr' 
      ? this.detectOutliersIQR(validation.cleaned)
      : this.detectOutliers(validation.cleaned);

    // Remove outliers
    const cleaned = [];
    const removed = [];

    for (let i = 0; i < validation.cleaned.length; i++) {
      if (outlierIndices.includes(i)) {
        removed.push({
          index: validation.originalIndices[i],
          price: validation.cleaned[i],
          reason: 'outlier',
        });
      } else {
        cleaned.push(validation.cleaned[i]);
      }
    }

    // Calculate statistics
    const priceValues = cleaned.map(p => parseFloat(p.price || p));
    const stats = {
      count: cleaned.length,
      removed: removed.length,
      mean: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
      min: Math.min(...priceValues),
      max: Math.max(...priceValues),
      std: Math.sqrt(
        priceValues.reduce((sum, price) => {
          const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
          return sum + Math.pow(price - mean, 2);
        }, 0) / priceValues.length
      ),
    };

    return {
      cleaned,
      removed,
      stats,
    };
  }

  /**
   * Fill missing data using interpolation
   * @param {Array} prices - Array of price objects with dates
   * @returns {Array} Prices with missing values filled
   */
  fillMissingData(prices) {
    if (!prices || prices.length < 2) return prices;

    const filled = [];
    
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      const priceValue = parseFloat(price.price || price);

      if (isNaN(priceValue) || !isFinite(priceValue)) {
        // Interpolate from neighbors
        let interpolatedValue = null;

        // Look backward
        for (let j = i - 1; j >= 0; j--) {
          const prevPrice = parseFloat(prices[j].price || prices[j]);
          if (!isNaN(prevPrice) && isFinite(prevPrice)) {
            interpolatedValue = prevPrice;
            break;
          }
        }

        // Look forward if backward didn't work
        if (interpolatedValue === null) {
          for (let j = i + 1; j < prices.length; j++) {
            const nextPrice = parseFloat(prices[j].price || prices[j]);
            if (!isNaN(nextPrice) && isFinite(nextPrice)) {
              interpolatedValue = nextPrice;
              break;
            }
          }
        }

        // Use linear interpolation if we have both neighbors
        if (interpolatedValue === null && i > 0 && i < prices.length - 1) {
          const prevPrice = parseFloat(prices[i - 1].price || prices[i - 1]);
          const nextPrice = parseFloat(prices[i + 1].price || prices[i + 1]);
          if (!isNaN(prevPrice) && !isNaN(nextPrice)) {
            interpolatedValue = (prevPrice + nextPrice) / 2;
          }
        }

        if (interpolatedValue !== null) {
          filled.push({
            ...price,
            price: interpolatedValue,
            _interpolated: true,
          });
        } else {
          // Can't interpolate, skip this point
          continue;
        }
      } else {
        filled.push(price);
      }
    }

    return filled;
  }

  /**
   * Get data quality score (0-100)
   * @param {Array} prices - Array of price objects
   * @returns {number} Quality score
   */
  getQualityScore(prices) {
    if (!prices || prices.length === 0) return 0;

    const validation = this.validatePrices(prices);
    let score = 100;

    // Deduct points for errors
    score -= validation.errors.length * 5;

    // Deduct points for outliers
    const outliers = this.detectOutliers(validation.cleaned);
    score -= outliers.length * 3;

    // Deduct points for missing data
    const missing = validation.cleaned.filter(p => {
      const price = parseFloat(p.price || p);
      return isNaN(price) || !isFinite(price);
    }).length;
    score -= missing * 10;

    // Bonus for sufficient data
    if (validation.cleaned.length >= 30) {
      score += 10;
    } else if (validation.cleaned.length >= 15) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}

module.exports = new DataQualityService();

