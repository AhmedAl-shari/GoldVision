#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  try {
    // Demo user creation removed

    // Seed historical price data
    const prices = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365); // 1 year ago

    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Generate realistic price data with some volatility
      const basePrice = 2000;
      const volatility = 50;
      const trend = i * 0.5; // Slight upward trend
      const randomFactor = (Math.random() - 0.5) * volatility;
      const price = basePrice + trend + randomFactor;

      prices.push({
        ds: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0], // Format as YYYY-MM-DD string
        price: Math.round(price * 100) / 100,
      });
    }

    // Insert prices in batches (skip if already exist)
    const batchSize = 100;
    let insertedCount = 0;
    for (let i = 0; i < prices.length; i += batchSize) {
      const batch = prices.slice(i, i + batchSize);
      try {
        await prisma.goldPrice.createMany({
          data: batch,
        });
        insertedCount += batch.length;
      } catch (error) {
        console.log(`⚠️ Some prices already exist, skipping duplicates`);
      }
    }
    console.log(`✅ ${insertedCount} historical prices seeded`);

    // Create some sample alerts
    const alerts = [
      {
        userId: demoUser.id,
        asset: "XAU",
        currency: "USD",
        ruleType: "price_threshold",
        threshold: 2100,
        direction: "above",
      },
      {
        userId: demoUser.id,
        asset: "XAU",
        currency: "USD",
        ruleType: "price_threshold",
        threshold: 1900,
        direction: "below",
      },
    ];

    let createdAlerts = 0;
    for (const alertData of alerts) {
      try {
        await prisma.alert.create({
          data: alertData,
        });
        createdAlerts++;
      } catch (error) {
        console.log(`⚠️ Alert already exists, skipping`);
      }
    }
    console.log(`✅ ${createdAlerts} sample alerts created`);

    // Create a sample forecast run
    const forecastRun = await prisma.forecastRun.create({
      data: {
        asset: "XAU",
        currency: "USD",
        generatedAt: new Date(),
        horizonDays: 14,
        modelVersion: "prophet-1.1",
        params: JSON.stringify({
          trainingWindow: 30,
          holidaysEnabled: true,
          seasonalityFlags: { daily: true, weekly: true, yearly: true },
        }),
        trainingWindow: 30,
        holidaysEnabled: true,
        seasonalityFlags: JSON.stringify({
          daily: true,
          weekly: true,
          yearly: true,
        }),
        randomState: 42,
      },
    });
    console.log("✅ Sample forecast run created");

    // Create sample forecast points
    const forecastPoints = [];
    const lastPrice = prices[prices.length - 1];

    for (let i = 1; i <= 14; i++) {
      const date = new Date(lastPrice.ds);
      date.setDate(date.getDate() + i);
      const basePrice = lastPrice.price;
      const variance = basePrice * 0.02; // 2% variance

      forecastPoints.push({
        asset: "XAU",
        currency: "USD",
        generatedAt: forecastRun.generatedAt,
        horizonDays: 14,
        ds: date,
        yhat: basePrice + (Math.random() - 0.5) * variance,
        yhatLower: basePrice - variance,
        yhatUpper: basePrice + variance,
        modelVersion: "prophet-1.1",
        trainingWindow: 30,
        holidaysEnabled: true,
        seasonalityFlags: JSON.stringify({
          daily: true,
          weekly: true,
          yearly: true,
        }),
      });
    }

    await prisma.forecast.createMany({
      data: forecastPoints,
    });
    console.log(`✅ ${forecastPoints.length} forecast points created`);

    console.log("\n🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedDatabase().catch((error) => {
  console.error("Failed to seed database:", error);
  process.exit(1);
});
