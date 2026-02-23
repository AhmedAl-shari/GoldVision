#!/usr/bin/env node

const puppeteer = require("puppeteer");

async function testPWA() {
  console.log("Testing PWA functionality...");

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log("Navigating to http://localhost:5173...");
    await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });

    // Check if manifest is loaded
    const manifest = await page.evaluate(() => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      return manifestLink ? manifestLink.href : null;
    });

    if (manifest) {
      console.log("✅ Manifest found:", manifest);
    } else {
      console.log("❌ Manifest not found");
    }

    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return "serviceWorker" in navigator;
    });

    if (swRegistered) {
      console.log("✅ Service Worker API available");
    } else {
      console.log("❌ Service Worker API not available");
    }

    // Check for install prompt
    const installPrompt = await page.evaluate(() => {
      return window.deferredPrompt !== undefined;
    });

    if (installPrompt) {
      console.log("✅ Install prompt available");
    } else {
      console.log(
        "ℹ️ Install prompt not yet available (may appear after user interaction)"
      );
    }

    // Test offline page
    console.log("Testing offline page...");
    await page.goto("http://localhost:5173/offline");

    const offlineContent = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      return heading ? heading.textContent : null;
    });

    if (offlineContent && offlineContent.includes("Offline")) {
      console.log("✅ Offline page working");
    } else {
      console.log("❌ Offline page not working");
    }

    console.log("\nPWA test completed!");
    console.log("\nTo test installation:");
    console.log("1. Look for install button in browser address bar");
    console.log('2. Or use browser menu: "Install GoldVision"');
    console.log("3. Test offline functionality after installation");
  } catch (error) {
    console.error("Error testing PWA:", error);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is available
try {
  require.resolve("puppeteer");
  testPWA();
} catch (e) {
  console.log("Puppeteer not installed. Installing...");
  const { exec } = require("child_process");
  exec("npm install puppeteer", (error, stdout, stderr) => {
    if (error) {
      console.log(
        "Could not install puppeteer. Please install manually: npm install puppeteer"
      );
      console.log("\nManual PWA testing:");
      console.log("1. Open http://localhost:5173 in Chrome");
      console.log("2. Look for install button in address bar");
      console.log("3. Test offline functionality");
    } else {
      console.log("Puppeteer installed. Running PWA test...");
      testPWA();
    }
  });
}
