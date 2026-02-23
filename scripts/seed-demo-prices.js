#!/usr/bin/env node

/**
 * Demo Price Data Seeder
 * Generates 14 days of realistic gold price data for demo purposes
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Base gold price (updated to match current market rate ~$4,298)
const CURRENT_MARKET_PRICE = 4298; // Current gold price per ounce
const VOLATILITY = 0.02; // 2% daily volatility

// Generate realistic price movements that end at current market price
function generatePriceData(days = 90) {
  const prices = [];
  // Start from a price 90 days ago that will trend to current market rate
  // Calculate starting price: current price with slight upward trend over 90 days
  const avgDailyChange = 0.0003; // Slight upward trend (~0.03% per day)
  let currentPrice = CURRENT_MARKET_PRICE / Math.pow(1 + avgDailyChange, days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Generate realistic daily price movement with slight upward trend
    const dailyChange = (Math.random() - 0.5) * VOLATILITY + avgDailyChange;
    currentPrice = currentPrice * (1 + dailyChange);

    // Add daily price (one per day)
    prices.push({
      ds: date.toISOString().split("T")[0],
      price: Math.round(currentPrice * 100) / 100,
    });
  }

  // Ensure the last price is close to current market price
  const lastPrice = prices[prices.length - 1].price;
  const adjustment = CURRENT_MARKET_PRICE / lastPrice;
  prices.forEach((p) => {
    p.price = Math.round(p.price * adjustment * 100) / 100;
  });

  return prices;
}

// Generate forecast data
function generateForecastData() {
  const forecasts = [];
  const startDate = new Date();

  // Generate 30 days of forecasts
  for (let i = 1; i <= 30; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    // Generate realistic forecast with some trend
    const trend = Math.sin(i / 10) * 0.01; // Cyclical trend
    const randomFactor = (Math.random() - 0.5) * 0.02;
    const forecastPrice = CURRENT_MARKET_PRICE * (1 + trend + randomFactor);

    forecasts.push({
      asset: "XAU",
      currency: "USD",
      generatedAt: new Date(),
      horizonDays: 30,
      ds: forecastDate,
      yhat: Math.round(forecastPrice * 100) / 100,
      yhatLower: Math.round(forecastPrice * 0.95 * 100) / 100,
      yhatUpper: Math.round(forecastPrice * 1.05 * 100) / 100,
      modelVersion: "demo-v1.0",
      trainingWindow: 30,
      holidaysEnabled: true,
      seasonalityFlags: "{}",
    });
  }

  return forecasts;
}

async function seedDemoPrices() {
  try {
    console.log("🌱 Seeding demo price data...");

    // Clear existing data
    await prisma.forecast.deleteMany({});
    await prisma.goldPrice.deleteMany({});

    // Generate price data (90 days to ensure enough data for forecast evaluation)
    const priceData = generatePriceData(90);
    const forecastData = generateForecastData();

    // Insert price data in batches
    console.log(`📊 Inserting ${priceData.length} price records...`);
    for (let i = 0; i < priceData.length; i += 100) {
      const batch = priceData.slice(i, i + 100);
      await prisma.goldPrice.createMany({
        data: batch,
      });
    }

    // Insert forecast data
    console.log(`🔮 Inserting ${forecastData.length} forecast records...`);
    await prisma.forecast.createMany({
      data: forecastData,
    });

    console.log("✅ Demo price data seeded successfully!");
    console.log(`📈 ${priceData.length} price records`);
    console.log(`🔮 ${forecastData.length} forecast records`);
  } catch (error) {
    console.error("❌ Error seeding demo prices:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoPrices();
}

module.exports = { seedDemoPrices, generatePriceData, generateForecastData };
