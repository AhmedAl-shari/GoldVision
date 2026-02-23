/**
 * Realistic News Provider
 * Provides authentic, human-like news data when NEWS_PROVIDER=fixtures
 */

const fs = require("fs");
const path = require("path");

// Realistic news sources with diverse backgrounds
const newsSources = [
  "Reuters",
  "Bloomberg",
  "Financial Times",
  "Wall Street Journal",
  "MarketWatch",
  "Kitco News",
  "Mining.com",
  "CNBC",
  "Yahoo Finance",
  "Investing.com",
  "South China Morning Post",
  "Gulf News",
  "Arab News",
  "Middle East Eye",
  "Yemen Times",
  "Saba News Agency",
  "Al Jazeera",
  "BBC Business",
  "Associated Press",
  "Dow Jones",
  "S&P Global",
  "Refinitiv",
  "ETF.com",
  "GoldSeek",
  "BullionVault",
  "TheStreet",
  "Seeking Alpha",
  "Zero Hedge",
];

// Realistic company names and locations
const companies = [
  "Barrick Gold Corp.",
  "Newmont Corporation",
  "AngloGold Ashanti",
  "Gold Fields Ltd.",
  "Kinross Gold Corporation",
  "Agnico Eagle Mines",
  "Yamana Gold Inc.",
  "Eldorado Gold Corp.",
  "Harmony Gold Mining",
  "Sibanye-Stillwater",
  "Fresnillo PLC",
  "Polymetal International",
  "Zijin Mining Group",
  "Shandong Gold Mining",
  "China National Gold Group",
  "Freeport-McMoRan",
];

const locations = [
  "London",
  "New York",
  "Zurich",
  "Dubai",
  "Singapore",
  "Hong Kong",
  "Tokyo",
  "Sydney",
  "Toronto",
  "Johannesburg",
  "Moscow",
  "Istanbul",
  "Riyadh",
  "Doha",
  "Sana'a",
  "Aden",
  "Taiz",
  "Hodeidah",
  "Marib",
  "Ibb",
];

// Realistic analyst names
const analysts = [
  "Sarah Chen",
  "Michael Rodriguez",
  "Ahmed Al-Zahra",
  "David Thompson",
  "Fatima Hassan",
  "James Wilson",
  "Aisha Mohammed",
  "Robert Kim",
  "Nour Al-Din",
  "Christopher Lee",
  "Mariam Abdullah",
  "Alexander Petrov",
  "Layla Ibrahim",
  "Thomas Anderson",
  "Yasmin Ali",
];

// Breaking news templates (urgent, short)
const breakingNewsTemplates = [
  {
    title: "BREAKING: Gold Jumps $45 to $2,847 After Fed Comments",
    summary:
      "Gold surged $45 per ounce to $2,847 in London trading following Federal Reserve Chair Powell's remarks about inflation concerns. The precious metal hit session highs as investors sought safe-haven assets.",
    sentiment: 1,
    tags: ["Breaking News", "Federal Reserve", "Price Movement"],
  },
  {
    title: "URGENT: Major Gold Mine Suspends Operations in South Africa",
    summary:
      "AngloGold Ashanti has temporarily suspended operations at its Mponeng mine following safety concerns. The mine produces approximately 300,000 ounces annually.",
    sentiment: -1,
    tags: ["Breaking News", "Mining", "Production"],
  },
  {
    title: "FLASH: USD/YER Rate Hits 1,250 - New Record High",
    summary:
      "The US Dollar to Yemeni Rial exchange rate reached an unprecedented 1,250 in parallel markets, up from 1,180 yesterday. Local traders report increased demand for dollars.",
    sentiment: -1,
    tags: ["Breaking News", "USD", "YER", "Exchange Rate"],
  },
];

