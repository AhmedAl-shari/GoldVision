/**
 * Enhanced Forecast Learning Service
 * Handles continuous model retraining, drift detection, and accuracy tracking
 */

const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

class EnhancedForecastLearning {
  constructor() {
    this.prisma = new PrismaClient();
    this.retrainInterval = null;
    this.lastRetrainTime = null;
    this.accuracyHistory = [];
  }

  /**
   * Track forecast accuracy by comparing predictions with actual prices
   */
  async trackAccuracy(forecastId, actualPrice, actualDate) {
    try {
      // Find the forecast record
      const forecast = await this.prisma.enhancedForecast.findUnique({
        where: { id: forecastId },
        include: {
          enhancedForecastModels: true,
        },
      });

      if (!forecast) {
        console.warn(`Forecast ${forecastId} not found for accuracy tracking`);
        return;
      }

      // Calculate error metrics
      const predictedPrice = parseFloat(forecast.ensembleYhat);
      const error = Math.abs(predictedPrice - actualPrice);
      const errorPercent = (error / actualPrice) * 100;

      // Store accuracy record
      await this.prisma.forecastAccuracy.create({
        data: {
          asset: forecast.asset,
          currency: forecast.currency,
          forecastDate: forecast.generatedAt,
          actualDate: new Date(actualDate),
          predictedPrice: predictedPrice,
          actualPrice: actualPrice,
          error: error,
          errorPercent: errorPercent,
          modelVersion: forecast.modelVersion,
        },
      });

      console.log(
        `[Learning] Tracked accuracy for forecast ${forecastId}: ${errorPercent.toFixed(2)}% error`
      );

      // Check if retraining is needed based on accuracy degradation
      await this.checkRetrainNeeded(forecast.asset, forecast.currency);
      
      // Also check for model drift
      await this.detectDrift(forecast.asset, forecast.currency);
    } catch (error) {
      console.error("[Learning] Error tracking accuracy:", error.message);
    }
  }

