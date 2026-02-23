// Internationalization support for GoldVision
export type Locale = "en" | "ar";

export interface Translations {
  // Navigation
  dashboard: string;
  trends: string;
  alerts: string;
  news: string;
  calculator: string;
  settings: string;
  login: string;
  logout: string;

  // Dashboard
  currentPrice: string;
  nextDayForecast: string;
  priceTrendForecast: string;
  refreshData: string;

  // Trends
  trendsForecast: string;
  historicalGoldPrices: string;
  dateRange: string;
  showErrorAnalysis: string;
  hideErrorAnalysis: string;
  averageAbsoluteError: string;
  averagePercentError: string;
  dataPoints: string;
  dailyErrorAnalysis: string;
  actualPrice: string;
  forecastPrice: string;
  absoluteError: string;
  percentError: string;
  forecastGenerated: string;

  // Alerts
  priceAlerts: string;
  createAlert: string;
  yourAlerts: string;
  alertType: string;
  direction: string;
  thresholdPrice: string;
  priceAbove: string;
  priceBelow: string;
  above: string;
  below: string;
  enterPriceThreshold: string;
  alertCreated: string;
  alertDeleted: string;
  noAlertsFound: string;
  priceAboveThreshold: string;
  priceBelowThreshold: string;
  triggered: string;
  created: string;

  // Common
  loading: string;
  error: string;
  success: string;
  delete: string;
  submit: string;
  save: string;
  edit: string;
  close: string;
  cancel: string;
  confirm: string;
  yes: string;
  no: string;
  required: string;
  optional: string;

  // Form validation
  alertTypeRequired: string;
  directionRequired: string;
  thresholdRequired: string;
  thresholdMustBePositive: string;

  // Chat
  chatTitle: string;
  chatPlaceholder: string;
  chatDisclaimer: string;
  chatErrorMessage: string;
  chatSummarizeToday: string;
  chatCreateAlertBelow: string;
  chatExplainForecast: string;
  chatRunBacktest: string;
  chatCheckAlerts: string;
  chatCreateNewAlert: string;

  // Admin
  adminDashboard: string;
  adminSubtitle: string;
  apiDocs: string;
  prometheus: string;
  health: string;

  // Yemen pricing
  summary: string;
  ounce: string;
  gram: string;
  kilogram: string;
  tola: string;
  spotRateDisclaimer: string;
  yemenDisclaimer: string;
  errorLoadingData: string;

  // News
  newsTitle: string;
  live: string;
  professionalNewsFeed: string;
  searchPlaceholder: string;
  source: string;
  latest: string;
  top: string;
  liveOnly: string;
  breaking: string;
  gold: string;
  usd: string;
  yer: string;
  all: string;
  read: string;
  noResults: string;

  // Auth
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  signIn: string;
  signUp: string;
  createAccount: string;
  signingIn: string;
  creating: string;
  capsLockOn: string;
  hidePassword: string;
  showPassword: string;
  tipKeyboard: string;
  loginFailed: string;
  signupFailed: string;

  // Dashboard
  strongBullishMomentum: string;
  bullishDescription: string;
  bearishPressureAlert: string;
  bearishDescription: string;
  highVolatilityEnvironment: string;
  volatilityDescription: string;
  overboughtConditions: string;
  overboughtDescription: string;
  oversoldOpportunity: string;
  oversoldDescription: string;
  marketFearDetected: string;
  fearDescription: string;
  greedLevelsRising: string;
  greedDescription: string;
  strongMomentumSignal: string;
  momentumDescription: string;
  refreshing: string;
  refresh: string;
  high: string;
  medium: string;
  low: string;
  failedToRefresh: string;

