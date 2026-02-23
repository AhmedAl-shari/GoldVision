const promClient = require("prom-client");

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "goldvision",
  version: "2.0.0",
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// HTTP Request Metrics
const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

// News Service Metrics
const newsFetchTotal = new promClient.Counter({
  name: "news_fetch_total",
  help: "Total number of news fetch operations",
  labelNames: ["provider", "status"],
  registers: [register],
});

const newsInsertTotal = new promClient.Counter({
  name: "news_insert_total",
  help: "Total number of news items inserted",
  labelNames: ["provider", "sentiment"],
  registers: [register],
});

const newsSseClients = new promClient.Gauge({
  name: "news_sse_clients",
  help: "Current number of news SSE clients connected",
  registers: [register],
});

const priceSseClients = new promClient.Gauge({
  name: "price_sse_clients",
  help: "Current number of price SSE clients connected",
  registers: [register],
});

// Copilot Service Metrics
const copilotIntentTotal = new promClient.Counter({
  name: "copilot_intent_total",
  help: "Total number of copilot intents processed",
  labelNames: ["intent_type", "status"],
  registers: [register],
});

const copilotResponseTime = new promClient.Histogram({
  name: "copilot_response_time_seconds",
  help: "Copilot response time in seconds",
  labelNames: ["intent_type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Forecast Service Metrics
const forecastCacheHitTotal = new promClient.Counter({
  name: "forecast_cache_hit_total",
  help: "Total number of forecast cache hits",
  labelNames: ["cache_type"],
  registers: [register],
});

const forecastCacheMissTotal = new promClient.Counter({
  name: "forecast_cache_miss_total",
  help: "Total number of forecast cache misses",
  labelNames: ["cache_type"],
  registers: [register],
});

const forecastGenerationTime = new promClient.Histogram({
  name: "forecast_generation_time_seconds",
  help: "Forecast generation time in seconds",
  labelNames: ["model_type"],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// Forecast Latency Metrics
const forecastLatencyCold = new promClient.Histogram({
  name: "forecast_latency_cold_seconds",
  help: "Cold forecast latency in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

const forecastLatencyWarm = new promClient.Histogram({
  name: "forecast_latency_warm_seconds",
  help: "Warm forecast latency in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Database Metrics
const dbConnectionsActive = new promClient.Gauge({
  name: "db_connections_active",
  help: "Number of active database connections",
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// System Metrics
const memoryUsage = new promClient.Gauge({
  name: "nodejs_memory_usage_bytes",
  help: "Node.js memory usage in bytes",
  labelNames: ["type"],
  registers: [register],
});

const cpuUsage = new promClient.Gauge({
  name: "nodejs_cpu_usage_percent",
  help: "Node.js CPU usage percentage",
  registers: [register],
});

// Performance Alarm Metrics
const performanceAlarm = new promClient.Counter({
  name: "performance_alarm_total",
  help: "Total number of performance alarms triggered",
  labelNames: ["alarm_type", "severity"],
  registers: [register],
});

// Response time tracking for alarms
const responseTimeWindows = new Map();
const ALARM_WINDOW_SIZE = 5; // 5 consecutive windows
const ALARM_THRESHOLD_P95 = 800; // 800ms threshold

// Custom Metrics Functions
const metrics = {
  // HTTP Metrics
  recordHttpRequest: (method, route, statusCode, duration) => {
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    // Track response times for alarm monitoring
    metrics.trackResponseTime(route, duration);
  },

  // News Metrics
  recordNewsFetch: (provider, status) => {
    newsFetchTotal.inc({ provider, status });
  },

  recordNewsInsert: (provider, sentiment) => {
    newsInsertTotal.inc({ provider, sentiment });
  },

  setSseClients: (count) => {
    // Legacy method - sets news clients for backward compatibility
    newsSseClients.set(count);
  },
  
  setNewsSseClients: (count) => {
    newsSseClients.set(count);
  },
  
  setPriceSseClients: (count) => {
    priceSseClients.set(count);
  },

  // Copilot Metrics
  recordCopilotIntent: (intentType, status) => {
    copilotIntentTotal.inc({ intent_type: intentType, status });
  },

  recordCopilotResponseTime: (intentType, duration) => {
    copilotResponseTime.observe({ intent_type: intentType }, duration);
  },

  // Forecast Metrics
  recordForecastCacheHit: (cacheType) => {
    forecastCacheHitTotal.inc({ cache_type: cacheType });
  },

  recordForecastCacheMiss: (cacheType) => {
    forecastCacheMissTotal.inc({ cache_type: cacheType });
  },

  recordForecastGenerationTime: (modelType, duration) => {
    forecastGenerationTime.observe({ model_type: modelType }, duration);
  },

  // Database Metrics
  setDbConnectionsActive: (count) => {
    dbConnectionsActive.set(count);
  },

  recordDbQueryDuration: (operation, table, duration) => {
    dbQueryDuration.observe({ operation, table }, duration);
  },

  // System Metrics
  updateSystemMetrics: () => {
    const memUsage = process.memoryUsage();
    memoryUsage.set({ type: "rss" }, memUsage.rss);
    memoryUsage.set({ type: "heapTotal" }, memUsage.heapTotal);
    memoryUsage.set({ type: "heapUsed" }, memUsage.heapUsed);
    memoryUsage.set({ type: "external" }, memUsage.external);

    // CPU usage (simplified)
    const cpuUsagePercent = process.cpuUsage();
    cpuUsage.set(cpuUsagePercent.user / 1000000); // Convert to seconds
  },

  // Get metrics for Prometheus scraping
  getMetrics: async () => {
    metrics.updateSystemMetrics();
    return register.metrics();
  },

  // Get metrics in JSON format for admin dashboard
  getMetricsJson: async () => {
    metrics.updateSystemMetrics();
    return register.getMetricsAsJSON();
  },

  // Performance Alarm Functions
  trackResponseTime: (route, duration) => {
    const now = Date.now();
    const windowKey = `${route}_${Math.floor(now / 60000)}`; // 1-minute windows

    if (!responseTimeWindows.has(windowKey)) {
      responseTimeWindows.set(windowKey, []);
    }

    const window = responseTimeWindows.get(windowKey);
    window.push(duration);

    // Keep only recent windows (last 10 minutes)
    const cutoff = now - 10 * 60 * 1000;
    for (const [key, times] of responseTimeWindows.entries()) {
      const windowTime = parseInt(key.split("_").pop()) * 60000;
      if (windowTime < cutoff) {
        responseTimeWindows.delete(key);
      }
    }

    // Check for alarm conditions
    metrics.checkPerformanceAlarms(route);
  },

  checkPerformanceAlarms: (route) => {
    const routeWindows = Array.from(responseTimeWindows.entries())
      .filter(([key]) => key.startsWith(`${route}_`))
      .map(([, times]) => times)
      .slice(-ALARM_WINDOW_SIZE); // Last 5 windows

    if (routeWindows.length < ALARM_WINDOW_SIZE) {
      return; // Not enough data
    }

    // Calculate P95 for each window
    const p95Values = routeWindows.map((times) => {
      if (times.length === 0) return 0;
      const sorted = [...times].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.95);
      return sorted[index];
    });

    // Check if all windows exceed threshold
    const allExceedThreshold = p95Values.every(
      (p95) => p95 > ALARM_THRESHOLD_P95
    );

    if (allExceedThreshold) {
      const avgP95 =
        p95Values.reduce((sum, val) => sum + val, 0) / p95Values.length;

      // Log alarm
      console.warn(
        `🚨 PERFORMANCE ALARM: P95 response time for ${route} exceeded 800ms for 5 consecutive windows. Average P95: ${avgP95.toFixed(
          2
        )}ms`
      );

      // Record alarm metric
      performanceAlarm.inc({
        alarm_type: "p95_response_time",
        severity: avgP95 > 2000 ? "critical" : "warning",
      });

      // Additional logging for critical alarms
      if (avgP95 > 2000) {
        console.error(
          `🔥 CRITICAL PERFORMANCE ALARM: ${route} P95 response time is ${avgP95.toFixed(
            2
          )}ms - immediate attention required!`
        );
      }
    }
  },

  // Get current alarm status
  getAlarmStatus: () => {
    const alarms = [];

    // Check all routes for alarm conditions
    const routes = new Set();
    for (const key of responseTimeWindows.keys()) {
      const route = key.split("_")[0];
      routes.add(route);
    }

    for (const route of routes) {
      const routeWindows = Array.from(responseTimeWindows.entries())
        .filter(([key]) => key.startsWith(`${route}_`))
        .map(([, times]) => times)
        .slice(-ALARM_WINDOW_SIZE);

      if (routeWindows.length >= ALARM_WINDOW_SIZE) {
        const p95Values = routeWindows.map((times) => {
          if (times.length === 0) return 0;
          const sorted = [...times].sort((a, b) => a - b);
          const index = Math.floor(sorted.length * 0.95);
          return sorted[index];
        });

        const avgP95 =
          p95Values.reduce((sum, val) => sum + val, 0) / p95Values.length;

        if (avgP95 > ALARM_THRESHOLD_P95) {
          alarms.push({
            route,
            avgP95: Math.round(avgP95),
            severity: avgP95 > 2000 ? "critical" : "warning",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return alarms;
  },
};

module.exports = {
  register,
  metrics,
  forecastLatencyCold,
  forecastLatencyWarm,
};