  /**
   * Check if model retraining is needed based on accuracy metrics
   */
  async checkRetrainNeeded(asset, currency) {
    try {
      // Get recent accuracy records (last 30 days)
      const recentAccuracy = await this.prisma.forecastAccuracy.findMany({
        where: {
          asset: asset,
          currency: currency,
          forecastDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          forecastDate: "desc",
        },
        take: 50,
      });

      if (recentAccuracy.length < 10) {
        // Not enough data yet
        return false;
      }

      // Calculate average error
      const avgError = recentAccuracy.reduce(
        (sum, acc) => sum + acc.errorPercent,
        0
      ) / recentAccuracy.length;

      // Check if error is above threshold (15%)
      if (avgError > 15) {
        console.log(
          `[Learning] High error detected (${avgError.toFixed(2)}%), requesting retrain`
        );
        await this.requestRetrain(
          asset,
          currency,
          `High prediction error: ${avgError.toFixed(2)}%`
        );
        return true;
      }

      // Check for accuracy degradation trend
      const recent10 = recentAccuracy.slice(0, 10);
      const older10 = recentAccuracy.slice(10, 20);

      if (older10.length >= 10) {
        const recentAvg = recent10.reduce(
          (sum, acc) => sum + acc.errorPercent,
          0
        ) / recent10.length;
        const olderAvg = older10.reduce(
          (sum, acc) => sum + acc.errorPercent,
          0
        ) / older10.length;

        // If error increased by more than 20%
        if (recentAvg > olderAvg * 1.2) {
          console.log(
            `[Learning] Accuracy degradation detected (${olderAvg.toFixed(2)}% -> ${recentAvg.toFixed(2)}%), requesting retrain`
          );
          await this.requestRetrain(
            asset,
            currency,
            `Accuracy degradation: ${olderAvg.toFixed(2)}% -> ${recentAvg.toFixed(2)}%`
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[Learning] Error checking retrain need:", error.message);
      return false;
    }
  }

  /**
   * Detect model drift by comparing recent predictions with actuals
   */
  async detectDrift(asset, currency) {
    try {
      const recentAccuracy = await this.prisma.forecastAccuracy.findMany({
        where: {
          asset: asset,
          currency: currency,
          forecastDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: {
          forecastDate: "desc",
        },
        take: 20,
      });

      if (recentAccuracy.length < 10) {
        return { driftDetected: false, reason: "Insufficient data" };
      }

      // Calculate moving average error
      const errors = recentAccuracy.map((r) => r.errorPercent);
      const recentAvg = errors.slice(0, 10).reduce((sum, e) => sum + e, 0) / 10;
      const olderAvg = errors.slice(10, 20).reduce((sum, e) => sum + e, 0) / 10;

      // Drift detected if error increased significantly
      if (recentAvg > olderAvg * 1.3) {
        await this.requestRetrain(
          asset,
          currency,
          `Model drift detected: error increased from ${olderAvg.toFixed(2)}% to ${recentAvg.toFixed(2)}%`
        );
        return { driftDetected: true, recentAvg, olderAvg };
      }

      return { driftDetected: false, recentAvg, olderAvg };
    } catch (error) {
      console.error("[Learning] Error detecting drift:", error.message);
      return { driftDetected: false, reason: error.message };
    }
  }

  /**
   * Request model retraining
   */
  async requestRetrain(asset, currency, reason) {
    try {
      // Create retrain ticket
      await this.prisma.retrainTicket.create({
        data: {
          requestedAt: new Date(),
          reason: reason,
          status: "pending",
          requestedBy: 0, // System
        },
      });

      console.log(`[Learning] Retrain requested: ${reason}`);
    } catch (error) {
      console.error("[Learning] Error requesting retrain:", error.message);
    }
  }

  /**
   * Process pending retrain tickets
   */
  async processRetrainTickets() {
    try {
      const pendingTickets = await this.prisma.retrainTicket.findMany({
        where: {
          status: "pending",
        },
        orderBy: {
          requestedAt: "asc",
        },
        take: 1, // Process one at a time
      });

      for (const ticket of pendingTickets) {
        try {
          // Update status to in_progress
          await this.prisma.retrainTicket.update({
            where: { id: ticket.id },
            data: { status: "in_progress" },
          });

          console.log(`[Learning] Processing retrain ticket ${ticket.id}`);

          // Trigger retrain by calling forecast endpoint with force_cold
          // This will force a fresh model training
          const response = await axios.post(
            `${process.env.API_BASE_URL || "http://localhost:3000"}/forecast/enhanced`,
            {
              asset: "XAU",
              currency: "USD",
              horizon_days: 7,
              force_cold: true,
            },
            {
              timeout: 60000, // 60 second timeout for retraining
            }
          );

          if (response.data.success) {
            // Mark as completed
            await this.prisma.retrainTicket.update({
              where: { id: ticket.id },
              data: {
                status: "completed",
                completedAt: new Date(),
                notes: "Model retrained successfully",
              },
            });

            console.log(`[Learning] Retrain ticket ${ticket.id} completed`);
          }
        } catch (error) {
          console.error(
            `[Learning] Error processing retrain ticket ${ticket.id}:`,
            error.message
          );

          // Mark as failed
          await this.prisma.retrainTicket.update({
            where: { id: ticket.id },
            data: {
              status: "failed",
              notes: `Error: ${error.message}`,
            },
          });
        }
      }
    } catch (error) {
      console.error("[Learning] Error processing retrain tickets:", error.message);
    }
  }

  /**
   * Start continuous learning system
   */
  startContinuousLearning(intervalMinutes = 360) {
    // Process retrain tickets every interval
    this.retrainInterval = setInterval(() => {
      this.processRetrainTickets();
    }, intervalMinutes * 60 * 1000);

    // Process immediately on start
    this.processRetrainTickets();

    console.log(
      `[Learning] Continuous learning started (checking every ${intervalMinutes} minutes)`
    );
  }

  /**
   * Stop continuous learning system
   */
  stopContinuousLearning() {
    if (this.retrainInterval) {
      clearInterval(this.retrainInterval);
      this.retrainInterval = null;
      console.log("[Learning] Continuous learning stopped");
    }
  }

  /**
   * Get accuracy statistics
   */
  async getAccuracyStats(asset, currency, days = 30) {
    try {
      const accuracyRecords = await this.prisma.forecastAccuracy.findMany({
        where: {
          asset: asset,
          currency: currency,
          forecastDate: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          forecastDate: "desc",
        },
      });

      if (accuracyRecords.length === 0) {
        return {
          count: 0,
          avgError: 0,
          avgErrorPercent: 0,
          bestAccuracy: 0,
          worstAccuracy: 0,
        };
      }

      const errors = accuracyRecords.map((r) => r.errorPercent);
      const avgError = accuracyRecords.reduce((sum, r) => sum + r.error, 0) / accuracyRecords.length;
      const avgErrorPercent = errors.reduce((sum, e) => sum + e, 0) / errors.length;
      const bestAccuracy = 100 - Math.max(...errors);
      const worstAccuracy = 100 - Math.min(...errors);

      return {
        count: accuracyRecords.length,
        avgError: avgError,
        avgErrorPercent: avgErrorPercent,
        bestAccuracy: bestAccuracy,
        worstAccuracy: worstAccuracy,
        records: accuracyRecords,
      };
    } catch (error) {
      console.error("[Learning] Error getting accuracy stats:", error.message);
      return null;
    }
  }
}

module.exports = new EnhancedForecastLearning();

