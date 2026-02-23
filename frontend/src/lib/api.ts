import axios, { type AxiosInstance, type AxiosError } from "axios";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ResidualsData } from "../utils/csvExport";
import type { paths, components } from "./api-types";

// Input validation utilities
const validateDays = (days: number): boolean => {
  return Number.isInteger(days) && days >= 1 && days <= 365;
};

const validateLimit = (limit: number): boolean => {
  return Number.isInteger(limit) && limit >= 1 && limit <= 1000;
};

const validateNewsLimit = (limit: number): boolean => {
  return Number.isInteger(limit) && limit >= 1 && limit <= 100;
};

const sanitizeString = (input: string): string => {
  return input.replace(/[<>]/g, "").trim();
};

export type YemenLocalFlowConfidence = "high" | "medium" | "low";

export type YemenLocalFlowTrend = "inbound" | "outbound";

export interface YemenLocalFlowReport {
  id: number;
  region: string;
  reportDate: string | null;
  netFlow: number;
  percentage: number;
  trend: YemenLocalFlowTrend;
  supplyPressure: number | null;
  demandPressure: number | null;
  retailPremiumBps: number | null;
  buybackDiscountBps: number | null;
  makingChargeYER: number | null;
  bullionArrivals: unknown[];
  contributors: unknown[];
  note: string;
  confidence: YemenLocalFlowConfidence;
  createdBy: number | null;
}

export interface YemenLocalFlowMetadata {
  regions: string[];
  includeHistory: boolean;
  limitPerRegion: number;
  requestedRegion: string | null;
  refreshIntervalHours: number;
  generatedAt: string;
  lastReportDate: string | null;
}

export interface YemenLocalFlowResponse {
  success: boolean;
  data: YemenLocalFlowReport[];
  metadata: YemenLocalFlowMetadata;
}

export interface YemenLocalFlowOptions {
  region?: string;
  includeHistory?: boolean;
  limitPerRegion?: number;
  days?: number;
}

// NUCLEAR OPTION: Force complete cache clear and reload if old code detected
if (typeof window !== "undefined") {
  // Check if we're running old cached code by looking for /api/v1 in any existing requests
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0];
    if (typeof url === "string" && url.includes("/api/v1/")) {
      console.error(
        "🚨 DETECTED OLD CACHED CODE! Clearing all caches and reloading..."
      );

      // Clear everything
      localStorage.clear();
      sessionStorage.clear();

      // Clear all caches
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Force reload with cache bust
      setTimeout(() => {
        window.location.href =
          window.location.origin + "?v=" + Date.now() + "&force_reload=true";
      }, 100);

      return Promise.reject(new Error("Old cached code detected - reloading"));
    }
    return originalFetch.apply(this, args);
  };
}

import { API_BASE_URL } from "./config";
import { GRAMS_PER_TOLA } from "./constants";

// API configuration loaded

class ApiClient {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  private sessionId: string;
  private csrfTokenPromise: Promise<string | null> | null = null;
  private csrfTokenCache: string | null = null;

  constructor() {
    // Generate or restore a consistent session ID for this browser session
    this.sessionId = this.restoreSessionId();
    this.csrfTokenCache = this.getCSRFTokenSync();
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased to 60 seconds for slow endpoints
      withCredentials: true, // Enable cookies
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Bust": Date.now().toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    // Ensure we have a CSRF token available (best-effort)
    this.ensureCSRFToken().catch(console.warn);

    // Add request interceptor to ensure no /api/v1 requests and add CSRF tokens
    this.api.interceptors.request.use(
      (config) => {
        // Double-check URL doesn't contain /api/v1
        if (config.url && config.url.includes("/api/v1/")) {
          console.error("🚨 BLOCKING /api/v1 REQUEST:", config.url);
          throw new Error("Blocked /api/v1 request - this should not happen");
        }

        // Ensure Authorization header is explicitly set from defaults (for JWT tokens)
        // This ensures the header is always sent, even if defaults were set
        if (this.api.defaults.headers.common["Authorization"]) {
          config.headers["Authorization"] =
            this.api.defaults.headers.common["Authorization"];
          console.log("🔐 Added Authorization header to request:", config.url);
        }

        // Add session ID header for all requests
        config.headers["x-session-id"] = this.sessionId;

        // Add CSRF token for state-changing requests (except login and CSRF endpoint itself)
        if (
          ["POST", "PUT", "PATCH", "DELETE"].includes(
            config.method?.toUpperCase()
          ) &&
          !config.url?.includes("/auth/login") &&
          !config.url?.includes("/csrf")
        ) {
          const csrfToken = this.getCSRFTokenSync();
          if (csrfToken) {
            config.headers["x-csrf-token"] = csrfToken;
            console.log(
              "✅ Added CSRF token to",
              config.method,
              config.url,
              "Token:",
              csrfToken.substring(0, 8) + "..."
            );
          } else {
            // If no CSRF token available, try to fetch it synchronously from cookie first
            // If still not available, the request will proceed and backend will return 403
            // The error interceptor will handle retrying with a new token
            console.warn(
              "⚠️ No CSRF token available for",
              config.method,
              config.url
            );
          }
        }

        // Add cache busting to every request
        config.params = {
          ...config.params,
          _t: Date.now(),
          _cb: Math.random().toString(36).substring(7),
        };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors with automatic token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.api(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (!refreshToken) {
              // No refresh token available - user needs to sign in
              this.failedQueue.forEach(({ reject }) =>
                reject(new Error("No refresh token available"))
              );
              this.failedQueue = [];
              this.setToken(null);
              window.dispatchEvent(new CustomEvent("auth:logout"));
              return Promise.reject(new Error("No refresh token available"));
            }

            const response = await this.api.post("/auth/refresh", {
              refresh_token: refreshToken,
            });

            const newToken = response.data.access_token;
            localStorage.setItem("access_token", newToken);
            this.setToken(newToken);

            // Process failed queue
            this.failedQueue.forEach(({ resolve }) => resolve());
            this.failedQueue = [];

            // Retry original request
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];

            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            this.setToken(null);

            // Trigger logout in the app
            window.dispatchEvent(new CustomEvent("auth:logout"));

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        const requestConfig = originalRequest as any;

        if (
          error.response?.status === 403 &&
          requestConfig &&
          !requestConfig._csrfRetry &&
          typeof error.response?.data?.detail === "string" &&
          error.response.data.detail.toLowerCase().includes("csrf")
        ) {
          console.warn(
            "⚠️ CSRF token rejected, fetching new token and retrying..."
          );
          requestConfig._csrfRetry = true;

          // Don't reset session state - just fetch a new CSRF token for the current session
          // This ensures the session ID stays consistent
          const currentSessionId = this.sessionId;
          const newToken = await this.ensureCSRFToken(true);

          if (!newToken) {
            console.error(
              "❌ Failed to get new CSRF token after CSRF rejection"
            );
            // Only reset session if token fetch fails
            this.resetSessionState();
            const retryToken = await this.ensureCSRFToken(true);
            if (!retryToken) {
              return Promise.reject(
                new Error(
                  "Failed to refresh CSRF token. Please refresh the page."
                )
              );
            }
            requestConfig.headers = {
              ...(requestConfig.headers ?? {}),
              "x-session-id": this.sessionId,
              "x-csrf-token": retryToken,
            };
          } else {
            // Use the new token with the same session ID
            const finalToken = this.getCSRFTokenSync() || newToken;
            console.log(
              `🔄 Retrying with same session: ${currentSessionId.substring(
                0,
                8
              )}..., new token: ${finalToken?.substring(0, 8)}...`
            );

            requestConfig.headers = {
              ...(requestConfig.headers ?? {}),
              "x-session-id": currentSessionId,
              "x-csrf-token": finalToken,
            };
          }

          return this.api(requestConfig);
        }

        // Only log errors that aren't timeout/connection issues
        if (error.code !== "ECONNABORTED" && error.code !== "ERR_NETWORK") {
          console.error("API Error:", {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
            timeout: error.code === "ECONNABORTED",
          });
        }
        return Promise.reject(error);
      }
    );
  }

