/**
 * Market Recommendation Service
 * Generates daily market summaries and recommendations with bilingual support (English & Arabic)
 */

class MarketRecommendationService {
  constructor() {
    this.regimeDescriptionsEn = {
      bull: "bullish market conditions",
      bear: "bearish market conditions",
      volatile: "highly volatile market conditions",
      stable: "stable market conditions",
    };

    this.regimeDescriptionsAr = {
      bull: "ظروف سوق صاعدة",
      bear: "ظروف سوق هابطة",
      volatile: "ظروف سوق متقلبة للغاية",
      stable: "ظروف سوق مستقرة",
    };

    this.regimeNamesAr = {
      bull: "صاعد",
      bear: "هابط",
      volatile: "متقلب",
      stable: "مستقر",
    };

    this.recommendationAr = {
      buy: "شراء",
      sell: "بيع",
      hold: "الاحتفاظ",
      watch: "المراقبة",
    };
  }

  /**
   * Calculate 24-hour price change
   */
  calculate24hChange(prices) {
    if (!prices || prices.length < 2) return 0;
    const currentPrice = parseFloat(prices[0]?.price || prices[0]);
    const price24hAgo = parseFloat(prices[1]?.price || prices[1]);
    if (!price24hAgo || price24hAgo === 0) return 0;
    return ((currentPrice - price24hAgo) / price24hAgo) * 100;
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(prices) {
    if (!prices || prices.length < 2) return 0;
    const priceValues = prices.map((p) => parseFloat(p.price || p));
    const returns = [];
    for (let i = 1; i < priceValues.length; i++) {
      if (priceValues[i - 1] > 0) {
        returns.push(
          (priceValues[i] - priceValues[i - 1]) / priceValues[i - 1]
        );
      }
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility as percentage
  }

  /**
   * Determine trend direction
   */
  determineTrend(prices) {
    if (!prices || prices.length < 5) return "neutral";
    const priceValues = prices.slice(0, 5).map((p) => parseFloat(p.price || p));
    const first = priceValues[priceValues.length - 1];
    const last = priceValues[0];
    const change = ((last - first) / first) * 100;
    if (change > 0.5) return "up";
    if (change < -0.5) return "down";
    return "neutral";
  }

  /**
   * Generate recommendation based on market data
   */
  generateRecommendation(data) {
    const {
      currentPrice,
      forecast,
      regime,
      confidence,
      priceChange24h,
      technicalIndicators,
    } = data;
    const forecastChange = ((forecast - currentPrice) / currentPrice) * 100;

    let action = "hold";
    let riskLevel = "medium";
    let timeHorizon = "short";

    // Strong buy signal
    if (forecastChange > 2 && confidence > 0.8 && regime === "bull") {
      action = "buy";
      riskLevel = "low";
    }
    // Buy signal
    else if (forecastChange > 1 && confidence > 0.7) {
      action = "buy";
      riskLevel = "medium";
    }
    // Strong sell signal
    else if (forecastChange < -2 && confidence > 0.8 && regime === "bear") {
      action = "sell";
      riskLevel = "low";
    }
    // Sell signal
    else if (forecastChange < -1 && confidence > 0.7) {
      action = "sell";
      riskLevel = "medium";
    }
    // Watch (uncertain)
    else if (confidence < 0.6 || regime === "volatile") {
      action = "watch";
      riskLevel = "high";
    }

    // Adjust time horizon based on confidence and regime
    if (confidence > 0.8 && regime === "stable") {
      timeHorizon = "medium";
    } else if (confidence > 0.85 && regime === "bull") {
      timeHorizon = "long";
    }

    // Calculate confidence boost based on signal strength and market conditions
    let confidenceBoost = 0;

    // Strong buy/sell signals get higher confidence (lowered thresholds for better boost)
    if (Math.abs(forecastChange) > 2.5 && confidence > 0.7) {
      confidenceBoost = 0.1; // +10% boost for very strong signals (>2.5% change)
    } else if (Math.abs(forecastChange) > 2 && confidence > 0.7) {
      confidenceBoost = 0.07; // +7% boost for strong signals (>2% change)
    } else if (
      Math.abs(forecastChange) > 1.5 &&
      confidence > 0.65 &&
      regime === "stable"
    ) {
      confidenceBoost = 0.04; // +4% boost for moderate signals in stable markets
    } else if (Math.abs(forecastChange) > 1 && confidence > 0.65) {
      confidenceBoost = 0.02; // +2% boost for any positive signal
    }

    // Additional boost for stable/bull markets (lowered threshold)
    if (confidence > 0.7 && (regime === "stable" || regime === "bull")) {
      confidenceBoost += 0.03; // +3% additional boost for stable/bull markets
    }

    // Boost for strong model agreement (lowered threshold)
    if (confidence > 0.75) {
      confidenceBoost += 0.03; // +3% for high base confidence
    } else if (confidence > 0.7) {
      confidenceBoost += 0.02; // +2% for moderate-high confidence
    }

    // Extra boost for very strong forecast changes regardless of base confidence
    if (Math.abs(forecastChange) > 3) {
      confidenceBoost += 0.02; // +2% extra for exceptional signals (>3% change)
    }

    // Calculate final confidence (allow up to 100%)
    const finalConfidence = Math.min((confidence + confidenceBoost) * 100, 100);

    return {
      action,
      confidence: finalConfidence,
      riskLevel,
      timeHorizon,
      reasoning: this.generateReasoning(
        action,
        forecastChange,
        regime,
        confidence
      ),
    };
  }

  /**
   * Generate reasoning text
   */
  generateReasoning(action, forecastChange, regime, confidence) {
    const changeText = Math.abs(forecastChange).toFixed(2);
    if (action === "buy") {
      return `Strong upward momentum expected (${changeText}% increase) with ${(
        confidence * 100
      ).toFixed(0)}% confidence`;
    } else if (action === "sell") {
      return `Downward pressure expected (${changeText}% decrease) with ${(
        confidence * 100
      ).toFixed(0)}% confidence`;
    } else if (action === "watch") {
      return `Uncertain market conditions. Monitor closely before making decisions`;
    }
    return `Market conditions suggest holding current position`;
  }

  /**
   * Generate summary text in both English and Arabic
   */
  generateSummaryText(data) {
    const {
      recommendation,
      marketRegime,
      priceChange24h,
      forecastChange,
      confidence,
      keyFeatures,
    } = data;

    // English summary
    const textEn =
      `Today's gold market shows ${this.regimeDescriptionsEn[marketRegime]}. ` +
      `The price has ${
        priceChange24h >= 0 ? "increased" : "decreased"
      } by ${Math.abs(priceChange24h).toFixed(2)}% in the last 24 hours. ` +
      `Our ensemble model predicts a ${
        forecastChange >= 0 ? "rise" : "fall"
      } of ${Math.abs(forecastChange).toFixed(2)}% ` +
      `with ${(confidence * 100).toFixed(0)}% confidence. ` +
      `Based on this analysis, our recommendation is to ${recommendation.action.toUpperCase()}.`;

    // Arabic summary
    const textAr =
      `يظهر سوق الذهب اليوم ${this.regimeDescriptionsAr[marketRegime]}. ` +
      `${priceChange24h >= 0 ? "ارتفع" : "انخفض"} السعر بنسبة ${Math.abs(
        priceChange24h
      ).toFixed(2)}% خلال آخر 24 ساعة. ` +
      `يتوقع نموذجنا المجمع ${
        forecastChange >= 0 ? "ارتفاع" : "انخفاض"
      } بنسبة ${Math.abs(forecastChange).toFixed(2)}% ` +
      `بثقة ${(confidence * 100).toFixed(0)}%. ` +
      `بناءً على هذا التحليل، توصيتنا هي ${
        this.recommendationAr[recommendation.action]
      }.`;

    // Key points in English
    const keyPointsEn = [
      `Market Regime: ${
        marketRegime.charAt(0).toUpperCase() + marketRegime.slice(1)
      }`,
      `24h Change: ${priceChange24h >= 0 ? "+" : ""}${priceChange24h.toFixed(
        2
      )}%`,
      `Forecast Change: ${
        forecastChange >= 0 ? "+" : ""
      }${forecastChange.toFixed(2)}%`,
      `Model Confidence: ${(confidence * 100).toFixed(0)}%`,
      keyFeatures && keyFeatures.length > 0
        ? `Key Driver: ${
            keyFeatures[0].feature_name
          } (${keyFeatures[0].contribution_percent.toFixed(1)}%)`
        : null,
    ].filter(Boolean);

    // Key points in Arabic
    const keyPointsAr = [
      `نظام السوق: ${this.regimeNamesAr[marketRegime]}`,
      `التغيير خلال 24 ساعة: ${
        priceChange24h >= 0 ? "+" : ""
      }${priceChange24h.toFixed(2)}%`,
      `تغيير التوقع: ${forecastChange >= 0 ? "+" : ""}${forecastChange.toFixed(
        2
      )}%`,
      `ثقة النموذج: ${(confidence * 100).toFixed(0)}%`,
      keyFeatures && keyFeatures.length > 0
        ? `المحرك الرئيسي: ${
            keyFeatures[0].feature_name
          } (${keyFeatures[0].contribution_percent.toFixed(1)}%)`
        : null,
    ].filter(Boolean);

    return {
      en: textEn,
      ar: textAr,
      keyPointsEn,
      keyPointsAr,
    };
  }

  /**
   * Generate daily market summary with bilingual support
   */
  async generateDailyMarketSummary(
    asset,
    currency,
    forecastData,
    pricesData,
    technicalData
  ) {
    try {
      const currentPrice = parseFloat(pricesData[0]?.price || pricesData[0]);
      const priceChange24h = this.calculate24hChange(pricesData);
      const marketRegime = forecastData.market_regime || "stable";

      // Get base confidence from ensemble model
      let baseConfidence = forecastData.overall_confidence || 0.75;

      // Boost confidence based on data quality (more data = higher confidence)
      const dataQualityBoost =
        pricesData.length >= 30 ? 0.02 : pricesData.length >= 15 ? 0.01 : 0;
      baseConfidence = Math.min(baseConfidence + dataQualityBoost, 0.98);

      // Boost confidence if individual models show high agreement
      if (
        forecastData.individual_models &&
        forecastData.individual_models.length > 0
      ) {
        const modelConfidences = forecastData.individual_models.map(
          (m) => m.confidence || 0
        );
        const avgModelConfidence =
          modelConfidences.reduce((a, b) => a + b, 0) / modelConfidences.length;
        const confidenceVariance =
          modelConfidences.reduce(
            (sum, c) => sum + Math.pow(c - avgModelConfidence, 2),
            0
          ) / modelConfidences.length;

        // If models agree closely (low variance), boost confidence
        if (confidenceVariance < 0.01 && avgModelConfidence > 0.7) {
          baseConfidence = Math.min(baseConfidence + 0.02, 0.98); // +2% for model agreement
        }
      }

      const confidence = baseConfidence;
      const nextDayForecast =
        forecastData.forecast && forecastData.forecast[0]
          ? parseFloat(forecastData.forecast[0].yhat)
          : currentPrice;

      // Generate recommendation
      const recommendation = this.generateRecommendation({
        currentPrice,
        forecast: nextDayForecast,
        regime: marketRegime,
        confidence,
        priceChange24h,
        technicalIndicators: technicalData,
      });

      // Generate summary text in both languages
      const summary = this.generateSummaryText({
        recommendation,
        marketRegime,
        priceChange24h,
        forecastChange: ((nextDayForecast - currentPrice) / currentPrice) * 100,
        confidence,
        keyFeatures: forecastData.feature_importance?.slice(0, 3),
      });

      return {
        success: true,
        recommendation: recommendation.action,
        confidence: recommendation.confidence,
        summary: {
          en: summary.en,
          ar: summary.ar,
        },
        keyPoints: {
          en: summary.keyPointsEn,
          ar: summary.keyPointsAr,
        },
        riskLevel: recommendation.riskLevel,
        timeHorizon: recommendation.timeHorizon,
        priceTargets: {
          support:
            forecastData.forecast && forecastData.forecast[0]
              ? parseFloat(forecastData.forecast[0].yhat_lower)
              : currentPrice * 0.98,
          target: nextDayForecast,
          resistance:
            forecastData.forecast && forecastData.forecast[0]
              ? parseFloat(forecastData.forecast[0].yhat_upper)
              : currentPrice * 1.02,
        },
        marketContext: {
          regime: marketRegime,
          volatility: this.calculateVolatility(pricesData),
          trend: this.determineTrend(pricesData),
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating market recommendation:", error);
      throw error;
    }
  }
}

module.exports = new MarketRecommendationService();
