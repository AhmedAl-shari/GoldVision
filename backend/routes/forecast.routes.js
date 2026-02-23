/**
 * Forecast Routes
 * Defines all forecast-related endpoints
 */

const express = require("express");
const router = express.Router();

function createForecastRoutes(dependencies) {
  const { forecastController, forecastRateLimit, csrfProtection } = dependencies;

  /**
   * Generate forecast
   * POST /forecast
   */
  router.post(
    "/",
    forecastRateLimit,
    csrfProtection,
    forecastController.generateForecast.bind(forecastController)
  );

  /**
   * Generate enhanced forecast
   * POST /forecast/enhanced
   */
  router.post(
    "/enhanced",
    forecastRateLimit,
    csrfProtection,
    forecastController.generateEnhancedForecast.bind(forecastController)
  );

  /**
   * Clear forecast cache
   * POST /forecast/clear-cache
   */
  router.post(
    "/clear-cache",
    csrfProtection,
    forecastController.clearCache.bind(forecastController)
  );

  /**
   * Get accuracy statistics
   * GET /forecast/accuracy/stats
   */
  router.get(
    "/accuracy/stats",
    forecastController.getAccuracyStats.bind(forecastController)
  );

  return router;
}

module.exports = createForecastRoutes;

