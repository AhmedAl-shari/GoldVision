#!/usr/bin/env node

/**
 * Demo News Generator
 * Generates 100 realistic news articles for demo purposes
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Demo news templates
const newsTemplates = [
  {
    title: "Gold Prices Surge on Federal Reserve Interest Rate Decision",
    summary:
      "Gold prices jumped 2.5% following the Federal Reserve's announcement of maintaining current interest rates, with investors seeking safe-haven assets amid economic uncertainty.",
    source: "Financial Times",
    sentiment: 1,
    tags: ["Federal Reserve", "Interest Rates", "Market Analysis"],
  },
  {
    title: "Central Bank Gold Purchases Reach Record High in Q4",
    summary:
      "Global central banks purchased a record 1,200 tonnes of gold in the fourth quarter, signaling continued diversification away from traditional reserve currencies.",
    source: "Reuters",
    sentiment: 1,
    tags: ["Central Banks", "Reserves", "Diversification"],
  },
  {
    title: "Inflation Concerns Drive Gold Investment Demand",
    summary:
      "Rising inflation expectations have led to increased gold investment demand, with ETF holdings reaching their highest level in six months.",
    source: "Bloomberg",
    sentiment: 1,
    tags: ["Inflation", "ETF", "Investment Demand"],
  },
  {
    title: "Gold Mining Production Declines Due to Environmental Regulations",
    summary:
      "Major gold mining companies report production declines as new environmental regulations impact operations across key mining regions.",
    source: "Mining Weekly",
    sentiment: -1,
    tags: ["Mining", "Production", "Environmental"],
  },
  {
    title: "Dollar Strength Weighs on Gold Prices",
    summary:
      "A stronger US dollar has put downward pressure on gold prices, with the precious metal trading lower for the third consecutive session.",
    source: "MarketWatch",
    sentiment: -1,
    tags: ["US Dollar", "Currency", "Price Pressure"],
  },
  {
    title: "Geopolitical Tensions Support Gold Safe-Haven Demand",
    summary:
      "Escalating geopolitical tensions have increased demand for gold as a safe-haven asset, with prices finding support above key technical levels.",
    source: "CNBC",
    sentiment: 1,
    tags: ["Geopolitics", "Safe Haven", "Technical Analysis"],
  },
  {
    title: "Gold ETF Outflows Continue for Second Week",
    summary:
      "Gold exchange-traded funds experienced net outflows for the second consecutive week as investors rotate into riskier assets.",
    source: "ETF.com",
    sentiment: -1,
    tags: ["ETF", "Outflows", "Risk Appetite"],
  },
  {
    title: "China's Gold Imports Surge Ahead of Lunar New Year",
    summary:
      "China's gold imports increased significantly ahead of the Lunar New Year celebrations, driven by strong retail demand for jewelry and investment products.",
    source: "South China Morning Post",
    sentiment: 1,
    tags: ["China", "Imports", "Retail Demand"],
  },
  {
    title: "Gold Futures Show Increased Speculative Positioning",
    summary:
      "Commitments of Traders data reveals increased speculative positioning in gold futures, with hedge funds adding to long positions.",
    source: "Futures Magazine",
    sentiment: 1,
    tags: ["Futures", "Speculation", "Hedge Funds"],
  },
  {
    title: "Gold Recycling Rates Decline Amid Lower Prices",
    summary:
      "Gold recycling rates have declined as lower prices reduce the incentive for consumers to sell their gold jewelry and coins.",
    source: "Recycling Today",
    sentiment: -1,
    tags: ["Recycling", "Supply", "Consumer Behavior"],
  },
];

// Additional news sources
const sources = [
  "Financial Times",
  "Reuters",
  "Bloomberg",
  "MarketWatch",
  "CNBC",
  "Wall Street Journal",
  "Forbes",
  "Investing.com",
  "Kitco News",
  "Mining Weekly",
  "ETF.com",
  "Futures Magazine",
  "South China Morning Post",
];

// Additional tags
const additionalTags = [
  "Market Analysis",
  "Technical Analysis",
  "Fundamental Analysis",
  "Economic Data",
  "Central Banks",
  "Monetary Policy",
  "Fiscal Policy",
  "Inflation",
  "Deflation",
  "Interest Rates",
  "Currency Markets",
  "Commodity Markets",
  "Precious Metals",
  "Safe Haven",
  "Risk Appetite",
  "Investment Demand",
  "Jewelry Demand",
  "Industrial Demand",
  "Supply Chain",
  "Mining",
  "Production",
  "Exploration",
  "Environmental",
  "Regulation",
  "Geopolitics",
  "Trade Wars",
  "Economic Sanctions",
  "Global Economy",
  "Emerging Markets",
  "Developed Markets",
  "US Economy",
  "European Economy",
  "Asian Economy",
  "Chinese Economy",
  "Indian Economy",
  "Middle East",
  "Latin America",
  "Africa",
  "Australia",
  "Canada",
];

// Generate random news article
function generateNewsArticle(index) {
  const template = newsTemplates[index % newsTemplates.length];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const sentiment = Math.random() > 0.5 ? 1 : Math.random() > 0.3 ? -1 : 0;

  // Generate random tags
  const numTags = Math.floor(Math.random() * 3) + 2; // 2-4 tags
  const selectedTags = [...template.tags];
  while (selectedTags.length < numTags) {
    const randomTag =
      additionalTags[Math.floor(Math.random() * additionalTags.length)];
    if (!selectedTags.includes(randomTag)) {
      selectedTags.push(randomTag);
    }
  }

  // Generate realistic timestamps (last 7 days)
  const now = new Date();
  const randomHours = Math.floor(Math.random() * 168); // 0-168 hours (7 days)
  const publishedAt = new Date(now.getTime() - randomHours * 60 * 60 * 1000);

  // Generate unique URL
  const url = `https://demo-news-${
    index + 1
  }.com/gold-market-update-${Date.now()}`;

  // Generate image URL (using Unsplash for demo)
  const imageUrls = [
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=250&fit=crop",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=250&fit=crop",
  ];
  const image = imageUrls[Math.floor(Math.random() * imageUrls.length)];

  return {
    title: template.title,
    summary: template.summary,
    url: url,
    source: source,
    publishedAt: publishedAt,
    sentiment: sentiment,
    tags: JSON.stringify(selectedTags),
    image: image,
    tickers: JSON.stringify(["XAU"]),
    createdAt: new Date(),
  };
}

async function generateDemoNews() {
  try {
    console.log("📰 Generating demo news articles...");

    // Clear existing news
    await prisma.news.deleteMany({});

    // Generate 100 news articles
    const newsArticles = [];
    for (let i = 0; i < 100; i++) {
      newsArticles.push(generateNewsArticle(i));
    }

    // Insert news articles in batches
    console.log(`📝 Inserting ${newsArticles.length} news articles...`);
    for (let i = 0; i < newsArticles.length; i += 20) {
      const batch = newsArticles.slice(i, i + 20);
      await prisma.news.createMany({
        data: batch,
      });
    }

    // Generate some statistics
    const sentimentStats = newsArticles.reduce(
      (acc, article) => {
        if (article.sentiment === 1) acc.positive++;
        else if (article.sentiment === -1) acc.negative++;
        else acc.neutral++;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    console.log("✅ Demo news articles generated successfully!");
    console.log(`📊 News Statistics:`);
    console.log(`   • Total articles: ${newsArticles.length}`);
    console.log(`   • Positive sentiment: ${sentimentStats.positive}`);
    console.log(`   • Negative sentiment: ${sentimentStats.negative}`);
    console.log(`   • Neutral sentiment: ${sentimentStats.neutral}`);
    console.log(
      `   • Live articles: ${newsArticles.filter((a) => a.isLive).length}`
    );
  } catch (error) {
    console.error("❌ Error generating demo news:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  generateDemoNews();
}

module.exports = { generateDemoNews, generateNewsArticle };