  // Admin
  testEmailSent: string;
  retrainRequestSubmitted: string;
  allDataRefreshed: string;
  autoRefresh: string;
  paused: string;
  active: string;
  inactive: string;
  never: string;
  failedToSendEmail: string;
  failedToSubmitRequest: string;
  // Components
  dataSource: string;
  status: string;
  lastFetch: string;
  lastPrice: string;
  providerType: string;
  interval: string;
  fallbackUsed: string;
  confidence: string;
  unknown: string;
  healthy: string;
  unhealthy: string;
  warning: string;
  neutral: string;
  bullish: string;
  bearish: string;
  positive: string;
  negative: string;
  greed: string;
  fear: string;
  marketIntelligence: string;
  advancedAnalytics: string;
  realTimeInsights: string;
  aiPoweredAnalysis: string;
  neutralTrend: string;
  advanced: string;
  aiAssistant: string;
  goldSpotPrice: string;
  comexBenchmark: string;
  lastUpdated: string;
  usdPerTroyOunce: string;
  bidAskSpread: string;
  spread: string;
  sellingPrice: string;
  buyingPrice: string;
  marketClosed: string;
  tradingInvolvesRisk: string;
  pastPerformanceWarning: string;
  dataProvidedBy: string;
  updatedInRealTime: string;

  // Market Recommendations
  todaysMarketSummary: string;
  marketRecommendation: string;
  recommendationBuy: string;
  recommendationSell: string;
  recommendationHold: string;
  recommendationWatch: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
  timeHorizon: string;
  timeHorizonShort: string;
  timeHorizonMedium: string;
  timeHorizonLong: string;
  priceTargets: string;
  support: string;
  target: string;
  resistance: string;
  keyMetrics: string;
  marketRegime: string;
  regimeBull: string;
  regimeBear: string;
  regimeVolatile: string;
  regimeStable: string;
  forecastChange: string;
  priceChange24h: string;
  modelConfidence: string;
  keyDriver: string;
  viewFullAnalysis: string;
  todaysRecommendation: string;
  marketSummary: string;
  analyzingMarketConditions: string;
  marketShows: string;
  priceHasIncreased: string;
  priceHasDecreased: string;
  inLast24Hours: string;
  ensembleModelPredicts: string;
  rise: string;
  fall: string;
  withConfidence: string;
  basedOnAnalysis: string;
  recommendationIs: string;
  percent: string;
  detailedAnalysis: string;
  recommendationReasoning: string;
  riskAssessment: string;
  priceRange: string;
  trend: string;
  volatility: string;
}

