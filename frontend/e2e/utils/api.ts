import { APIRequestContext, expect } from "@playwright/test";

const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiClient {
  constructor(private request: APIRequestContext) {}

  async healthCheck() {
    const response = await this.request.get(`${API_BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async seedPrices(prices: Array<{ ds: string; price: number }>) {
    const response = await this.request.post(`${API_BASE_URL}/prices/ingest`, {
      data: { rows: prices },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async getPrices(params: { from?: string; to?: string; limit?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.from) searchParams.set("from", params.from);
    if (params.to) searchParams.set("to", params.to);
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const response = await this.request.get(
      `${API_BASE_URL}/prices?${searchParams}`
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async generateForecast(
    data: { horizon_days?: number; include_history?: boolean } = {}
  ) {
    const response = await this.request.post(`${API_BASE_URL}/forecast`, {
      data: {
        horizon_days: data.horizon_days || 14,
        include_history: data.include_history || true,
      },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async createAlert(
    alertData: {
      rule_type: "price_above" | "price_below";
      threshold: number;
      direction: "above" | "below";
    },
    userId = 1
  ) {
    const response = await this.request.post(
      `${API_BASE_URL}/alerts?user_id=${userId}`,
      {
        data: alertData,
      }
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async getAlerts(userId = 1) {
    const response = await this.request.get(
      `${API_BASE_URL}/alerts?user_id=${userId}`
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async deleteAlert(alertId: number, userId = 1) {
    const response = await this.request.delete(
      `${API_BASE_URL}/alerts/${alertId}?user_id=${userId}`
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async fetchLatestPrice() {
    const response = await this.request.post(`${API_BASE_URL}/fetch-latest`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
}

export async function waitForApiResponse(
  page: {
    waitForResponse: (
      predicate: (response: {
        url: () => string;
        status: () => number;
      }) => boolean,
      options: { timeout: number }
    ) => Promise<{ url: () => string; status: () => number }>;
  },
  url: string,
  timeout = 10000
) {
  return page.waitForResponse(
    (response) => response.url().includes(url) && response.status() === 200,
    { timeout }
  );
}

export async function waitForChartRender(
  page: {
    waitForSelector: (
      selector: string,
      options: { timeout: number }
    ) => Promise<{ waitForTimeout: (ms: number) => Promise<void> }>;
  },
  selector = "canvas"
) {
  await page.waitForSelector(selector, { timeout: 10000 });
  // Wait a bit more for chart to fully render
  await page.waitForTimeout(1000);
}

export function generateSamplePrices(days: number = 30) {
  const prices = [];
  const basePrice = 2000;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic price movement
    const change = (Math.random() - 0.5) * 50;
    const price = Math.max(
      1500,
      Math.min(2500, basePrice + change + (days - i) * 2)
    );

    prices.push({
      ds: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }

  return prices;
}