// Analysis article templates (detailed, analytical)
const analysisTemplates = [
  {
    title: "Gold's Technical Outlook: Key Support at $2,750 Under Pressure",
    summary:
      "Technical analyst Sarah Chen at Kitco News warns that gold's critical support level at $2,750 per ounce is showing signs of weakness. 'If we break below $2,720, we could see a retest of the $2,650 level,' Chen noted. The 50-day moving average at $2,780 continues to act as resistance.",
    sentiment: -1,
    tags: ["Technical Analysis", "Support Levels", "Price Targets"],
  },
  {
    title: "Central Bank Gold Buying Spree: What It Means for Prices",
    summary:
      "According to World Gold Council data, central banks purchased 1,136 tonnes of gold in 2024, the second-highest annual total on record. 'This trend reflects growing concerns about currency debasement and geopolitical tensions,' said Michael Rodriguez, senior analyst at Refinitiv.",
    sentiment: 1,
    tags: ["Central Banks", "Geopolitics", "Currency Concerns"],
  },
  {
    title: "Yemen's Gold Market: Adapting to Economic Challenges",
    summary:
      "Despite ongoing economic difficulties, Yemen's gold markets in Sana'a and Aden continue to function, with traders developing innovative solutions to currency volatility. Local jeweler Ahmed Al-Zahra reports steady demand for gold jewelry as a store of value.",
    sentiment: 1,
    tags: ["Yemen", "Local Markets", "Economic Adaptation"],
  },
];

// Market update templates (routine, factual)
const marketUpdateTemplates = [
  {
    title: "London Gold Fix Sets at $2,798.50 - Up $12.30",
    summary:
      "The London Bullion Market Association's afternoon gold fix was set at $2,798.50 per ounce, up $12.30 from the morning fix. Trading volume was 15% above average, with strong buying interest from Asian markets.",
    sentiment: 1,
    tags: ["London Fix", "Price Update", "Trading Volume"],
  },
  {
    title: "Gold ETF Holdings Rise by 2.3 Tonnes This Week",
    summary:
      "Global gold-backed ETF holdings increased by 2.3 tonnes to 3,247.8 tonnes, according to data from the World Gold Council. The SPDR Gold Trust (GLD) saw the largest inflow at 1.8 tonnes.",
    sentiment: 1,
    tags: ["ETF", "Holdings", "Inflows"],
  },
  {
    title: "COMEX Gold Futures Close Higher on Dollar Weakness",
    summary:
      "December gold futures on the COMEX division of the New York Mercantile Exchange settled at $2,801.20 per ounce, up $18.40. The dollar index fell 0.3% to 103.45, supporting precious metals.",
    sentiment: 1,
    tags: ["COMEX", "Futures", "Dollar Index"],
  },
];

// Company-specific news templates
const companyNewsTemplates = [
  {
    title: "Barrick Gold Reports Q4 Production of 1.05M Ounces",
    summary:
      "Barrick Gold Corporation announced fourth-quarter production of 1.05 million ounces, meeting guidance. The company's Nevada operations contributed 580,000 ounces, while African mines produced 470,000 ounces. CEO Mark Bristow noted 'strong operational performance despite challenging conditions.'",
    sentiment: 1,
    tags: ["Barrick Gold", "Production", "Earnings"],
  },
  {
    title: "Newmont Faces Cost Pressures at Yanacocha Mine",
    summary:
      "Newmont Corporation reported increased operating costs at its Yanacocha mine in Peru, with all-in sustaining costs rising to $1,450 per ounce. The company cited higher labor costs and energy prices as contributing factors.",
    sentiment: -1,
    tags: ["Newmont", "Costs", "Peru"],
  },
  {
    title: "AngloGold Ashanti Completes Obuasi Mine Expansion",
    summary:
      "AngloGold Ashanti has completed the $500 million expansion of its Obuasi mine in Ghana, increasing annual production capacity to 400,000 ounces. The project was completed on schedule and within budget.",
    sentiment: 1,
    tags: ["AngloGold Ashanti", "Expansion", "Ghana"],
  },
];

// Regional news templates
const regionalNewsTemplates = [
  {
    title: "Dubai Gold Souk Sees 15% Increase in Tourist Purchases",
    summary:
      "Gold jewelry sales in Dubai's historic Gold Souk rose 15% in December, driven by increased tourist arrivals and wedding season demand. Local traders report strong interest in traditional Arabic designs.",
    sentiment: 1,
    tags: ["Dubai", "Tourism", "Jewelry"],
  },
  {
    title: "Singapore Gold Imports Rise 8% in November",
    summary:
      "Singapore's gold imports increased 8% month-over-month to 12.3 tonnes in November, according to customs data. The increase was attributed to regional demand and Singapore's role as a regional trading hub.",
    sentiment: 1,
    tags: ["Singapore", "Imports", "Regional Trade"],
  },
  {
    title: "Hong Kong Gold Premiums Narrow to $2-3 per Ounce",
    summary:
      "Gold premiums in Hong Kong have narrowed to $2-3 per ounce above London spot prices, down from $5-7 per ounce last month. The narrowing reflects improved supply conditions and reduced demand.",
    sentiment: -1,
    tags: ["Hong Kong", "Premiums", "Supply"],
  },
];

