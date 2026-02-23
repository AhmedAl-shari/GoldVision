/**
 * Unit Tests for FeatureCollector Service
 */

const featureCollector = require('../../../services/featureCollector');

describe('FeatureCollector', () => {
  describe('calculateTechnicalIndicators', () => {
    it('should calculate RSI correctly', () => {
      const prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113];
      const indicators = featureCollector.calculateTechnicalIndicators(prices);
      
      expect(indicators.rsi).toBeDefined();
      expect(indicators.rsi).toBeGreaterThan(0);
      expect(indicators.rsi).toBeLessThan(100);
    });

    it('should calculate MACD correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
      const indicators = featureCollector.calculateTechnicalIndicators(prices);
      
      expect(indicators.macd).toBeDefined();
      expect(typeof indicators.macd).toBe('number');
    });

    it('should calculate moving averages', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
      const indicators = featureCollector.calculateTechnicalIndicators(prices);
      
      expect(indicators.sma20).toBeDefined();
      expect(indicators.sma50).toBeDefined();
      expect(indicators.sma20).toBeGreaterThan(0);
      expect(indicators.sma50).toBeGreaterThan(0);
    });

    it('should calculate volatility', () => {
      const prices = [100, 102, 98, 105, 103, 107, 101, 109];
      const indicators = featureCollector.calculateTechnicalIndicators(prices);
      
      expect(indicators.volatility).toBeDefined();
      expect(indicators.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should handle insufficient data gracefully', () => {
      const prices = [100, 102];
      const indicators = featureCollector.calculateTechnicalIndicators(prices);
      
      expect(indicators.rsi).toBe(50); // Default value
      expect(indicators.macd).toBe(0); // Default value
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average', () => {
      const values = [100, 102, 101, 103, 105];
      const ema = featureCollector.calculateEMA(values, 3);
      
      expect(ema).toBeDefined();
      expect(ema.length).toBe(values.length);
      expect(ema[0]).toBe(values[0]); // First value is the same
    });
  });

  describe('formatForEnhancedForecast', () => {
    it('should format features correctly for API', () => {
      const features = [
        {
          ds: '2025-11-22',
          dxy: 105.5,
          btc_price: 45000,
          oil_price: 75.5,
          volatility: 0.15,
          rsi: 65,
          macd: 2.5,
          sentiment_score: 0.3
        }
      ];

      const formatted = featureCollector.formatForEnhancedForecast(features);
      
      expect(formatted).toBeDefined();
      expect(formatted.length).toBe(1);
      expect(formatted[0]).toHaveProperty('ds');
      expect(formatted[0]).toHaveProperty('dxy');
      expect(formatted[0]).toHaveProperty('volatility');
      expect(formatted[0]).toHaveProperty('rsi');
    });

    it('should handle null values', () => {
      const features = [
        {
          ds: '2025-11-22',
          dxy: null,
          btc_price: null,
          sentiment_score: null
        }
      ];

      const formatted = featureCollector.formatForEnhancedForecast(features);
      
      expect(formatted[0].dxy).toBeNull();
      expect(formatted[0].btc_price).toBeNull();
    });
  });
});

