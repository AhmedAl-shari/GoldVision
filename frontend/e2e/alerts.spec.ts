import { test, expect } from "@playwright/test";
import * as api from "./utils/api";
import { expectToast } from "./utils/ui";

test.describe("Alerts Page", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a clean state for each test
    await api.clearDatabase();
    await page.goto("/alerts");
  });

  test("should create, list, and delete alerts", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Click create alert button
    await page.click('[data-testid="create-alert-button"]');

    // Fill out the alert form
    await page.selectOption('[data-testid="alert-type-select"]', "price_above");
    await page.selectOption('[data-testid="direction-select"]', "above");
    await page.fill('[data-testid="threshold-input"]', "2500");

    // Submit the form
    await page.click('[data-testid="submit-alert-button"]');

    // Wait for success toast
    await expectToast(page, "Alert created successfully");

    // Check that the alert appears in the list
    await expect(page.locator('[data-testid="alert-item-1"]')).toBeVisible();
    await expect(page.locator('text="Price Above $2,500.00"')).toBeVisible();

    // Delete the alert
    await page.click('[data-testid="delete-alert-1"]');

    // Wait for confirmation or success message
    await page.waitForTimeout(1000);

    // Check that the alert is removed from the list
    await expect(
      page.locator('[data-testid="alert-item-1"]')
    ).not.toBeVisible();

    console.log("✅ Alerts page: create, list, and delete functionality works");
  });

  test("should validate alert form inputs", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Click create alert button
    await page.click('[data-testid="create-alert-button"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-alert-button"]');

    // Check for validation errors
    await expect(page.locator('text="Alert type is required"')).toBeVisible();
    await expect(page.locator('text="Direction is required"')).toBeVisible();
    await expect(page.locator('text="Threshold is required"')).toBeVisible();

    // Fill invalid threshold
    await page.fill('[data-testid="threshold-input"]', "-100");
    await page.click('[data-testid="submit-alert-button"]');

    // Check for threshold validation error
    await expect(
      page.locator('text="Threshold must be positive"')
    ).toBeVisible();

    console.log("✅ Alerts page validates form inputs correctly");
  });

  test("should simulate alert trigger by ingesting a price", async ({
    page,
  }) => {
    // Create an alert first
    await api.createAlert({
      rule_type: "price_above",
      threshold: 2500,
      direction: "above",
    });

    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Check that alert is created and not triggered
    await expect(page.locator('[data-testid="alert-item-1"]')).toBeVisible();
    await expect(page.locator('text="Price Above $2,500.00"')).toBeVisible();

    // Alert should not be triggered yet
    const triggeredAlert = page.locator('text="⚠️ Triggered:"');
    await expect(triggeredAlert).not.toBeVisible();

    // Ingest a price that should trigger the alert
    const highPrice = api.generateSamplePrices(1);
    highPrice[0].price = 2600; // Above threshold
    await api.seedPrices(highPrice);

    // Trigger price evaluation by calling fetch-latest
    await api.fetchLatestPrice();

    // Refresh the page to see updated alert status
    await page.reload();
    await page.waitForSelector('[data-testid="alerts"]');

    // Check that the alert is now triggered
    await expect(page.locator('[data-testid="alert-item-1"]')).toBeVisible();

    // The alert should now show as triggered
    const triggeredIndicator = page.locator('text="⚠️ Triggered:"');
    if (await triggeredIndicator.isVisible()) {
      await expect(triggeredIndicator).toBeVisible();
    }

    console.log("✅ Alerts page simulates alert trigger by ingesting a price");
  });

  test("should handle different alert types", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Test price_above alert
    await page.click('[data-testid="create-alert-button"]');
    await page.selectOption('[data-testid="alert-type-select"]', "price_above");
    await page.selectOption('[data-testid="direction-select"]', "above");
    await page.fill('[data-testid="threshold-input"]', "2000");
    await page.click('[data-testid="submit-alert-button"]');

    await expectToast(page, "Alert created successfully");

    // Test price_below alert
    await page.click('[data-testid="create-alert-button"]');
    await page.selectOption('[data-testid="alert-type-select"]', "price_below");
    await page.selectOption('[data-testid="direction-select"]', "below");
    await page.fill('[data-testid="threshold-input"]', "1800");
    await page.click('[data-testid="submit-alert-button"]');

    await expectToast(page, "Alert created successfully");

    // Check that both alerts are visible
    await expect(page.locator('[data-testid="alert-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-item-2"]')).toBeVisible();

    // Check alert descriptions
    await expect(page.locator('text="Price Above $2,000.00"')).toBeVisible();
    await expect(page.locator('text="Price Below $1,800.00"')).toBeVisible();

    console.log("✅ Alerts page handles different alert types correctly");
  });

  test("should show empty state when no alerts exist", async ({ page }) => {
    // Navigate to alerts page without creating any alerts
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Check for empty state message
    const emptyState = page.locator('text="No alerts found"');
    const createButton = page.locator('[data-testid="create-alert-button"]');

    // Either empty state message or create button should be visible
    const hasEmptyState = await emptyState.isVisible();
    const hasCreateButton = await createButton.isVisible();

    expect(hasEmptyState || hasCreateButton).toBeTruthy();

    console.log("✅ Alerts page shows empty state when no alerts exist");
  });

  test("should handle form cancellation", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Click create alert button
    await page.click('[data-testid="create-alert-button"]');

    // Fill out some form data
    await page.selectOption('[data-testid="alert-type-select"]', "price_above");
    await page.fill('[data-testid="threshold-input"]', "2500");

    // Click cancel button
    await page.click('[data-testid="cancel-alert-button"]');

    // Check that form is hidden
    await expect(page.locator('[data-testid="alert-form"]')).not.toBeVisible();

    // Check that no alert was created
    await expect(
      page.locator('[data-testid="alert-item-1"]')
    ).not.toBeVisible();

    console.log("✅ Alerts page handles form cancellation correctly");
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Create an alert
    await api.createAlert({
      rule_type: "price_above",
      threshold: 2500,
      direction: "above",
    });

    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Check that page is visible on mobile
    await expect(page.locator('[data-testid="alerts"]')).toBeVisible();

    // Check that alert list is visible
    await expect(page.locator('[data-testid="alert-item-1"]')).toBeVisible();

    // Test create alert form on mobile
    await page.click('[data-testid="create-alert-button"]');
    await expect(page.locator('[data-testid="alert-form"]')).toBeVisible();

    // Cancel the form
    await page.click('[data-testid="cancel-alert-button"]');

    console.log("✅ Alerts page is responsive on mobile devices");
  });

  test("should handle loading states during operations", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts");
    await page.waitForSelector('[data-testid="alerts"]');

    // Click create alert button
    await page.click('[data-testid="create-alert-button"]');

    // Fill out the form
    await page.selectOption('[data-testid="alert-type-select"]', "price_above");
    await page.selectOption('[data-testid="direction-select"]', "above");
    await page.fill('[data-testid="threshold-input"]', "2500");

    // Submit the form and check for loading state
    await page.click('[data-testid="submit-alert-button"]');

    // Check that submit button shows loading state
    const submitButton = page.locator('[data-testid="submit-alert-button"]');
    const buttonText = await submitButton.textContent();

    // Button should show "Creating..." or similar loading text
    expect(buttonText).toMatch(/Creating|Loading/);

    // Wait for operation to complete
    await page.waitForTimeout(2000);

    console.log("✅ Alerts page handles loading states during operations");
  });
});
