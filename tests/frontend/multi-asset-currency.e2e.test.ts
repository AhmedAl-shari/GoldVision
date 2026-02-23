import { test, expect } from '@playwright/test';

test.describe('Multi-Asset Multi-Currency E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display asset and currency selectors in navbar', async ({ page }) => {
    // Check if asset selector is present
    const assetSelector = page.locator('[data-testid="asset-selector"]');
    await expect(assetSelector).toBeVisible();

    // Check if currency selector is present
    const currencySelector = page.locator('[data-testid="currency-selector"]');
    await expect(currencySelector).toBeVisible();
  });

  test('should switch between different assets', async ({ page }) => {
    // Test switching to Silver
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Silver');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('Silver');
    
    // Test switching to Platinum
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Platinum');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('Platinum');
    
    // Test switching back to Gold
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Gold');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('Gold');
  });

  test('should switch between different currencies', async ({ page }) => {
    // Test switching to EUR
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=EUR');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('EUR');
    
    // Test switching to SAR
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=SAR');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('SAR');
    
    // Test switching back to USD
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=USD');
    
    // Verify the page title updates
    await expect(page.locator('h1')).toContainText('USD');
  });

  test('should update Dashboard KPIs when switching asset/currency', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Switch to Silver/EUR
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Silver');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=EUR');
    
    // Wait for data to update
    await page.waitForTimeout(2000);
    
    // Verify the page shows Silver in EUR
    await expect(page.locator('h1')).toContainText('Silver (EUR)');
    
    // Check if KPIs are displayed (they should be present)
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    await expect(kpiCards).toHaveCount(4); // Current Price, 24h Change, 7d Change, 30d Change
  });

  test('should update Trends page when switching asset/currency', async ({ page }) => {
    // Navigate to Trends page
    await page.click('text=Trends');
    await page.waitForLoadState('networkidle');
    
    // Switch to XPT/SAR
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Platinum');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=SAR');
    
    // Wait for data to update
    await page.waitForTimeout(2000);
    
    // Verify the page shows Platinum in SAR
    await expect(page.locator('h1')).toContainText('Platinum Trends & Forecast (SAR)');
  });

  test('should create alerts scoped to selected asset/currency', async ({ page }) => {
    // Navigate to Alerts page
    await page.click('text=Alerts');
    await page.waitForLoadState('networkidle');
    
    // Switch to XAG/EUR
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Silver');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=EUR');
    
    // Wait for data to update
    await page.waitForTimeout(1000);
    
    // Verify the page shows Silver in EUR
    await expect(page.locator('h1')).toContainText('Silver Price Alerts (EUR)');
    
    // Create a new alert
    await page.click('text=Create Alert');
    
    // Fill in alert form
    await page.selectOption('select[name="rule_type"]', 'price_above');
    await page.fill('input[name="threshold"]', '25');
    await page.selectOption('select[name="direction"]', 'above');
    
    // Submit the alert
    await page.click('button[type="submit"]');
    
    // Wait for the alert to be created
    await page.waitForTimeout(1000);
    
    // Verify the alert appears in the list
    const alertList = page.locator('[data-testid="alert-item"]');
    await expect(alertList).toHaveCount(1);
    
    // Verify the alert shows the correct asset and currency
    await expect(alertList.first()).toContainText('Silver');
    await expect(alertList.first()).toContainText('EUR');
  });

  test('should persist asset/currency selection across page refreshes', async ({ page }) => {
    // Switch to XPT/SAR
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Platinum');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=SAR');
    
    // Wait for data to update
    await page.waitForTimeout(1000);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify the selection is persisted
    await expect(page.locator('h1')).toContainText('Platinum (SAR)');
  });

  test('should update all pages consistently when switching asset/currency', async ({ page }) => {
    // Test Dashboard
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Silver');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=EUR');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1')).toContainText('Silver (EUR)');
    
    // Test Trends page
    await page.click('text=Trends');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Silver Trends & Forecast (EUR)');
    
    // Test Alerts page
    await page.click('text=Alerts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Silver Price Alerts (EUR)');
  });
});

