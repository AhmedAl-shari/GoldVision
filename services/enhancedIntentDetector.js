const natural = require("natural");

class EnhancedIntentDetector {
  constructor() {
    // Initialize natural language processing
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;

    // Intent patterns with context awareness
    this.intentPatterns = {
      // Price and forecasting intents
      price_query: {
        keywords: ["price", "cost", "value", "rate", "سعر", "تكلفة", "قيمة"],
        patterns: [
          /what.*price/i,
          /current.*price/i,
          /price.*now/i,
          /how much.*cost/i,
          /ما هو.*السعر/i,
          /كم.*السعر/i,
        ],
        context: ["market", "gold", "forecast", "prediction"],
      },

      forecast_query: {
        keywords: [
          "forecast",
          "predict",
          "future",
          "expect",
          "توقع",
          "تنبؤ",
          "مستقبل",
        ],
        patterns: [
          /what.*forecast/i,
          /predict.*price/i,
          /future.*price/i,
          /expect.*price/i,
          /ما هو.*التوقع/i,
          /ماذا.*تتوقع/i,
        ],
        context: ["price", "market", "trend", "analysis"],
      },

      market_analysis: {
        keywords: [
          "analyze",
          "analysis",
          "market",
          "trend",
          "تحليل",
          "سوق",
          "اتجاه",
        ],
        patterns: [
          /analyze.*market/i,
          /market.*analysis/i,
          /explain.*trend/i,
          /what.*happening/i,
          /تحليل.*السوق/i,
          /شرح.*الحركة/i,
        ],
        context: ["current", "today", "movement", "condition"],
      },

      simulation_request: {
        keywords: [
          "simulate",
          "simulation",
          "test",
          "run",
          "محاكاة",
          "اختبار",
          "تشغيل",
        ],
        patterns: [
          /run.*simulation/i,
          /monte.*carlo/i,
          /simulate.*price/i,
          /test.*scenario/i,
          /شغل.*محاكاة/i,
          /محاكاة.*مونت/i,
        ],
        context: ["price", "forecast", "scenario", "analysis"],
      },

      alert_management: {
        keywords: ["alert", "notify", "remind", "تنبيه", "إشعار", "تذكير"],
        patterns: [
          /create.*alert/i,
          /set.*alert/i,
          /notify.*when/i,
          /alert.*price/i,
          /إنشاء.*تنبيه/i,
          /تنبيه.*سعر/i,
        ],
        context: ["price", "above", "below", "threshold"],
      },

      technical_analysis: {
        keywords: [
          "technical",
          "indicator",
          "rsi",
          "macd",
          "bollinger",
          "تحليل فني",
          "مؤشر",
        ],
        patterns: [
          /technical.*analysis/i,
          /rsi.*indicator/i,
          /macd.*signal/i,
          /bollinger.*bands/i,
          /تحليل.*فني/i,
          /مؤشر.*تقني/i,
        ],
        context: ["chart", "signal", "trend", "momentum"],
      },

      risk_assessment: {
        keywords: [
          "risk",
          "volatility",
          "uncertainty",
          "portfolio",
          "مخاطر",
          "تقلب",
          "عدم اليقين",
          "محفظة",
        ],
        patterns: [
          /risk.*assessment/i,
          /portfolio.*risk/i,
          /what.*my.*portfolio.*risk/i,
          /volatility.*analysis/i,
          /uncertainty.*level/i,
          /risk.*level/i,
          /تقييم.*المخاطر/i,
          /تحليل.*التقلب/i,
          /ما.*هو.*مخاطر.*محفظتي/i,
        ],
        context: ["portfolio", "investment", "market", "exposure"],
      },

      volatility_forecast: {
        keywords: [
          "volatility",
          "forecast",
          "predict",
          "expect",
          "تقلب",
          "توقع",
          "تنبؤ",
        ],
        patterns: [
          /volatility.*forecast/i,
          /what.*volatility.*forecast/i,
          /volatility.*prediction/i,
          /volatility.*expect/i,
          /forecast.*volatility/i,
          /predict.*volatility/i,
          /توقع.*التقلب/i,
          /تنبؤ.*التقلب/i,
          /ما.*هو.*توقع.*التقلب/i,
        ],
        context: ["market", "price", "analysis", "future"],
      },

      backtest_request: {
        keywords: [
          "backtest",
          "backtest",
          "historical",
          "test",
          "اختبار",
          "تاريخي",
          "محاكاة",
        ],
        patterns: [
          /run.*backtest/i,
          /backtest.*analysis/i,
          /historical.*test/i,
          /test.*strategy/i,
          /شغل.*اختبار/i,
          /اختبار.*تاريخي/i,
          /محاكاة.*تاريخية/i,
        ],
        context: ["strategy", "performance", "historical", "analysis"],
      },

      correlation_analysis: {
        keywords: [
          "correlation",
          "relationship",
          "compare",
          "ارتباط",
          "علاقة",
          "مقارنة",
        ],
        patterns: [
          /correlation.*with/i,
          /relationship.*between/i,
          /compare.*with/i,
          /how.*related/i,
          /الارتباط.*مع/i,
          /العلاقة.*بين/i,
        ],
        context: ["bitcoin", "dollar", "oil", "stocks"],
      },

      help_request: {
        keywords: ["help", "how", "what", "explain", "مساعدة", "كيف", "ماذا"],
        patterns: [
          /how.*work/i,
          /what.*can.*do/i,
          /explain.*feature/i,
          /help.*me/i,
          /كيف.*يعمل/i,
          /ماذا.*يمكن/i,
        ],
        context: ["feature", "function", "capability", "usage"],
      },
    };

    // Contextual keywords that modify intent
    this.contextModifiers = {
      urgency: [
        "urgent",
        "quick",
        "fast",
        "immediately",
        "عاجل",
        "سريع",
        "فوري",
      ],
      complexity: [
        "simple",
        "detailed",
        "comprehensive",
        "basic",
        "بسيط",
        "مفصل",
        "شامل",
      ],
      timeframe: [
        "today",
        "tomorrow",
        "week",
        "month",
        "year",
        "اليوم",
        "غداً",
        "أسبوع",
        "شهر",
        "سنة",
      ],
      comparison: [
        "vs",
        "versus",
        "compared",
        "against",
        "مقابل",
        "مقارنة",
        "ضد",
      ],
    };
  }

