/**
 * Multi-Asset Data Seeding Script
 * Seeds synthetic data for XAU in USD and YER currencies
 */

const { PrismaClient, Prisma } = require("@prisma/client");

// Simple FX provider for seeding
class SimpleFxProvider {
  constructor() {
    this.rates = {
      "USD-USD": 1.0,
      "USD-YER": 250.0, // Approximate YER per USD
      "YER-USD": 0.004, // Approximate USD per YER
      "YER-YER": 1.0,
    };
  }

  async getRate(base, quote) {
    if (base === quote) return 1.0;
    const key = `${base}-${quote}`;
    if (this.rates[key]) return this.rates[key];

    // Try through USD
    if (base !== "USD" && quote !== "USD") {
      const baseToUsd = await this.getRate(base, "USD");
      const usdToQuote = await this.getRate("USD", quote);
      return baseToUsd * usdToQuote;
    }

    throw new Error(`No rate for ${base} to ${quote}`);
  }
}

const fxProvider = new SimpleFxProvider();

const prisma = new PrismaClient();

// Synthetic price relationships
const ASSET_RATIOS = {
  XAU: 1.0, // Gold (base)
};

const CURRENCIES = ["USD", "YER"];

async function generateSyntheticPrices(basePrices) {
  const allPrices = [];

  for (const [date, goldPrice] of basePrices.entries()) {
    for (const [asset, ratio] of Object.entries(ASSET_RATIOS)) {
      for (const currency of CURRENCIES) {
        let basePrice = goldPrice * ratio;

        // Convert to target currency
        let price = basePrice;
        if (currency !== "USD") {
          try {
            const rate = await fxProvider.getRate("USD", currency);
            price = basePrice * rate;
          } catch (error) {
            console.warn(
              `Failed to get FX rate for USD to ${currency}:`,
              error.message
            );
            // Use fallback rates
            const fallbackRates = { YER: 250.0 };
            price = basePrice * fallbackRates[currency];
          }
        }

        allPrices.push({
          asset,
          currency,
          ds: new Date(date),
          price: new Prisma.Decimal(price.toFixed(2)),
        });
      }
    }
  }

  return allPrices;
}

async function seedMultiAssetData() {
  try {
    console.log("🌱 Starting multi-asset data seeding...");

    // Get existing gold prices as base
    const existingPrices = await prisma.goldPrice.findMany({
      orderBy: { ds: "asc" },
      take: 100, // Last 100 days
    });

    if (existingPrices.length === 0) {
      console.log(
        "❌ No existing gold prices found. Please seed gold prices first."
      );
      return;
    }

    console.log(`📊 Found ${existingPrices.length} existing gold prices`);

    // Convert to Map for easier processing
    const basePrices = new Map();
    existingPrices.forEach((price) => {
      basePrices.set(price.ds.toISOString().split("T")[0], price.price);
    });

    // Generate synthetic prices for all assets and currencies
    const syntheticPrices = await generateSyntheticPrices(basePrices);

    console.log(`🔄 Generated ${syntheticPrices.length} synthetic prices`);

    // Clear existing Price table
    await prisma.price.deleteMany({});
    console.log("🗑️  Cleared existing Price table");

    // Insert new prices in batches
    const batchSize = 100;
    for (let i = 0; i < syntheticPrices.length; i += batchSize) {
      const batch = syntheticPrices.slice(i, i + batchSize);
      for (const price of batch) {
        await prisma.price.create({
          data: price,
        });
      }
      console.log(
        `📝 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          syntheticPrices.length / batchSize
        )}`
      );
    }

    // Generate some forecasts for the new data
    await generateForecasts();

    console.log("✅ Multi-asset data seeding completed!");

    // Show summary
    const summary = await prisma.price.groupBy({
      by: ["asset", "currency"],
      _count: { id: true },
    });

    console.log("\n📈 Data Summary:");
    summary.forEach(({ asset, currency, _count }) => {
      console.log(`  ${asset}/${currency}: ${_count.id} prices`);
    });
  } catch (error) {
    console.error("❌ Error seeding multi-asset data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateForecasts() {
  console.log("🔮 Generating forecasts for multi-asset data...");

  const assets = ["XAU"];
  const currencies = ["USD", "YER"];

  for (const asset of assets) {
    for (const currency of currencies) {
      // Get recent prices for this asset/currency
      const prices = await prisma.price.findMany({
        where: { asset, currency },
        orderBy: { ds: "desc" },
        take: 30,
      });

      if (prices.length < 10) continue;

      // Generate simple linear trend forecast
      const latestPrice = prices[0].price;
      const priceChange = (prices[0].price - prices[9].price) / 9; // Average daily change

      const forecasts = [];
      const now = new Date();

      for (let i = 1; i <= 14; i++) {
        const forecastDate = new Date(now);
        forecastDate.setDate(forecastDate.getDate() + i);

        const trend = priceChange * i;
        const noise = (Math.random() - 0.5) * latestPrice * 0.02; // ±1% noise
        const yhat = Number(latestPrice) + trend + noise;
        const uncertainty = Math.abs(yhat) * 0.05; // 5% uncertainty

        forecasts.push({
          asset,
          currency,
          generatedAt: now,
          horizonDays: 14,
          ds: forecastDate,
          yhat: new Prisma.Decimal(yhat.toFixed(2)),
          yhatLower: new Prisma.Decimal((yhat - uncertainty).toFixed(2)),
          yhatUpper: new Prisma.Decimal((yhat + uncertainty).toFixed(2)),
        });
      }

      for (const forecast of forecasts) {
        await prisma.forecast.create({
          data: forecast,
        });
      }

      console.log(
        `  Generated ${forecasts.length} forecasts for ${asset}/${currency}`
      );
    }
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedMultiAssetData()
    .then(() => {
      console.log("🎉 Seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = { seedMultiAssetData };
