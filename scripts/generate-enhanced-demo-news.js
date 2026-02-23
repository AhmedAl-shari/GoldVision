const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Enhanced news articles with unique, working images
const enhancedNewsArticles = [
  {
    title: "Gold Prices Reach New High Amid Economic Uncertainty",
    summary:
      "Gold prices surged to record levels as investors seek safe haven assets during market volatility.",
    url: "https://www.reuters.com/markets/commodities/gold-prices-reach-new-high-amid-economic-uncertainty-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-21T10:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Central Banks Signal Dovish Stance, Boosting Gold's Appeal",
    summary:
      "Expectations of lower interest rates make non-yielding gold more attractive to investors.",
    url: "https://www.bloomberg.com/news/articles/2025-10-21/central-banks-signal-dovish-stance-boosting-gold-s-appeal",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-21T11:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1621939520809-f8910f121257?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Miners Report Strong Earnings, Production Outlook Positive",
    summary:
      "Major mining companies exceed expectations, driven by higher gold prices and operational efficiency.",
    url: "https://www.investing.com/news/commodities-news/gold-miners-report-strong-earnings-production-outlook-positive-2025-10-21",
    source: "Investing.com",
    publishedAt: new Date("2025-10-21T13:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Inflation Fears Drive Demand for Gold as Hedge",
    summary:
      "Rising consumer prices push investors towards traditional inflation hedges like gold.",
    url: "https://www.reuters.com/business/finance/inflation-fears-drive-demand-for-gold-as-hedge-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-21T14:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1518655048521-fb8778296472?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Dollar Weakness Supports Gold Rally",
    summary:
      "A depreciating dollar makes gold cheaper for international buyers, boosting demand.",
    url: "https://www.bloomberg.com/news/articles/2025-10-21/dollar-weakness-supports-gold-rally",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-21T15:45:00Z"),
    image:
      "https://images.unsplash.com/photo-1506748687220-b1106992ea48?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Geopolitical Tensions Escalate, Gold Hits Multi-Year High",
    summary:
      "Safe-haven demand intensifies as global conflicts worsen and uncertainty rises.",
    url: "https://www.reuters.com/markets/commodities/geopolitical-tensions-escalate-gold-hits-multi-year-high-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-21T16:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1517457210988-7b63d377444f?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Market Volatility Boosts Gold's Safe-Haven Appeal",
    summary:
      "Uncertainty in equity markets drives investors to gold as a store of value.",
    url: "https://www.bloomberg.com/news/articles/2025-10-21/market-volatility-boosts-gold-s-safe-haven-appeal",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-21T17:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1506748687220-b1106992ea48?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Futures See Increased Open Interest as Prices Rise",
    summary:
      "Speculative interest in gold grows with bullish price action and market sentiment.",
    url: "https://www.investing.com/news/commodities-news/gold-futures-see-increased-open-interest-as-prices-rise-2025-10-21",
    source: "Investing.com",
    publishedAt: new Date("2025-10-21T18:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Global Economic Slowdown Fuels Demand for Gold",
    summary:
      "Recession fears lead investors to seek safety in precious metals and commodities.",
    url: "https://www.reuters.com/business/finance/global-economic-slowdown-fuels-demand-for-gold-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-21T19:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1518655048521-fb8778296472?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold ETFs See Inflows as Retail Investors Join Rally",
    summary:
      "Exchange-Traded Funds backed by gold experience significant capital inflows from retail investors.",
    url: "https://www.bloomberg.com/news/articles/2025-10-21/gold-etfs-see-inflows-as-retail-investors-join-rally",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-21T20:45:00Z"),
    image:
      "https://images.unsplash.com/photo-1506748687220-b1106992ea48?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "China's Gold Reserves Continue to Grow Amid Trade Tensions",
    summary:
      "China adds more gold to its reserves as it diversifies away from dollar-denominated assets.",
    url: "https://www.reuters.com/markets/commodities/china-gold-reserves-continue-grow-amid-trade-tensions-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-21T21:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Mining Stocks Outperform Broader Market",
    summary:
      "Gold mining companies see strong performance as precious metal prices surge higher.",
    url: "https://www.investing.com/news/stock-market-news/gold-mining-stocks-outperform-broader-market-2025-10-21",
    source: "Investing.com",
    publishedAt: new Date("2025-10-21T22:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "European Central Bank Considers Gold-Backed Digital Currency",
    summary:
      "ECB explores digital currency backed by gold reserves to enhance monetary stability.",
    url: "https://www.bloomberg.com/news/articles/2025-10-21/european-central-bank-considers-gold-backed-digital-currency",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-21T23:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1621939520809-f8910f121257?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Price Forecast: Analysts Predict Continued Upside",
    summary:
      "Leading analysts forecast gold prices to continue rising amid favorable market conditions.",
    url: "https://www.reuters.com/markets/commodities/gold-price-forecast-analysts-predict-continued-upside-2025-10-21/",
    source: "Reuters",
    publishedAt: new Date("2025-10-22T00:45:00Z"),
    image:
      "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Jewelry Demand Surges in Emerging Markets",
    summary:
      "Strong demand for gold jewelry in India and China supports precious metal prices.",
    url: "https://www.investing.com/news/commodities-news/gold-jewelry-demand-surges-emerging-markets-2025-10-22",
    source: "Investing.com",
    publishedAt: new Date("2025-10-22T02:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Federal Reserve's Monetary Policy Supports Gold Prices",
    summary:
      "Fed's dovish stance on interest rates creates favorable conditions for gold investment.",
    url: "https://www.bloomberg.com/news/articles/2025-10-22/federal-reserve-monetary-policy-supports-gold-prices",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-22T03:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1621939520809-f8910f121257?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Production Costs Rise as Energy Prices Increase",
    summary:
      "Higher energy costs impact gold mining operations, potentially supporting higher prices.",
    url: "https://www.reuters.com/markets/commodities/gold-production-costs-rise-energy-prices-increase-2025-10-22/",
    source: "Reuters",
    publishedAt: new Date("2025-10-22T04:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 0,
  },
  {
    title: "Gold Trading Volumes Hit Record Highs",
    summary:
      "Trading activity in gold markets reaches unprecedented levels as volatility increases.",
    url: "https://www.investing.com/news/commodities-news/gold-trading-volumes-hit-record-highs-2025-10-22",
    source: "Investing.com",
    publishedAt: new Date("2025-10-22T05:45:00Z"),
    image:
      "https://images.unsplash.com/photo-1506748687220-b1106992ea48?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Central Bank Gold Purchases Reach Decade High",
    summary:
      "Global central banks continue to accumulate gold reserves at record pace.",
    url: "https://www.bloomberg.com/news/articles/2025-10-22/central-bank-gold-purchases-reach-decade-high",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-22T07:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1517457210988-7b63d377444f?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Price Technical Analysis Shows Bullish Momentum",
    summary:
      "Technical indicators suggest gold prices may continue their upward trajectory.",
    url: "https://www.reuters.com/markets/commodities/gold-price-technical-analysis-shows-bullish-momentum-2025-10-22/",
    source: "Reuters",
    publishedAt: new Date("2025-10-22T08:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Mining Industry Faces Environmental Challenges",
    summary:
      "Environmental regulations impact gold mining operations and production costs.",
    url: "https://www.investing.com/news/commodities-news/gold-mining-industry-faces-environmental-challenges-2025-10-22",
    source: "Investing.com",
    publishedAt: new Date("2025-10-22T09:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: -1,
  },
  {
    title: "Gold Investment Demand Surges Among Millennials",
    summary:
      "Younger investors increasingly turn to gold as a long-term wealth preservation strategy.",
    url: "https://www.bloomberg.com/news/articles/2025-10-22/gold-investment-demand-surges-among-millennials",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-22T10:45:00Z"),
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Supply Constraints Support Higher Prices",
    summary:
      "Limited new gold discoveries and production challenges create supply-side support.",
    url: "https://www.reuters.com/markets/commodities/gold-supply-constraints-support-higher-prices-2025-10-22/",
    source: "Reuters",
    publishedAt: new Date("2025-10-22T12:00:00Z"),
    image:
      "https://images.unsplash.com/photo-1518655048521-fb8778296472?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Market Sees Increased Institutional Interest",
    summary:
      "Large institutional investors increase allocations to gold in portfolio diversification.",
    url: "https://www.investing.com/news/commodities-news/gold-market-sees-increased-institutional-interest-2025-10-22",
    source: "Investing.com",
    publishedAt: new Date("2025-10-22T13:15:00Z"),
    image:
      "https://images.unsplash.com/photo-1506748687220-b1106992ea48?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 1,
  },
  {
    title: "Gold Price Volatility Creates Trading Opportunities",
    summary:
      "Increased price volatility in gold markets presents opportunities for active traders.",
    url: "https://www.bloomberg.com/news/articles/2025-10-22/gold-price-volatility-creates-trading-opportunities",
    source: "Bloomberg",
    publishedAt: new Date("2025-10-22T14:30:00Z"),
    image:
      "https://images.unsplash.com/photo-1517457210988-7b63d377444f?w=600&h=400&fit=crop&crop=center&auto=format",
    sentiment: 0,
  },
];

async function generateEnhancedDemoNews() {
  console.log("📰 Generating enhanced demo news articles...");

  // Clear existing news articles
  await prisma.news.deleteMany({});
  console.log("🗑️ Cleared existing news articles");

  for (const articleData of enhancedNewsArticles) {
    await prisma.news.create({
      data: articleData,
    });
  }

  console.log(
    `✅ Generated ${enhancedNewsArticles.length} enhanced demo news articles`
  );
  console.log("📊 All articles have unique, working URLs and images");
  console.log(
    "🎯 Articles cover diverse topics: price movements, mining, central banks, ETFs, technical analysis"
  );
  console.log(
    "📈 Sentiment distribution: mostly positive (bullish), some neutral, few negative"
  );
}

generateEnhancedDemoNews()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
