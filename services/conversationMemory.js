const NodeCache = require("node-cache");

class ConversationMemory {
  constructor() {
    // Cache conversations for 24 hours
    this.memory = new NodeCache({
      stdTTL: 86400, // 24 hours
      checkperiod: 3600, // Check every hour
      useClones: false,
    });

    // Default user profile
    this.defaultProfile = {
      riskProfile: "moderate",
      preferredLanguage: "en",
      interests: ["gold", "forecasting", "alerts"],
      experienceLevel: "intermediate",
      timezone: "UTC",
    };
  }

  // Get or create conversation context
  getContext(sessionId, userId = null) {
    const key = `session_${sessionId}`;
    let context = this.memory.get(key);

    if (!context) {
      context = {
        sessionId,
        userId,
        userProfile: { ...this.defaultProfile },
        conversationHistory: [],
        marketContext: {
          lastAnalysis: null,
          currentPrice: null,
          marketSentiment: "neutral",
          volatility: "moderate",
        },
        preferences: {
          alertFrequency: "daily",
          analysisDepth: "comprehensive",
          chartPreferences: "candlestick",
        },
        lastInteraction: new Date(),
        interactionCount: 0,
      };

      this.memory.set(key, context);
    }

    // Update last interaction
    context.lastInteraction = new Date();
    context.interactionCount++;

    return context;
  }

  // Update conversation context
  updateContext(sessionId, updates) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (context) {
      Object.assign(context, updates);
      this.memory.set(key, context);
    }
  }

  // Add message to conversation history
  addMessage(sessionId, message) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (context) {
      context.conversationHistory.push({
        ...message,
        timestamp: new Date(),
        messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      // Keep only last 50 messages to prevent memory bloat
      if (context.conversationHistory.length > 50) {
        context.conversationHistory = context.conversationHistory.slice(-50);
      }

      this.memory.set(key, context);
    }
  }

  // Get recent conversation context
  getRecentContext(sessionId, messageCount = 5) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (!context) return null;

    return {
      recentMessages: context.conversationHistory.slice(-messageCount),
      userProfile: context.userProfile,
      marketContext: context.marketContext,
      preferences: context.preferences,
      interactionCount: context.interactionCount,
    };
  }

  // Update market context
  updateMarketContext(sessionId, marketData) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (context) {
      context.marketContext = {
        ...context.marketContext,
        ...marketData,
        lastUpdated: new Date(),
      };
      this.memory.set(key, context);
    }
  }

  // Update user profile based on interactions
  updateUserProfile(sessionId, interactionData) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (context) {
      // Analyze interaction patterns to update profile
      const { queryType, complexity, language } = interactionData;

      // Update experience level based on query complexity
      if (
        complexity === "advanced" &&
        context.userProfile.experienceLevel === "beginner"
      ) {
        context.userProfile.experienceLevel = "intermediate";
      } else if (
        complexity === "expert" &&
        context.userProfile.experienceLevel === "intermediate"
      ) {
        context.userProfile.experienceLevel = "advanced";
      }

      // Update interests based on query types
      if (queryType && !context.userProfile.interests.includes(queryType)) {
        context.userProfile.interests.push(queryType);
      }

      // Update preferred language
      if (language) {
        context.userProfile.preferredLanguage = language;
      }

      this.memory.set(key, context);
    }
  }

  // Get conversation statistics
  getStats(sessionId) {
    const key = `session_${sessionId}`;
    const context = this.memory.get(key);

    if (!context) return null;

    return {
      sessionId,
      interactionCount: context.interactionCount,
      conversationLength: context.conversationHistory.length,
      userProfile: context.userProfile,
      lastInteraction: context.lastInteraction,
      marketContext: context.marketContext,
    };
  }

  // Clear conversation (for privacy)
  clearConversation(sessionId) {
    const key = `session_${sessionId}`;
    this.memory.del(key);
  }

  // Get all active sessions (for monitoring)
  getAllSessions() {
    const keys = this.memory.keys();
    return keys.map((key) => {
      const context = this.memory.get(key);
      return {
        sessionId: context.sessionId,
        userId: context.userId,
        interactionCount: context.interactionCount,
        lastInteraction: context.lastInteraction,
        userProfile: context.userProfile,
      };
    });
  }
}

module.exports = new ConversationMemory();
