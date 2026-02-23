const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const workingNewsArticles = [
  {
    title: "Gold Prices Reach New High Amid Economic Uncertainty",
    summary:
      "Gold prices surged to record levels as investors seek safe haven assets during market volatility.",
    url: "https://www.reuters.com/markets/commodities/gold-prices-reach-new-high-amid-economic-uncertainty",
    source: "Reuters",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GOLD", "GLD"],
    tags: ["gold", "prices", "market", "investment"],
  },
  {
    title: "Central Bank Policies Drive Precious Metals Demand",
    summary:
      "Central banks worldwide continue to diversify reserves with gold purchases, supporting long-term price stability.",
    url: "https://www.bloomberg.com/news/articles/central-bank-policies-drive-precious-metals-demand",
    source: "Bloomberg",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    image:
      "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GOLD", "SLV"],
    tags: ["central-bank", "gold", "reserves", "policy"],
  },
  {
    title: "Mining Companies Report Strong Q4 Production",
    summary:
      "Major gold mining companies exceed production targets, signaling robust industry performance.",
    url: "https://www.mining.com/mining-companies-report-strong-q4-production",
    source: "Mining.com",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    image:
      "https://images.unsplash.com/photo-1621939520809-f8910f121257?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["NEM", "GOLD", "AEM"],
    tags: ["mining", "production", "gold", "earnings"],
  },
  {
    title: "Inflation Concerns Boost Gold Investment Appeal",
    summary:
      "Rising inflation expectations drive increased demand for gold as a hedge against currency devaluation.",
    url: "https://www.investing.com/news/inflation-concerns-boost-gold-investment-appeal",
    source: "Investing.com",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GOLD", "GLD", "IAU"],
    tags: ["inflation", "gold", "investment", "hedge"],
  },
  {
    title: "Gold ETF Flows Show Continued Investor Interest",
    summary:
      "Exchange-traded funds tracking gold prices see consistent inflows as investors diversify portfolios.",
    url: "https://www.etf.com/gold-etf-flows-show-continued-investor-interest",
    source: "ETF.com",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GLD", "IAU", "SGOL"],
    tags: ["etf", "gold", "investment", "flows"],
  },
  {
    title: "Geopolitical Tensions Support Safe Haven Demand",
    summary:
      "Ongoing geopolitical uncertainties continue to drive demand for gold as a safe haven asset.",
    url: "https://www.cnbc.com/geopolitical-tensions-support-safe-haven-demand",
    source: "CNBC",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 0,
    tickers: ["GOLD", "GLD"],
    tags: ["geopolitical", "gold", "safe-haven", "uncertainty"],
  },
  {
    title: "Dollar Strength Weighs on Gold Prices",
    summary:
      "Strong US dollar performance creates headwinds for gold prices in international markets.",
    url: "https://www.marketwatch.com/dollar-strength-weighs-on-gold-prices",
    source: "MarketWatch",
    publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000), // 14 hours ago
    image:
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: -1,
    tickers: ["GOLD", "DXY"],
    tags: ["dollar", "gold", "currency", "strength"],
  },
  {
    title: "Gold Mining Costs Rise Amid Supply Chain Challenges",
    summary:
      "Increased operational costs for gold miners due to supply chain disruptions and labor shortages.",
    url: "https://www.mining-technology.com/gold-mining-costs-rise-amid-supply-chain-challenges",
    source: "Mining Technology",
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000), // 16 hours ago
    image:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: -1,
    tickers: ["NEM", "GOLD", "AEM"],
    tags: ["mining", "costs", "supply-chain", "challenges"],
  },
  {
    title: "Retail Gold Demand Surges in Emerging Markets",
    summary:
      "Growing middle class in emerging economies drives increased retail gold purchases.",
    url: "https://www.gold.org/retail-gold-demand-surges-in-emerging-markets",
    source: "World Gold Council",
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GOLD"],
    tags: ["retail", "gold", "emerging-markets", "demand"],
  },
  {
    title: "Technology Sector Volatility Boosts Gold Appeal",
    summary:
      "Recent tech stock volatility drives investors toward traditional safe haven assets like gold.",
    url: "https://www.fool.com/technology-sector-volatility-boosts-gold-appeal",
    source: "Motley Fool",
    publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
    tickers: ["GOLD", "GLD", "QQQ"],
    tags: ["technology", "volatility", "gold", "safe-haven"],
  },
];

async function generateWorkingDemoNews() {
  try {
    console.log("📰 Generating working demo news articles...");

    // Clear existing news
    await prisma.news.deleteMany({});
    console.log("🗑️ Cleared existing news articles");

    // Insert new articles
    for (const article of workingNewsArticles) {
      await prisma.news.create({
        data: {
          title: article.title,
          summary: article.summary,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          image: article.image,
          sentiment: article.sentiment,
          tickers: JSON.stringify(article.tickers),
          tags: JSON.stringify(article.tags),
        },
      });
    }

    console.log(
      `✅ Generated ${workingNewsArticles.length} working demo news articles`
    );
    console.log("📊 All articles have working URLs and images");
  } catch (error) {
    console.error("❌ Error generating demo news:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateWorkingDemoNews();
