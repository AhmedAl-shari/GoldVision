/**
 * Route Index
 * Centralized route registration
 */

const express = require("express");
const router = express.Router();

function registerRoutes(app, dependencies) {
  const {
    prisma,
    spotProvider,
    prophetCircuitBreaker,
    forecastCache,
    featureCollector,
    dataQuality,
    metrics,
    forecastLatencyCold,
    forecastLatencyWarm,
    forecastRateLimit,
    csrfProtection,
    enhancedForecastLearning,
    continuousLearning,
  } = dependencies;

  // Initialize services
  const ForecastService = require("../services/forecast.service");
  const forecastService = new ForecastService({
    prisma,
    spotProvider,
    prophetCircuitBreaker,
    prophetUrl: process.env.PROPHET_URL || "http://localhost:8001",
    forecastCache,
    featureCollector,
    dataQuality,
    metrics,
    forecastLatencyCold,
    forecastLatencyWarm,
  });

  // Initialize controllers
  const ForecastController = require("../controllers/forecast.controller");
  const forecastController = new ForecastController(forecastService);

  // Register forecast routes
  const createForecastRoutes = require("./forecast.routes");
  const forecastRoutes = createForecastRoutes({
    forecastController,
    forecastRateLimit,
    csrfProtection,
  });

  app.use("/forecast", forecastRoutes);

  // Additional forecast endpoints that need the services
  app.post("/forecast/accuracy/track", async (req, res) => {
    try {
      const { forecastId, actualPrice, actualDate } = req.body;

      if (!forecastId || !actualPrice || !actualDate) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: forecastId, actualPrice, actualDate",
        });
      }

      await enhancedForecastLearning.trackAccuracy(
        parseInt(forecastId),
        parseFloat(actualPrice),
        actualDate
      );

      res.json({
        success: true,
        message: "Accuracy tracked successfully",
      });
    } catch (error) {
      console.error("[Accuracy Tracking] Error:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get("/forecast/accuracy/stats", async (req, res) => {
    try {
      const { asset = "XAU", currency = "USD", days = 30 } = req.query;

      const stats = await enhancedForecastLearning.getAccuracyStats(
        asset,
        currency,
        parseInt(days)
      );

      const learningSummary = continuousLearning.getPerformanceSummary();

      res.json({
        success: true,
        stats: stats,
        continuous_learning: learningSummary,
      });
    } catch (error) {
      console.error("[Accuracy Stats] Error:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.post("/forecast/accuracy/track-model", async (req, res) => {
    try {
      const { modelName, forecastDate, predictedPrice, actualPrice, mae, mape } =
        req.body;

      if (!modelName || !forecastDate || predictedPrice === undefined) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: modelName, forecastDate, predictedPrice",
        });
      }

      continuousLearning.recordAccuracy(
        modelName,
        new Date(forecastDate),
        parseFloat(predictedPrice),
        actualPrice ? parseFloat(actualPrice) : null,
        mae ? parseFloat(mae) : null,
        mape ? parseFloat(mape) : null
      );

      res.json({
        success: true,
        message: "Model accuracy recorded for continuous learning",
      });
    } catch (error) {
      console.error("[Model Accuracy Tracking] Error:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get("/forecast/model-weights", async (req, res) => {
    try {
      const defaultWeights = {
        Prophet: 0.2,
        LSTM: 0.25,
        XGBoost: 0.25,
        RandomForest: 0.15,
        ARIMA: 0.1,
        Sentiment: 0.05,
      };

      const weights = continuousLearning.getModelWeights(defaultWeights);
      const performance = continuousLearning.getPerformanceSummary();

      res.json({
        success: true,
        weights: weights,
        performance: performance,
        note: "Weights are dynamically adjusted based on recent model performance",
      });
    } catch (error) {
      console.error("[Model Weights] Error:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  console.log("✅ Forecast routes registered");
}

module.exports = registerRoutes;

