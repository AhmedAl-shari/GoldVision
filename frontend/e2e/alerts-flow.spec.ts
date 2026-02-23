import { test, expect } from "@playwright/test";
import { ApiClient } from "./utils/api";

test.describe("Alerts Flow", () => {
  let api: ApiClient;

  test.beforeEach(async ({ request }) => {
    api = new ApiClient(request);

    // Ensure backend is healthy
    await api.healthCheck();
  });

  test("should create, list, and delete alerts", async () => {
    // Create an alert
    const alertData = {
      rule_type: "price_above" as const,
      threshold: 2500,
      direction: "above" as const,
    };

    const createResponse = await api.createAlert(alertData);
    expect(createResponse).toHaveProperty("alert");
    expect(createResponse.alert.rule_type).toBe("price_above");
    expect(createResponse.alert.threshold).toBe(2500);
    expect(createResponse.alert.direction).toBe("above");
    expect(createResponse.alert.triggered_at).toBeNull();

    const alertId = createResponse.alert.id;

    // List alerts
    const listResponse = await api.getAlerts();
    expect(listResponse).toHaveProperty("alerts");
    expect(listResponse.alerts).toHaveLength(1);
    expect(listResponse.alerts[0].id).toBe(alertId);

    // Delete alert
    const deleteResponse = await api.deleteAlert(alertId);
    expect(deleteResponse).toHaveProperty("deleted", true);

    // Verify alert is deleted
    const finalListResponse = await api.getAlerts();
    expect(finalListResponse.alerts).toHaveLength(0);
  });

  test("should trigger alert when price exceeds threshold", async () => {
    // Create an alert for price above 2100
    const alertData = {
      rule_type: "price_above" as const,
      threshold: 2100,
      direction: "above" as const,
    };

    const createResponse = await api.createAlert(alertData);
    const alertId = createResponse.alert.id;

    // Verify alert is not triggered initially
    let alertsResponse = await api.getAlerts();
    expect(alertsResponse.alerts[0].triggered_at).toBeNull();

    // Insert a price that should trigger the alert
    const triggerPrice = 2200; // Above threshold
    const today = new Date();
    const triggerDate = new Date(today);
    triggerDate.setDate(today.getDate() + 1);

    await api.seedPrices([
      {
        ds: triggerDate.toISOString().split("T")[0],
        price: triggerPrice,
      },
    ]);

    // Fetch latest price to trigger alert evaluation
    await api.fetchLatestPrice();

    // Check that alert was triggered
    alertsResponse = await api.getAlerts();
    const triggeredAlert = alertsResponse.alerts.find(
      (alert) => alert.id === alertId
    );
    expect(triggeredAlert).toBeDefined();
    expect(triggeredAlert?.triggered_at).not.toBeNull();

    console.log("✅ Alert triggered successfully");
    console.log(`Alert triggered at: ${triggeredAlert?.triggered_at}`);
  });

  test("should not trigger alert when price is below threshold", async () => {
    // Create an alert for price above 2500
    const alertData = {
      rule_type: "price_above" as const,
      threshold: 2500,
      direction: "above" as const,
    };

    const createResponse = await api.createAlert(alertData);
    const alertId = createResponse.alert.id;

    // Insert a price below threshold
    const belowThresholdPrice = 2000;
    const today = new Date();
    const triggerDate = new Date(today);
    triggerDate.setDate(today.getDate() + 1);

    await api.seedPrices([
      {
        ds: triggerDate.toISOString().split("T")[0],
        price: belowThresholdPrice,
      },
    ]);

    // Fetch latest price
    await api.fetchLatestPrice();

    // Check that alert was NOT triggered
    const alertsResponse = await api.getAlerts();
    const alert = alertsResponse.alerts.find((alert) => alert.id === alertId);
    expect(alert?.triggered_at).toBeNull();
  });

  test("should handle multiple alerts", async () => {
    // Create multiple alerts
    const alerts = [
      {
        rule_type: "price_above" as const,
        threshold: 2000,
        direction: "above" as const,
      },
      {
        rule_type: "price_below" as const,
        threshold: 1800,
        direction: "below" as const,
      },
      {
        rule_type: "price_above" as const,
        threshold: 2500,
        direction: "above" as const,
      },
    ];

    const createdAlerts = [];
    for (const alertData of alerts) {
      const response = await api.createAlert(alertData);
      createdAlerts.push(response.alert);
    }

    // List all alerts
    const listResponse = await api.getAlerts();
    expect(listResponse.alerts).toHaveLength(3);

    // Verify all alerts are present
    createdAlerts.forEach((createdAlert) => {
      const foundAlert = listResponse.alerts.find(
        (alert) => alert.id === createdAlert.id
      );
      expect(foundAlert).toBeDefined();
    });

    // Clean up - delete all alerts
    for (const alert of createdAlerts) {
      await api.deleteAlert(alert.id);
    }

    const finalListResponse = await api.getAlerts();
    expect(finalListResponse.alerts).toHaveLength(0);
  });

  test("should handle invalid alert data", async () => {
    // Try to create alert with invalid data
    const invalidAlertData = {
      rule_type: "invalid_type" as string,
      threshold: -100, // Negative threshold
      direction: "invalid_direction" as string,
    };

    // This should fail
    await expect(async () => {
      await api.createAlert(invalidAlertData);
    }).rejects.toThrow();
  });
});