  // Enhanced intent detection with context
  detectIntent(message, context = null) {
    const messageLower = message.toLowerCase();
    const tokens = this.tokenizer.tokenize(messageLower);
    const stems = tokens.map((token) => this.stemmer.stem(token));

    let bestMatch = {
      intent: "general_query",
      confidence: 0,
      context: {},
      complexity: "intermediate",
      urgency: "normal",
      timeframe: null,
      entities: [],
    };

    // Check each intent pattern
    for (const [intentName, intentData] of Object.entries(
      this.intentPatterns
    )) {
      let confidence = 0;
      let matchedKeywords = 0;
      let matchedPatterns = 0;

      // Check keyword matches
      for (const keyword of intentData.keywords) {
        if (messageLower.includes(keyword)) {
          matchedKeywords++;
          confidence += 0.3;
        }
      }

      // Check pattern matches
      for (const pattern of intentData.patterns) {
        if (pattern.test(message)) {
          matchedPatterns++;
          confidence += 0.4;
        }
      }

      // Check context matches
      if (context && intentData.context) {
        for (const contextKeyword of intentData.context) {
          if (context.includes(contextKeyword)) {
            confidence += 0.2;
          }
        }
      }

      // Normalize confidence
      confidence = Math.min(confidence, 1.0);

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: intentName,
          confidence,
          context: {
            matchedKeywords,
            matchedPatterns,
            keywords: intentData.keywords.filter((k) =>
              messageLower.includes(k)
            ),
          },
          complexity: this.detectComplexity(message, tokens),
          urgency: this.detectUrgency(message),
          timeframe: this.detectTimeframe(message),
          entities: this.extractEntities(message),
        };
      }
    }

    return bestMatch;
  }

  // Detect query complexity
  detectComplexity(message, tokens) {
    const complexIndicators = [
      "correlation",
      "volatility",
      "standard deviation",
      "regression",
      "monte carlo",
      "bootstrap",
      "ensemble",
      "machine learning",
      "الارتباط",
      "التقلب",
      "الانحراف",
      "الانحدار",
    ];

    const simpleIndicators = [
      "simple",
      "basic",
      "easy",
      "quick",
      "just",
      "بسيط",
      "أساسي",
      "سهل",
      "سريع",
      "فقط",
    ];

    const complexCount = complexIndicators.filter((indicator) =>
      message.toLowerCase().includes(indicator)
    ).length;

    const simpleCount = simpleIndicators.filter((indicator) =>
      message.toLowerCase().includes(indicator)
    ).length;

    if (complexCount > 1) return "advanced";
    if (simpleCount > 0) return "basic";
    if (tokens.length > 10) return "intermediate";
    return "basic";
  }

  // Detect urgency level
  detectUrgency(message) {
    const urgentKeywords = [
      "urgent",
      "asap",
      "immediately",
      "quick",
      "fast",
      "now",
      "عاجل",
      "فوري",
      "سريع",
      "الآن",
      "فوراً",
    ];

    return urgentKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    )
      ? "high"
      : "normal";
  }

  // Detect timeframe
  detectTimeframe(message) {
    const timeframes = {
      immediate: ["now", "current", "today", "الآن", "الحالي", "اليوم"],
      short: [
        "tomorrow",
        "week",
        "next week",
        "غداً",
        "أسبوع",
        "الأسبوع القادم",
      ],
      medium: ["month", "next month", "quarter", "شهر", "الشهر القادم", "ربع"],
      long: [
        "year",
        "next year",
        "long term",
        "سنة",
        "السنة القادمة",
        "طويل المدى",
      ],
    };

    for (const [timeframe, keywords] of Object.entries(timeframes)) {
      if (keywords.some((keyword) => message.toLowerCase().includes(keyword))) {
        return timeframe;
      }
    }

    return null;
  }

  // Extract entities from message
  extractEntities(message) {
    const entities = [];

    // Extract prices
    const pricePattern =
      /\$?(\d+(?:\.\d+)?)\s*(?:per\s+)?(?:ounce|oz|gram|g|kg|kilo)?/gi;
    const priceMatches = message.match(pricePattern);
    if (priceMatches) {
      entities.push({
        type: "price",
        values: priceMatches.map((match) => ({
          value: match,
          normalized: parseFloat(match.replace(/[$,]/g, "")),
        })),
      });
    }

    // Extract percentages
    const percentPattern = /(\d+(?:\.\d+)?)\s*%/gi;
    const percentMatches = message.match(percentPattern);
    if (percentMatches) {
      entities.push({
        type: "percentage",
        values: percentMatches.map((match) => ({
          value: match,
          normalized: parseFloat(match.replace("%", "")),
        })),
      });
    }

    // Extract dates
    const datePattern =
      /(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi;
    const dateMatches = message.match(datePattern);
    if (dateMatches) {
      entities.push({
        type: "date",
        values: dateMatches.map((match) => ({
          value: match,
          normalized: new Date(match),
        })),
      });
    }

    // Extract currencies
    const currencyPattern = /(?:USD|GBP|JPY|CHF|CAD|AUD|XAU|BTC|ETH|YER)/gi;
    const currencyMatches = message.match(currencyPattern);
    if (currencyMatches) {
      entities.push({
        type: "currency",
        values: currencyMatches.map((match) => ({
          value: match,
          normalized: match.toUpperCase(),
        })),
      });
    }

    return entities;
  }

  // Analyze conversation context
  analyzeContext(recentMessages) {
    if (!recentMessages || recentMessages.length === 0) {
      return null;
    }

    const context = {
      topics: new Set(),
      entities: new Set(),
      sentiment: "neutral",
      complexity: "intermediate",
      language: "en",
    };

    // Analyze recent messages
    for (const message of recentMessages) {
      const intent = this.detectIntent(message.content);

      // Collect topics
      context.topics.add(intent.intent);

      // Collect entities
      intent.entities.forEach((entity) => {
        entity.values.forEach((value) => {
          context.entities.add(value.normalized);
        });
      });

      // Determine language
      if (/[\u0600-\u06FF]/.test(message.content)) {
        context.language = "ar";
      }

      // Update complexity
      if (intent.complexity === "advanced") {
        context.complexity = "advanced";
      } else if (
        intent.complexity === "basic" &&
        context.complexity === "intermediate"
      ) {
        context.complexity = "basic";
      }
    }

    return {
      topics: Array.from(context.topics),
      entities: Array.from(context.entities),
      sentiment: context.sentiment,
      complexity: context.complexity,
      language: context.language,
    };
  }

  // Get suggested follow-up questions
  getSuggestedQuestions(intent, context) {
    const suggestions = {
      price_query: [
        "What's the price trend over the past week?",
        "How does this compare to historical prices?",
        "What factors are affecting the current price?",
      ],
      forecast_query: [
        "What's the confidence level of this forecast?",
        "What are the key assumptions?",
        "How accurate have past forecasts been?",
      ],
      market_analysis: [
        "What are the key technical indicators?",
        "How does this compare to other assets?",
        "What are the main risks?",
      ],
      simulation_request: [
        "What parameters were used?",
        "How many scenarios were tested?",
        "What's the probability distribution?",
      ],
      alert_management: [
        "What alert conditions are available?",
        "How will I be notified?",
        "Can I set multiple alerts?",
      ],
    };

    return (
      suggestions[intent] || [
        "Can you provide more details?",
        "What other information would be helpful?",
        "Is there anything else you'd like to know?",
      ]
    );
  }
}

module.exports = new EnhancedIntentDetector();
