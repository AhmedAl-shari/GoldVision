const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GoldVision API",
      version: "1.0.0",
      description:
        "Real-time gold price tracking and forecasting API with Prophet integration, OpenAPI validation, and comprehensive monitoring",
      contact: {
        name: "GoldVision Team",
        email: "support@goldvision.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Development server",
      },
      {
        url: "https://api.goldvision.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth-token",
          description: "Authentication token stored in HTTP-only cookie",
        },
        csrfToken: {
          type: "apiKey",
          in: "header",
          name: "x-csrf-token",
          description: "CSRF protection token",
        },
      },
      schemas: {
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            timestamp: { type: "string", format: "date-time" },
            uptime_seconds: { type: "number" },
            version: { type: "string", example: "1.0.0" },
            prophet_healthy: { type: "boolean" },
          },
        },
        PriceData: {
          type: "object",
          properties: {
            id: { type: "string" },
            ds: { type: "string", format: "date-time" },
            price: { type: "number" },
            change: { type: "number" },
            change_percent: { type: "number" },
          },
        },
        ForecastResponse: {
          type: "object",
          properties: {
            ds: { type: "string", format: "date-time" },
            yhat: { type: "number" },
            yhat_lower: { type: "number" },
            yhat_upper: { type: "number" },
            trend: { type: "string" },
            confidence: { type: "number" },
          },
        },
        NewsArticle: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            content: { type: "string" },
            url: { type: "string", format: "uri" },
            image_url: { type: "string", format: "uri" },
            source: { type: "string" },
            published_at: { type: "string", format: "date-time" },
            sentiment: {
              type: "string",
              enum: ["positive", "negative", "neutral"],
            },
            tags: { type: "array", items: { type: "string" } },
          },
        },
        Alert: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: ["price_alert", "trend_alert", "news_alert"],
            },
            condition: { type: "string" },
            threshold: { type: "number" },
            is_active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            triggered_at: { type: "string", format: "date-time" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["user", "admin"] },
            created_at: { type: "string", format: "date-time" },
            last_login: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            request_id: { type: "string" },
          },
        },
        MetricsResponse: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            metrics: {
              type: "object",
              properties: {
                requests_total: { type: "number" },
                requests_per_second: { type: "number" },
                avg_response_time: { type: "number" },
                p95_response_time: { type: "number" },
                error_rate: { type: "number" },
                active_connections: { type: "number" },
                memory_usage: { type: "number" },
                cpu_usage: { type: "number" },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { csrfToken: [] }],
  },
  apis: ["./express-backend-enhanced.js"], // Path to the API files
};

const specs = swaggerJSDoc(options);

module.exports = specs;
