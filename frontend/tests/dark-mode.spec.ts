import { test, expect } from "@playwright/test";

test.describe("Dark Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://127.0.0.1:5173/login");
    // Mock authentication
    await page.route("**/auth/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "1", username: "test", role: "user" },
        }),
      });
    });
    await page.goto("http://127.0.0.1:5173/dashboard");
  });

  test("should toggle between light and dark themes", async ({ page }) => {
    // Check initial theme (should be light by default)
    await expect(page.locator("body")).not.toHaveClass(/dark/);

    // Find and click the theme toggle button
    const themeToggle = page.locator('button[title*="Current:"]');
    await expect(themeToggle).toBeVisible();

    // Click to cycle through themes
    await themeToggle.click();

    // Should now be in dark mode
    await expect(page.locator("body")).toHaveClass(/dark/);

    // Click again to go to system theme
    await themeToggle.click();

    // Click again to go back to light theme
    await themeToggle.click();

    // Should be back to light mode
    await expect(page.locator("body")).not.toHaveClass(/dark/);
  });

  test("should show correct theme icons", async ({ page }) => {
    const themeToggle = page.locator('button[title*="Current:"]');

    // Should start with light theme icon
    await expect(themeToggle.locator("text=☀️")).toBeVisible();

    // Click to dark theme
    await themeToggle.click();
    await expect(themeToggle.locator("text=🌙")).toBeVisible();

    // Click to system theme
    await themeToggle.click();
    await expect(themeToggle.locator("text=💻")).toBeVisible();
  });

  test("should persist theme preference", async ({ page }) => {
    // Set to dark mode
    const themeToggle = page.locator('button[title*="Current:"]');
    await themeToggle.click();
    await expect(page.locator("body")).toHaveClass(/dark/);

    // Reload page
    await page.reload();

    // Should still be in dark mode
    await expect(page.locator("body")).toHaveClass(/dark/);
  });

  test("should apply dark mode styles to components", async ({ page }) => {
    // Switch to dark mode
    const themeToggle = page.locator('button[title*="Current:"]');
    await themeToggle.click();

    // Check that navbar has dark styles
    const navbar = page.locator("nav");
    await expect(navbar).toHaveClass(/dark:bg-gray-900/);

    // Check that cards have dark styles
    const cards = page.locator(".card");
    await expect(cards.first()).toHaveClass(/dark:bg-zinc-900/);
  });
});
