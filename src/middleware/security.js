const rateLimit = require("express-rate-limit");
const axios = require("axios");
const crypto = require("crypto");
const promClient = require("prom-client");

// Prometheus metrics for security events
const rateLimitBlockTotal = new promClient.Counter({
  name: "rate_limit_block_total",
  help: "Total number of requests blocked by rate limiting",
  labelNames: ["route", "ip", "reason"],
});

const upstreamTimeoutTotal = new promClient.Counter({
  name: "upstream_timeout_total",
  help: "Total number of upstream timeouts",
  labelNames: ["service", "operation"],
});

const circuitBreakerState = new promClient.Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
  labelNames: ["service"],
});

const apiKeyUsageTotal = new promClient.Counter({
  name: "api_key_usage_total",
  help: "Total API key usage",
  labelNames: ["key_id", "operation", "status"],
});

// Circuit breaker implementation
class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds

    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    // Update Prometheus metric
    circuitBreakerState.set({ service }, this.getStateValue());
  }

  getStateValue() {
    switch (this.state) {
      case "CLOSED":
        return 0;
      case "OPEN":
        return 1;
      case "HALF_OPEN":
        return 2;
      default:
        return 0;
    }
  }

  async execute(operation) {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for ${this.service}`);
      }
      this.state = "HALF_OPEN";
      circuitBreakerState.set({ service: this.service }, this.getStateValue());
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
    circuitBreakerState.set({ service: this.service }, this.getStateValue());
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
      circuitBreakerState.set({ service: this.service }, this.getStateValue());
    }
  }

  getHealth() {
    return {
      service: this.service,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }
}

// API Key management
class APIKeyManager {
  constructor() {
    this.keys = new Map();
    this.loadKeysFromEnv();
  }

  loadKeysFromEnv() {
    // Load API keys from environment variables
    const newsApiKey = process.env.NEWS_API_KEY;
    const marketauxKey = process.env.MARKETAUX_API_KEY;
    const gdeltKey = process.env.GDELT_API_KEY;

    if (newsApiKey) {
      this.keys.set("news", {
        id: "news",
        key: newsApiKey,
        provider: process.env.NEWS_PROVIDER || "rss",
        permissions: ["news:read"],
        lastUsed: null,
        usageCount: 0,
      });
    }

    if (marketauxKey) {
      this.keys.set("marketaux", {
        id: "marketaux",
        key: marketauxKey,
        provider: "marketaux",
        permissions: ["news:read"],
        lastUsed: null,
        usageCount: 0,
      });
    }

    if (gdeltKey) {
      this.keys.set("gdelt", {
        id: "gdelt",
        key: gdeltKey,
        provider: "gdelt",
        permissions: ["news:read"],
        lastUsed: null,
        usageCount: 0,
      });
    }
  }

  getKey(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) return null;

    // Update usage stats
    keyData.lastUsed = new Date();
    keyData.usageCount++;

    return keyData;
  }

  validateKey(keyId, requiredPermissions = []) {
    const keyData = this.getKey(keyId);
    if (!keyData) return false;

    // Check permissions
    for (const permission of requiredPermissions) {
      if (!keyData.permissions.includes(permission)) {
        return false;
      }
    }

    return true;
  }

  redactSecret(value) {
    if (!value || typeof value !== "string") return "[REDACTED]";
    if (value.length <= 8) return "[REDACTED]";
    return value.substring(0, 4) + "..." + value.substring(value.length - 4);
  }
}

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, keyGenerator) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      type: "https://goldvision.com/errors/rate-limit-exceeded",
      title: "Rate Limit Exceeded",
      status: 429,
      detail: message,
      instance: "/api/rate-limit",
    },
    keyGenerator,
    handler: (req, res) => {
      rateLimitBlockTotal.inc({
        route: req.route?.path || req.path,
        ip: req.ip,
        reason: "rate_limit_exceeded",
      });

      res.status(429).json({
        type: "https://goldvision.com/errors/rate-limit-exceeded",
        title: "Rate Limit Exceeded",
        status: 429,
        detail: message,
        instance: req.path,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters
// In development, use a very high limit or check if we're running locally
const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production" ||
  !process.env.NODE_ENV;

const newsRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  isDevelopment ? 5000 : 30, // Very high limit in development (5000/min) - effectively no limit
  "News API rate limit exceeded. Maximum 30 requests per minute per IP.",
  (req) => req.ip,
);

// Separate rate limiter for image proxy with much higher limits
const imageProxyRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  process.env.NODE_ENV === "development" ? 1000 : 200, // Very high limit for images (1000/min in dev)
  "Image proxy rate limit exceeded. Maximum 200 requests per minute per IP.",
  (req) => req.ip,
);

const copilotRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 requests per minute
  "Copilot API rate limit exceeded. Maximum 10 requests per minute per user.",
  (req) => req.user?.id || req.ip,
);

const forecastRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  15, // 15 requests per minute
  "Forecast API rate limit exceeded. Maximum 15 requests per minute per IP.",
  (req) => req.ip,
);

// Timeout middleware
const createTimeout = (timeoutMs) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        upstreamTimeoutTotal.inc({
          service: req.service || "unknown",
          operation: req.operation || "unknown",
        });

        res.status(504).json({
          type: "https://goldvision.com/errors/upstream-timeout",
          title: "Upstream Timeout",
          status: 504,
          detail: `Request timed out after ${timeoutMs}ms`,
          instance: req.path,
        });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timeout));
    res.on("close", () => clearTimeout(timeout));

    next();
  };
};

// Retry middleware with exponential backoff and jitter
const createRetry = (maxRetries = 3, baseDelay = 1000) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    let retryCount = 0;

    const attemptRequest = async () => {
      try {
        // Store original send method
        res.send = originalSend;

        // Execute the request
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Request timeout"));
          }, 10000); // 10 second timeout

          res.on("finish", () => {
            clearTimeout(timeout);
            resolve();
          });

          res.on("close", () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        return true;
      } catch (error) {
        retryCount++;

        if (retryCount <= maxRetries) {
          // Calculate delay with exponential backoff and jitter
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          const jitter = Math.random() * 0.1 * delay;
          const totalDelay = delay + jitter;

          console.log(
            `Retrying request (attempt ${retryCount}/${maxRetries}) after ${totalDelay}ms`,
          );

          await new Promise((resolve) => setTimeout(resolve, totalDelay));
          return attemptRequest();
        } else {
          throw error;
        }
      }
    };

    try {
      await attemptRequest();
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Image proxy with domain allowlist
const createImageProxy = (allowedDomains = []) => {
  const defaultAllowedDomains = [
    "images.unsplash.com",
    "cdn.pixabay.com",
    "picsum.photos",
    "source.unsplash.com",
  ];

  const domains = [...allowedDomains, ...defaultAllowedDomains];

  return async (req, res, next) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        type: "https://goldvision.com/errors/invalid-image-url",
        title: "Invalid Image URL",
        status: 400,
        detail: "Image URL parameter is required",
        instance: req.path,
      });
    }

    try {
      // Decode URL if it's encoded
      const decodedUrl = decodeURIComponent(url);
      console.log("Original URL:", url);
      console.log("Decoded URL:", decodedUrl);
      const urlObj = new URL(decodedUrl);
      const hostname = urlObj.hostname;
      console.log("Parsed hostname:", hostname);

      // Check if domain is allowed
      const isAllowed = domains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain),
      );

      if (!isAllowed) {
        return res.status(403).json({
          type: "https://goldvision.com/errors/domain-not-allowed",
          title: "Domain Not Allowed",
          status: 403,
          detail: `Domain ${hostname} is not in the allowed list`,
          instance: req.path,
        });
      }

      // Set cache headers
      res.set({
        "Cache-Control": "public, max-age=86400", // 24 hours
        "Content-Security-Policy": "img-src 'self' data: " + domains.join(" "),
      });

      // Proxy the image with better error handling
      console.log("Attempting to fetch:", decodedUrl);

      try {
        const response = await axios.get(decodedUrl, {
          headers: {
            "User-Agent": "GoldVision-ImageProxy/1.0",
            Accept: "image/*,*/*;q=0.8",
          },
          timeout: 10000, // 10 second timeout
          responseType: "stream", // Stream the response for better memory usage
        });

        console.log("Axios response status:", response.status);

        const contentType = response.headers["content-type"];
        console.log("Content type:", contentType);

        if (!contentType || !contentType.startsWith("image/")) {
          return res.status(400).json({
            type: "https://goldvision.com/errors/invalid-image-type",
            title: "Invalid Image Type",
            status: 400,
            detail: `URL does not point to a valid image. Content-Type: ${contentType}`,
            instance: req.path,
          });
        }

        res.set("Content-Type", contentType);

        // Stream the response directly
        response.data.pipe(res);
      } catch (fetchError) {
        console.error("Axios specific error:", fetchError.message);
        if (fetchError.response) {
          console.error("Response status:", fetchError.response.status);
          console.error("Response headers:", fetchError.response.headers);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error("Image proxy error:", error.message);
      console.error("Error type:", error.constructor.name);

      // More specific error handling
      if (error.message.includes("fetch")) {
        return res.status(400).json({
          type: "https://goldvision.com/errors/fetch-error",
          title: "Fetch Error",
          status: 400,
          detail: `Failed to fetch image: ${error.message}`,
          instance: req.path,
        });
      }

      res.status(400).json({
        type: "https://goldvision.com/errors/invalid-url",
        title: "Invalid URL",
        status: 400,
        detail: `Image proxy error: ${error.message}`,
        instance: req.path,
      });
    }
  };
};

// Error handler for RFC7807 compliance
const createErrorHandler = () => {
  return (error, req, res, next) => {
    // Don't send response if headers already sent
    if (res.headersSent) {
      return next(error);
    }

    console.error("Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });

    // Default error response
    let status = 500;
    let type = "https://goldvision.com/errors/internal-server-error";
    let title = "Internal Server Error";
    let detail = "An unexpected error occurred";

    // Map known errors to RFC7807 format
    if (error.name === "ValidationError") {
      status = 400;
      type = "https://goldvision.com/errors/validation-error";
      title = "Validation Error";
      detail = error.message;
    } else if (error.name === "UnauthorizedError") {
      status = 401;
      type = "https://goldvision.com/errors/unauthorized";
      title = "Unauthorized";
      detail = "Authentication required";
    } else if (error.name === "ForbiddenError") {
      status = 403;
      type = "https://goldvision.com/errors/forbidden";
      title = "Forbidden";
      detail = "Access denied";
    } else if (error.name === "NotFoundError") {
      status = 404;
      type = "https://goldvision.com/errors/not-found";
      title = "Not Found";
      detail = "Resource not found";
    } else if (error.name === "TimeoutError") {
      status = 504;
      type = "https://goldvision.com/errors/timeout";
      title = "Timeout";
      detail = "Request timed out";
    }

    res.status(status).json({
      type,
      title,
      status,
      detail,
      instance: req.path,
      timestamp: new Date().toISOString(),
    });
  };
};

module.exports = {
  CircuitBreaker,
  APIKeyManager,
  newsRateLimit,
  imageProxyRateLimit,
  copilotRateLimit,
  forecastRateLimit,
  createTimeout,
  createRetry,
  createImageProxy,
  createErrorHandler,
  rateLimitBlockTotal,
  upstreamTimeoutTotal,
  circuitBreakerState,
  apiKeyUsageTotal,
};
