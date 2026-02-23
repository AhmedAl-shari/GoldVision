import { test, expect } from '@playwright/test';

test.describe('Monte Carlo Simulator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Trends page and then to Simulator tab
    await page.click('text=Trends');
    await page.waitForLoadState('networkidle');
    await page.click('text=Simulator');
    await page.waitForLoadState('networkidle');
  });

  test('should display simulator controls', async ({ page }) => {
    // Check if simulation parameters are visible
    await expect(page.locator('text=Simulation Parameters')).toBeVisible();
    
    // Check Days slider
    await expect(page.locator('input[type="range"][min="1"][max="60"]')).toBeVisible();
    
    // Check Method selector
    await expect(page.locator('select')).toBeVisible();
    
    // Check Volatility slider (should be visible for GBM)
    await expect(page.locator('text=Volatility:')).toBeVisible();
    
    // Check Drift slider
    await expect(page.locator('text=Drift:')).toBeVisible();
    
    // Check Paths selector
    await expect(page.locator('text=Paths:')).toBeVisible();
    
    // Check Run Simulation button
    await expect(page.locator('button:has-text("Run Simulation")')).toBeVisible();
  });

  test('should run GBM simulation with default parameters', async ({ page }) => {
    // Click Run Simulation button
    await page.click('button:has-text("Run Simulation")');
    
    // Wait for simulation to complete
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    
    // Verify VaR card is displayed
    await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
    
    // Verify CVaR card is displayed
    await expect(page.locator('text=Conditional VaR (CVaR)')).toBeVisible();
    
    // Verify fan chart is displayed
    await expect(page.locator('text=Monte Carlo Simulation Results')).toBeVisible();
    
    // Verify Export CSV button is displayed
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('should run bootstrap simulation', async ({ page }) => {
    // Change method to Bootstrap
    await page.selectOption('select', 'Bootstrap');
    
    // Verify volatility slider is hidden for bootstrap
    await expect(page.locator('text=Volatility:')).not.toBeVisible();
    
    // Click Run Simulation button
    await page.click('button:has-text("Run Simulation")');
    
    // Wait for simulation to complete
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    
    // Verify results are displayed
    await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
    await expect(page.locator('text=Conditional VaR (CVaR)')).toBeVisible();
  });

  test('should adjust simulation parameters', async ({ page }) => {
    // Adjust days to 15
    await page.fill('input[type="range"][min="1"][max="60"]', '15');
    
    // Adjust volatility to 30%
    await page.fill('input[type="range"][min="10"][max="40"]', '30');
    
    // Adjust drift to +3%
    await page.fill('input[type="range"][min="-5"][max="5"]', '3');
    
    // Change number of paths to 5,000
    await page.selectOption('select:has-text("Paths")', '5000');
    
    // Click Run Simulation button
    await page.click('button:has-text("Run Simulation")');
    
    // Wait for simulation to complete
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    
    // Verify results are displayed
    await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
    await expect(page.locator('text=Conditional VaR (CVaR)')).toBeVisible();
  });

  test('should export simulation results to CSV', async ({ page }) => {
    // Run a simulation first
    await page.click('button:has-text("Run Simulation")');
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click Export CSV button
    await page.click('button:has-text("Export CSV")');
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/simulation_.*\.csv/);
  });

  test('should handle simulation errors gracefully', async ({ page }) => {
    // Switch to an invalid asset/currency combination that might cause errors
    await page.click('[data-testid="asset-selector"]');
    await page.click('text=Platinum');
    await page.click('[data-testid="currency-selector"]');
    await page.click('text=SAR');
    
    // Wait for data to update
    await page.waitForTimeout(1000);
    
    // Try to run simulation
    await page.click('button:has-text("Run Simulation")');
    
    // Wait a bit to see if error appears
    await page.waitForTimeout(5000);
    
    // Check if error message appears or if simulation completes
    const errorMessage = page.locator('text=Simulation failed:');
    const successMessage = page.locator('text=Value at Risk (VaR)');
    
    // Either error or success should be visible
    const hasError = await errorMessage.isVisible();
    const hasSuccess = await successMessage.isVisible();
    
    expect(hasError || hasSuccess).toBe(true);
  });

  test('should show loading state during simulation', async ({ page }) => {
    // Click Run Simulation button
    await page.click('button:has-text("Run Simulation")');
    
    // Verify button shows loading state
    await expect(page.locator('button:has-text("Running Simulation...")')).toBeVisible();
    
    // Wait for simulation to complete
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    
    // Verify button returns to normal state
    await expect(page.locator('button:has-text("Run Simulation")')).toBeVisible();
  });

  test('should work with different assets and currencies', async ({ page }) => {
    const testCases = [
      { asset: 'Silver', currency: 'EUR' },
      { asset: 'Platinum', currency: 'SAR' },
      { asset: 'Gold', currency: 'USD' }
    ];

    for (const testCase of testCases) {
      // Switch asset and currency
      await page.click('[data-testid="asset-selector"]');
      await page.click(`text=${testCase.asset}`);
      await page.click('[data-testid="currency-selector"]');
      await page.click(`text=${testCase.currency}`);
      
      // Wait for data to update
      await page.waitForTimeout(1000);
      
      // Run simulation
      await page.click('button:has-text("Run Simulation")');
      
      // Wait for simulation to complete
      await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
      
      // Verify results are displayed
      await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
      await expect(page.locator('text=Conditional VaR (CVaR)')).toBeVisible();
      
      // Clear results for next test
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.click('text=Trends');
      await page.waitForLoadState('networkidle');
      await page.click('text=Simulator');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display fan chart with correct elements', async ({ page }) => {
    // Run a simulation
    await page.click('button:has-text("Run Simulation")');
    await page.waitForSelector('text=Monte Carlo Simulation Results', { timeout: 30000 });
    
    // Verify fan chart elements
    await expect(page.locator('text=Monte Carlo Simulation Results')).toBeVisible();
    
    // Check for SVG chart
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();
    
    // Check for legend
    await expect(page.locator('text=Legend')).toBeVisible();
    await expect(page.locator('text=Median (p50)')).toBeVisible();
    await expect(page.locator('text=90% Confidence (p05-p95)')).toBeVisible();
    await expect(page.locator('text=98% Confidence (p01-p99)')).toBeVisible();
  });

  test('should validate simulation parameters', async ({ page }) => {
    // Test minimum days (1)
    await page.fill('input[type="range"][min="1"][max="60"]', '1');
    await page.click('button:has-text("Run Simulation")');
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
    
    // Test maximum days (60)
    await page.fill('input[type="range"][min="1"][max="60"]', '60');
    await page.click('button:has-text("Run Simulation")');
    await page.waitForSelector('text=Value at Risk (VaR)', { timeout: 30000 });
    await expect(page.locator('text=Value at Risk (VaR)')).toBeVisible();
  });
});

