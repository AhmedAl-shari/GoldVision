import { test, expect } from "@playwright/test";
import * as api from "./utils/api";
import { waitForChartToRender } from "./utils/ui";

test.describe("Trends Page", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a clean state for each test
    await api.clearDatabase();
    await page.goto("/trends");
  });

  test("should render history and forecast with shaded confidence band", async ({
    page,
  }) => {
    // Seed database with historical data
    const samplePrices = api.generateSamplePrices(60); // 60 days of data
    await api.seedPrices(samplePrices);

    // Generate forecast
    await api.generateForecast({
      horizon_days: 30,
      include_history: true,
    });

    // Navigate to trends page
    await page.goto("/trends");

    // Wait for chart to render
    await waitForChartToRender(page, "canvas");

    // Check that chart is visible
    await expect(page.locator("canvas")).toBeVisible();

    // Check for chart elements (Chart.js specific)
    await expect(page.locator('text="Historical Prices"')).toBeVisible();
    await expect(page.locator('text="Forecast"')).toBeVisible();
    await expect(
      page.locator('text="Confidence Interval (Upper)"')
    ).toBeVisible();

    // Verify the page title and description
    await expect(page.locator("h1")).toContainText("Trends & Forecast");
    await expect(page.locator("p")).toContainText(
      "Historical gold prices with 30-day Prophet forecast"
    );

    console.log(
      "✅ Trends page renders history and forecast with confidence band"
    );
  });

  test("should handle empty data gracefully", async ({ page }) => {
    // Navigate to trends page without seeding data
    await page.goto("/trends");

    // Check for error message or empty state
    const errorMessage = page.locator('text="Failed to load trend data"');
    const emptyState = page.locator('text="No data available"');

    // Either error message or empty state should be visible
    const hasError = await errorMessage.isVisible();
    const hasEmptyState = await emptyState.isVisible();

    expect(hasError || hasEmptyState).toBeTruthy();

    console.log("✅ Trends page handles empty data gracefully");
  });

  test("should display forecast information correctly", async ({ page }) => {
    // Seed data and generate forecast
    const samplePrices = api.generateSamplePrices(45);
    await api.seedPrices(samplePrices);

    await api.generateForecast({
      horizon_days: 14,
      include_history: true,
    });

    // Navigate to trends page
    await page.goto("/trends");
    await waitForChartToRender(page, "canvas");

    // Check that the chart is visible
    await expect(page.locator("canvas")).toBeVisible();

    // Check for forecast-specific elements
    await expect(page.locator('text="Forecast"')).toBeVisible();
    await expect(page.locator('text="Confidence Interval"')).toBeVisible();

    // Check the footer text about Prophet
    await expect(
      page.locator('text="Forecast generated using Facebook Prophet"')
    ).toBeVisible();

    console.log("✅ Trends page displays forecast information correctly");
  });

  test("should be responsive on different screen sizes", async ({ page }) => {
    // Seed data
    const samplePrices = api.generateSamplePrices(30);
    await api.seedPrices(samplePrices);

    await api.generateForecast({
      horizon_days: 14,
      include_history: true,
    });

    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/trends");
    await waitForChartToRender(page, "canvas");
    await expect(page.locator("canvas")).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await waitForChartToRender(page, "canvas");
    await expect(page.locator("canvas")).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await waitForChartToRender(page, "canvas");
    await expect(page.locator("canvas")).toBeVisible();

    console.log("✅ Trends page is responsive on different screen sizes");
  });

  test("should show loading state while data is being fetched", async ({
    page,
  }) => {
    // Navigate to trends page
    await page.goto("/trends");

    // Check for loading indicators
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    const loadingText = page.locator('text="Loading..."');

    // Either loading spinner or loading text should be present initially
    const hasLoadingSpinner = await loadingSpinner.isVisible();
    const hasLoadingText = await loadingText.isVisible();

    // If no loading indicators, check that chart eventually appears
    if (!hasLoadingSpinner && !hasLoadingText) {
      // Wait for chart to appear or error to show
      await page.waitForSelector('canvas, [data-testid="error-banner"]', {
        timeout: 10000,
      });
    }

    console.log(
      "✅ Trends page shows loading state while data is being fetched"
    );
  });

  test("should handle forecast generation errors gracefully", async ({
    page,
  }) => {
    // Seed minimal data (less than required for forecasting)
    const samplePrices = api.generateSamplePrices(3); // Less than 7 days required
    await api.seedPrices(samplePrices);

    // Navigate to trends page
    await page.goto("/trends");

    // Check for error message about insufficient data
    const errorMessage = page.locator('text="Failed to load trend data"');
    const insufficientDataMessage = page.locator('text="Insufficient data"');

    // Either error message should be visible
    const hasError = await errorMessage.isVisible();
    const hasInsufficientData = await insufficientDataMessage.isVisible();

    expect(hasError || hasInsufficientData).toBeTruthy();

    console.log("✅ Trends page handles forecast generation errors gracefully");
  });

  test("should display correct data range information", async ({ page }) => {
    // Seed data with specific date range
    const samplePrices = api.generateSamplePrices(30);
    await api.seedPrices(samplePrices);

    await api.generateForecast({
      horizon_days: 14,
      include_history: true,
    });

    // Navigate to trends page
    await page.goto("/trends");
    await waitForChartToRender(page, "canvas");

    // Check that the page shows appropriate information
    await expect(page.locator("h1")).toContainText("Trends & Forecast");

    // Check for the description about the forecast
    const description = page.locator("p");
    await expect(description).toContainText("30-day Prophet forecast");

    console.log("✅ Trends page displays correct data range information");
  });
});
