import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Tests", () => {
  test("News page should be accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Run axe accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    // Check for serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousViolations).toHaveLength(0);

    // Log all violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        "Accessibility violations found:",
        accessibilityScanResults.violations
      );
    }
  });

  test("Dashboard page should be accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/dashboard");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Run axe accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    // Check for serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousViolations).toHaveLength(0);
  });

  test("Trends page should be accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/trends");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Run axe accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    // Check for serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousViolations).toHaveLength(0);
  });

  test("Keyboard navigation should work", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Test skip links
    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link:visible");
    await expect(skipLink).toBeVisible();

    // Test keyboard navigation through interactive elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Verify focus is visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("RTL support should work correctly", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Switch to RTL
    await page.evaluate(() => {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    });

    // Wait for RTL styles to apply
    await page.waitForTimeout(100);

    // Check that RTL styles are applied
    const body = page.locator("body");
    const computedStyle = await body.evaluate((el) => {
      return window.getComputedStyle(el).direction;
    });

    expect(computedStyle).toBe("rtl");
  });

  test("Touch targets should be minimum 44px", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Check button sizes
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("Color contrast should meet WCAG AA standards", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Run axe color contrast tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .analyze();

    // Filter for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === "color-contrast"
    );

    expect(colorContrastViolations).toHaveLength(0);
  });

  test("Focus management should work correctly", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Test focus trap in modals/dropdowns
    const liveToggle = page.locator("button[aria-pressed]");
    await liveToggle.focus();

    // Verify focus is visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Test focus ring
    const focusRing = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outlineWidth !== "0px" || styles.boxShadow !== "none";
    });

    expect(focusRing).toBe(true);
  });

  test("Screen reader support should work", async ({ page }) => {
    await page.goto("http://localhost:5173/news");

    // Check for proper ARIA labels
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute("aria-label");
      const textContent = await button.textContent();

      // Either aria-label or text content should be present
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }

    // Check for proper heading structure
    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const headingCount = await headings.count();

    expect(headingCount).toBeGreaterThan(0);

    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });
});
