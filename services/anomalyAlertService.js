/**
 * Anomaly Alert Service
 * Real-time anomaly detection with automatic alert generation
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

class AnomalyAlertService {
  constructor() {
    this.zScoreThreshold = 2.5; // 2.5 standard deviations
    this.lastCheckedPrice = null;
    this.priceHistory = []; // Rolling window for calculations
    this.windowSize = 30; // Use 30-day window for statistics
  }

  /**
   * Detect price anomalies using statistical methods
   */
  detectAnomaly(currentPrice, historicalPrices) {
    if (!historicalPrices || historicalPrices.length < 10) {
      return null;
    }

    // Calculate mean and standard deviation
    const prices = historicalPrices.map(p => parseFloat(p.price));
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    // Calculate z-score for current price
    const zScore = Math.abs((currentPrice - mean) / stdDev);

    // Detect anomaly if z-score exceeds threshold
    if (zScore > this.zScoreThreshold) {
      const severity = zScore > 3.5 ? 'high' : zScore > 3 ? 'medium' : 'low';
      const type = currentPrice > mean ? 'spike' : 'drop';
      const percentChange = ((currentPrice - mean) / mean) * 100;

      return {
        detected: true,
        type,
        severity,
        zScore: parseFloat(zScore.toFixed(2)),
        currentPrice,
        meanPrice: parseFloat(mean.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        percentFromMean: parseFloat(percentChange.toFixed(2)),
        description: this.generateDescription(type, zScore, percentChange),
        recommendation: this.generateRecommendation(type, severity, currentPrice, mean),
        confidence: Math.min(95, Math.max(60, (zScore - 2.5) * 20 + 70))
      };
    }

    return null;
  }

  /**
   * Generate human-readable anomaly description
   */
  generateDescription(type, zScore, percentChange) {
    const direction = type === 'spike' ? 'spike' : 'drop';
    const magnitude = Math.abs(percentChange);
    
    if (zScore > 3.5) {
      return `Extreme ${direction} detected: ${magnitude.toFixed(1)}% ${type === 'spike' ? 'above' : 'below'} 30-day average (${zScore.toFixed(1)}σ event - rare!)`;
    } else if (zScore > 3) {
      return `Significant ${direction} detected: ${magnitude.toFixed(1)}% ${type === 'spike' ? 'above' : 'below'} normal range (${zScore.toFixed(1)}σ event)`;
    } else {
      return `Unusual ${direction}: ${magnitude.toFixed(1)}% ${type === 'spike' ? 'above' : 'below'} 30-day average (${zScore.toFixed(1)}σ)`;
    }
  }

  /**
   * Generate AI recommendation based on anomaly
   */
  generateRecommendation(type, severity, currentPrice, meanPrice) {
    const recommendations = {
      spike_high: `Consider taking profits or setting stop-loss at $${(currentPrice * 0.95).toFixed(2)}. Unusual spikes often mean-revert.`,
      spike_medium: `Monitor closely. Price is significantly above average. Consider reviewing your position.`,
      spike_low: `Slight price elevation detected. Normal market fluctuation, continue monitoring.`,
      drop_high: `Potential buying opportunity if fundamentals unchanged. Price $${(currentPrice - meanPrice).toFixed(2)} below average.`,
      drop_medium: `Price decline detected. Review market news and consider dollar-cost averaging if bullish.`,
      drop_low: `Minor price dip. May present accumulation opportunity for long-term holders.`
    };

    const key = `${type}_${severity}`;
    return recommendations[key] || 'Monitor price movement and review your investment strategy.';
  }

  /**
   * Auto-create alert for detected anomaly
   */
  async createAnomalyAlert(userId, anomaly, asset = 'XAU', currency = 'USD') {
    try {
      // Create alert - MATCH PRISMA SCHEMA!
      const alertData = {
        userId,
        asset,
        currency,
        ruleType: anomaly.type === "spike" ? "price_above" : "price_below",
        threshold: new Prisma.Decimal(anomaly.currentPrice),
        direction: anomaly.type === "spike" ? "above" : "below",
        triggeredAt: new Date(), // ✅ Mark as already triggered
      };

      console.log(`[Anomaly] Creating alert with data:`, alertData);
      const alert = await prisma.alert.create({
        data: alertData
      });

      console.log(`[Anomaly] Auto-created alert ${alert.id} for ${anomaly.type} anomaly (${anomaly.severity} severity)`);
      return alert;

    } catch (error) {
      console.error('[Anomaly] Failed to create auto-alert:', error.message);
      return null;
    }
  }

  /**
   * Check current price for anomalies and auto-create alerts
   */
  async checkAndAlert(currentPrice, asset = 'XAU', currency = 'USD', specificUserId = null) {
    try {
      // Get recent historical prices (30-day window)
      // Note: goldPrice table doesn't have asset/currency columns - it's implicitly XAU/USD
      const historicalPrices = await prisma.goldPrice.findMany({
        orderBy: { ds: 'desc' },
        take: this.windowSize
      });

      if (historicalPrices.length < 10) {
        console.log('[Anomaly] Insufficient historical data for anomaly detection');
        return null;
      }

      // Detect anomaly
      const anomaly = this.detectAnomaly(currentPrice, historicalPrices);

      if (anomaly) {
        console.log(`[Anomaly] Detected ${anomaly.type} anomaly:`, anomaly);

        // Get all active users for anomaly alerts
        const alerts = [];
        const targetUsers = specificUserId
          ? [{ id: specificUserId }]
          : await prisma.user.findMany({
              where: { role: { in: ['user', 'admin'] } },
              select: { id: true },
            });

        for (const user of targetUsers) {
          const threshold = new Prisma.Decimal(anomaly.currentPrice);
          const existingRecent = await prisma.alert.findFirst({
            where: {
              userId: user.id,
              asset,
              currency,
              ruleType: anomaly.type === "spike" ? "price_above" : "price_below",
              threshold,
              createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
          });

          if (existingRecent) {
            console.log(
              `[Anomaly] Recent alert exists for user ${user.id} at ${threshold.toString()}, skipping duplicate`
            );
            continue;
          }

          const alert = await this.createAnomalyAlert(
            user.id,
            anomaly,
            asset,
            currency
          );
          if (alert) alerts.push(alert);
        }

        return {
          anomaly,
          alertsCreated: alerts.length,
          alerts
        };
      }

      return null;

    } catch (error) {
      console.error('[Anomaly] Error in checkAndAlert:', error.message);
      return null;
    }
  }

  /**
   * Analyze price movement velocity (rate of change)
   */
  detectVelocityAnomaly(prices, currentPrice) {
    if (prices.length < 5) return null;

    // Calculate recent velocity (last 3 prices)
    const recentPrices = prices.slice(0, 3).map(p => parseFloat(p.price));
    const velocities = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      velocities.push(recentPrices[i - 1] - recentPrices[i]);
    }

    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    // Check if current velocity is unusual
    if (Math.abs(avgVelocity) > 50) { // $50/day is unusual
      return {
        detected: true,
        velocity: avgVelocity,
        description: `Rapid price ${avgVelocity > 0 ? 'increase' : 'decrease'}: $${Math.abs(avgVelocity).toFixed(2)}/day`,
        type: avgVelocity > 0 ? 'rapid_increase' : 'rapid_decrease',
        severity: Math.abs(avgVelocity) > 100 ? 'high' : Math.abs(avgVelocity) > 75 ? 'medium' : 'low'
      };
    }

    return null;
  }

  /**
   * Get anomaly statistics for reporting
   */
  async getAnomalyStats(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Note: Can't filter by metadata since it doesn't exist in schema
      // Get all triggered alerts in the time period as proxy for anomaly alerts
      const anomalyAlerts = await prisma.alert.findMany({
        where: {
          createdAt: { gte: since },
          triggeredAt: { not: null } // Anomaly alerts are auto-triggered
        },
        orderBy: { createdAt: 'desc' }
      });

      // Note: Since metadata field doesn't exist, we can only provide basic stats
      const stats = {
        total: anomalyAlerts.length,
        byType: {
          spike: anomalyAlerts.filter(a => a.direction === 'above').length,
          drop: anomalyAlerts.filter(a => a.direction === 'below').length
        },
        bySeverity: {
          high: 0,  // Can't determine without metadata
          medium: 0,
          low: anomalyAlerts.length // Assume all are at least low severity
        },
        recent: anomalyAlerts.slice(0, 5).map(a => ({
          id: a.id,
          threshold: a.threshold,
          direction: a.direction,
          createdAt: a.createdAt,
          triggeredAt: a.triggeredAt
        }))
      };

      return stats;
    } catch (error) {
      console.error('[Anomaly] Error getting stats:', error.message);
      return null;
    }
  }
}

module.exports = new AnomalyAlertService();

