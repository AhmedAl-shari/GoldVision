const natural = require("natural");

class SentimentAnalyzer {
  constructor() {
    // Use a simpler sentiment analysis approach
    this.positiveWords = new Set([
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "positive",
      "bullish",
      "surge",
      "rally",
      "gain",
      "rise",
      "increase",
      "growth",
      "strong",
      "robust",
      "optimistic",
      "confident",
      "recovery",
      "rebound",
      "breakthrough",
      "momentum",
      "uptrend",
      "support",
      "resistance",
      "up",
      "higher",
      "better",
    ]);

    this.negativeWords = new Set([
      "bad",
      "terrible",
      "awful",
      "horrible",
      "negative",
      "bearish",
      "crash",
      "plunge",
      "fall",
      "decline",
      "drop",
      "loss",
      "weak",
      "fragile",
      "pessimistic",
      "concerned",
      "volatile",
      "uncertain",
      "breakdown",
      "downtrend",
      "pressure",
      "risk",
      "down",
      "lower",
      "worse",
    ]);

    this.neutralWords = new Set([
      "okay",
      "fine",
      "average",
      "normal",
      "stable",
      "flat",
      "sideways",
      "consolidation",
      "range",
      "neutral",
      "moderate",
      "balanced",
      "steady",
      "unchanged",
      "maintain",
      "same",
    ]);

    // Custom sentiment lexicon for financial context
    this.financialLexicon = {
      positive: [
        "bullish",
        "surge",
        "rally",
        "gain",
        "rise",
        "increase",
        "growth",
        "strong",
        "robust",
        "optimistic",
        "confident",
        "recovery",
        "rebound",
        "breakthrough",
        "momentum",
        "uptrend",
        "support",
        "resistance",
        "صاعد",
        "قوي",
        "نمو",
        "زيادة",
        "انتعاش",
        "تعافي",
        "متفائل",
      ],
      negative: [
        "bearish",
        "crash",
        "plunge",
        "fall",
        "decline",
        "drop",
        "loss",
        "weak",
        "fragile",
        "pessimistic",
        "concerned",
        "volatile",
        "uncertain",
        "breakdown",
        "downtrend",
        "resistance",
        "pressure",
        "risk",
        "هابط",
        "ضعيف",
        "انخفاض",
        "خسارة",
        "مقلق",
        "متقلب",
        "غير مؤكد",
      ],
      neutral: [
        "stable",
        "flat",
        "sideways",
        "consolidation",
        "range",
        "neutral",
        "moderate",
        "balanced",
        "steady",
        "unchanged",
        "maintain",
        "مستقر",
        "ثابت",
        "متوازن",
        "معتدل",
        "غير متغير",
      ],
    };

    // Market sentiment indicators
    this.marketIndicators = {
      fear: [
        "fear",
        "panic",
        "sell-off",
        "crash",
        "bear market",
        "خوف",
        "ذعر",
        "بيع",
      ],
      greed: [
        "greed",
        "euphoria",
        "buying",
        "rally",
        "bull market",
        "جشع",
        "ابتهاج",
        "شراء",
      ],
      uncertainty: [
        "uncertain",
        "volatile",
        "choppy",
        "mixed",
        "unclear",
        "غير مؤكد",
        "متقلب",
        "مختلط",
      ],
    };
  }

  // Analyze sentiment of user message
  analyzeUserSentiment(message) {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(message.toLowerCase());
    const stems = tokens.map((token) => natural.PorterStemmer.stem(token));

    // Simple sentiment analysis using word sets
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const token of tokens) {
      if (this.positiveWords.has(token)) {
        positiveCount++;
      } else if (this.negativeWords.has(token)) {
        negativeCount++;
      } else if (this.neutralWords.has(token)) {
        neutralCount++;
      }
    }

    // Calculate sentiment score
    const totalWords = tokens.length;
    const sentiment = (positiveCount - negativeCount) / Math.max(totalWords, 1);

    // Determine sentiment category
    let category = "neutral";
    let confidence = Math.abs(sentiment);

    if (sentiment > 0.1) {
      category = "positive";
    } else if (sentiment < -0.1) {
      category = "negative";
    }

    // Check for financial context
    const financialContext = this.analyzeFinancialContext(message);