// Economic indicator templates
const economicTemplates = [
  {
    title: "US Inflation Data Shows 3.2% Year-Over-Year Increase",
    summary:
      "The US Consumer Price Index rose 3.2% year-over-year in November, slightly above expectations. Core inflation, excluding food and energy, increased 4.0%. The data supports the case for continued Fed hawkishness.",
    sentiment: -1,
    tags: ["Inflation", "Federal Reserve", "Economic Data"],
  },
  {
    title: "Yemen's Central Bank Reports Foreign Reserves at $2.1B",
    summary:
      "Yemen's Central Bank announced foreign exchange reserves of $2.1 billion as of November 30, down from $2.3 billion in October. The decline reflects continued economic pressures and reduced remittances.",
    sentiment: -1,
    tags: ["Yemen", "Central Bank", "Foreign Reserves"],
  },
  {
    title: "China's Gold Reserves Rise to 2,264 Tonnes",
    summary:
      "The People's Bank of China reported gold reserves of 2,264 tonnes at the end of November, up 23 tonnes from October. This marks the 13th consecutive month of gold purchases by the central bank.",
    sentiment: 1,
    tags: ["China", "Central Bank", "Gold Reserves"],
  },
];

// Demo news data with realistic, diverse content - no duplicates
const demoNewsData = [
  {
    title: "BREAKING: Gold Jumps $45 to $2,847 After Fed Comments",
    summary:
      "Gold surged $45 per ounce to $2,847 in London trading following Federal Reserve Chair Powell's remarks about inflation concerns. The precious metal hit session highs as investors sought safe-haven assets.",
    url: "https://demo-news.com/breaking-gold-fed-comments-v5",
    source: "Reuters",
    publishedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    sentiment: 1,
    tags: ["Breaking News", "Federal Reserve", "Price Movement"],
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
    isBreaking: true,
  },
  {
    title: "Central Bank Gold Buying Spree: What It Means for Prices",
    summary:
      "According to World Gold Council data, central banks purchased 1,136 tonnes of gold in 2024, the second-highest annual total on record. 'This trend reflects growing concerns about currency debasement and geopolitical tensions,' said Michael Rodriguez, senior analyst at Refinitiv.",
    url: "https://demo-news.com/central-bank-gold-buying-analysis-v5",
    source: "Financial Times",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    sentiment: 1,
    tags: ["Central Banks", "Geopolitics", "Currency Concerns"],
    image:
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop&crop=center&auto=format",
  },
  {
    title: "USD/YER Rate Hits 1,250 - New Record High",
    summary:
      "The US Dollar to Yemeni Rial exchange rate reached an unprecedented 1,250 in parallel markets, up from 1,180 yesterday. Local traders report increased demand for dollars amid economic uncertainty.",
    url: "https://demo-news.com/usd-yer-record-high-v5",
    source: "Bloomberg",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    sentiment: -1,
    tags: ["USD", "YER", "Exchange Rate", "Economic Uncertainty"],
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop&crop=center&auto=format",
  },
  {
    title: "Barrick Gold Reports Q4 Production of 1.05M Ounces",
    summary:
      "Barrick Gold Corporation announced fourth-quarter production of 1.05 million ounces, meeting guidance. The company's Nevada operations contributed 580,000 ounces, while African mines produced 470,000 ounces. CEO Mark Bristow noted 'strong operational performance despite challenging conditions.'",
    url: "https://demo-news.com/barrick-q4-production-v5",
    source: "Mining.com",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    sentiment: 1,
    tags: ["Barrick Gold", "Production", "Earnings"],
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center&auto=format",
  },
  {
    title: "Gold's Technical Outlook: Key Support at $2,750 Under Pressure",
    summary:
      "Technical analyst Sarah Chen at Kitco News warns that gold's critical support level at $2,750 per ounce is showing signs of weakness. 'If we break below $2,720, we could see a retest of the $2,650 level,' Chen noted. The 50-day moving average at $2,780 continues to act as resistance.",
    url: "https://demo-news.com/gold-technical-outlook-v5",
    source: "Kitco News",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    sentiment: -1,
    tags: ["Technical Analysis", "Support Levels", "Price Targets"],
    image:
      "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
  },
  {
    title: "Yemen's Gold Market: Adapting to Economic Challenges",
    summary:
      "Despite ongoing economic difficulties, Yemen's gold markets in Sana'a and Aden continue to function, with traders developing innovative solutions to currency volatility. Local jeweler Ahmed Al-Zahra reports steady demand for gold jewelry as a store of value.",
    url: "https://demo-news.com/yemen-gold-market-adaptation-v5",
    source: "Arab News",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    sentiment: 1,
    tags: ["Yemen", "Local Markets", "Economic Adaptation"],
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop&crop=center&auto=format",
  },
  {
    title: "Dubai Gold Souk Sees 15% Increase in Tourist Purchases",
    summary:
      "Gold jewelry sales in Dubai's historic Gold Souk rose 15% in December, driven by increased tourist arrivals and wedding season demand. Local traders report strong interest in traditional Arabic designs.",
    url: "https://demo-news.com/dubai-gold-souk-tourist-demand-v5",
    source: "Gulf News",
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000), // 16 hours ago
    sentiment: 1,
    tags: ["Dubai", "Tourism", "Jewelry"],
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&crop=center&auto=format",
  },
];

