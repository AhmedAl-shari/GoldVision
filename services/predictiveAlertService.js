/**
 * Predictive Alert Recommendation Service
 * AI-powered suggestions for optimal alert placement
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

class PredictiveAlertService {
  constructor() {
    this.fibonacciLevels = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
  }

  /**
   * Calculate support and resistance levels using multiple methods
   */
  calculateSupportResistance(prices) {
    if (!prices || prices.length < 20) return { support: [], resistance: [] };

    // Handle both Price table format (Decimal) and GoldPrice format (Float)
    const priceValues = prices.map(p => {
      const price = p.price;
      if (price === null || price === undefined) return null;
      // Handle Prisma Decimal type
      if (typeof price === 'object' && price.toString) {
        return parseFloat(price.toString());
      }
      return typeof price === 'string' ? parseFloat(price) : parseFloat(price);
    }).filter(p => p !== null && !isNaN(p) && p > 0);
    const currentPrice = priceValues[0];

    // Method 1: Recent highs and lows
    const recentPrices = priceValues.slice(0, 30);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);

    // Method 2: Round number levels (psychological)
    const roundLevels = [];
    const baseLevel = Math.floor(currentPrice / 100) * 100;
    for (let i = -2; i <= 2; i++) {
      roundLevels.push(baseLevel + (i * 100));
    }

    // Method 3: Fibonacci retracement levels
    const fibLevels = this.fibonacciLevels.map(level => {
      return low + (high - low) * level;
    });

    // Method 4: Moving averages as dynamic S/R
    const sma20 = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const sma50 = priceValues.slice(0, 50).reduce((a, b) => a + b, 0) / Math.min(50, priceValues.length);

    // Combine and deduplicate levels
    const allLevels = [
      ...roundLevels,
      ...fibLevels,
      high,
      low,
      sma20,
      sma50
    ].filter(level => !isNaN(level) && level > 0);

    // Separate into support and resistance
    const support = allLevels
      .filter(level => level < currentPrice)
      .sort((a, b) => b - a) // Sort descending
      .slice(0, 3) // Top 3 support levels
      .map(level => parseFloat(level.toFixed(2)));

    const resistance = allLevels
      .filter(level => level > currentPrice)
      .sort((a, b) => a - b) // Sort ascending
      .slice(0, 3) // Top 3 resistance levels
      .map(level => parseFloat(level.toFixed(2)));

    return {
      support: [...new Set(support)], // Remove duplicates
      resistance: [...new Set(resistance)],
      current: parseFloat(currentPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      sma20: parseFloat(sma20.toFixed(2)),
      sma50: parseFloat(sma50.toFixed(2))
    };
  }

  /**
   * Calculate Bollinger Band levels for volatility-based alerts
   */
  calculateBollingerLevels(prices, period = 20, multiplier = 2) {
    if (!prices || prices.length < period) return null;

    // Handle both Price table format (Decimal) and GoldPrice format (Float)
    const recentPrices = prices.slice(0, period).map(p => {
      const price = p.price;
      if (price === null || price === undefined) return null;
      // Handle Prisma Decimal type
      if (typeof price === 'object' && price.toString) {
        return parseFloat(price.toString());
      }
      return typeof price === 'string' ? parseFloat(price) : parseFloat(price);
    }).filter(p => p !== null && !isNaN(p) && p > 0);
    const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => 
      sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      middle: parseFloat(sma.toFixed(2)),
      upper: parseFloat((sma + multiplier * stdDev).toFixed(2)),
      lower: parseFloat((sma - multiplier * stdDev).toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2))
    };
  }

  /**
   * Calculate probability of price reaching a level
   */
  calculateReachProbability(currentPrice, targetPrice, volatility, days = 7) {
    // Simplified probability calculation based on distance and volatility
    const distance = Math.abs(targetPrice - currentPrice);
    const expectedMove = volatility * Math.sqrt(days / 252); // Daily vol to multi-day
    
    // Z-score approach
    const zScore = distance / (currentPrice * expectedMove);
    
    // Convert z-score to probability (simplified normal distribution)
    let probability;
    if (zScore < 0.5) probability = 0.85;
    else if (zScore < 1.0) probability = 0.70;
    else if (zScore < 1.5) probability = 0.55;
    else if (zScore < 2.0) probability = 0.35;
    else if (zScore < 2.5) probability = 0.20;
    else probability = 0.10;

    return {
      probability: parseFloat((probability * 100).toFixed(0)),
      expectedDays: Math.ceil(distance / (currentPrice * expectedMove / days)),
      confidence: zScore < 2 ? 'high' : zScore < 3 ? 'medium' : 'low'
    };
  }

  /**
   * Generate AI-powered alert recommendations
   */
  async generateRecommendations(asset = 'XAU', currency = 'USD', userId = null) {
    try {
      let priceData = [];
      
      // Try to get prices from Price table first (if it exists)
      try {
        const prices = await prisma.price.findMany({
          where: {
            asset: asset,
            currency: currency
          },
          orderBy: { ds: 'desc' },
          take: 60
        });
        
        if (prices.length >= 20) {
          priceData = prices;
          console.log(`[Predictive Alerts] Using ${prices.length} records from Price table`);
        }
      } catch (err) {
        // Price table might not exist, continue to fallback
        console.log(`[Predictive Alerts] Price table not available, using fallback`);
      }

      // Fallback to GoldPrice if Price table is empty or doesn't exist
      if (priceData.length < 20) {
        console.log(`[Predictive Alerts] Price table has ${priceData.length} records, falling back to GoldPrice`);
        try {
          // Use Prisma to get all records
          const goldPrices = await prisma.goldPrice.findMany({
            orderBy: { ds: 'desc' },
            take: 60,
            select: { ds: true, price: true }
          });
          
          // Convert to expected format
          const formattedPrices = goldPrices.map(row => ({
            ds: row.ds instanceof Date ? row.ds : new Date(row.ds),
            price: parseFloat(row.price.toString())
          }));
          
          console.log(`[Predictive Alerts] Prisma query found ${formattedPrices.length} GoldPrice records`);
          
          if (formattedPrices.length >= 20) {
            priceData = formattedPrices.map(p => ({ 
              price: p.price,
              ds: p.ds
            }));
            console.log(`[Predictive Alerts] Using ${priceData.length} records from GoldPrice table`);
          } else {
            console.log(`[Predictive Alerts] GoldPrice table has only ${goldPrices.length} records, need at least 20`);
            // If we have some data but not enough, we can still generate basic recommendations
            if (goldPrices.length >= 5) {
              console.log(`[Predictive Alerts] Using limited data (${goldPrices.length} records) for basic recommendations`);
              priceData = goldPrices.map(p => ({ 
                price: p.price,
                ds: p.ds
              }));
            }
          }
        } catch (err) {
          console.error(`[Predictive Alerts] Error fetching GoldPrice:`, err.message);
          // Try Prisma findMany as final fallback
          try {
            const goldPrices = await prisma.goldPrice.findMany({
              take: 100
            });
            goldPrices.sort((a, b) => new Date(b.ds) - new Date(a.ds));
            if (goldPrices.length >= 20) {
              priceData = goldPrices.slice(0, 60).map(p => ({ 
                price: parseFloat(p.price),
                ds: new Date(p.ds)
              }));
              console.log(`[Predictive Alerts] Using ${priceData.length} records from GoldPrice (Prisma fallback)`);
            }
          } catch (err2) {
            console.error(`[Predictive Alerts] Prisma fallback also failed:`, err2.message);
          }
        }
      }

      // If we have no historical data, try to get current spot price and generate basic recommendations
      if (priceData.length < 10) {
        console.log(`[Predictive Alerts] Insufficient historical data (${priceData.length} records), trying to get current spot price`);
        
        try {
          // Try to get latest spot rate from SpotRate table first
          const latestSpot = await prisma.spotRate.findFirst({
            orderBy: { asOf: 'desc' }
          });
          
          if (latestSpot && latestSpot.usdPerOunce) {
            const currentPrice = parseFloat(latestSpot.usdPerOunce.toString());
            console.log(`[Predictive Alerts] Using current spot price from DB: $${currentPrice} for basic recommendations`);
            return this.generateBasicRecommendations(currentPrice);
          }
          
          // Fallback: Get current spot price from API endpoint
          console.log(`[Predictive Alerts] No spot rate in DB, fetching from API`);
          const baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
          const spotResponse = await axios.get(`${baseUrl}/spot`, { timeout: 5000 });
          
          if (spotResponse.data && spotResponse.data.usdPerOunce) {
            const currentPrice = parseFloat(spotResponse.data.usdPerOunce);
            console.log(`[Predictive Alerts] Using current spot price from API: $${currentPrice} for basic recommendations`);
            return this.generateBasicRecommendations(currentPrice);
          }
        } catch (err) {
          console.error(`[Predictive Alerts] Error getting spot rate:`, err.message);
        }
        
        return {
          success: false,
          error: 'Insufficient price data for recommendations',
          details: `Found only ${priceData.length} price records, need at least 10`
        };
      }
      
      // If we have between 10-19 records, we can still generate basic recommendations
      if (priceData.length < 20) {
        console.log(`[Predictive Alerts] Using limited dataset (${priceData.length} records) for basic recommendations`);
      }

      const currentPrice = parseFloat(priceData[0].price);

      // Calculate volatility
      const returns = [];
      for (let i = 1; i < Math.min(30, priceData.length); i++) {
        returns.push((parseFloat(priceData[i-1].price) - parseFloat(priceData[i].price)) / parseFloat(priceData[i].price));
      }
      const volatility = returns.length > 0 
        ? Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length) * Math.sqrt(252)
        : 0.15; // Default volatility if no returns

      // Get S/R levels
      const levels = this.calculateSupportResistance(priceData);
      
      // Get Bollinger levels
      const bollinger = this.calculateBollingerLevels(priceData);

      // Generate recommendations
      const recommendations = [];

      // Resistance alerts (sell/take profit)
      for (const resistance of levels.resistance) {
        const probability = this.calculateReachProbability(currentPrice, resistance, volatility);
        
        recommendations.push({
          type: 'resistance',
          direction: 'above',
          price: resistance,
          reasoning: `Strong resistance at $${resistance} (${((resistance - currentPrice) / currentPrice * 100).toFixed(1)}% above current)`,
          probability: probability.probability,
          expectedDays: probability.expectedDays,
          confidence: probability.confidence,
          action: 'Consider taking profits if price reaches this level',
          priority: probability.probability > 70 ? 'high' : probability.probability > 50 ? 'medium' : 'low'
        });
      }

      // Support alerts (buy/accumulate)
      for (const support of levels.support) {
        const probability = this.calculateReachProbability(currentPrice, support, volatility);
        
        recommendations.push({
          type: 'support',
          direction: 'below',
          price: support,
          reasoning: `Strong support at $${support} (${((currentPrice - support) / currentPrice * 100).toFixed(1)}% below current)`,
          probability: probability.probability,
          expectedDays: probability.expectedDays,
          confidence: probability.confidence,
          action: 'Consider buying if price reaches this level',
          priority: probability.probability > 70 ? 'high' : probability.probability > 50 ? 'medium' : 'low'
        });
      }

      // Bollinger band alerts (volatility-based)
      if (bollinger) {
        recommendations.push({
          type: 'volatility',
          direction: 'above',
          price: bollinger.upper,
          reasoning: `Upper Bollinger Band ($${bollinger.upper}) - overbought signal`,
          probability: 60,
          expectedDays: 3,
          confidence: 'medium',
          action: 'Potential reversal zone - consider taking profits',
          priority: 'medium'
        });

        recommendations.push({
          type: 'volatility',
          direction: 'below',
          price: bollinger.lower,
          reasoning: `Lower Bollinger Band ($${bollinger.lower}) - oversold signal`,
          probability: 60,
          expectedDays: 3,
          confidence: 'medium',
          action: 'Potential buying opportunity - oversold condition',
          priority: 'medium'
        });
      }

      // Sort by priority and probability
      recommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.probability) - (priorityWeight[a.priority] * a.probability);
      });

      return {
        success: true,
        currentPrice,
        recommendations: recommendations.slice(0, 6), // Top 6 recommendations
        levels,
        bollinger,
        volatility: parseFloat((volatility * 100).toFixed(2)),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[Predictive Alerts] Error generating recommendations:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate basic recommendations using only current price
   */
  generateBasicRecommendations(currentPrice) {
    const recommendations = [];
    
    // Round number levels (psychological support/resistance)
    const baseLevel = Math.floor(currentPrice / 100) * 100;
    const levels = [
      baseLevel - 200, // Support 1
      baseLevel - 100, // Support 2
      baseLevel,       // Current level
      baseLevel + 100, // Resistance 1
      baseLevel + 200, // Resistance 2
    ];
    
    // Support alerts
    levels.filter(l => l < currentPrice).forEach(level => {
      const diff = ((currentPrice - level) / currentPrice * 100);
      recommendations.push({
        type: 'support',
        direction: 'below',
        price: level,
        reasoning: `Round number support at $${level} (${diff.toFixed(1)}% below current)`,
        probability: diff < 5 ? 75 : diff < 10 ? 60 : 45,
        expectedDays: Math.ceil(diff / 2),
        confidence: diff < 5 ? 'high' : diff < 10 ? 'medium' : 'low',
        action: 'Consider buying if price reaches this level',
        priority: diff < 5 ? 'high' : diff < 10 ? 'medium' : 'low'
      });
    });
    
    // Resistance alerts
    levels.filter(l => l > currentPrice).forEach(level => {
      const diff = ((level - currentPrice) / currentPrice * 100);
      recommendations.push({
        type: 'resistance',
        direction: 'above',
        price: level,
        reasoning: `Round number resistance at $${level} (${diff.toFixed(1)}% above current)`,
        probability: diff < 5 ? 75 : diff < 10 ? 60 : 45,
        expectedDays: Math.ceil(diff / 2),
        confidence: diff < 5 ? 'high' : diff < 10 ? 'medium' : 'low',
        action: 'Consider taking profits if price reaches this level',
        priority: diff < 5 ? 'high' : diff < 10 ? 'medium' : 'low'
      });
    });
    
    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.probability) - (priorityWeight[a.priority] * a.probability);
    });
    
    return {
      success: true,
      currentPrice,
      recommendations: recommendations.slice(0, 6),
      levels: {
        support: levels.filter(l => l < currentPrice).slice(-3).reverse(),
        resistance: levels.filter(l => l > currentPrice).slice(0, 3),
        current: currentPrice
      },
      bollinger: null,
      volatility: 15.0, // Default volatility
      generatedAt: new Date().toISOString(),
      note: 'Basic recommendations based on current price only'
    };
  }

  /**
   * Auto-create recommended alerts for a user
   */
  async createRecommendedAlerts(userId, recommendations, maxAlerts = 3) {
    const created = [];

    try {
      // Take top N recommendations by priority
      const topRecommendations = recommendations.slice(0, maxAlerts);

      for (const rec of topRecommendations) {
        // Match the actual Prisma schema for Alert model
        const alertData = {
          userId,
          asset: 'XAU',
          currency: 'USD',
          ruleType: rec.direction === 'above' ? 'price_above' : 'price_below', // ✅ Correct field
          threshold: rec.price,
          direction: rec.direction, // ✅ Correct field
          // triggeredAt is optional, leave null for active alerts
        };

        console.log(`[Predictive] Creating alert with data:`, alertData);
        const alert = await prisma.alert.create({ data: alertData });
        created.push(alert);
        console.log(`[Predictive] ✅ Created recommended alert ${alert.id} at $${rec.price} (${rec.direction})`);
      }

      return {
        success: true,
        created: created.length,
        alerts: created
      };

    } catch (error) {
      console.error('[Predictive] Error creating alerts:', error.message);
      return {
        success: false,
        error: error.message,
        created: created.length,
        alerts: created
      };
    }
  }
}

module.exports = new PredictiveAlertService();

