import { test, expect } from "@playwright/test";
import { ApiClient, generateSamplePrices } from "./utils/api";
import { UIActions } from "./utils/ui";

test.describe("UI Smoke Tests", () => {
  let api: ApiClient;
  let ui: UIActions;

  test.beforeEach(async ({ request, page }) => {
    api = new ApiClient(request);
    ui = new UIActions(page);

    // Ensure backend is healthy
    await api.healthCheck();

    // Seed database with sample data
    const samplePrices = generateSamplePrices(30);
    await api.seedPrices(samplePrices);
  });

  test("dashboard should show current price and forecast summary", async ({
    page,
  }) => {
    // Navigate to dashboard
    await ui.navigateTo("/dashboard");
    await ui.waitForDashboard();

    // Wait for API calls to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes("/prices") && response.status() === 200
    );
    await page.waitForResponse(
      (response) =>
        response.url().includes("/forecast") && response.status() === 200
    );

    // Check that price card is displayed
    await ui.waitForPriceCard();

    // Verify current price is displayed
    const currentPrice = await ui.getPriceValue();
    expect(currentPrice).toBeTruthy();
    expect(parseFloat(currentPrice)).toBeGreaterThan(0);

    // Verify forecast price is displayed
    const forecastPrice = await ui.getForecastValue();
    expect(forecastPrice).toBeTruthy();
    expect(parseFloat(forecastPrice)).toBeGreaterThan(0);

    // Verify chart is rendered
    await ui.waitForForecastChart();
    await ui.waitForChartData();

    console.log("✅ Dashboard smoke test passed");
    console.log(`Current price: $${currentPrice}`);
    console.log(`Forecast price: $${forecastPrice}`);
  });

  test("trends page should render chart with history and forecast", async ({
    page,
  }) => {
    // Navigate to trends
    await ui.navigateTo("/trends");
    await ui.waitForTrends();

    // Wait for API calls to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes("/prices") && response.status() === 200
    );
    await page.waitForResponse(
      (response) =>
        response.url().includes("/forecast") && response.status() === 200
    );

    // Verify chart is rendered
    await ui.waitForForecastChart();
    await ui.waitForChartData();

    // Check that chart canvas exists and has content
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Verify chart title is present
    await expect(
      page.locator("text=Gold Price Forecast with Confidence Intervals")
    ).toBeVisible();

    console.log("✅ Trends smoke test passed");
  });

  test("alerts page should allow creating and deleting alerts", async () => {
    // Navigate to alerts
    await ui.navigateTo("/alerts");
    await ui.waitForAlerts();

    // Initially no alerts should be present
    let alertCount = await ui.getAlertCount();
    expect(alertCount).toBe(0);

    // Click create alert button
    await ui.clickCreateAlert();
    await ui.waitForAlertForm();

    // Fill alert form
    const alertData = {
      rule_type: "price_above" as const,
      threshold: 2500,
      direction: "above" as const,
    };
    await ui.fillAlertForm(alertData);

    // Submit form
    await ui.submitAlertForm();

    // Wait for success toast
    await ui.waitForToast("Alert created successfully!");

    // Verify alert appears in list
    await ui.waitForAlertList();
    alertCount = await ui.getAlertCount();
    expect(alertCount).toBe(1);

    // Verify alert text contains expected information
    const alertText = await ui.getAlertText(1);
    expect(alertText).toContain("above $2500.00");

    // Delete the alert
    await ui.deleteAlert(1);

    // Wait for success toast
    await ui.waitForToast("Alert deleted successfully");

    // Verify alert is removed
    alertCount = await ui.getAlertCount();
    expect(alertCount).toBe(0);

    console.log("✅ Alerts smoke test passed");
  });

  test("should handle form validation errors", async ({ page }) => {
    // Navigate to alerts
    await ui.navigateTo("/alerts");
    await ui.waitForAlerts();

    // Click create alert button
    await ui.clickCreateAlert();
    await ui.waitForAlertForm();

    // Try to submit empty form
    await ui.submitAlertForm();

    // Should show validation errors
    await expect(page.locator("text=Alert type is required")).toBeVisible();
    await expect(page.locator("text=Direction is required")).toBeVisible();
    await expect(page.locator("text=Threshold is required")).toBeVisible();

    // Cancel form
    await ui.cancelAlertForm();

    // Form should be hidden
    await expect(page.locator('[data-testid="alert-form"]')).not.toBeVisible();

    console.log("✅ Form validation test passed");
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Navigate to dashboard
    await ui.navigateTo("/dashboard");
    await ui.waitForDashboard();

    // Simulate API error by going to a non-existent endpoint
    await page.route("**/prices**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    // Refresh data to trigger error
    await ui.refreshData();

    // Should show error banner
    await ui.waitForErrorBanner();
    await expect(
      page.locator("text=Failed to load dashboard data")
    ).toBeVisible();

    console.log("✅ Error handling test passed");
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test dashboard on mobile
    await ui.navigateTo("/dashboard");
    await ui.waitForDashboard();

    // Verify mobile layout
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator("text=Dashboard")).toBeVisible();

    // Test trends on mobile
    await ui.navigateTo("/trends");
    await ui.waitForTrends();

    // Verify chart is still visible on mobile
    await ui.waitForForecastChart();
    await expect(page.locator("canvas")).toBeVisible();

    // Test alerts on mobile
    await ui.navigateTo("/alerts");
    await ui.waitForAlerts();

    // Verify create button is visible
    await expect(
      page.locator('[data-testid="create-alert-button"]')
    ).toBeVisible();

    console.log("✅ Mobile responsiveness test passed");
  });

  test("should handle loading states", async () => {
    // Navigate to dashboard
    await ui.navigateTo("/dashboard");

    // Should show loading spinner initially
    await ui.waitForLoadingSpinner();

    // Wait for loading to complete
    await ui.waitForLoadingSpinnerToDisappear();

    // Should show content
    await ui.waitForPriceCard();

    console.log("✅ Loading states test passed");
  });
});
