#!/usr/bin/env node

/**
 * Add Historical Gold Price Data
 *
 * This script adds historical gold price data to the database
 * to enable technical analysis calculations
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Generate realistic historical gold prices
function generateHistoricalPrices() {
  const prices = [];
  const basePrice = 4000; // Starting price
  const today = new Date();

  // Generate 30 days of historical data
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic price variations
    const dailyVariation = (Math.random() - 0.5) * 50; // ±25 USD variation
    const trend = Math.sin(i * 0.1) * 20; // Slight trend
    const price = basePrice + dailyVariation + trend;

    prices.push({
      ds: date,
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
    });
  }

  return prices;
}

async function addHistoricalData() {
  try {
    console.log("📊 Adding historical gold price data...");

    // Check current data count
    const currentCount = await prisma.goldPrice.count();
    console.log(`Current data points: ${currentCount}`);

    if (currentCount >= 30) {
      console.log("✅ Sufficient data already exists");
      return;
    }

    // Generate historical prices
    const historicalPrices = generateHistoricalPrices();

    // Insert data
    await prisma.goldPrice.createMany({
      data: historicalPrices,
    });

    const newCount = await prisma.goldPrice.count();
    console.log(`✅ Added historical data. Total data points: ${newCount}`);

    // Show sample data
    const sampleData = await prisma.goldPrice.findMany({
      orderBy: { ds: "desc" },
      take: 5,
    });

    console.log("\n📈 Sample recent data:");
    sampleData.forEach((item) => {
      console.log(`${item.ds.toISOString().split("T")[0]}: $${item.price}`);
    });
  } catch (error) {
    console.error("❌ Error adding historical data:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Add historical data
addHistoricalData();