// Helper function to get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate realistic price movements
function generatePriceMovement(basePrice = 2800) {
  const change = (Math.random() - 0.5) * 100; // -50 to +50
  const newPrice = basePrice + change;
  return {
    price: newPrice.toFixed(2),
    change: change.toFixed(2),
    changePercent: ((change / basePrice) * 100).toFixed(2),
  };
}

// Helper function to generate realistic time ago
function generateTimeAgo() {
  const minutes = Math.floor(Math.random() * 60);
  const hours = Math.floor(Math.random() * 24);
  const days = Math.floor(Math.random() * 7);

  if (minutes < 60) {
    return new Date(Date.now() - minutes * 60 * 1000);
  } else if (hours < 24) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  } else {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}

// Additional realistic news templates to avoid repetition
const additionalTemplates = [
  {
    title: "Gold Mining Stocks Rally on Production Beat",
    summary:
      "Major gold mining companies saw their shares rise 3-5% after reporting better-than-expected production figures for the quarter. Barrick Gold led gains with a 4.2% increase.",
    sentiment: 1,
    tags: ["Mining Stocks", "Production", "Earnings"],
  },
  {
    title: "Federal Reserve Signals Potential Rate Cut",
    summary:
      "Fed officials hinted at possible interest rate reductions in 2025, citing cooling inflation data. Gold futures jumped $12 on the news as lower rates typically support precious metals.",
    sentiment: 1,
    tags: ["Federal Reserve", "Interest Rates", "Inflation"],
  },
  {
    title: "China's Gold Imports Hit 6-Month High",
    summary:
      "China imported 156 tonnes of gold in November, the highest level since May. The increase reflects strong retail demand ahead of the Lunar New Year celebrations.",
    sentiment: 1,
    tags: ["China", "Imports", "Retail Demand"],
  },
  {
    title: "Gold ETF Outflows Continue for Third Week",
    summary:
      "Global gold-backed ETFs saw net outflows of 1.8 tonnes last week, marking the third consecutive week of redemptions. Investors continue rotating into riskier assets.",
    sentiment: -1,
    tags: ["ETF", "Outflows", "Risk Appetite"],
  },
  {
    title: "Yemen's Currency Crisis Deepens",
    summary:
      "The Yemeni Rial fell to a new low of 1,280 per dollar in parallel markets, down from 1,200 last week. Economic instability continues to pressure the local currency.",
    sentiment: -1,
    tags: ["Yemen", "Currency Crisis", "Economic Instability"],
  },
  {
    title: "Gold Jewelry Demand Surges in India",
    summary:
      "Gold jewelry sales in India increased 18% year-over-year in November, driven by wedding season demand and lower gold prices. Local traders report strong inventory turnover.",
    sentiment: 1,
    tags: ["India", "Jewelry", "Wedding Season"],
  },
  {
    title: "Central Bank Gold Reserves Reach Record",
    summary:
      "Global central bank gold holdings hit 36,700 tonnes at the end of Q3, the highest level on record. Emerging market central banks led the purchases.",
    sentiment: 1,
    tags: ["Central Banks", "Reserves", "Emerging Markets"],
  },
  {
    title: "Gold Price Volatility Hits 3-Month Low",
    summary:
      "Gold's 30-day volatility dropped to 12.5%, the lowest level since August. Reduced volatility suggests the market is finding equilibrium after recent price swings.",
    sentiment: 0,
    tags: ["Volatility", "Market Stability", "Technical Analysis"],
  },
];

