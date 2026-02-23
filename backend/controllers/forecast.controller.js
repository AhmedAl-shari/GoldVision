/**
 * Forecast Controller
 * Handles HTTP requests for forecast endpoints
 */

class ForecastController {
  constructor(forecastService) {
    this.forecastService = forecastService;
  }

  /**
   * Generate forecast
   * POST /forecast
   */
  async generateForecast(req, res) {
    try {
      const result = await this.forecastService.generateForecast(req.body);
      res.json(result);
    } catch (error) {
      console.error("Forecast error:", error);
      const statusCode = error.response?.status || 500;
      res.status(statusCode).json({
        type: "https://tools.ietf.org/html/rfc7231#section-6.6.1",
        title: "Internal Server Error",
        status: statusCode,
        detail: error.message || "Failed to generate forecast",
        instance: req.path,
      });
    }
  }

  /**
   * Generate enhanced forecast
   * POST /forecast/enhanced
   */
  async generateEnhancedForecast(req, res) {
    try {
      // This endpoint logic is already in the service
      // We can reuse generateForecast with use_enhanced=true
      const result = await this.forecastService.generateForecast({
        ...req.body,
        use_enhanced: true,
        use_ensemble: req.body.use_ensemble !== false,
      });
      res.json(result);
    } catch (error) {
      console.error("[Enhanced Forecast] Error:", error.message);
      const statusCode = error.response?.status || 500;
      res.status(statusCode).json({
        success: false,
        type: "https://tools.ietf.org/html/rfc7231#section-6.6.1",
        title: "Internal Server Error",
        status: statusCode,
        detail:
          error.response?.data?.detail ||
          error.message ||
          "Failed to generate enhanced forecast",
        instance: req.path,
      });
    }
  }

  /**
   * Clear forecast cache
   * POST /forecast/clear-cache
   */
  async clearCache(req, res) {
    try {
      this.forecastService.forecastCache.flushAll();
      console.log("[Forecast] Cache manually cleared");
      res.json({ success: true, message: "Forecast cache cleared" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get accuracy statistics
   * GET /forecast/accuracy/stats
   */
  async getAccuracyStats(req, res) {
    try {
      const { asset = "XAU", currency = "USD", days = 30 } = req.query;

      // This would use enhancedForecastLearning service
      // For now, return a placeholder structure
      res.json({
        success: true,
        stats: {
          asset,
          currency,
          days: parseInt(days),
        },
        note: "Full implementation requires enhancedForecastLearning service",
      });
    } catch (error) {
      console.error("[Accuracy Stats] Error:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = ForecastController;