  private restoreSessionId(): string {
    if (typeof window === "undefined") {
      return this.generateSessionId();
    }
    const stored = localStorage.getItem("session_id");
    if (stored) {
      return stored;
    }
    const generated = this.generateSessionId();
    localStorage.setItem("session_id", generated);
    return generated;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSessionId(sessionId?: string | null) {
    if (typeof window === "undefined") {
      this.sessionId = sessionId || this.generateSessionId();
      return;
    }

    if (sessionId) {
      this.sessionId = sessionId;
      localStorage.setItem("session_id", sessionId);
    } else {
      localStorage.removeItem("session_id");
      const regenerated = this.generateSessionId();
      this.sessionId = regenerated;
      localStorage.setItem("session_id", regenerated);
    }
  }

  private cacheCSRFToken(token: string | null) {
    this.csrfTokenCache = token ?? null;
    if (typeof document === "undefined") {
      return;
    }
    if (token) {
      document.cookie = `csrf_token=${token}; path=/; max-age=1800; samesite=lax`;
    } else {
      document.cookie =
        "csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }

  resetSessionState() {
    this.csrfTokenPromise = null;
    this.updateSessionId(null);
    this.cacheCSRFToken(null);
  }

  getCSRFTokenSync(): string | null {
    if (this.csrfTokenCache) {
      return this.csrfTokenCache;
    }
    if (typeof document === "undefined") {
      return null;
    }
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/i);
    if (match) {
      const value = decodeURIComponent(match[1]);
      this.csrfTokenCache = value;
      return value;
    }
    return null;
  }

  async getCSRFToken(forceRefresh: boolean = false): Promise<string | null> {
    if (!forceRefresh) {
      const existing = this.getCSRFTokenSync();
      if (existing) {
        return existing;
      }
    }

    if (this.csrfTokenPromise) {
      console.log("🔄 CSRF token fetch already in progress, awaiting result");
      return this.csrfTokenPromise;
    }

    this.csrfTokenPromise = this.api
      .get("/csrf", {
        headers: {
          "x-session-id": this.sessionId,
        },
      })
      .then((response) => {
        const token = response.data?.csrf_token ?? null;
        if (token) {
          console.log(
            "✅ CSRF token fetched and stored:",
            token.substring(0, 8) + "..."
          );
          this.cacheCSRFToken(token);
        }
        return token;
      })
      .catch((error) => {
        console.warn("Failed to fetch CSRF token:", error);
        return null;
      })
      .finally(() => {
        this.csrfTokenPromise = null;
      });

    return this.csrfTokenPromise;
  }

  async ensureCSRFToken(forceRefresh: boolean = false): Promise<string | null> {
    console.log(
      forceRefresh ? "🔄 Refreshing CSRF token..." : "🔄 Ensuring CSRF token..."
    );
    const token = await this.getCSRFToken(forceRefresh);
    if (!token) {
      console.warn("❌ CSRF token unavailable after ensure attempt");
    }
    return token;
  }

  setToken(token: string | null) {
    if (token) {
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log(
        "🔐 API Client: Set Authorization header with token:",
        token.substring(0, 20) + "..."
      );
    } else {
      delete this.api.defaults.headers.common["Authorization"];
      console.log("🔐 API Client: Cleared Authorization header");
    }
  }

  // Authentication methods
  async signup(
    email: string,
    password: string,
    locale: string = "en",
    role: string = "user"
  ) {
    const response = await this.api.post("/auth/signup", {
      email,
      password,
      locale,
      role,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    try {
      const response = await this.api.post("/auth/login", { email, password });

      // Store tokens for backward compatibility (cookies are set automatically)
      if (response.data.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }
      if (response.data.session_id) {
        this.updateSessionId(response.data.session_id);
      }
      if (response.data.csrf_token) {
        this.cacheCSRFToken(response.data.csrf_token);
      } else {
        await this.ensureCSRFToken(true);
      }

      return response.data;
    } catch (error: unknown) {
      // Clear any stale tokens on login failure
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("session_id");
      this.resetSessionState();

      // Clear cookies
      document.cookie =
        "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      const axiosError = error as AxiosError<{
        detail?: string;
        message?: string;
      }>;
      const status = axiosError?.response?.status;
      const data = axiosError?.response?.data;
      const detail = data?.detail || data?.message;
      if (status === 401) {
        throw new Error(detail || "Invalid email or password");
      }
      if (status === 429) {
        throw new Error(
          detail || "Too many login attempts. Please try again later."
        );
      }
      throw new Error(detail || (axiosError?.message ?? "Login failed"));
    }
  }

  async refreshToken(refreshToken: string) {
    const response = await this.api.post("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get("/auth/me");
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.api.get("/health");
    return response.data;
  }

  // Prices API
  async getPrices(
    params: {
      asset?: string;
      currency?: string;
      region?: string;
      karat?: number;
      unit?: string;
      from?: string;
      to?: string;
      limit?: number;
    } = {}
  ) {
    const response = await this.api.get("/prices", { params });
    return response.data;
  }

  async fetchLatestPrice() {
    const response = await this.api.post("/fetch-latest");
    return response.data;
  }

  async ingestPrices(rows: PriceData[]) {
    const response = await this.api.post("/prices/ingest", { rows });
    return response.data;
  }

  // Forecast API
  async postForecast(
    data: {
      asset?: string;
      currency?: string;
      region?: string;
      karat?: number;
      unit?: string;
      horizon_days?: number;
      include_history?: boolean;
      force_cold?: boolean;
    } = {}
  ) {
    // Ensure CSRF token is available before making the request
    await this.ensureCSRFToken();

    const response = await this.api.post("/forecast", data);
    return response.data;
  }

  // Enhanced Forecast API
  async postEnhancedForecast(
    data: {
      asset?: string;
      currency?: string;
      horizon_days?: number;
      use_ensemble?: boolean;
      include_feature_importance?: boolean;
      force_cold?: boolean;
    } = {}
  ) {
    await this.ensureCSRFToken();

    const response = await this.api.post("/forecast/enhanced", data);
    return response.data;
  }

  // Market Recommendations API
  async postMarketRecommendation(
    data: {
      asset?: string;
      currency?: string;
    } = {}
  ) {
    await this.ensureCSRFToken();

    const response = await this.api.post("/forecast/recommendations", data);
    return response.data;
  }

  async postForecastEvaluate(payload: {
    rows: Array<{ ds: string; price: number }>;
    horizon_days: number;
    asset: string;
    currency: string;
  }): Promise<ForecastEvaluationResponse> {
    await this.ensureCSRFToken();
    try {
      const response = await this.api.post("/forecast/evaluate", payload);
      return response.data as ForecastEvaluationResponse;
    } catch (error: any) {
      console.error(
        "[API] Forecast evaluate error:",
        error.response?.data || error.message
      );
      if (error.response?.data?.error) {
        console.error(
          "[API] Backend error message:",
          error.response.data.error
        );
      }
      throw error;
    }
  }

  async postLstmEvaluate(payload: {
    rows: Array<{ ds: string; price: number }>;
    horizon_days: number;
  }): Promise<LstmEvaluationResponse> {
    await this.ensureCSRFToken();
    const response = await this.api.post("/ml/eval/lstm", payload);
    return response.data as LstmEvaluationResponse;
  }

  // Alerts API
  async getAlerts(
    params: {
      asset?: string;
      currency?: string;
    } = {}
  ) {
    // Alerts are an authenticated feature.
    // IMPORTANT: Treat 401 as a *successful* response so Axios interceptors don't turn
    // it into a rejected promise (which spams the console via polling queries).
    const response = await this.api.get("/alerts", {
      params,
      validateStatus: (status) => status === 200 || status === 401,
    });
    if (response.status === 401) return { alerts: [] };
    return response.data;
  }

  async createAlert(alertData: {
    asset?: string;
    currency?: string;
    rule_type: "price_above" | "price_below";
    threshold: number;
    direction: "above" | "below";
  }) {
    const response = await this.api.post("/alerts", alertData);
    return response.data;
  }

  async updateAlert(
    alertId: number,
    alertData: {
      asset?: string;
      currency?: string;
      rule_type: "price_above" | "price_below";
      threshold: number;
      direction: "above" | "below";
    }
  ) {
    const response = await this.api.put(`/alerts/${alertId}`, alertData);
    return response.data;
  }

  async runSimulation(simulationData: {
    asset?: string;
    currency?: string;
    days?: number;
    method?: "gbm" | "bootstrap";
    annual_vol?: number | null;
    drift_adj?: number | null;
    n?: number;
  }) {
    const response = await this.api.post("/simulate", simulationData);
    return response.data;
  }

  async deleteAlert(alertId: number) {
    const response = await this.api.delete(`/alerts/${alertId}`);
    return response.data;
  }

  // Backtest methods
  async runBacktest(
    params: {
      horizon?: number;
      step?: number;
      min_train?: number;
      max_cutoffs?: number;
    } = {}
  ) {
    const response = await this.api.get("/backtest", { params });
    return response.data;
  }

  async downloadBacktestResults() {
    const response = await this.api.get("/backtest/download", {
      responseType: "blob",
    });
    return response.data;
  }

  // Provider status methods
  async getProviderStatus() {
    const response = await this.api.get("/provider/status");
    return response.data;
  }

  // Admin-only endpoints
  async getDataSourceStatus() {
    const response = await this.api.get("/admin/data-source");
    return response.data;
  }

  async getMetricsSnapshot() {
    const response = await this.api.get("/metrics/json");
    return response.data;
  }

  async getSchedulerStatus() {
    const response = await this.api.get("/admin/scheduler");
    return response.data;
  }

  // Email notification methods
  async getEmailStatus() {
    const response = await this.api.get("/notifications/status");
    return response.data;
  }

  async sendTestEmail() {
    const response = await this.api.post("/notifications/test");
    return response.data;
  }

  // Model comparison methods
  async postModelComparison(params: {
    horizon_days: number;
    holidays_enabled: boolean;
    weekly_seasonality: boolean;
    yearly_seasonality: boolean;
  }) {
    // Ensure CSRF token is available before making the request
    await this.ensureCSRFToken();

    const response = await this.api.post("/forecast/compare", params);
    return response.data;
  }

  // Drift detection methods
  async getDriftStatus() {
    const response = await this.api.get("/drift/status");
    return response.data;
  }

  // Model health methods
  async getModelHealth() {
    const response = await this.api.get("/admin/model-health");
    return response.data;
  }

  async getComponents(
    asset: string,
    currency: string,
    options: {
      yearly_seasonality?: boolean;
      weekly_seasonality?: boolean;
      holidays?: boolean;
      seasonality_mode?: string;
    } = {}
  ): Promise<{
    asset: string;
    currency: string;
    trend: Array<{ ds: string; value: number }>;
    weekly: Array<{ dow: number; label: string; value: number }>;
    yearly: Array<{ doy: number; ds: string; value: number }>;
    holidays?: Array<{ ds: string; name: string; value: number }>;
    seasonality_mode: string;
    generated_at: string;
  }> {
    const response = await this.api.post("/components", {
      asset,
      currency,
      options,
    });
    return response.data;
  }

  async requestRetrain(reason?: string) {
    const response = await this.api.post("/admin/request-retrain", { reason });
    return response.data;
  }

  async postForecastExplain(data: ComponentsRequest) {
    // Ensure CSRF token is available before making the request
    await this.ensureCSRFToken();

    const response = await this.api.post("/forecast/explain", data);
    return response.data;
  }

  async getStreamingStatus() {
    const response = await this.api.get("/admin/streaming");
    return response.data;
  }

  // User Management API
  async getUsers() {
    const response = await this.api.get("/admin/users");
    return response.data;
  }

  async deleteUser(userId: number) {
    await this.ensureCSRFToken();
    const response = await this.api.delete(`/admin/users/${userId}`);
    return response.data;
  }

  // Admin Analytics API
  async getAlertsAnalytics() {
    const response = await this.api.get("/admin/alerts-analytics");
    return response.data;
  }

  async getDatabaseStats() {
    const response = await this.api.get("/admin/database-stats");
    return response.data;
  }

  async getNewsAnalytics() {
    const response = await this.api.get("/admin/news-analytics");
    return response.data;
  }

  // FX Status API
  async getFxStatus(region?: string) {
    const params = region ? { region } : {};
    try {
      const response = await this.api.get("/fx/status", {
        params,
        // Treat 404 as a valid, handled response to avoid interceptor error logging
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 404,
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        // Endpoint not available; gracefully degrade with empty object
        return {} as any;
      }
      throw error;
    }
  }

  // Spot Rate API
  async getSpotRate() {
    const response = await this.api.get("/spot");
    const data: any = response.data || {};

    // Normalize field names from snake_case to camelCase if needed
    const usdPerOunce = data.usdPerOunce ?? data.usd_per_ounce;
    const usdG24Raw = data.usdPerGram ?? data.usd_per_gram;
    const usdTola24Raw =
      data.usdTola24 ?? (usdG24Raw ? usdG24Raw * GRAMS_PER_TOLA : undefined);

    // Include change and changePercent from the API response
    const change = data.change ?? null;
    const changePercent = data.changePercent ?? null;

    return {
      asOf: data.asOf ?? data.ds ?? null,
      source: data.source ?? data.meta?.source ?? "unknown",
      usdPerOunce: typeof usdPerOunce === "number" ? usdPerOunce : NaN,
      usdPerGram: typeof usdG24Raw === "number" ? usdG24Raw : NaN,
      usdG24: typeof usdG24Raw === "number" ? usdG24Raw : NaN,
      usdTola24: typeof usdTola24Raw === "number" ? usdTola24Raw : NaN,
      change: typeof change === "number" ? change : null,
      changePercent: typeof changePercent === "number" ? changePercent : null,
      meta: data.meta ?? null,
    } as {
      asOf: string | null;
      source: string;
      usdPerOunce: number;
      usdPerGram: number;
      usdG24: number;
      usdTola24: number;
      change: number | null;
      changePercent: number | null;
      meta: any;
    };
  }

  // Yemen Summary API
  async getYemenSummary(region?: string, currency?: string) {
    const params: any = {};
    if (region) params.region = region;
    if (currency) params.currency = currency;
    const response = await this.api.get("/yemen/summary", { params });
    return response.data;
  }

  // Yemen Local Flow API
  async getYemenLocalFlow(
    options: YemenLocalFlowOptions = {}
  ): Promise<YemenLocalFlowResponse> {
    const params: any = {};
    if (options.region) params.region = options.region;
    if (options.includeHistory !== undefined)
      params.includeHistory = options.includeHistory;
    if (options.limitPerRegion) params.limitPerRegion = options.limitPerRegion;
    if (options.days) params.days = options.days;

    const response = await this.api.get("/yemen/local-flow", { params });
    return response.data as YemenLocalFlowResponse;
  }

  // Yemen Summary CSV export
  async exportYemenSummaryCSV(
    region?: string,
    currency?: string,
    tab?: string
  ) {
    const params: any = {};
    if (region) params.region = region;
    if (currency) params.currency = currency;
    if (tab) params.tab = tab;
    const response = await this.api.get("/yemen/summary.csv", {
      params,
      responseType: "blob",
    });
    return response.data;
  }

  // Yemen Regions Configuration API
  async getYemenRegions(locale?: string) {
    const params: any = {};
    if (locale) params.locale = locale;
    const response = await this.api.get("/yemen/regions", { params });
    return response.data;
  }

  // Research Templates API
  async getResearchTemplates(category?: string, locale?: string) {
    const params: any = {};
    if (category) params.category = category;
    if (locale) params.locale = locale;
    const response = await this.api.get("/research/templates", { params });
    return response.data;
  }

  // News API methods
  async getNews(params: NewsParams = {}) {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append("q", params.query);
    if (params.sentiment !== undefined)
      searchParams.append("sentiment", params.sentiment.toString());
    if (params.sort) searchParams.append("sort", params.sort);
    if (params.from) searchParams.append("from", params.from);
    if (params.to) searchParams.append("to", params.to);
    if (params.tag) searchParams.append("tag", params.tag);
    if (params.page_token) searchParams.append("page_token", params.page_token);
    if (params.page_size)
      searchParams.append("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/news?${queryString}` : "/news";

    const response = await this.api.get(url);
    return response.data;
  }

  async fetchNews() {
    const response = await this.api.post("/news/fetcher");
    return response.data;
  }

  async extractOgImage(url: string) {
    const response = await this.api.get(
      `/api/og?url=${encodeURIComponent(url)}`
    );
    return response.data;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Legacy API for backward compatibility
const api = apiClient["api"];

// Export the API client
export { apiClient };

// Type aliases using generated OpenAPI types
export type PriceData = components["schemas"]["PriceData"];

export type ForecastData = components["schemas"]["ForecastResponse"];

export type AlertData = components["schemas"]["Alert"];

// Response types using generated OpenAPI types
export type PricesResponse =
  paths["/prices"]["get"]["responses"]["200"]["content"]["application/json"];
export type ForecastResponse =
  paths["/forecast"]["post"]["responses"]["200"]["content"]["application/json"];
export type AlertsResponse =
  paths["/alerts"]["get"]["responses"]["200"]["content"]["application/json"];

export interface ComponentsRequest {
  asset: string;
  currency: string;
  options?: {
    yearly_seasonality?: boolean;
    weekly_seasonality?: boolean;
    holidays?: boolean;
    seasonality_mode?: "additive" | "multiplicative";
  };
}

export interface ComponentsResponse {
  asset: string;
  currency: string;
  trend: Array<{ ds: string; value: number }>;
  weekly: Array<{ dow: number; label: string; value: number }>;
  yearly: Array<{ doy: number; ds: string; value: number }>;
  holidays?: Array<{ ds: string; name: string; value: number }>;
  seasonality_mode: string;
  generated_at: string;
}

export interface ForecastPointLite {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface ForecastEvaluationResponse {
  success: boolean;
  horizon_days: number;
  metrics: Record<string, number>;
  folds?: number;
  evaluation_date?: string;
  residuals?: ResidualsData[];
}

export interface LstmEvaluationResponse {
  success: boolean;
  horizon_days: number;
  forecast: ForecastPointLite[];
  metrics: Record<string, number>;
  evaluation_date: string;
  note?: string;
}

// Legacy API functions for backward compatibility
export const healthCheck = () => apiClient.healthCheck();
export const getPrices = (
  params: {
    asset?: string;
    currency?: string;
    region?: string;
    karat?: number;
    unit?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}
) => apiClient.getPrices(params);

// Get real-time spot price from GoldAPI.io
export const getSpotPrice = async (): Promise<{
  asOf: string;
  source: string;
  usdPerOunce: number;
  usdG24: number;
  usdTola24: number;
  change: number | null;
  changePercent: number | null;
  meta: any;
}> => {
  return apiClient.getSpotRate();
};

export const fetchLatestPrice = () => apiClient.fetchLatestPrice();
export const ingestPrices = (rows: PriceData[]) => apiClient.ingestPrices(rows);
export const postForecast = (
  data: {
    asset?: string;
    currency?: string;
    region?: string;
    karat?: number;
    unit?: string;
    horizon_days?: number;
    include_history?: boolean;
    force_cold?: boolean;
  } = {}
) => apiClient.postForecast(data);

export const postEnhancedForecast = (
  data: {
    asset?: string;
    currency?: string;
    horizon_days?: number;
    use_ensemble?: boolean;
    include_feature_importance?: boolean;
    force_cold?: boolean;
  } = {}
) => apiClient.postEnhancedForecast(data);

export const postMarketRecommendation = (
  data: {
    asset?: string;
    currency?: string;
  } = {}
) => apiClient.postMarketRecommendation(data);

export const postForecastEvaluate = (payload: {
  rows: Array<{ ds: string; price: number }>;
  horizon_days: number;
  asset: string;
  currency: string;
}) => apiClient.postForecastEvaluate(payload);

export const postLstmEvaluate = (payload: {
  rows: Array<{ ds: string; price: number }>;
  horizon_days: number;
}) => apiClient.postLstmEvaluate(payload);

export const postComponents = (
  data: ComponentsRequest
): Promise<ComponentsResponse> => apiClient.postForecastExplain(data);

export const getStreamingStatus = (): Promise<{
  status: string;
  connected_clients: number;
  clients_by_asset: Record<string, number>;
  simulator_running: boolean;
  last_broadcast: string;
  messages_per_minute: string;
}> => apiClient.getStreamingStatus();

export const getUsers = () => apiClient.getUsers();
export const deleteUser = (userId: number) => apiClient.deleteUser(userId);

// Admin Analytics functions
export const getAlertsAnalytics = () => apiClient.getAlertsAnalytics();
export const getDatabaseStats = () => apiClient.getDatabaseStats();
export const getNewsAnalytics = () => apiClient.getNewsAnalytics();

export const getFxStatus = (region?: string) => apiClient.getFxStatus(region);
export const getAlerts = (params?: { asset?: string; currency?: string }) =>
  apiClient.getAlerts(params);
export const createAlert = (alertData: {
  rule_type: "price_above" | "price_below";
  threshold: number;
  direction: "above" | "below";
}) => apiClient.createAlert(alertData);
export const updateAlert = (
  alertId: number,
  alertData: {
    rule_type: "price_above" | "price_below";
    threshold: number;
    direction: "above" | "below";
  }
) => apiClient.updateAlert(alertId, alertData);
export const deleteAlert = (alertId: number) => apiClient.deleteAlert(alertId);
export const runSimulation = (simulationData: {
  asset?: string;
  currency?: string;
  days?: number;
  method?: "gbm" | "bootstrap";
  annual_vol?: number | null;
  drift_adj?: number | null;
  n?: number;
}) => apiClient.runSimulation(simulationData);
export const runBacktest = (
  params: {
    horizon?: number;
    step?: number;
    min_train?: number;
    max_cutoffs?: number;
  } = {}
) => apiClient.runBacktest(params);

export const downloadBacktestResults = () =>
  apiClient.downloadBacktestResults();

export const getProviderStatus = () => apiClient.getProviderStatus();

// Admin API functions
export const getDataSourceStatus = () => apiClient.getDataSourceStatus();
export const getMetricsSnapshot = () => apiClient.getMetricsSnapshot();
export const getSchedulerStatus = () => apiClient.getSchedulerStatus();

// Email notification functions
export const getEmailStatus = () => apiClient.getEmailStatus();
export const sendTestEmail = () => apiClient.sendTestEmail();

// Model comparison functions
export const postModelComparison = (params: {
  horizon_days: number;
  holidays_enabled: boolean;
  weekly_seasonality: boolean;
  yearly_seasonality: boolean;
}) => apiClient.postModelComparison(params);

// Drift detection functions
export const getDriftStatus = () => apiClient.getDriftStatus();

// Model health functions
export const getModelHealth = () => apiClient.getModelHealth();
export const getComponents = (asset: string, currency: string, options?: any) =>
  apiClient.getComponents(asset, currency, options);
export const requestRetrain = (reason?: string) =>
  apiClient.requestRetrain(reason);

// Yemen pricing functions
export const getSpotRate = () => apiClient.getSpotRate();
export const getYemenSummary = (region?: string, currency?: string) =>
  apiClient.getYemenSummary(region, currency);
export const exportYemenSummaryCSV = (
  region?: string,
  currency?: string,
  tab?: string
) => apiClient.exportYemenSummaryCSV(region, currency, tab);
export const getYemenRegions = (locale?: string) =>
  apiClient.getYemenRegions(locale);
export const getYemenLocalFlow = (options?: YemenLocalFlowOptions) =>
  apiClient.getYemenLocalFlow(options ?? {});

export const getHistoricalRegionalPrices = async (
  region: string,
  days: number = 7,
  karat: number = 24
): Promise<{
  success: boolean;
  data: Array<{
    date: string;
    price: number;
    priceYer: number;
    usdPerOunce: number;
  }>;
  region: string;
  karat: number;
  days: number;
}> => {
  // Add timestamp to prevent caching when parameters change
  const timestamp = Date.now();
  const response = await api.get(
    `/yemen/regional-prices/historical?region=${region}&days=${days}&karat=${karat}&_t=${timestamp}`
  );
  return response.data;
};

export const getYemenPremium = async (
  region: string = "ADEN",
  days: number = 30
): Promise<{
  success: boolean;
  premium: number;
  source: string;
  region: string;
  min?: number;
  max?: number;
  stdDev?: number;
  sampleSize?: number;
  days?: number;
  note?: string;
}> => {
  const response = await api.get(
    `/yemen/premium?region=${region}&days=${days}`
  );
  return response.data;
};

// ============================================
// Gold Shops API
// ============================================

export interface ShopFilters {
  region?: string; // Legacy field
  governorate?: string; // New field for governorate
  district?: string; // New field for district
  maxDistance?: number;
  minRating?: number;
  certifiedOnly?: boolean;
  searchQuery?: string;
  services?: string[];
  priceMin?: number;
  priceMax?: number;
  lat?: number;
  lng?: number;
}

export const getShops = async (
  filters: ShopFilters = {}
): Promise<{
  success: boolean;
  data: any[];
}> => {
  const params = new URLSearchParams();

  // Legacy region support
  if (filters.region) params.append("region", filters.region);
  // New governorate/district support
  if (filters.governorate) params.append("governorate", filters.governorate);
  if (filters.district) params.append("district", filters.district);
  if (filters.maxDistance)
    params.append("maxDistance", filters.maxDistance.toString());
  if (filters.minRating)
    params.append("minRating", filters.minRating.toString());
  if (filters.certifiedOnly) params.append("certifiedOnly", "true");
  if (filters.searchQuery) params.append("searchQuery", filters.searchQuery);
  if (filters.services) {
    filters.services.forEach((s) => params.append("services", s));
  }
  if (filters.priceMin) params.append("priceMin", filters.priceMin.toString());
  if (filters.priceMax) params.append("priceMax", filters.priceMax.toString());
  if (filters.lat) params.append("lat", filters.lat.toString());
  if (filters.lng) params.append("lng", filters.lng.toString());

  const response = await api.get(`/api/shops?${params.toString()}`);
  return response.data;
};

export const getShopById = async (
  id: string
): Promise<{
  success: boolean;
  data: any;
}> => {
  const response = await api.get(`/api/shops/${id}`);
  return response.data;
};

export const createShopReview = async (
  shopId: string,
  rating: number,
  comment: string,
  userName?: string
): Promise<{
  success: boolean;
  data: any;
}> => {
  const response = await api.post(`/api/shops/${shopId}/reviews`, {
    rating,
    comment,
    userName,
  });
  return response.data;
};

export const createShop = async (shopData: {
  name: string;
  nameAr?: string;
  region: string;
  lat: number;
  lng: number;
  address: string;
  addressAr?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  openingHoursAr?: string;
  description?: string;
  descriptionAr?: string;
  priceMin?: number;
  priceMax?: number;
  services?: string[];
  certified?: boolean;
}): Promise<{
  success: boolean;
  data: any;
  message?: string;
}> => {
  const response = await api.post("/api/shops", shopData);
  return response.data;
};

export const updateShop = async (
  shopId: string,
  shopData: Partial<{
    name: string;
    nameAr: string;
    region: string;
    lat: number;
    lng: number;
    address: string;
    addressAr: string;
    phone: string;
    email: string;
    website: string;
    openingHours: string;
    openingHoursAr: string;
    description: string;
    descriptionAr: string;
    priceMin: number;
    priceMax: number;
    services: string[];
    certified: boolean;
  }>
): Promise<{
  success: boolean;
  data: any;
}> => {
  const response = await api.put(`/api/shops/${shopId}`, shopData);
  return response.data;
};

export const addShopPhoto = async (
  shopId: string,
  photoData: {
    url: string;
    thumbnail?: string;
    caption?: string;
  }
): Promise<{
  success: boolean;
  data: any;
}> => {
  const response = await api.post(`/api/shops/${shopId}/photos`, photoData);
  return response.data;
};

export const verifyShop = async (
  shopId: string,
  verification: {
    verified?: boolean;
    certified?: boolean;
  }
): Promise<{
  success: boolean;
  data: any;
  message?: string;
}> => {
  const response = await api.post(`/api/shops/${shopId}/verify`, verification);
  return response.data;
};

export const getYemenPremiumRealtime = async (
  region: string = "ADEN"
): Promise<{
  success: boolean;
  premium: number;
  region: string;
  spotPrice: { usdPerOunce: number; usdPerGram: number };
  regionalPrice: { usdPerGram: number; yerPerGram: number };
  historical: {
    avg: number;
    min: number;
    max: number;
    stdDev: number;
  } | null;
  change: {
    absolute: number;
    percent: number;
  } | null;
  timestamp: string;
  source: string;
}> => {
  const response = await api.get(`/yemen/premium/realtime?region=${region}`);
  return response.data;
};

// Research Templates API
export const getResearchTemplates = (category?: string, locale?: string) =>
  apiClient.getResearchTemplates(category, locale);

// React Query hooks for Yemen pricing
export const useSpotRate = () => {
  return useQuery({
    queryKey: ["spot-rate"],
    queryFn: () => apiClient.getSpotRate(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useYemenSummary = (region?: string, currency?: string) => {
  return useQuery({
    queryKey: ["yemen-summary", region, currency],
    queryFn: () => apiClient.getYemenSummary(region, currency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // 1 second between retries
  });
};

export const useYemenRegions = (locale?: string) => {
  return useQuery({
    queryKey: ["yemen-regions", locale],
    queryFn: () => apiClient.getYemenRegions(locale),
    staleTime: 60 * 60 * 1000, // 1 hour - regions don't change often
  });
};

export const useYemenLocalFlow = (options?: YemenLocalFlowOptions) => {
  const opts = options ?? {};
  return useQuery({
    queryKey: [
      "yemen-local-flow",
      opts.region ?? null,
      opts.includeHistory ?? false,
      opts.limitPerRegion ?? null,
      opts.days ?? null,
    ],
    queryFn: () => apiClient.getYemenLocalFlow(opts),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (opts.includeHistory ? 15 : 5) * 60 * 1000,
  });
};

export const useResearchTemplates = (category?: string, locale?: string) => {
  return useQuery({
    queryKey: ["research-templates", category, locale],
    queryFn: () => apiClient.getResearchTemplates(category, locale),
    staleTime: 30 * 60 * 1000, // 30 minutes - templates might be updated
  });
};

// ============================================================================
// NEWS API FUNCTIONS - Real-Time News MVP
// ============================================================================

export type NewsItem = components["schemas"]["NewsArticle"];

export type NewsResponse =
  paths["/news/aggregate"]["get"]["responses"]["200"]["content"]["application/json"];

export interface NewsParams {
  query?: string;
  sentiment?: number;
  sort?: "top" | "latest";
  from?: string;
  to?: string;
  tag?: string;
  page_token?: string;
  page_size?: number;
}

// News API functions
export const getNews = (params: NewsParams = {}): Promise<NewsResponse> => {
  // Validate and sanitize input parameters
  const validatedParams: NewsParams = {};

  if (params.query) {
    validatedParams.query = sanitizeString(params.query);
  }

  if (params.sentiment !== undefined) {
    if (params.sentiment < -1 || params.sentiment > 1) {
      throw new Error("Invalid sentiment parameter: must be between -1 and 1");
    }
    validatedParams.sentiment = params.sentiment;
  }

  if (params.sort && !["top", "latest"].includes(params.sort)) {
    throw new Error('Invalid sort parameter: must be "top" or "latest"');
  }
  validatedParams.sort = params.sort;

  if (params.from) {
    validatedParams.from = sanitizeString(params.from);
  }

  if (params.to) {
    validatedParams.to = sanitizeString(params.to);
  }

  if (params.tag) {
    validatedParams.tag = sanitizeString(params.tag);
  }

  if (params.page_token) {
    validatedParams.page_token = sanitizeString(params.page_token);
  }

  if (params.page_size !== undefined) {
    if (!validateNewsLimit(params.page_size)) {
      throw new Error("Invalid page_size parameter: must be between 1 and 100");
    }
    validatedParams.page_size = params.page_size;
  }

  return apiClient.getNews(validatedParams);
};

export const fetchNews = (): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> => {
  return apiClient.fetchNews();
};

export const extractOgImage = (
  url: string
): Promise<{ url: string; image: string | null; timestamp: string }> => {
  return apiClient.extractOgImage(url);
};

// React Query hooks for news
export const useNews = (params: NewsParams = {}) => {
  return useQuery({
    queryKey: ["news", params],
    queryFn: () => getNews(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useNewsInfinite = (params: NewsParams = {}) => {
  return useInfiniteQuery({
    queryKey: ["news-infinite", params],
    queryFn: ({ pageParam }) =>
      getNews({ ...params, page_token: pageParam as string }),
    getNextPageParam: (lastPage: any) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    initialPageParam: "",
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Technical Analysis API
export interface TechnicalAnalysisData {
  currentPrice: number;
  change: number;
  changePercent: number;
  volatility: number;
  trend: "bullish" | "bearish" | "neutral";
  sentiment: "greed" | "fear" | "neutral";
  rsi: number;
  macd: number;
  signal: number;
  histogram: number;
  sma20: number;
  sma50: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  support: number;
  resistance: number;
  momentum: number;
  volume: number;
  marketCap: number;
  liquidity: "low" | "medium" | "high";
}

export interface TechnicalAnalysisResponse {
  success: boolean;
  data: TechnicalAnalysisData;
  period: number;
  dataPoints: number;
  lastUpdated: string;
}

export const getTechnicalAnalysis = async (
  params: {
    period?: number;
    limit?: number;
  } = {}
): Promise<TechnicalAnalysisResponse> => {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append("period", params.period.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());

  const response = await api.get(`/technical-analysis?${queryParams}`);
  return response.data;
};

export const useTechnicalAnalysis = (
  params: {
    period?: number;
    limit?: number;
  } = {}
) => {
  return useQuery({
    queryKey: ["technical-analysis", params],
    queryFn: () => getTechnicalAnalysis(params),
    refetchInterval: 60000, // Update every minute
    staleTime: 30000, // 30 seconds
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// OHLC Data Types and Functions
export interface OHLCData {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  priceRange?: number;
  volatility?: number;
}

export interface OHLCResponse {
  success: boolean;
  data: OHLCData[];
  source: string;
  count: number;
  total_count: number;
  meta?: any;
  lastUpdated: string;
}

export const getOHLCData = async (
  params: {
    days?: number;
    limit?: number;
  } = {}
): Promise<OHLCResponse> => {
  // Validate input parameters
  if (params.days && !validateDays(params.days)) {
    throw new Error("Invalid days parameter: must be between 1 and 365");
  }

  if (params.limit && !validateLimit(params.limit)) {
    throw new Error("Invalid limit parameter: must be between 1 and 1000");
  }

  const queryParams = new URLSearchParams();
  if (params.days) queryParams.append("days", params.days.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());

  const response = await api.get(`/ohlc?${queryParams}`);
  return response.data;
};

export const useOHLCData = (
  params: {
    days?: number;
    limit?: number;
  } = {}
) => {
  return useQuery({
    queryKey: ["ohlc-data", params, Math.floor(Date.now() / 300000)], // Force cache invalidation every 5 minutes
    queryFn: () => getOHLCData(params),
    refetchInterval: 300000, // Update every 5 minutes (reduced from 30 seconds)
    staleTime: 120000, // Cache for 2 minutes (increased from 0)
  });
};

// Alert Performance Types and Functions
export interface AlertPerformanceData {
  alertId: number;
  accuracy: number;
  totalTriggers: number;
  successfulTriggers: number;
  avgResponseTime: number;
  profitability: number;
  lastTriggered: string | null;
  createdAt: string;
  ruleType: string;
  threshold: number;
  direction: string;
  asset: string;
  currency: string;
}

export interface AlertPerformanceResponse {
  success: boolean;
  data: AlertPerformanceData[];
  count: number;
  lastUpdated: string;
}

export const getAlertPerformance =
  async (): Promise<AlertPerformanceResponse> => {
    const response = await api.get("/alerts/performance");
    return response.data;
  };

export const useAlertPerformance = () => {
  return useQuery({
    queryKey: ["alert-performance"],
    queryFn: getAlertPerformance,
    refetchInterval: 300000, // Update every 5 minutes
    staleTime: 120000, // 2 minutes
  });
};

// Predictive alert recommendation helpers
export interface PredictiveAlertRecommendation {
  type: string;
  direction: "above" | "below";
  price: number;
  reasoning: string;
  probability: number;
  expectedDays: number;
  confidence: "high" | "medium" | "low";
  action: string;
  priority: "high" | "medium" | "low";
}

export interface PredictiveAlertRecommendationsResponse {
  success: boolean;
  currentPrice: number;
  recommendations: PredictiveAlertRecommendation[];
  levels?: Record<string, unknown>;
  bollinger?: Record<string, number>;
  volatility?: number;
  generatedAt?: string;
}

export const getPredictiveAlertRecommendations = async (
  params: {
    asset?: string;
    currency?: string;
  } = {}
): Promise<PredictiveAlertRecommendationsResponse> => {
  const response = await api.get("/ai/alerts/recommendations", {
    params,
  });
  return response.data;
};

export const usePredictiveAlertRecommendations = (
  params: { asset?: string; currency?: string } = {},
  options: { enabled?: boolean } = {}
) => {
  const { asset, currency } = params;
  return useQuery({
    queryKey: [
      "predictive-alert-recommendations",
      asset ?? "XAU",
      currency ?? "USD",
    ],
    queryFn: () => getPredictiveAlertRecommendations(params),
    refetchInterval: 300000,
    staleTime: 120000,
    retry: 1,
    enabled: options.enabled ?? true,
  });
};

export const createAIRecommendedAlerts = async (
  maxAlerts: number = 3
): Promise<{ success: boolean; created: number }> => {
  await apiClient.ensureCSRFToken();
  const response = await api.post("/ai/alerts/create-recommended", {
    maxAlerts,
  });
  return response.data;
};

// Market Conditions Types and Functions for Dynamic Scenario Generation
export interface MarketConditions {
  currentPrice: number;
  volatility: number;
  trend: "bullish" | "bearish" | "neutral";
  sentiment: "greed" | "fear" | "neutral";
  rsi: number;
  macd: number;
  marketRegime: "normal" | "euphoric" | "panic" | "uptrend" | "downtrend";
  riskLevel: "low" | "medium" | "high";
  volatilityRegime: "low" | "moderate" | "high";
  baseDrift: number;
  timestamp: string;
}

export interface MarketConditionsResponse {
  success: boolean;
  data: MarketConditions;
  lastUpdated: string;
}

export const getMarketConditions =
  async (): Promise<MarketConditionsResponse> => {
    const response = await api.get("/market-conditions");
    return response.data;
  };

export const useMarketConditions = () => {
  return useQuery({
    queryKey: ["market-conditions"],
    queryFn: getMarketConditions,
    refetchInterval: 300000, // Update every 5 minutes
    staleTime: 120000, // 2 minutes
  });
};

// Multi-asset data for AdvancedVisualizations
export interface MultiAssetData {
  timestamp: string;
  assets: {
    [key: string]: {
      name: string;
      symbol: string;
      data: Array<{
        ds: string;
        price: number;
        open: number;
        high: number;
        low: number;
        volume: number;
      }>;
      currentPrice: number;
      change: number;
      changePercent: number;
      source: string;
      lastUpdated: string;
      error?: string;
    };
  };
  period: string;
  source: string;
}

export async function getMultiAssetData(
  days: number = 30
): Promise<MultiAssetData> {
  const response = await api.get(`/multi-asset?days=${days}`);
  return response.data;
}

export function useMultiAssetData(days: number = 30) {
  return useQuery({
    queryKey: ["multi-asset", days],
    queryFn: () => getMultiAssetData(days),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000, // 2 minutes
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // 1 second between retries
  });
}

export interface DebugInfo {
  decisionTrace: Array<{
    step: number;
    action: string;
    reasoning: string;
    confidence: number;
    timestamp: string;
  }>;
  toolUsage: Array<{
    tool_name: string;
    called: boolean;
    success: boolean;
    response_time_ms: number;
    error_message?: string;
  }>;
  executionTime: number;
  scenarioId: string;
  category: string;
  lastUpdated?: string;
}

export interface DebugResponse {
  success: boolean;
  data: DebugInfo;
  timestamp: string;
}

export async function getDebugData(): Promise<DebugResponse> {
  const response = await api.get("/debug/copilot");
  return response.data;
}

export function useDebugData() {
  return useQuery({
    queryKey: ["debug-copilot"],
    queryFn: getDebugData,
    refetchInterval: 2000, // 2 seconds for real-time updates
    staleTime: 1000, // 1 second
    enabled: false, // Only fetch when explicitly enabled
  });
}

// ============================================================================
// PORTFOLIO MANAGEMENT API FUNCTIONS
// ============================================================================

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  transactions: Transaction[];
  holdings: Holding[];
}

export interface Transaction {
  id: string;
  portfolioId: string;
  type: "BUY" | "SELL";
  asset: "XAU";
  amount: number;
  price: number;
  totalValue: number;
  fees?: number;
  currency: string;
  timestamp: string;
  notes?: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  asset: "XAU";
  amount: number;
  avgCost: number;
  totalCost: number;
  currentValue: number;
  currency: string;
  updatedAt: string;
}

export interface PortfolioResponse {
  portfolios: Portfolio[];
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
}

export interface CreateTransactionRequest {
  type: "BUY" | "SELL";
  asset: "XAU";
  amount: number;
  price: number;
  fees?: number;
  notes?: string;
}

// Portfolio API functions
export async function getPortfolios(): Promise<PortfolioResponse> {
  const response = await api.get("/portfolios");
  return response.data;
}

export async function createPortfolio(
  data: CreatePortfolioRequest
): Promise<{ portfolio: Portfolio }> {
  const response = await api.post("/portfolios", data);
  return response.data;
}

export async function addTransaction(
  portfolioId: string,
  data: CreateTransactionRequest
): Promise<{ transaction: Transaction }> {
  const response = await api.post(
    `/portfolios/${portfolioId}/transactions`,
    data
  );
  return response.data;
}

export async function updateHoldings(
  portfolioId: string
): Promise<{ holdings: Holding[] }> {
  const response = await api.put(`/portfolios/${portfolioId}/holdings`);
  return response.data;
}

// Portfolio React Query hooks
export function usePortfolios() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: getPortfolios,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      portfolioId,
      data,
    }: {
      portfolioId: string;
      data: CreateTransactionRequest;
    }) => addTransaction(portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useUpdateHoldings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateHoldings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

// ============================================================================
// MARKET INTELLIGENCE API FUNCTIONS
// ============================================================================

export interface SentimentData {
  overall: number;
  news: number;
  social: number;
  analyst: number;
  retail: number;
  institutional: number;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  historical: Array<{
    date: string;
    sentiment: number;
    price: number;
  }>;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  importance: "high" | "medium" | "low";
  date: string;
  time: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface CorrelationData {
  asset: string;
  correlation: number;
  significance: number;
  trend: "strengthening" | "weakening" | "stable";
}

export interface SeasonalData {
  month: string;
  avgReturn: number;
  volatility: number;
  strength: "strong" | "moderate" | "weak";
}

// Market Intelligence API functions
export async function getSentimentData(
  range: string = "7d"
): Promise<SentimentData> {
  const response = await api.get(`/intelligence/sentiment?range=${range}`);
  const data = response.data;
  return {
    overall: data.score || 0.75,
    news: data.breakdown?.news?.score || 0.8,
    social: data.breakdown?.social?.score || 0.7,
    analyst: data.breakdown?.analyst?.score || 0.8,
    retail: 0.6, // Mock data
    institutional: 0.7, // Mock data
    trend:
      data.overall === "bullish"
        ? "bullish"
        : data.overall === "bearish"
        ? "bearish"
        : "neutral",
    confidence: data.confidence || 0.85,
    historical: data.trends || [],
  };
}

export async function getEconomicEvents(
  range: string = "7d"
): Promise<EconomicEvent[]> {
  const response = await api.get(
    `/intelligence/economic-events?range=${range}`
  );
  const events = response.data.events || [];

  // Convert numeric importance to string format
  return events.map((event: any) => ({
    ...event,
    importance:
      event.importance >= 0.8
        ? "high"
        : event.importance >= 0.6
        ? "medium"
        : "low",
  }));
}

export async function getCorrelationData(
  range: string = "7d"
): Promise<CorrelationData[]> {
  const response = await api.get(`/intelligence/correlations?range=${range}`);
  return response.data.correlations
    ? Object.entries(response.data.correlations).map(
        ([asset, data]: [string, any]) => ({
          asset,
          correlation: data.value,
          significance: 0.85, // Mock significance
          trend:
            data.strength === "strong"
              ? "strengthening"
              : data.strength === "moderate"
              ? "stable"
              : "weakening",
        })
      )
    : [];
}

export async function getSeasonalData(): Promise<SeasonalData[]> {
  const response = await api.get("/intelligence/seasonal");
  return response.data.patterns?.monthly || [];
}

// Market Intelligence React Query hooks
export function useSentimentData(range: string = "7d") {
  return useQuery({
    queryKey: ["sentiment", range],
    queryFn: () => getSentimentData(range),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000, // 2 minutes
  });
}

export function useEconomicEvents(range: string = "7d") {
  return useQuery({
    queryKey: ["economic-events", range],
    queryFn: () => getEconomicEvents(range),
    refetchInterval: 600000, // 10 minutes
    staleTime: 300000, // 5 minutes
  });
}

export function useCorrelationData(range: string = "7d") {
  return useQuery({
    queryKey: ["correlations", range],
    queryFn: () => getCorrelationData(range),
    refetchInterval: 600000, // 10 minutes
    staleTime: 300000, // 5 minutes
  });
}

export function useSeasonalData() {
  return useQuery({
    queryKey: ["seasonal"],
    queryFn: getSeasonalData,
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
  });
}

export default api;
