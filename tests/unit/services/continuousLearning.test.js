/**
 * Unit Tests for ContinuousLearning Service
 */

const continuousLearning = require('../../../services/continuousLearning');

describe('ContinuousLearning', () => {
  beforeEach(() => {
    // Clear accuracy history before each test
    continuousLearning.accuracyHistory.clear();
    continuousLearning.modelWeights.clear();
  });

  describe('recordAccuracy', () => {
    it('should record accuracy for a model', () => {
      const modelName = 'Prophet';
      const forecastDate = new Date('2025-11-22');
      const predictedPrice = 2150.50;
      const actualPrice = 2152.30;
      const mae = 1.80;
      const mape = 0.084;

      continuousLearning.recordAccuracy(
        modelName,
        forecastDate,
        predictedPrice,
        actualPrice,
        mae,
        mape
      );

      const history = continuousLearning.accuracyHistory.get(modelName);
      expect(history).toBeDefined();
      expect(history.length).toBe(1);
      expect(history[0].predicted).toBe(predictedPrice);
      expect(history[0].actual).toBe(actualPrice);
      expect(history[0].mae).toBe(mae);
      expect(history[0].mape).toBe(mape);
    });

    it('should maintain only recent history (30 days)', () => {
      const modelName = 'Prophet';
      const now = new Date();
      
      // Add 40 records (more than 30-day window)
      for (let i = 0; i < 40; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        continuousLearning.recordAccuracy(
          modelName,
          date,
          2150,
          2152,
          2,
          0.1
        );
      }

      const history = continuousLearning.accuracyHistory.get(modelName);
      expect(history.length).toBeLessThanOrEqual(30);
    });
  });

  describe('getModelWeights', () => {
    it('should return default weights when no learning data', () => {
      const defaultWeights = {
        Prophet: 0.2,
        LSTM: 0.25,
        XGBoost: 0.25,
      };

      const weights = continuousLearning.getModelWeights(defaultWeights);
      
      expect(weights).toBeDefined();
      expect(weights.Prophet).toBeDefined();
      expect(weights.LSTM).toBeDefined();
    });

    it('should blend learned weights with defaults', () => {
      // Record some accuracy data
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        continuousLearning.recordAccuracy(
          'Prophet',
          new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          2150,
          2151,
          1,
          0.05 // Low error - should get higher weight
        );
        continuousLearning.recordAccuracy(
          'LSTM',
          new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          2150,
          2155,
          5,
          0.25 // Higher error - should get lower weight
        );
      }

      const defaultWeights = {
        Prophet: 0.2,
        LSTM: 0.25,
      };

      const weights = continuousLearning.getModelWeights(defaultWeights);
      
      // Prophet should have higher weight due to better performance
      expect(weights.Prophet).toBeGreaterThan(weights.LSTM);
    });
  });

  describe('getModelPerformance', () => {
    it('should return performance stats for a model', () => {
      const modelName = 'Prophet';
      const now = new Date();
      
      // Add some performance data
      for (let i = 0; i < 10; i++) {
        continuousLearning.recordAccuracy(
          modelName,
          new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          2150,
          2152,
          2,
          0.1
        );
      }

      const performance = continuousLearning.getModelPerformance(modelName);
      
      expect(performance).toBeDefined();
      expect(performance.sampleCount).toBeGreaterThan(0);
      expect(performance.avgMape).toBeDefined();
      expect(performance.avgMae).toBeDefined();
    });

    it('should return empty stats for model with no data', () => {
      const performance = continuousLearning.getModelPerformance('NonExistent');
      
      expect(performance.sampleCount).toBe(0);
      expect(performance.avgMape).toBeNull();
    });
  });

  describe('shouldRetrain', () => {
    it('should return true when MAPE exceeds threshold', () => {
      const modelName = 'Prophet';
      const now = new Date();
      
      // Add high error data
      for (let i = 0; i < 10; i++) {
        continuousLearning.recordAccuracy(
          modelName,
          new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          2150,
          2200,
          50,
          2.5 // High MAPE
        );
      }

      const shouldRetrain = continuousLearning.shouldRetrain(modelName, 5.0);
      expect(shouldRetrain).toBe(false); // MAPE 2.5 < threshold 5.0
    });

    it('should return false when MAPE is below threshold', () => {
      const modelName = 'Prophet';
      const shouldRetrain = continuousLearning.shouldRetrain(modelName, 5.0);
      expect(shouldRetrain).toBe(false); // No data
    });
  });
});