// Generate additional realistic news articles with better variety
function generateAdditionalNews(count = 15) {
  const additionalNews = [];
  const allTemplates = [
    ...breakingNewsTemplates,
    ...analysisTemplates,
    ...marketUpdateTemplates,
    ...companyNewsTemplates,
    ...regionalNewsTemplates,
    ...economicTemplates,
    ...additionalTemplates,
  ];

  // Track used templates to avoid exact duplicates
  const usedTemplates = new Set();
  const usedSources = new Set();
  const usedTitles = new Set();

  for (let i = 0; i < count; i++) {
    // Ensure we don't repeat the same template too often
    let template;
    let attempts = 0;
    do {
      template = getRandomElement(allTemplates);
      attempts++;
    } while (usedTemplates.has(template.title) && attempts < 15);

    usedTemplates.add(template.title);

    // Ensure source variety
    let source;
    do {
      source = getRandomElement(newsSources);
    } while (usedSources.has(source) && usedSources.size < newsSources.length);
    usedSources.add(source);

    const analyst = getRandomElement(analysts);
    const company = getRandomElement(companies);
    const location = getRandomElement(locations);
    const priceData = generatePriceMovement();
    const publishedAt = generateTimeAgo();

    // Generate unique URL with more variety
    const urlSuffix = Math.random().toString(36).substring(7);
    const url = `https://demo-news.com/${template.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${urlSuffix}-${i}`;

    // Enhanced image selection with more variety and better categorization
    let imageUrl;
    const imageOptions = {
      goldBars: [
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center&auto=format",
        "https://images.unsplash.com/photo-1621939520809-f8910f121257?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
      goldCoins: [
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop&crop=center&auto=format",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
      dollarBills: [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop&crop=center&auto=format",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
      mining: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
      jewelry: [
        "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
      charts: [
        "https://images.unsplash.com/photo-1561489396-888724115d4d?w=600&h=400&fit=crop&crop=center&auto=format",
      ],
    };

    // More specific image selection logic
    if (
      template.tags.includes("Breaking News") ||
      template.tags.includes("Price Movement") ||
      template.tags.includes("Federal Reserve")
    ) {
      imageUrl = getRandomElement(imageOptions.goldBars);
    } else if (
      template.tags.includes("Central Banks") ||
      template.tags.includes("Reserves") ||
      template.tags.includes("China")
    ) {
      imageUrl = getRandomElement(imageOptions.goldCoins);
    } else if (
      template.tags.includes("USD") ||
      template.tags.includes("YER") ||
      template.tags.includes("Currency Crisis") ||
      template.tags.includes("Exchange Rate")
    ) {
      imageUrl = getRandomElement(imageOptions.dollarBills);
    } else if (
      template.tags.includes("Mining") ||
      template.tags.includes("Production") ||
      template.tags.includes("Barrick") ||
      template.tags.includes("AngloGold")
    ) {
      imageUrl = getRandomElement(imageOptions.mining);
    } else if (
      template.tags.includes("Jewelry") ||
      template.tags.includes("Tourism") ||
      template.tags.includes("Dubai") ||
      template.tags.includes("India")
    ) {
      imageUrl = getRandomElement(imageOptions.jewelry);
    } else if (
      template.tags.includes("Technical Analysis") ||
      template.tags.includes("Support Levels") ||
      template.tags.includes("Volatility")
    ) {
      imageUrl = getRandomElement(imageOptions.charts);
    } else {
      // For other cases, randomly select from all categories to avoid overusing charts
      const allImages = [
        ...imageOptions.goldBars,
        ...imageOptions.goldCoins,
        ...imageOptions.dollarBills,
        ...imageOptions.mining,
        ...imageOptions.jewelry,
      ];
      imageUrl = getRandomElement(allImages);
    }

    // Enhanced customization with more variety
    let customizedTitle = template.title;
    let customizedSummary = template.summary;

    // Add more specific details and variations
    if (template.tags.includes("Price Movement")) {
      const priceVariations = [
        priceData.price,
        (priceData.price * 1.02).toFixed(2),
        (priceData.price * 0.98).toFixed(2),
      ];
      const changeVariations = [
        Math.abs(priceData.change),
        (Math.abs(priceData.change) * 1.1).toFixed(2),
        (Math.abs(priceData.change) * 0.9).toFixed(2),
      ];

      customizedTitle = customizedTitle.replace(
        /\$2,847/g,
        `$${getRandomElement(priceVariations)}`
      );
      customizedSummary = customizedSummary.replace(
        /\$45/g,
        `$${getRandomElement(changeVariations)}`
      );
    }

    if (template.tags.includes("Technical Analysis")) {
      customizedSummary = customizedSummary.replace("Sarah Chen", analyst);
      customizedSummary = customizedSummary.replace("Kitco News", source);
    }

    if (template.tags.includes("Central Banks")) {
      customizedSummary = customizedSummary.replace(
        "Michael Rodriguez",
        analyst
      );
      customizedSummary = customizedSummary.replace("Refinitiv", source);
    }

    if (template.tags.includes("Yemen")) {
      customizedSummary = customizedSummary.replace("Ahmed Al-Zahra", analyst);
    }

    // Add some realistic variations to make it less templated
    if (Math.random() > 0.7) {
      customizedSummary +=
        " Market analysts expect this trend to continue in the coming weeks.";
    }

    // Check for title uniqueness to avoid duplicates
    let finalTitle = customizedTitle;
    let titleAttempts = 0;
    while (usedTitles.has(finalTitle) && titleAttempts < 5) {
      finalTitle = customizedTitle + ` (${titleAttempts + 1})`;
      titleAttempts++;
    }
    usedTitles.add(finalTitle);

    additionalNews.push({
      title: finalTitle,
      summary: customizedSummary,
      url,
      source,
      publishedAt,
      sentiment: template.sentiment,
      tags: template.tags,
      image: imageUrl,
      readTime: Math.floor(Math.random() * 5) + 2, // 2-6 minutes
      isLive: Math.random() > 0.8, // 20% chance of being live
      isBreaking: template.tags.includes("Breaking News"),
    });
  }

  return additionalNews;
}

/**
 * Get demo news data
 */
function getDemoNews() {
  const additionalNews = generateAdditionalNews(15); // Generate 15 additional articles (total: 7 + 15 = 22)
  return [...demoNewsData, ...additionalNews];
}

/**
 * Filter demo news by sentiment
 */
function filterBySentiment(news, sentiment) {
  if (sentiment === null || sentiment === undefined) return news;
  return news.filter((item) => item.sentiment === sentiment);
}

/**
 * Get news by source
 */
function getNewsBySource(news, source) {
  if (!source) return news;
  return news.filter((item) =>
    item.source.toLowerCase().includes(source.toLowerCase())
  );
}

/**
 * Get breaking news
 */
function getBreakingNews(news) {
  return news.filter((item) => item.isBreaking === true);
}

/**
 * Get live news
 */
function getLiveNews(news) {
  return news.filter((item) => item.isLive === true);
}

/**
 * Search news by keyword
 */
function searchNews(news, keyword) {
  if (!keyword) return news;
  const lowerKeyword = keyword.toLowerCase();
  return news.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerKeyword) ||
      item.summary.toLowerCase().includes(lowerKeyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
  );
}

module.exports = {
  getDemoNews,
  filterBySentiment,
  getNewsBySource,
  getBreakingNews,
  getLiveNews,
  searchNews,
  newsSources,
  companies,
  locations,
  analysts,
};
