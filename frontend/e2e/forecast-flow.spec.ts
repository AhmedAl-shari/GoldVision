import { test, expect } from "@playwright/test";
import { ApiClient, generateSamplePrices } from "./utils/api";

test.describe("Forecast Flow", () => {
  let api: ApiClient;

  test.beforeEach(async ({ request }) => {
    api = new ApiClient(request);

    // Ensure backend is healthy
    await api.healthCheck();
  });

  test("should generate forecast with 14 future points and confidence intervals", async () => {
    // Seed database with sample prices
    const samplePrices = generateSamplePrices(30);
    await api.seedPrices(samplePrices);

    // Generate forecast
    const forecastResponse = await api.generateForecast({
      horizon_days: 14,
      include_history: true,
    });

    // Verify response structure
    expect(forecastResponse).toHaveProperty("generated_at");
    expect(forecastResponse).toHaveProperty("horizon_days", 14);
    expect(forecastResponse).toHaveProperty("forecast");
    expect(forecastResponse).toHaveProperty("history");

    // Verify forecast data
    const forecast = forecastResponse.forecast;
    expect(forecast).toHaveLength(14);

    // Check each forecast point has required fields
    forecast.forEach(
      (point: {
        ds: string;
        yhat: number;
        yhat_lower: number;
        yhat_upper: number;
      }) => {
        expect(point).toHaveProperty("ds");
        expect(point).toHaveProperty("yhat");
        expect(point).toHaveProperty("yhat_lower");
        expect(point).toHaveProperty("yhat_upper");

        // Verify confidence interval is valid
        expect(point.yhat_lower).toBeLessThan(point.yhat);
        expect(point.yhat_upper).toBeGreaterThan(point.yhat);

        // Verify dates are in the future
        const forecastDate = new Date(point.ds);
        const today = new Date();
        expect(forecastDate.getTime()).toBeGreaterThan(today.getTime());
      }
    );

    // Verify history data
    const history = forecastResponse.history;
    expect(history).toHaveLength(30);

    history.forEach((point: { ds: string; price: number }) => {
      expect(point).toHaveProperty("ds");
      expect(point).toHaveProperty("price");
      expect(typeof point.price).toBe("number");
    });

    console.log("✅ Forecast flow test passed");
    console.log(`Generated ${forecast.length} forecast points`);
    console.log(`Included ${history?.length} historical points`);
  });

  test("should handle different horizon days", async () => {
    // Seed database
    const samplePrices = generateSamplePrices(20);
    await api.seedPrices(samplePrices);

    // Test different horizon days
    const horizonDays = [7, 14, 30];

    for (const days of horizonDays) {
      const forecastResponse = await api.generateForecast({
        horizon_days: days,
        include_history: false,
      });

      expect(forecastResponse.horizon_days).toBe(days);
      expect(forecastResponse.forecast).toHaveLength(days);
      // When include_history is false, history should not be present in response
      expect(forecastResponse).not.toHaveProperty("history");
    }
  });

  test("should handle empty database gracefully", async () => {
    // Try to generate forecast with no data
    const forecastResponse = await api.generateForecast({
      horizon_days: 7,
      include_history: true,
    });

    // Should still return a response structure
    expect(forecastResponse).toHaveProperty("forecast");
    expect(Array.isArray(forecastResponse.forecast)).toBe(true);
  });
});
