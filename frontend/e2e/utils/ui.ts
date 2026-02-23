import { Page } from "@playwright/test";

export class UIActions {
  constructor(private page: Page) {}

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  async waitForDashboard() {
    await this.page.waitForSelector('[data-testid="dashboard"]', {
      timeout: 10000,
    });
  }

  async waitForTrends() {
    await this.page.waitForSelector('[data-testid="trends"]', {
      timeout: 10000,
    });
  }

  async waitForAlerts() {
    await this.page.waitForSelector('[data-testid="alerts"]', {
      timeout: 10000,
    });
  }

  async waitForPriceCard() {
    await this.page.waitForSelector('[data-testid="price-card"]', {
      timeout: 10000,
    });
  }

  async waitForForecastChart() {
    await this.page.waitForSelector("canvas", { timeout: 10000 });
    // Wait for chart to fully render
    await this.page.waitForTimeout(2000);
  }

  async waitForAlertForm() {
    await this.page.waitForSelector('[data-testid="alert-form"]', {
      timeout: 10000,
    });
  }

  async waitForAlertList() {
    await this.page.waitForSelector('[data-testid="alert-list"]', {
      timeout: 10000,
    });
  }

  async clickCreateAlert() {
    await this.page.click('[data-testid="create-alert-button"]');
  }

  async fillAlertForm(alertData: {
    rule_type: "price_above" | "price_below";
    threshold: number;
    direction: "above" | "below";
  }) {
    // Select alert type
    await this.page.selectOption(
      '[data-testid="alert-type-select"]',
      alertData.rule_type
    );

    // Select direction
    await this.page.selectOption(
      '[data-testid="direction-select"]',
      alertData.direction
    );

    // Enter threshold
    await this.page.fill(
      '[data-testid="threshold-input"]',
      alertData.threshold.toString()
    );
  }

  async submitAlertForm() {
    await this.page.click('[data-testid="submit-alert-button"]');
  }

  async cancelAlertForm() {
    await this.page.click('[data-testid="cancel-alert-button"]');
  }

  async deleteAlert(alertId: number) {
    await this.page.click(`[data-testid="delete-alert-${alertId}"]`);
    // Confirm deletion
    await this.page.click("text=OK");
  }

  async refreshData() {
    await this.page.click('[data-testid="refresh-data-button"]');
  }

  async waitForLoadingSpinner() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', {
      timeout: 5000,
    });
  }

  async waitForLoadingSpinnerToDisappear() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', {
      state: "hidden",
      timeout: 10000,
    });
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`text=${message}`, { timeout: 5000 });
  }

  async waitForErrorBanner() {
    await this.page.waitForSelector('[data-testid="error-banner"]', {
      timeout: 5000,
    });
  }

  async getPriceValue() {
    const priceElement = await this.page.waitForSelector(
      '[data-testid="current-price"]'
    );
    const priceText = await priceElement.textContent();
    return priceText?.replace(/[$,]/g, "") || "";
  }

  async getForecastValue() {
    const forecastElement = await this.page.waitForSelector(
      '[data-testid="forecast-price"]'
    );
    const forecastText = await forecastElement.textContent();
    return forecastText?.replace(/[$,]/g, "") || "";
  }

  async getAlertCount() {
    const alerts = await this.page.$$('[data-testid^="alert-item-"]');
    return alerts.length;
  }

  async getAlertText(alertId: number) {
    const alertElement = await this.page.waitForSelector(
      `[data-testid="alert-item-${alertId}"]`
    );
    return await alertElement.textContent();
  }

  async waitForChartData() {
    // Wait for chart to have data by checking if canvas has been drawn on
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some((pixel) => pixel !== 0);
      },
      { timeout: 10000 }
    );
  }
}

// Standalone utility functions
export async function waitForChartToRender(page: Page, selector: string) {
  await page.waitForSelector(selector, { timeout: 10000 });
  // Wait for chart to fully render
  await page.waitForTimeout(2000);
}

export async function expectToast(page: Page, message: string) {
  await page.waitForSelector(`text=${message}`, { timeout: 5000 });
}
