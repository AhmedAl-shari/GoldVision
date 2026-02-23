/**
 * News-Price Impact Prediction Service
 * Predicts price movement based on breaking news using historical correlation
 */

const axios = require('axios');

class NewsPriceImpactService {
  constructor() {
    // Historical correlation between news events and price movements
    this.impactPatterns = {
      // Central bank & monetary policy
      'fed.*rate.*cut': { avgImpact: +1.8, volatility: 0.5, direction: 'bullish', confidence: 0.85 },
      'fed.*rate.*hike': { avgImpact: -1.2, volatility: 0.4, direction: 'bearish', confidence: 0.80 },
      'interest.*rate.*cut': { avgImpact: +1.5, volatility: 0.6, direction: 'bullish', confidence: 0.75 },
      'interest.*rate.*increase': { avgImpact: -1.0, volatility: 0.5, direction: 'bearish', confidence: 0.75 },
      
      // Geopolitical events
      'war|conflict|tension': { avgImpact: +2.5, volatility: 1.2, direction: 'bullish', confidence: 0.80 },
      'peace.*deal|ceasefire': { avgImpact: -1.0, volatility: 0.8, direction: 'bearish', confidence: 0.65 },
      'sanction': { avgImpact: +1.2, volatility: 0.9, direction: 'bullish', confidence: 0.70 },
      
      // Economic indicators
      'inflation.*surge|inflation.*rise': { avgImpact: +1.6, volatility: 0.6, direction: 'bullish', confidence: 0.80 },
      'inflation.*fall|inflation.*decline': { avgImpact: -0.8, volatility: 0.4, direction: 'bearish', confidence: 0.70 },
      'recession|economic.*crisis': { avgImpact: +2.0, volatility: 1.0, direction: 'bullish', confidence: 0.85 },
      'economic.*growth|gdp.*rise': { avgImpact: -0.5, volatility: 0.3, direction: 'bearish', confidence: 0.60 },
      
      // Market sentiment
      'record.*high|all.*time.*high': { avgImpact: +0.8, volatility: 0.7, direction: 'bullish', confidence: 0.65 },
      'crash|plunge|collapse': { avgImpact: -2.5, volatility: 1.5, direction: 'bearish', confidence: 0.75 },
      'rally|surge|soar': { avgImpact: +1.2, volatility: 0.8, direction: 'bullish', confidence: 0.70 },
      'sell.*off|dump': { avgImpact: -1.5, volatility: 1.0, direction: 'bearish', confidence: 0.70 },
      
      // Dollar strength
      'dollar.*strengthen|dollar.*rally': { avgImpact: -1.3, volatility: 0.6, direction: 'bearish', confidence: 0.75 },
      'dollar.*weaken|dollar.*fall': { avgImpact: +1.4, volatility: 0.6, direction: 'bullish', confidence: 0.75 },
      
      // Central bank gold purchases
      'central.*bank.*buy.*gold': { avgImpact: +1.0, volatility: 0.4, direction: 'bullish', confidence: 0.80 },
      'gold.*reserve.*increase': { avgImpact: +0.9, volatility: 0.4, direction: 'bullish', confidence: 0.75 },
    };
  }

  /**
   * Analyze news headline and predict price impact
   */
  predictImpact(headline, content = '', currentPrice = null) {
    const text = `${headline} ${content}`.toLowerCase();
    const impacts = [];

    // Check each pattern
    for (const [pattern, impact] of Object.entries(this.impactPatterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        impacts.push({
          pattern,
          ...impact,
          matched: true
        });
      }
    }

    if (impacts.length === 0) {
      return {
        hasImpact: false,
        prediction: null
      };
    }

    // Aggregate multiple pattern matches
    const avgImpact = impacts.reduce((sum, i) => sum + i.avgImpact, 0) / impacts.length;
    const maxVolatility = Math.max(...impacts.map(i => i.volatility));
    const dominantDirection = impacts[0].direction;
    const avgConfidence = impacts.reduce((sum, i) => sum + i.confidence, 0) / impacts.length;

    // Calculate predicted price range
    let predictedChange = null;
    let predictedRange = null;
    let timeframe = '24-48 hours';

    if (currentPrice) {
      const lowerChange = avgImpact - maxVolatility;
      const upperChange = avgImpact + maxVolatility;
      
      predictedChange = {
        expected: parseFloat(avgImpact.toFixed(2)),
        lower: parseFloat(lowerChange.toFixed(2)),
        upper: parseFloat(upperChange.toFixed(2))
      };

      predictedRange = {
        expected: parseFloat((currentPrice * (1 + avgImpact / 100)).toFixed(2)),
        lower: parseFloat((currentPrice * (1 + lowerChange / 100)).toFixed(2)),
        upper: parseFloat((currentPrice * (1 + upperChange / 100)).toFixed(2))
      };
    }

    return {
      hasImpact: true,
      prediction: {
        direction: dominantDirection,
        expectedChange: predictedChange,
        priceRange: predictedRange,
        confidence: parseFloat((avgConfidence * 100).toFixed(0)),
        timeframe,
        volatilityExpected: maxVolatility,
        patternsMatched: impacts.length,
        summary: this.generateImpactSummary(avgImpact, dominantDirection, avgConfidence, currentPrice),
        recommendation: this.generateNewsRecommendation(avgImpact, dominantDirection, avgConfidence),
        riskLevel: this.calculateRiskLevel(maxVolatility, avgConfidence)
      }
    };
  }