    return {
      sentiment: category,
      score: sentiment,
      confidence: confidence,
      financialContext: financialContext,
      tokens: tokens,
      analysis: this.getDetailedAnalysis(sentiment, financialContext),
    };
  }

  // Analyze market sentiment from news/analysis
  analyzeMarketSentiment(content) {
    const text = content.toLowerCase();
    let sentiment = 0;
    let indicators = [];

    // Check for positive indicators
    for (const word of this.financialLexicon.positive) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        sentiment += matches.length * 0.3;
        indicators.push({ word, type: "positive", count: matches.length });
      }
    }

    // Check for negative indicators
    for (const word of this.financialLexicon.negative) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        sentiment -= matches.length * 0.3;
        indicators.push({ word, type: "negative", count: matches.length });
      }
    }

    // Check for market indicators
    for (const [indicator, words] of Object.entries(this.marketIndicators)) {
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        if (regex.test(text)) {
          indicators.push({
            word,
            type: "market_indicator",
            category: indicator,
          });
        }
      }
    }

    // Normalize sentiment
    sentiment = Math.max(-1, Math.min(1, sentiment));

    let category = "neutral";
    if (sentiment > 0.2) category = "bullish";
    else if (sentiment < -0.2) category = "bearish";

    return {
      sentiment: category,
      score: sentiment,
      confidence: Math.abs(sentiment),
      indicators: indicators,
      analysis: this.getMarketAnalysis(sentiment, indicators),
    };
  }

  // Analyze financial context
  analyzeFinancialContext(message) {
    const text = message.toLowerCase();
    const context = {
      urgency: "normal",
      riskLevel: "moderate",
      timeframe: "short",
      complexity: "intermediate",
    };

    // Check urgency
    if (/\b(urgent|asap|immediately|quick|fast)\b/.test(text)) {
      context.urgency = "high";
    } else if (/\b(no rush|whenever|eventually)\b/.test(text)) {
      context.urgency = "low";
    }

    // Check risk level
    if (/\b(risky|dangerous|volatile|uncertain)\b/.test(text)) {
      context.riskLevel = "high";
    } else if (/\b(safe|stable|conservative|secure)\b/.test(text)) {
      context.riskLevel = "low";
    }

    // Check timeframe
    if (/\b(long term|years|decades)\b/.test(text)) {
      context.timeframe = "long";
    } else if (/\b(months|quarters)\b/.test(text)) {
      context.timeframe = "medium";
    } else if (/\b(days|weeks|short term)\b/.test(text)) {
      context.timeframe = "short";
    }

    // Check complexity
    if (/\b(complex|advanced|sophisticated|detailed)\b/.test(text)) {
      context.complexity = "advanced";
    } else if (/\b(simple|basic|easy|quick)\b/.test(text)) {
      context.complexity = "basic";
    }

    return context;
  }

  // Get detailed sentiment analysis
  getDetailedAnalysis(sentiment, financialContext) {
    const analysis = {
      emotionalState: "neutral",
      confidenceLevel: "moderate",
      riskTolerance: "moderate",
      investmentStyle: "balanced",
    };

    // Determine emotional state
    if (sentiment > 0.3) {
      analysis.emotionalState = "optimistic";
      analysis.confidenceLevel = "high";
    } else if (sentiment < -0.3) {
      analysis.emotionalState = "concerned";
      analysis.confidenceLevel = "low";
    }

    // Determine risk tolerance based on context
    if (financialContext.riskLevel === "high") {
      analysis.riskTolerance = "aggressive";
      analysis.investmentStyle = "growth";
    } else if (financialContext.riskLevel === "low") {
      analysis.riskTolerance = "conservative";
      analysis.investmentStyle = "value";
    }

    return analysis;
  }

  // Get market sentiment analysis
  getMarketAnalysis(sentiment, indicators) {
    const analysis = {
      marketMood: "neutral",
      trendDirection: "sideways",
      volatilityLevel: "moderate",
      keyDrivers: [],
    };

    // Determine market mood
    if (sentiment > 0.3) {
      analysis.marketMood = "optimistic";
      analysis.trendDirection = "upward";
    } else if (sentiment < -0.3) {
      analysis.marketMood = "pessimistic";
      analysis.trendDirection = "downward";
    }

    // Analyze volatility
    const volatilityIndicators = indicators.filter(
      (ind) => ind.type === "market_indicator" && ind.category === "uncertainty"
    );

    if (volatilityIndicators.length > 2) {
      analysis.volatilityLevel = "high";
    } else if (volatilityIndicators.length === 0) {
      analysis.volatilityLevel = "low";
    }

    // Extract key drivers
    analysis.keyDrivers = indicators
      .filter((ind) => ind.count > 1)
      .map((ind) => ind.word);

    return analysis;
  }

  // Analyze conversation sentiment over time
  analyzeConversationSentiment(messages) {
    if (!messages || messages.length === 0) {
      return { overall: "neutral", trend: "stable", confidence: 0 };
    }

    const sentiments = messages.map((msg) =>
      this.analyzeUserSentiment(msg.content)
    );
    const scores = sentiments.map((s) => s.score);

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const trend = this.calculateTrend(scores);

    let overall = "neutral";
    if (averageScore > 0.1) overall = "positive";
    else if (averageScore < -0.1) overall = "negative";

    return {
      overall,
      averageScore,
      trend,
      confidence: Math.abs(averageScore),
      recentSentiment: sentiments.slice(-3).map((s) => s.sentiment),
    };
  }

  // Calculate sentiment trend
  calculateTrend(scores) {
    if (scores.length < 2) return "stable";

    const recent = scores.slice(-3);
    const earlier = scores.slice(0, -3);

    if (recent.length === 0 || earlier.length === 0) return "stable";

    const recentAvg =
      recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const earlierAvg =
      earlier.reduce((sum, score) => sum + score, 0) / earlier.length;

    const difference = recentAvg - earlierAvg;

    if (difference > 0.1) return "improving";
    else if (difference < -0.1) return "declining";
    else return "stable";
  }

  // Get sentiment-based response suggestions
  getResponseSuggestions(sentiment, context) {
    const suggestions = {
      positive: [
        "That's great to hear! Let me provide some additional insights.",
        "I'm glad you're optimistic about the market. Here's what I found:",
        "Your positive outlook aligns with current market conditions.",
      ],
      negative: [
        "I understand your concerns. Let me help clarify the situation.",
        "It's natural to be cautious. Here's a balanced analysis:",
        "Your concerns are valid. Let me provide some context:",
      ],
      neutral: [
        "Let me provide you with a comprehensive analysis.",
        "Here's what I found regarding your question:",
        "I'll give you a balanced perspective on this topic.",
      ],
    };

    return suggestions[sentiment.overall] || suggestions.neutral;
  }
}

module.exports = SentimentAnalyzer;
