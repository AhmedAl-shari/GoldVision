const axios = require("axios");

class FredProvider {
  constructor() {
    this.apiKey = process.env.FRED_API_KEY;
    this.baseUrl = "https://api.stlouisfed.org/fred";
    this.timeout = 10000;

    // FRED series IDs for key economic indicators
    this.series = {
      DXY: "DTWEXBGS", // Dollar Index
      FED_FUNDS: "FEDFUNDS", // Federal Funds Rate
      CPI: "CPIAUCSL", // Consumer Price Index
      UNEMPLOYMENT: "UNRATE", // Unemployment Rate
      GOLD_PRICE: "GOLDAMGBD228NLBM", // Gold Price (if available)
      GDP: "GDP", // Gross Domestic Product
      INFLATION: "CPILFESL", // Core Inflation
      TREASURY_10Y: "GS10", // 10-Year Treasury Rate
      TREASURY_2Y: "GS2", // 2-Year Treasury Rate
    };
  }

  /**
   * Get the latest observation for a FRED series
   * @param {string} seriesId - FRED series ID
   * @param {number} limit - Number of observations to return (default: 1)
   * @returns {Promise<Object>} Latest observation data
   */
  async getLatestObservation(seriesId, limit = 1) {
    if (!this.apiKey) {
      throw new Error("FRED API key not configured");
    }

    try {
      const response = await axios.get(`${this.baseUrl}/series/observations`, {
        params: {
          series_id: seriesId,
          api_key: this.apiKey,
          file_type: "json",
          limit: limit,
          sort_order: "desc",
          units: "lin",
        },
        timeout: this.timeout,
      });

      if (
        response.data?.observations &&
        response.data.observations.length > 0
      ) {
        return response.data.observations[0];
      }

      return null;
    } catch (error) {
      console.error(`FRED API error for series ${seriesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get DXY (Dollar Index) data
   * @returns {Promise<Object>} DXY data with rate and metadata
   */
  async getDXY() {
    try {
      const observation = await this.getLatestObservation(this.series.DXY);

      if (!observation || observation.value === ".") {
        return null;
      }

      return {
        rate: parseFloat(observation.value),
        date: observation.date,
        source: "FRED",
        series: "DTWEXBGS",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to fetch DXY from FRED:", error.message);
      return null;
    }
  }

  /**
   * Get Federal Funds Rate
   * @returns {Promise<Object>} Fed Funds Rate data
   */
  async getFedFundsRate() {
    try {
      const observation = await this.getLatestObservation(
        this.series.FED_FUNDS
      );

      if (!observation || observation.value === ".") {
        return null;
      }

      return {
        rate: parseFloat(observation.value),
        date: observation.date,
        source: "FRED",
        series: "FEDFUNDS",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to fetch Fed Funds Rate from FRED:", error.message);
      return null;
    }
  }

  /**
   * Get Consumer Price Index (CPI)
   * @returns {Promise<Object>} CPI data
   */
  async getCPI() {
    try {
      const observation = await this.getLatestObservation(this.series.CPI);

      if (!observation || observation.value === ".") {
        return null;
      }

      return {
        value: parseFloat(observation.value),
        date: observation.date,
        source: "FRED",
        series: "CPIAUCSL",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to fetch CPI from FRED:", error.message);
      return null;
    }
  }

  /**
   * Get Unemployment Rate
   * @returns {Promise<Object>} Unemployment rate data
   */
  async getUnemploymentRate() {
    try {
      const observation = await this.getLatestObservation(
        this.series.UNEMPLOYMENT
      );

      if (!observation || observation.value === ".") {
        return null;
      }

      return {
        rate: parseFloat(observation.value),
        date: observation.date,
        source: "FRED",
        series: "UNRATE",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "Failed to fetch Unemployment Rate from FRED:",
        error.message
      );
      return null;
    }
  }

  /**
   * Get Treasury rates (10-year and 2-year)
   * @returns {Promise<Object>} Treasury rates data
   */
  async getTreasuryRates() {
    try {
      const [tenYear, twoYear] = await Promise.all([
        this.getLatestObservation(this.series.TREASURY_10Y),
        this.getLatestObservation(this.series.TREASURY_2Y),
      ]);

      const result = {
        source: "FRED",
        lastUpdated: new Date().toISOString(),
      };

      if (tenYear && tenYear.value !== ".") {
        result.tenYear = {
          rate: parseFloat(tenYear.value),
          date: tenYear.date,
        };
      }

      if (twoYear && twoYear.value !== ".") {
        result.twoYear = {
          rate: parseFloat(twoYear.value),
          date: twoYear.date,
        };
      }

      // Calculate yield curve spread if both rates available
      if (result.tenYear && result.twoYear) {
        result.yieldCurveSpread = result.tenYear.rate - result.twoYear.rate;
      }

      return result;
    } catch (error) {
      console.error("Failed to fetch Treasury rates from FRED:", error.message);
      return null;
    }
  }

  /**
   * Get multiple economic indicators at once
   * @returns {Promise<Object>} Combined economic data
   */
  async getEconomicIndicators() {
    try {
      const [dxy, fedFunds, cpi, unemployment, treasury] = await Promise.all([
        this.getDXY(),
        this.getFedFundsRate(),
        this.getCPI(),
        this.getUnemploymentRate(),
        this.getTreasuryRates(),
      ]);

      return {
        dxy,
        fedFunds,
        cpi,
        unemployment,
        treasury,
        source: "FRED",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "Failed to fetch economic indicators from FRED:",
        error.message
      );
      return null;
    }
  }

  /**
   * Get series information
   * @param {string} seriesId - FRED series ID
   * @returns {Promise<Object>} Series metadata
   */
  async getSeriesInfo(seriesId) {
    if (!this.apiKey) {
      throw new Error("FRED API key not configured");
    }

    try {
      const response = await axios.get(`${this.baseUrl}/series`, {
        params: {
          series_id: seriesId,
          api_key: this.apiKey,
          file_type: "json",
        },
        timeout: this.timeout,
      });

      if (response.data?.seriess && response.data.seriess.length > 0) {
        return response.data.seriess[0];
      }

      return null;
    } catch (error) {
      console.error(
        `FRED API error for series info ${seriesId}:`,
        error.message
      );
      throw error;
    }
  }
}

module.exports = new FredProvider();