const translations: Record<Locale, Translations> = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    trends: "Trends",
    alerts: "Alerts",
    news: "News",
    calculator: "Calculator",
    settings: "Settings",
    login: "Login",
    logout: "Logout",

    // Dashboard
    currentPrice: "Current Price",
    nextDayForecast: "Next Day Forecast",
    priceTrendForecast: "Price Trend & Forecast",
    refreshData: "Refresh Data",

    // Trends
    trendsForecast: "Trends & Forecast",
    historicalGoldPrices:
      "Historical gold prices with 30-day Prophet forecast including confidence intervals.",
    dateRange: "Date Range",
    showErrorAnalysis: "Show Error Analysis",
    hideErrorAnalysis: "Hide Error Analysis",
    averageAbsoluteError: "Average Absolute Error",
    averagePercentError: "Average Percent Error",
    dataPoints: "Data Points",
    dailyErrorAnalysis: "Daily Error Analysis",
    actualPrice: "Actual Price",
    forecastPrice: "Forecast Price",
    absoluteError: "Absolute Error",
    percentError: "Percent Error",
    forecastGenerated:
      "Forecast generated using Facebook Prophet time series analysis",

    // Alerts
    priceAlerts: "Price Alerts",
    createAlert: "Create Alert",
    yourAlerts: "Your Alerts",
    alertType: "Alert Type",
    direction: "Direction",
    thresholdPrice: "Threshold Price (USD)",
    priceAbove: "Price Above Threshold",
    priceBelow: "Price Below Threshold",
    above: "Above",
    below: "Below",
    enterPriceThreshold: "Enter price threshold",
    alertCreated: "Alert created successfully",
    alertDeleted: "Alert deleted successfully",
    noAlertsFound: "No alerts found",
    priceAboveThreshold: "Price Above $",
    priceBelowThreshold: "Price Below $",
    triggered: "Triggered",
    created: "Created",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    delete: "Delete",
    submit: "Submit",
    save: "Save",
    edit: "Edit",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    required: "Required",
    optional: "Optional",

    // Form validation
    alertTypeRequired: "Alert type is required",
    directionRequired: "Direction is required",
    thresholdRequired: "Threshold is required",
    thresholdMustBePositive: "Threshold must be positive",

    // Chat
    chatTitle: "GoldVision Copilot",
    chatPlaceholder: "Ask about gold prices, forecasts, or create alerts...",
    chatDisclaimer:
      "⚠️ This is not financial advice. GoldVision Copilot provides market analysis for informational purposes only.",
    chatErrorMessage: "Sorry, I encountered an error. Please try again.",
    chatSummarizeToday: "Summarize today's move",
    chatCreateAlertBelow: "Create alert below {price}",
    chatExplainForecast: "Explain this forecast",
    chatRunBacktest: "Run 14-day backtest",
    chatCheckAlerts: "Check my alerts",
    chatCreateNewAlert: "Create new alert",

    // Admin
    adminDashboard: "Admin Dashboard",
    adminSubtitle: "Operations, observability, and evidence tools",
    apiDocs: "API Docs",
    prometheus: "Prometheus",
    health: "Health",

    // Yemen pricing
    summary: "Summary",
    ounce: "Ounce",
    gram: "Gram",
    kilogram: "Kilogram",
    tola: "Tola",
    // News
    newsTitle: "GoldVision News",
    live: "LIVE",
    professionalNewsFeed: "Professional Financial News Feed",
    searchPlaceholder: "Search headlines, tags...",
    source: "Source",
    latest: "Latest",
    top: "Top",
    liveOnly: "LIVE only",
    breaking: "Breaking",
    gold: "Gold",
    usd: "USD",
    yer: "YER",
    all: "All",
    read: "read",
    noResults: "No news matches your filters.",

    // Auth
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create account",
    signingIn: "Signing in...",
    creating: "Creating...",
    capsLockOn: "Caps Lock is ON",
    hidePassword: "Hide",
    showPassword: "Show",
    tipKeyboard: "Tip: Press",
    loginFailed: "Login failed",
    signupFailed: "Signup failed",

    // Dashboard
    strongBullishMomentum: "Strong Bullish Momentum",
    bullishDescription:
      "Price action shows sustained upward momentum with strong buying pressure and positive technical indicators",
    bearishPressureAlert: "Bearish Pressure Alert",
    bearishDescription:
      "Market showing downward pressure with selling momentum and negative technical signals",
    highVolatilityEnvironment: "High Volatility Environment",
    volatilityDescription:
      "Market experiencing significant price swings with increased uncertainty and trading volume",
    overboughtConditions: "Overbought Conditions",
    overboughtDescription:
      "Technical indicators suggest potential price correction due to excessive buying pressure",
    oversoldOpportunity: "Oversold Opportunity",
    oversoldDescription:
      "Market conditions indicate potential buying opportunity with oversold technical indicators",
    marketFearDetected: "Market Fear Detected",
    fearDescription:
      "Heightened market anxiety detected with increased volatility and risk-off sentiment",
    greedLevelsRising: "Greed Levels Rising",
    greedDescription:
      "Market sentiment showing signs of excessive optimism and potential overvaluation",
    strongMomentumSignal: "Strong Momentum Signal",
    momentumDescription:
      "Clear directional momentum detected with strong technical confirmation and volume support",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    high: "High",
    medium: "Medium",
    low: "Low",
    failedToRefresh: "Failed to refresh data",

    // Admin
    testEmailSent: "Test email sent successfully",
    retrainRequestSubmitted: "Retrain request submitted successfully",
    allDataRefreshed: "All data refreshed",
    autoRefresh: "Auto Refresh",
    paused: "Paused",
    active: "Active",
    inactive: "Inactive",
    never: "Never",
    failedToSendEmail: "Failed to send test email",
    failedToSubmitRequest: "Failed to submit retrain request",

    // Components
    dataSource: "Data Source",
    status: "Status",
    lastFetch: "Last Fetch",
    lastPrice: "Last Price",
    providerType: "Provider Type",
    interval: "Interval",
    fallbackUsed: "Fallback Used",
    confidence: "Confidence",
    unknown: "unknown",
    healthy: "healthy",
    unhealthy: "unhealthy",
    warning: "warning",
    neutral: "Neutral",
    bullish: "Bullish",
    bearish: "Bearish",
    positive: "Positive",
    negative: "Negative",
    greed: "Greed",
    fear: "Fear",
    marketIntelligence: "Market Intelligence",
    advancedAnalytics:
      "Advanced analytics, real-time insights, and AI-powered market analysis",
    realTimeInsights: "real-time insights",
    aiPoweredAnalysis: "AI-powered market analysis",
    neutralTrend: "Neutral Trend",
    advanced: "Advanced",
    aiAssistant: "AI Assistant",
    goldSpotPrice: "Gold Spot Price",
    comexBenchmark: "COMEX Benchmark",
    lastUpdated: "Last Updated",
    usdPerTroyOunce: "USD per Troy Ounce",
    bidAskSpread: "Bid / Ask Spread",
    spread: "Spread",
    sellingPrice: "Selling price",
    buyingPrice: "Buying price",
    marketClosed: "MARKET CLOSED",
    tradingInvolvesRisk:
      "Trading involves risk. Past performance does not guarantee future results.",
    pastPerformanceWarning:
      "Past performance does not guarantee future results.",
    dataProvidedBy: "Data provided by GoldVision Markets",
    updatedInRealTime: "Updated in real-time",
    spotRateDisclaimer:
      "Retail prices vary by city/shop. This is derived from USD spot & public FX, not financial advice.",
    yemenDisclaimer:
      "Prices are derived from USD spot rates and public FX data. This information is for reference only and does not constitute financial advice.",
    errorLoadingData: "Error loading data",

    // Market Recommendations
    todaysMarketSummary: "Today's Market Summary",
    marketRecommendation: "Market Recommendation",
    recommendationBuy: "BUY",
    recommendationSell: "SELL",
    recommendationHold: "HOLD",
    recommendationWatch: "WATCH",
    riskLevel: "Risk Level",
    riskLow: "LOW",
    riskMedium: "MEDIUM",
    riskHigh: "HIGH",
    timeHorizon: "Time Horizon",
    timeHorizonShort: "SHORT",
    timeHorizonMedium: "MEDIUM",
    timeHorizonLong: "LONG",
    priceTargets: "Price Targets",
    support: "Support",
    target: "Target",
    resistance: "Resistance",
    keyMetrics: "Key Metrics",
    marketRegime: "Market Regime",
    regimeBull: "Bullish",
    regimeBear: "Bearish",
    regimeVolatile: "Volatile",
    regimeStable: "Stable",
    forecastChange: "Forecast Change",
    priceChange24h: "24h Change",
    modelConfidence: "Model Confidence",
    keyDriver: "Key Driver",
    viewFullAnalysis: "View Full Analysis",
    todaysRecommendation: "Today's Recommendation",
    marketSummary: "Market Summary",
    analyzingMarketConditions: "Analyzing market conditions...",
    marketShows: "Today's gold market shows",
    priceHasIncreased: "The price has increased by",
    priceHasDecreased: "The price has decreased by",
    inLast24Hours: "in the last 24 hours.",
    ensembleModelPredicts: "Our ensemble model predicts a",
    rise: "rise",
    fall: "fall",
    withConfidence: "with",
    basedOnAnalysis: "Based on this analysis, our recommendation is to",
    recommendationIs: "recommendation is to",
    percent: "%",
    detailedAnalysis: "Detailed Analysis",
    recommendationReasoning: "Recommendation Reasoning",
    riskAssessment: "Risk Assessment",
    priceRange: "Price Range",
    trend: "Trend",
    volatility: "Volatility",
  },

  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    trends: "الاتجاهات",
    alerts: "التنبيهات",
    news: "الأخبار",
    calculator: "الآلة الحاسبة",
    settings: "الإعدادات",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",

    // Dashboard
    currentPrice: "السعر الحالي",
    nextDayForecast: "توقع اليوم التالي",
    priceTrendForecast: "اتجاه السعر والتوقع",
    refreshData: "تحديث البيانات",

    // Trends
    trendsForecast: "الاتجاهات والتوقعات",
    historicalGoldPrices:
      "أسعار الذهب التاريخية مع توقع 30 يوم من Prophet يتضمن فترات الثقة.",
    dateRange: "نطاق التاريخ",
    showErrorAnalysis: "إظهار تحليل الأخطاء",
    hideErrorAnalysis: "إخفاء تحليل الأخطاء",
    averageAbsoluteError: "متوسط الخطأ المطلق",
    averagePercentError: "متوسط الخطأ النسبي",
    dataPoints: "نقاط البيانات",
    dailyErrorAnalysis: "تحليل الأخطاء اليومية",
    actualPrice: "السعر الفعلي",
    forecastPrice: "السعر المتوقع",
    absoluteError: "الخطأ المطلق",
    percentError: "الخطأ النسبي",
    forecastGenerated:
      "تم إنشاء التوقع باستخدام تحليل السلاسل الزمنية Facebook Prophet",

    // Alerts
    priceAlerts: "تنبيهات الأسعار",
    createAlert: "إنشاء تنبيه",
    yourAlerts: "تنبيهاتك",
    alertType: "نوع التنبيه",
    direction: "الاتجاه",
    thresholdPrice: "سعر العتبة (دولار)",
    priceAbove: "السعر أعلى من العتبة",
    priceBelow: "السعر أقل من العتبة",
    above: "أعلى",
    below: "أقل",
    enterPriceThreshold: "أدخل سعر العتبة",
    alertCreated: "تم إنشاء التنبيه بنجاح",
    alertDeleted: "تم حذف التنبيه بنجاح",
    noAlertsFound: "لم يتم العثور على تنبيهات",
    priceAboveThreshold: "السعر أعلى من $",
    priceBelowThreshold: "السعر أقل من $",
    triggered: "تم تفعيله",
    created: "تم الإنشاء",

    // Common
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجح",
    delete: "حذف",
    submit: "إرسال",
    save: "حفظ",
    edit: "تعديل",
    close: "إغلاق",
    cancel: "إلغاء",
    confirm: "تأكيد",
    yes: "نعم",
    no: "لا",
    required: "مطلوب",
    optional: "اختياري",

    // Form validation
    alertTypeRequired: "نوع التنبيه مطلوب",
    directionRequired: "الاتجاه مطلوب",
    thresholdRequired: "سعر العتبة مطلوب",
    thresholdMustBePositive: "يجب أن يكون سعر العتبة موجباً",

    // Chat
    chatTitle: "مساعد GoldVision",
    chatPlaceholder: "اسأل عن أسعار الذهب أو التوقعات أو أنشئ تنبيهات...",
    chatDisclaimer:
      "⚠️ هذا ليس نصيحة مالية. مساعد GoldVision يوفر تحليل السوق لأغراض إعلامية فقط.",
    chatErrorMessage: "عذراً، واجهت خطأ. يرجى المحاولة مرة أخرى.",
    chatSummarizeToday: "لخص حركة اليوم",
    chatCreateAlertBelow: "إنشاء تنبيه أقل من {price}",
    chatExplainForecast: "اشرح هذا التوقع",
    chatRunBacktest: "تشغيل اختبار 14 يوم",
    chatCheckAlerts: "تحقق من تنبيهاتي",
    chatCreateNewAlert: "إنشاء تنبيه جديد",

    // Admin
    adminDashboard: "لوحة تحكم الإدارة",
    adminSubtitle: "أدوات العمليات والمراقبة والأدلة",
    apiDocs: "وثائق API",
    prometheus: "بروميثيوس",
    health: "الصحة",

    // Yemen pricing
    summary: "ملخص",
    ounce: "أونصة",
    gram: "جرام",
    kilogram: "كيلوغرام",
    tola: "تولا",
    // News
    newsTitle: "أخبار GoldVision",
    live: "مباشر",
    professionalNewsFeed: "الأخبار المالية الاحترافية",
    searchPlaceholder: "ابحث في العناوين أو الوسوم...",
    source: "المصدر",
    latest: "الأحدث",
    top: "الأهم",
    liveOnly: "مباشر فقط",
    breaking: "عاجل",
    gold: "ذهب",
    usd: "دولار",
    yer: "ريال",
    all: "الكل",
    read: "قراءة",
    noResults: "لا توجد نتائج مطابقة للفلاتر.",

    // Auth
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    firstName: "الاسم الأول",
    lastName: "الاسم الأخير",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    createAccount: "إنشاء حساب",
    signingIn: "جاري تسجيل الدخول...",
    creating: "جاري الإنشاء...",
    capsLockOn: "Caps Lock مفعل",
    hidePassword: "إخفاء",
    showPassword: "إظهار",
    tipKeyboard: "نصيحة: اضغط",
    loginFailed: "فشل تسجيل الدخول",
    signupFailed: "فشل إنشاء الحساب",

    // Dashboard
    strongBullishMomentum: "زخم صاعد قوي",
    bullishDescription:
      "حركة السعر تُظهر زخماً صاعداً مستداماً مع ضغط شراء قوي ومؤشرات فنية إيجابية",
    bearishPressureAlert: "تنبيه ضغط هابط",
    bearishDescription:
      "السوق يُظهر ضغطاً هابطاً مع زخم بيع وإشارات فنية سلبية",
    highVolatilityEnvironment: "بيئة تقلبات عالية",
    volatilityDescription:
      "السوق يواجه تقلبات كبيرة في الأسعار مع زيادة عدم اليقين وحجم التداول",
    overboughtConditions: "ظروف شراء مفرط",
    overboughtDescription:
      "المؤشرات الفنية تشير إلى تصحيح محتمل في السعر بسبب ضغط شراء مفرط",
    oversoldOpportunity: "فرصة بيع مفرط",
    oversoldDescription:
      "ظروف السوق تشير إلى فرصة شراء محتملة مع مؤشرات فنية بيع مفرط",
    marketFearDetected: "تم اكتشاف خوف السوق",
    fearDescription:
      "تم اكتشاف قلق متزايد في السوق مع زيادة التقلبات ومشاعر تجنب المخاطر",
    greedLevelsRising: "مستويات الجشع ترتفع",
    greedDescription: "مشاعر السوق تُظهر علامات تفاؤل مفرط وتقييم مفرط محتمل",
    strongMomentumSignal: "إشارة زخم قوي",
    momentumDescription: "تم اكتشاف زخم اتجاهي واضح مع تأكيد فني قوي ودعم حجم",
    refreshing: "جاري التحديث...",
    refresh: "تحديث",
    high: "عالي",
    medium: "متوسط",
    low: "منخفض",
    failedToRefresh: "فشل في تحديث البيانات",

    // Admin
    testEmailSent: "تم إرسال البريد الإلكتروني التجريبي بنجاح",
    retrainRequestSubmitted: "تم تقديم طلب إعادة التدريب بنجاح",
    allDataRefreshed: "تم تحديث جميع البيانات",
    autoRefresh: "تحديث تلقائي",
    paused: "متوقف",
    active: "نشط",
    inactive: "غير نشط",
    never: "أبداً",
    failedToSendEmail: "فشل في إرسال البريد الإلكتروني التجريبي",
    failedToSubmitRequest: "فشل في تقديم طلب إعادة التدريب",

    // Components
    dataSource: "مصدر البيانات",
    status: "الحالة",
    lastFetch: "آخر جلب",
    lastPrice: "آخر سعر",
    providerType: "نوع المزود",
    interval: "الفترة",
    fallbackUsed: "تم استخدام النسخة الاحتياطية",
    confidence: "الثقة",
    unknown: "غير معروف",
    healthy: "سليم",
    unhealthy: "غير سليم",
    warning: "تحذير",
    neutral: "محايد",
    bullish: "صاعد",
    bearish: "هابط",
    positive: "إيجابي",
    negative: "سلبي",
    greed: "جشع",
    fear: "خوف",
    marketIntelligence: "ذكاء السوق",
    advancedAnalytics:
      "تحليلات متقدمة ورؤى في الوقت الفعلي وتحليل السوق المدعوم بالذكاء الاصطناعي",
    realTimeInsights: "رؤى في الوقت الفعلي",
    aiPoweredAnalysis: "تحليل السوق المدعوم بالذكاء الاصطناعي",
    neutralTrend: "اتجاه محايد",
    advanced: "متقدم",
    aiAssistant: "المساعد الذكي",
    goldSpotPrice: "سعر الذهب الفوري",
    comexBenchmark: "معيار COMEX",
    lastUpdated: "آخر تحديث",
    usdPerTroyOunce: "دولار أمريكي لكل أونصة تروي",
    bidAskSpread: "فارق العرض / الطلب",
    spread: "الفارق",
    sellingPrice: "سعر البيع",
    buyingPrice: "سعر الشراء",
    marketClosed: "السوق مغلق",
    tradingInvolvesRisk:
      "التداول ينطوي على مخاطر. الأداء السابق لا يضمن النتائج المستقبلية.",
    pastPerformanceWarning: "الأداء السابق لا يضمن النتائج المستقبلية.",
    dataProvidedBy: "البيانات مقدمة من GoldVision Markets",
    updatedInRealTime: "محدث في الوقت الفعلي",
    spotRateDisclaimer:
      "تختلف الأسعار بالتجزئة حسب المدينة/المتجر. هذا مشتق من السعر الفوري بالدولار الأمريكي وسعر الصرف العام، وليس نصيحة مالية.",
    yemenDisclaimer:
      "الأسعار مشتقة من أسعار الدولار الأمريكي الفورية وبيانات سعر الصرف العامة. هذه المعلومات للإشارة فقط ولا تشكل نصيحة مالية.",
    errorLoadingData: "خطأ في تحميل البيانات",

    // Market Recommendations (Arabic)
    todaysMarketSummary: "ملخص السوق اليوم",
    marketRecommendation: "توصية السوق",
    recommendationBuy: "شراء",
    recommendationSell: "بيع",
    recommendationHold: "احتفظ",
    recommendationWatch: "راقب",
    riskLevel: "مستوى المخاطر",
    riskLow: "منخفض",
    riskMedium: "متوسط",
    riskHigh: "عالي",
    timeHorizon: "الأفق الزمني",
    timeHorizonShort: "قصير",
    timeHorizonMedium: "متوسط",
    timeHorizonLong: "طويل",
    priceTargets: "أهداف السعر",
    support: "الدعم",
    target: "الهدف",
    resistance: "المقاومة",
    keyMetrics: "المقاييس الرئيسية",
    marketRegime: "نظام السوق",
    regimeBull: "صاعد",
    regimeBear: "هابط",
    regimeVolatile: "متقلب",
    regimeStable: "مستقر",
    forecastChange: "تغيير التوقع",
    priceChange24h: "التغيير خلال 24 ساعة",
    modelConfidence: "ثقة النموذج",
    keyDriver: "المحرك الرئيسي",
    viewFullAnalysis: "عرض التحليل الكامل",
    todaysRecommendation: "توصية اليوم",
    marketSummary: "ملخص السوق",
    analyzingMarketConditions: "جارٍ تحليل ظروف السوق...",
    marketShows: "يظهر سوق الذهب اليوم",
    priceHasIncreased: "ارتفع السعر بنسبة",
    priceHasDecreased: "انخفض السعر بنسبة",
    inLast24Hours: "خلال آخر 24 ساعة.",
    ensembleModelPredicts: "يتوقع نموذجنا المجمع",
    rise: "ارتفاع",
    fall: "انخفاض",
    withConfidence: "بثقة",
    basedOnAnalysis: "بناءً على هذا التحليل، توصيتنا هي",
    recommendationIs: "التوصية هي",
    percent: "٪",
    detailedAnalysis: "تحليل مفصل",
    recommendationReasoning: "منطق التوصية",
    riskAssessment: "تقييم المخاطر",
    priceRange: "نطاق السعر",
    trend: "الاتجاه",
    volatility: "التقلب",
  },
};

// Format numbers based on locale
export const formatNumber = (value: number, locale: Locale): string => {
  return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format currency based on locale
export const formatCurrency = (value: number, locale: Locale): string => {
  return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format date based on locale
export const formatDate = (date: string | Date, locale: Locale): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
};

// Get translation
export const t = (key: keyof Translations, locale: Locale = "en"): string => {
  return translations[locale][key] || translations.en[key] || key;
};

// Check if locale is RTL
export const isRTL = (locale: Locale): boolean => {
  return locale === "ar";
};

// Get text direction
export const getTextDirection = (locale: Locale): "ltr" | "rtl" => {
  return isRTL(locale) ? "rtl" : "ltr";
};
