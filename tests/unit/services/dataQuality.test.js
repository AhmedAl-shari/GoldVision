/**
 * Unit Tests for DataQuality Service
 */

const dataQuality = require('../../../services/dataQuality');

describe('DataQuality', () => {
  describe('detectOutliers', () => {
    it('should detect outliers using Z-score', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 1000 }, // Outlier
        { price: 103 },
        { price: 105 }
      ];

      const outliers = dataQuality.detectOutliers(prices);
      
      expect(outliers).toBeDefined();
      expect(Array.isArray(outliers)).toBe(true);
      // Index 2 should be detected as outlier
      expect(outliers).toContain(2);
    });

    it('should return empty array when no outliers', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 101 },
        { price: 103 }
      ];

      const outliers = dataQuality.detectOutliers(prices);
      expect(outliers.length).toBe(0);
    });
  });

  describe('detectOutliersIQR', () => {
    it('should detect outliers using IQR method', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 101 },
        { price: 200 }, // Outlier
        { price: 103 },
        { price: 105 }
      ];

      const outliers = dataQuality.detectOutliersIQR(prices);
      
      expect(outliers).toBeDefined();
      expect(Array.isArray(outliers)).toBe(true);
    });
  });

  describe('validatePrices', () => {
    it('should validate correct price data', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 101 }
      ];

      const validation = dataQuality.validatePrices(prices);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.cleaned.length).toBe(3);
    });

    it('should detect invalid prices', () => {
      const prices = [
        { price: 100 },
        { price: -50 }, // Invalid: negative
        { price: NaN }, // Invalid: NaN
        { price: 103 }
      ];

      const validation = dataQuality.validatePrices(prices);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const validation = dataQuality.validatePrices([]);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No price data provided');
    });
  });

  describe('cleanPrices', () => {
    it('should remove outliers from price data', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 1000 }, // Outlier
        { price: 103 },
        { price: 105 }
      ];

      const cleaned = dataQuality.cleanPrices(prices);
      
      expect(cleaned.cleaned.length).toBeLessThan(prices.length);
      expect(cleaned.removed.length).toBeGreaterThan(0);
      expect(cleaned.stats).toBeDefined();
    });

    it('should calculate statistics', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 101 },
        { price: 103 }
      ];

      const cleaned = dataQuality.cleanPrices(prices);
      
      expect(cleaned.stats).toBeDefined();
      expect(cleaned.stats.mean).toBeGreaterThan(0);
      expect(cleaned.stats.min).toBeDefined();
      expect(cleaned.stats.max).toBeDefined();
    });
  });

  describe('fillMissingData', () => {
    it('should fill missing data using interpolation', () => {
      const prices = [
        { price: 100 },
        { price: NaN }, // Missing
        { price: 103 },
        { price: 105 }
      ];

      const filled = dataQuality.fillMissingData(prices);
      
      expect(filled.length).toBeGreaterThanOrEqual(3);
      // Check that NaN values are filled
      const hasNaN = filled.some(p => isNaN(parseFloat(p.price || p)));
      expect(hasNaN).toBe(false);
    });

    it('should handle all valid data', () => {
      const prices = [
        { price: 100 },
        { price: 102 },
        { price: 101 }
      ];

      const filled = dataQuality.fillMissingData(prices);
      expect(filled.length).toBe(prices.length);
    });
  });

  describe('getQualityScore', () => {
    it('should return high score for good data', () => {
      const prices = Array.from({ length: 30 }, (_, i) => ({
        price: 100 + i * 0.5
      }));

      const score = dataQuality.getQualityScore(prices);
      
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return low score for bad data', () => {
      const prices = [
        { price: 100 },
        { price: NaN },
        { price: -50 },
        { price: 1000 } // Outlier
      ];

      const score = dataQuality.getQualityScore(prices);
      
      expect(score).toBeLessThan(50);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for empty data', () => {
      const score = dataQuality.getQualityScore([]);
      expect(score).toBe(0);
    });
  });
});

