/**
 * Continuous Learning Service
 * Tracks forecast accuracy over time and adapts model weights
 * Implements online learning to improve forecast accuracy
 */

class ContinuousLearning {
  constructor() {
    this.accuracyHistory = new Map(); // model_name -> array of {date, mae, mape, actual, predicted}
    this.modelWeights = new Map(); // model_name -> current weight
    this.performanceWindow = 30; // Days to consider for performance tracking
    this.minSamples = 5; // Minimum samples before adjusting weights
  }

  /**
   * Record forecast accuracy for a model
   * @param {string} modelName - Name of the model
   * @param {Date} forecastDate - Date the forecast was made for
   * @param {number} predictedPrice - Predicted price
   * @param {number} actualPrice - Actual price (when available)
   * @param {number} mae - Mean Absolute Error
   * @param {number} mape - Mean Absolute Percentage Error
   */
  recordAccuracy(modelName, forecastDate, predictedPrice, actualPrice, mae, mape) {
    if (!this.accuracyHistory.has(modelName)) {
      this.accuracyHistory.set(modelName, []);
    }

    const history = this.accuracyHistory.get(modelName);
    history.push({
      date: forecastDate,
      predicted: predictedPrice,
      actual: actualPrice,
      mae: mae,
      mape: mape,
      error: actualPrice ? Math.abs(actualPrice - predictedPrice) : null,
      errorPct: actualPrice ? Math.abs((actualPrice - predictedPrice) / actualPrice) * 100 : null,
    });

    // Keep only recent history
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.performanceWindow);
    
    const filtered = history.filter(h => new Date(h.date) >= cutoffDate);
    this.accuracyHistory.set(modelName, filtered);

    // Update weights if we have enough samples
    if (filtered.length >= this.minSamples) {
      this.updateModelWeights();
    }
  }

  /**
   * Update model weights based on recent performance
   */
  updateModelWeights() {
    const modelPerformances = new Map();

    // Calculate average MAPE for each model
    for (const [modelName, history] of this.accuracyHistory.entries()) {
      if (history.length < this.minSamples) continue;

      const recentHistory = history.slice(-this.performanceWindow);
      const validSamples = recentHistory.filter(h => h.mape !== null && h.mape !== undefined);
      
      if (validSamples.length === 0) continue;

      const avgMape = validSamples.reduce((sum, h) => sum + h.mape, 0) / validSamples.length;
      const avgMae = validSamples.reduce((sum, h) => sum + (h.mae || 0), 0) / validSamples.length;

      modelPerformances.set(modelName, {
        avgMape,
        avgMae,
        sampleCount: validSamples.length,
      });
    }

    if (modelPerformances.size === 0) return;

    // Calculate inverse error weights (lower error = higher weight)
    const weights = new Map();
    let totalInverseError = 0;

    for (const [modelName, perf] of modelPerformances.entries()) {
      // Use inverse MAPE as weight (lower MAPE = higher weight)
      const inverseError = 1.0 / (1.0 + perf.avgMape / 10.0); // Normalize MAPE
      weights.set(modelName, inverseError);
      totalInverseError += inverseError;
    }

    // Normalize weights to sum to 1.0
    if (totalInverseError > 0) {
      for (const [modelName, weight] of weights.entries()) {
        const normalizedWeight = weight / totalInverseError;
        this.modelWeights.set(modelName, normalizedWeight);
      }
    }

    console.log(`[Continuous Learning] Updated model weights:`, 
      Array.from(this.modelWeights.entries()).map(([name, weight]) => 
        `${name}: ${(weight * 100).toFixed(1)}%`
      ).join(', ')
    );
  }

  /**
   * Get current model weights
   * @param {Object} defaultWeights - Default weights to use if no learning data available
   * @returns {Object} Model weights
   */
  getModelWeights(defaultWeights = {}) {
    if (this.modelWeights.size === 0) {
      return defaultWeights;
    }

    const weights = {};
    for (const [modelName, weight] of this.modelWeights.entries()) {
      weights[modelName] = weight;
    }

    // Blend with default weights (70% learned, 30% default) for stability
    const blendedWeights = {};
    const defaultTotal = Object.values(defaultWeights).reduce((a, b) => a + b, 0);
    
    for (const modelName of Object.keys(defaultWeights)) {
      const learnedWeight = weights[modelName] || defaultWeights[modelName];
      const defaultWeight = defaultWeights[modelName] / defaultTotal;
      blendedWeights[modelName] = learnedWeight * 0.7 + defaultWeight * 0.3;
    }

    // Normalize
    const total = Object.values(blendedWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const modelName of Object.keys(blendedWeights)) {
        blendedWeights[modelName] /= total;
      }
    }

    return blendedWeights;
  }

  /**
   * Get performance statistics for a model
   * @param {string} modelName - Name of the model
   * @returns {Object} Performance stats
   */
  getModelPerformance(modelName) {
    const history = this.accuracyHistory.get(modelName) || [];
    
    if (history.length === 0) {
      return {
        sampleCount: 0,
        avgMape: null,
        avgMae: null,
        recentAccuracy: null,
      };
    }

    const recentHistory = history.slice(-this.performanceWindow);
    const validSamples = recentHistory.filter(h => h.mape !== null);

    if (validSamples.length === 0) {
      return {
        sampleCount: 0,
        avgMape: null,
        avgMae: null,
        recentAccuracy: null,
      };
    }

    const avgMape = validSamples.reduce((sum, h) => sum + h.mape, 0) / validSamples.length;
    const avgMae = validSamples.reduce((sum, h) => sum + (h.mae || 0), 0) / validSamples.length;
    const recentAccuracy = 100 - avgMape; // Convert MAPE to accuracy percentage

    return {
      sampleCount: validSamples.length,
      avgMape: avgMape.toFixed(2),
      avgMae: avgMae.toFixed(2),
      recentAccuracy: recentAccuracy.toFixed(2),
      weight: this.modelWeights.get(modelName) || null,
    };
  }

  /**
   * Get performance summary for all models
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const summary = {};
    
    for (const [modelName] of this.accuracyHistory.entries()) {
      summary[modelName] = this.getModelPerformance(modelName);
    }

    return summary;
  }

  /**
   * Check if model should be retrained based on performance degradation
   * @param {string} modelName - Name of the model
   * @param {number} thresholdMape - MAPE threshold for retraining (default 5%)
   * @returns {boolean} Whether model should be retrained
   */
  shouldRetrain(modelName, thresholdMape = 5.0) {
    const perf = this.getModelPerformance(modelName);
    
    if (!perf.avgMape || perf.sampleCount < this.minSamples) {
      return false;
    }

    return parseFloat(perf.avgMape) > thresholdMape;
  }
}

module.exports = new ContinuousLearning();