  /**
   * Generate impact summary
   */
  generateImpactSummary(impact, direction, confidence, currentPrice) {
    const magnitude = Math.abs(impact);
    const moveDirection = direction === 'bullish' ? 'rise' : 'fall';
    
    if (magnitude > 2.0) {
      return `Strong ${direction} signal: Expect ${magnitude.toFixed(1)}% ${moveDirection} (${(confidence * 100).toFixed(0)}% confidence)`;
    } else if (magnitude > 1.0) {
      return `Moderate ${direction} signal: Likely ${magnitude.toFixed(1)}% ${moveDirection} (${(confidence * 100).toFixed(0)}% confidence)`;
    } else {
      return `Mild ${direction} signal: Potential ${magnitude.toFixed(1)}% ${moveDirection} (${(confidence * 100).toFixed(0)}% confidence)`;
    }
  }

  /**
   * Generate recommendation based on news impact
   */
  generateNewsRecommendation(impact, direction, confidence) {
    const magnitude = Math.abs(impact);
    
    if (direction === 'bullish' && magnitude > 1.5 && confidence > 0.75) {
      return 'Consider buying or holding. Strong bullish catalyst detected.';
    } else if (direction === 'bearish' && magnitude > 1.5 && confidence > 0.75) {
      return 'Consider reducing exposure or setting stop-loss. Strong bearish catalyst detected.';
    } else if (magnitude > 1.0) {
      return `Monitor closely. ${direction === 'bullish' ? 'Potential upside' : 'Potential downside'} ahead.`;
    } else {
      return 'Minor impact expected. Continue with current strategy.';
    }
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(volatility, confidence) {
    if (volatility > 1.0 && confidence > 0.8) return 'high';
    if (volatility > 0.6 || confidence > 0.75) return 'medium';
    return 'low';
  }

  /**
   * Batch analyze recent news for market impact
   */
  async analyzeRecentNews(newsArticles, currentPrice) {
    const impacts = [];

    for (const article of newsArticles) {
      const impact = this.predictImpact(
        article.title || article.headline,
        article.description || article.snippet || '',
        currentPrice
      );

      if (impact.hasImpact) {
        impacts.push({
          article: {
            title: article.title || article.headline,
            publishedAt: article.publishedAt || article.date,
            source: article.source
          },
          impact: impact.prediction
        });
      }
    }

    // Sort by expected impact magnitude
    impacts.sort((a, b) => 
      Math.abs(b.impact.expectedChange?.expected || 0) - 
      Math.abs(a.impact.expectedChange?.expected || 0)
    );

    return {
      total: impacts.length,
      impacts: impacts.slice(0, 5), // Top 5 most impactful
      aggregated: this.aggregateImpacts(impacts),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Aggregate multiple news impacts
   */
  aggregateImpacts(impacts) {
    if (impacts.length === 0) {
      return {
        netDirection: 'neutral',
        netImpact: 0,
        confidence: 0
      };
    }

    const bullishCount = impacts.filter(i => i.impact.direction === 'bullish').length;
    const bearishCount = impacts.filter(i => i.impact.direction === 'bearish').length;
    
    const netImpact = impacts.reduce((sum, i) => {
      const change = i.impact.expectedChange?.expected || 0;
      return sum + change;
    }, 0) / impacts.length;

    return {
      netDirection: bullishCount > bearishCount ? 'bullish' : 
                    bearishCount > bullishCount ? 'bearish' : 'neutral',
      netImpact: parseFloat(netImpact.toFixed(2)),
      confidence: parseFloat((impacts.reduce((sum, i) => sum + i.impact.confidence, 0) / impacts.length).toFixed(0)),
      bullishSignals: bullishCount,
      bearishSignals: bearishCount
    };
  }
}

module.exports = new NewsPriceImpactService();

