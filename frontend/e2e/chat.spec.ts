import { test, expect } from "@playwright/test";

test.describe("GoldVision Copilot Chat", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the chat API
    await page.route("**/api/chat", async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || "{}");

      // Mock response based on message content
      let response;
      if (postData.messages?.[0]?.content?.includes("alert")) {
        response = {
          content:
            "I'll help you create a price alert. This is not financial advice.",
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "create_alert",
                arguments: JSON.stringify({
                  threshold: 2000,
                  direction: "below",
                }),
              },
            },
          ],
          finish_reason: "tool_calls",
        };
      } else if (postData.messages?.[0]?.content?.includes("forecast")) {
        response = {
          content:
            "I'll analyze the current forecast for you. This is not financial advice.",
          tool_calls: [
            {
              id: "call_2",
              type: "function",
              function: {
                name: "forecast",
                arguments: JSON.stringify({ horizon_days: 30 }),
              },
            },
          ],
          finish_reason: "tool_calls",
        };
      } else {
        response = {
          content:
            "Hello! I'm the GoldVision Copilot. How can I help you today? This is not financial advice.",
          finish_reason: "stop",
        };
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    // Navigate to dashboard
    await page.goto("/dashboard");
  });

  test("should open chat when floating button is clicked", async ({ page }) => {
    // Click the floating chat button
    await page.click('[data-testid="chat-button"]');

    // Check if chat dock is visible
    await expect(page.locator('[data-testid="chat-dock"]')).toBeVisible();
    await expect(page.locator("text=GoldVision Copilot")).toBeVisible();
  });

  test("should display disclaimer on first open", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Check for disclaimer
    await expect(
      page.locator("text=This is not financial advice")
    ).toBeVisible();
  });

  test("should send and receive messages", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Type a message
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Hello, can you help me?");

    // Send the message
    await page.click('[data-testid="chat-send"]');

    // Check if message appears in chat
    await expect(page.locator("text=Hello, can you help me?")).toBeVisible();

    // Check for response
    await expect(page.locator("text=GoldVision Copilot")).toBeVisible();
  });

  test("should show quick actions for dashboard", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Check for dashboard-specific quick actions
    await expect(page.locator("text=Summarize today's move")).toBeVisible();
    await expect(page.locator("text=Create alert below")).toBeVisible();
  });

  test("should handle quick action clicks", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Click a quick action
    await page.click("text=Summarize today's move");

    // Check if the action text appears in input
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toHaveValue("Summarize today's move");
  });

  test("should close chat when close button is clicked", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');
    await expect(page.locator('[data-testid="chat-dock"]')).toBeVisible();

    // Click close button
    await page.click('[data-testid="chat-close"]');

    // Check if chat is closed
    await expect(page.locator('[data-testid="chat-dock"]')).not.toBeVisible();
  });

  test("should handle keyboard shortcuts", async ({ page }) => {
    // Press '/' to open chat (if implemented)
    await page.keyboard.press("/");

    // Check if chat opens
    await expect(page.locator('[data-testid="chat-dock"]')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press("Escape");

    // Check if chat closes
    await expect(page.locator('[data-testid="chat-dock"]')).not.toBeVisible();
  });

  test("should show tool calls in messages", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Send a message that triggers tool calls
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create an alert when price drops below 2000");
    await page.click('[data-testid="chat-send"]');

    // Check for tool call display
    await expect(page.locator("text=create_alert")).toBeVisible();
  });

  test("should handle Arabic locale", async ({ page }) => {
    // Switch to Arabic (if locale toggle exists)
    await page.click('[data-testid="locale-toggle"]');
    await page.click("text=العربية");

    await page.click('[data-testid="chat-button"]');

    // Check for Arabic text
    await expect(page.locator("text=مساعد GoldVision")).toBeVisible();
  });

  test('should show "Ask about this chart" button on charts', async ({
    page,
  }) => {
    // Check if the button exists on the forecast chart
    await expect(page.locator("text=Ask about this chart")).toBeVisible();

    // Click the button
    await page.click("text=Ask about this chart");

    // Check if chat opens with initial message
    await expect(page.locator('[data-testid="chat-dock"]')).toBeVisible();
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toHaveValue(/explain.*forecast/i);
  });
});

test.describe("Chat on Trends Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the chat API
    await page.route("**/api/chat", async (route) => {
      const response = {
        content:
          "I'll help you understand this forecast. This is not financial advice.",
        finish_reason: "stop",
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await page.goto("/trends");
  });

  test("should show trends-specific quick actions", async ({ page }) => {
    await page.click('[data-testid="chat-button"]');

    // Check for trends-specific quick actions
    await expect(page.locator("text=Explain this forecast")).toBeVisible();
    await expect(page.locator("text=Run 14-day backtest")).toBeVisible();
  });

  test("should open chat from chart button", async ({ page }) => {
    // Click "Ask about this chart" button
    await page.click("text=Ask about this chart");

    // Check if chat opens
    await expect(page.locator('[data-testid="chat-dock"]')).toBeVisible();

    // Check if initial message is set
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toHaveValue(/explain.*forecast/i);
  });
});
