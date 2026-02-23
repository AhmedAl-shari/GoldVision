import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../lib/config";
import { useLocale } from "../contexts/useLocale";
import {
  useNewsInfinite,
  useSpotRate,
  getFxStatus,
  NewsItem as APINewsItem,
} from "../lib/api";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Globe,
  Calendar,
  Users,
  Clock,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Filter,
  Zap,
  Smile,
  Frown,
  Meh,
} from "lucide-react";

interface LiveNewsItem {
  id: string;
  title: string;
  summary: string;
  timestamp: Date;
  impact: "high" | "medium" | "low";
  category: "gold" | "usd" | "yer" | "breaking";
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  imageUrl: string | null;
  imageAlt: string;
  readTime: string;
  tags: string[];
  isLive: boolean;
}

interface MarketSnapshot {
  goldPrice: number;
  goldChange: number;
  goldChangePercent: number;
  usdIndex: number;
  usdChange: number;
  usdChangePercent: number;
  yerRate: number;
  yerChange: number;
  yerChangePercent: number;
  lastUpdate: Date;
}

// Dynamic image component with OG extraction fallback
const DynamicNewsImage = ({
  news,
  className,
}: {
  news: LiveNewsItem;
  className: string;
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(news.imageUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageError = async () => {
    if (isLoading) return; // Prevent multiple simultaneous requests

    setIsLoading(true);
    try {
      // Try to extract OG image from the news source URL
      const response = await fetch(
        `${API_BASE_URL}/og?url=${encodeURIComponent(news.source)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.image) {
          setImageSrc(data.image);
        } else {
          // Final fallback to a generic news placeholder
          setImageSrc("/api/placeholder/400/250?text=News");
        }
      } else {
        // Final fallback to a generic news placeholder
        setImageSrc("/api/placeholder/400/250?text=News");
      }
    } catch (error) {
      console.warn("Failed to extract OG image:", error);
      // Final fallback to a generic news placeholder
      setImageSrc("/api/placeholder/400/250?text=News");
    } finally {
      setIsLoading(false);
    }
  };

  if (!imageSrc) {
    return (
      <div
        className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}
      >
        <div className="text-gray-500 dark:text-gray-400 text-xs">No Image</div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={news.imageAlt}
      className={className}
      loading="lazy"
      onError={handleImageError}
    />
  );
};
const LiveGoldNews = () => {
  const { t, isRTL, textDirection } = useLocale();

  // Fetch paginated news from API (no client-side duplication)
  const {
    data: newsPages,
    isLoading: newsLoading,
    error: newsError,
    fetchNextPage,
    hasNextPage,
    refetch: refetchNews,
  } = useNewsInfinite({ page_size: 20, sort: "latest" });

  // Fetch provider status for strict labeling/error
  const { data: aggregateInfo } = useQuery({
    queryKey: ["news-aggregate-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/news/aggregate?limit=1`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Convert API news items to component format
  const newsItems: LiveNewsItem[] = useMemo(() => {
    const flatArticles = newsPages?.pages
      ? newsPages.pages.flatMap((p: any) => p.items || [])
      : [];
    if (flatArticles.length === 0) return [];

    return flatArticles.map((article: APINewsItem, index: number) => ({
      id: article.id || `news-${index}`,
      title: article.title || "No title available",
      summary: article.summary || article.description || "No summary available",
      timestamp: new Date(
        article.published_at || article.created_at || Date.now()
      ),
      impact: determineImpact(article.title || "", article.summary || ""),
      category: determineCategory(article.title || "", article.summary || ""),
      source: article.source || "Unknown",
      sentiment: determineSentiment(article.title || "", article.summary || ""),
      imageUrl: article.image_url || null, // Let the component handle fallback dynamically
      imageAlt: article.image_alt || "News image",
      readTime: calculateReadTime(article.summary || article.description || ""),
      tags: extractTags(article.title || "", article.summary || ""),
      isLive: isRecentNews(article.published_at || article.created_at),
    }));
  }, [newsPages]);

  const strictNoProvider =
    aggregateInfo?.sources?.strict &&
    aggregateInfo?.sources?.activeProvider === "none";

  // Helper functions
  const determineImpact = (
    title: string,
    summary: string
  ): "high" | "medium" | "low" => {
    const highImpactKeywords = [
      "breaking",
      "urgent",
      "crisis",
      "surge",
      "collapse",
      "explosive",
      "historic",
      "record",
    ];
    const mediumImpactKeywords = [
      "rise",
      "fall",
      "increase",
      "decrease",
      "change",
      "update",
    ];

    const text = (title + " " + summary).toLowerCase();

    if (highImpactKeywords.some((keyword) => text.includes(keyword)))
      return "high";
    if (mediumImpactKeywords.some((keyword) => text.includes(keyword)))
      return "medium";
    return "low";
  };

  const determineCategory = (
    title: string,
    summary: string
  ): "gold" | "usd" | "yer" | "breaking" => {
    const text = (title + " " + summary).toLowerCase();

    if (text.includes("breaking") || text.includes("urgent")) return "breaking";
    if (
      text.includes("gold") ||
      text.includes("xau") ||
      text.includes("precious metal")
    )
      return "gold";
    if (text.includes("dollar") || text.includes("usd") || text.includes("dxy"))
      return "usd";
    if (text.includes("yemen") || text.includes("yer") || text.includes("rial"))
      return "yer";

    return "gold"; // Default to gold
  };

  const determineSentiment = (
    title: string,
    summary: string
  ): "positive" | "negative" | "neutral" => {
    const positiveKeywords = [
      "surge",
      "rise",
      "increase",
      "gain",
      "rally",
      "boom",
      "success",
      "growth",
    ];
    const negativeKeywords = [
      "fall",
      "drop",
      "decline",
      "crash",
      "crisis",
      "loss",
      "collapse",
      "plunge",
    ];

    const text = (title + " " + summary).toLowerCase();

    const positiveCount = positiveKeywords.filter((keyword) =>
      text.includes(keyword)
    ).length;
    const negativeCount = negativeKeywords.filter((keyword) =>
      text.includes(keyword)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  };

  const calculateReadTime = (text: string): string => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const extractTags = (title: string, summary: string): string[] => {
    const commonTags = [
      "Gold",
      "USD",
      "YER",
      "Federal Reserve",
      "Market",
      "Trading",
      "Analysis",
    ];
    const text = (title + " " + summary).toLowerCase();

    return commonTags
      .filter((tag) => text.includes(tag.toLowerCase()))
      .slice(0, 5);
  };

  const isRecentNews = (dateString: string): boolean => {
    const newsDate = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - newsDate.getTime()) / (1000 * 60);
    return diffInMinutes <= 30; // Consider news "live" if published within last 30 minutes
  };

  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot>({
    goldPrice: 0,
    goldChange: 0,
    goldChangePercent: 0,
    usdIndex: 0,
    usdChange: 0,
    usdChangePercent: 0,
    yerRate: 0,
    yerChange: 0,
    yerChangePercent: 0,
    lastUpdate: new Date(),
  });
  const { data: spotRate } = useSpotRate();
  useEffect(() => {
    let mounted = true;
    const loadFx = async () => {
      try {
        const fx: any = await getFxStatus();
        if (!mounted) return;
        const dxy = fx?.dxy?.value ?? 0;
        const dxyChange = fx?.dxy?.change ?? 0;
        const dxyChangePct = fx?.dxy?.changePercent ?? 0;
        const yer = fx?.yer?.rate ?? 0;
        const yerChange = fx?.yer?.change ?? 0;
        const yerChangePct = fx?.yer?.changePercent ?? 0;
        const gold = spotRate?.usdPerOunce ?? 0;

        setMarketSnapshot({
          goldPrice: gold,
          goldChange: fx?.gold?.change ?? 0,
          goldChangePercent: fx?.gold?.changePercent ?? 0,
          usdIndex: dxy,
          usdChange: dxyChange,
          usdChangePercent: dxyChangePct,
          yerRate: yer,
          yerChange: yerChange,
          yerChangePercent: yerChangePct,
          lastUpdate: new Date(),
        });
      } catch {
        // ignore
      }
    };
    loadFx();
    const interval = setInterval(loadFx, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [spotRate?.usdPerOunce]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<
    "all" | "gold" | "usd" | "yer" | "breaking"
  >("all");
  const [sortMode, setSortMode] = useState<"latest" | "top">("latest");

  // New: search, source filter, pagination, impact/sentiment/onlyLive
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [impactFilter, setImpactFilter] = useState<
    "All" | "high" | "medium" | "low"
  >("All");
  const [sentimentFilter, setSentimentFilter] = useState<
    "All" | "positive" | "negative" | "neutral"
  >("All");
  const [onlyLive, setOnlyLive] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const allSources = useMemo(() => {
    const setS = new Set<string>(newsItems.map((n) => n.source));
    return ["All", ...Array.from(setS).sort()];
  }, [newsItems]);

  // Keyboard: focus search with '/'
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");
      if (!isTyping && e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Update clock without fabricating market/news data
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high":
        return <AlertTriangle className="w-3 h-3" />;
      case "medium":
        return <TrendingUp className="w-3 h-3" />;
      case "low":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      case "neutral":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "USD") return `$${price.toFixed(2)}`;
    if (currency === "YER") return `${price.toFixed(2)} YER`;
    return price.toFixed(2);
  };

  const highlight = (text: string, query: string) => {
    const q = query.trim();
    if (!q) return text;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp("(" + escaped + ")", "ig");
      const parts = text.split(regex);
      return parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    } catch {
      return text;
    }
  };

  // Derived list based on filter/sort/search
  const filteredAndSorted = useMemo(() => {
    const text = searchQuery.trim().toLowerCase();
    return newsItems
      .filter((n) =>
        activeFilter === "all" ? true : n.category === activeFilter
      )
      .filter((n) =>
        sourceFilter === "All" ? true : n.source === sourceFilter
      )
      .filter((n) =>
        impactFilter === "All" ? true : n.impact === impactFilter
      )
      .filter((n) =>
        sentimentFilter === "All" ? true : n.sentiment === sentimentFilter
      )
      .filter((n) => (onlyLive ? n.isLive : true))
      .filter((n) =>
        text
          ? n.title.toLowerCase().includes(text) ||
            n.summary.toLowerCase().includes(text) ||
            n.tags.some((t) => t.toLowerCase().includes(text))
          : true
      )
      .sort((a, b) => {
        if (sortMode === "latest")
          return b.timestamp.getTime() - a.timestamp.getTime();
        // top = high impact first, then most recent
        const impactRank = { high: 0, medium: 1, low: 2 } as const;
        const ia = impactRank[a.impact];
        const ib = impactRank[b.impact];
        if (ia !== ib) return ia - ib;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }, [
    newsItems,
    activeFilter,
    sourceFilter,
    impactFilter,
    sentimentFilter,
    onlyLive,
    searchQuery,
    sortMode,
  ]);

  // (Optional) SSE can be added back when needed; pagination already updates periodically

  // Infinite scroll: load next page when sentinel is visible
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (hasNextPage) {
              fetchNextPage();
            }
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // External link helper
  const ExternalLinkSafe = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
    >
      {children}
      <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
    </a>
  );

  const displayedNews = filteredAndSorted.slice(0, visibleCount);
  const canLoadMore = filteredAndSorted.length > displayedNews.length;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {newsLoading && (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-lg font-medium text-muted-foreground">
                Loading live news...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {newsError && (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Failed to load news
                </h3>
                <p className="text-muted-foreground mb-4">
                  {newsError instanceof Error
                    ? newsError.message
                    : "An error occurred while fetching news"}
                </p>
                <button
                  onClick={() => refetchNews()}
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strict provider unavailability */}
      {!newsLoading && !newsError && strictNoProvider && (
        <div className="card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
              <div className="text-amber-800 dark:text-amber-200 font-semibold">
                News provider unavailable (strict mode)
              </div>
              <div className="text-amber-700 dark:text-amber-300 text-sm">
                Configure a valid MarketAux key to enable news.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!newsLoading &&
        !newsError &&
        !strictNoProvider &&
        newsItems.length === 0 && (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <NewspaperIcon className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No news available
                  </h3>
                  <p className="text-muted-foreground">
                    There are no news articles to display at the moment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Main Content - Only show if we have data */}
      {!newsLoading && !newsError && newsItems.length > 0 && (
        <>
          {/* Professional Live Market Snapshot */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLiveMode ? "bg-red-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                Professional Market Snapshot
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium ${
                    isLiveMode
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {isLiveMode ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  {isLiveMode ? "LIVE" : "PAUSED"}
                </button>
                <div className="text-xs text-muted">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gold */}
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Gold (XAU/USD)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                      LIVE
                    </span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                  {formatPrice(marketSnapshot.goldPrice, "USD")}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    marketSnapshot.goldChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {marketSnapshot.goldChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {marketSnapshot.goldChange >= 0 ? "+" : ""}
                  {marketSnapshot.goldChange.toFixed(2)} (
                  {marketSnapshot.goldChangePercent >= 0 ? "+" : ""}
                  {marketSnapshot.goldChangePercent.toFixed(2)}%)
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Spot Price • London Fix
                </div>
              </div>

              {/* USD */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">
                    USD Index (DXY)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      LIVE
                    </span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-1">
                  {marketSnapshot.usdIndex.toFixed(2)}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    marketSnapshot.usdChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {marketSnapshot.usdChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {marketSnapshot.usdChange >= 0 ? "+" : ""}
                  {marketSnapshot.usdChange.toFixed(2)} (
                  {marketSnapshot.usdChangePercent >= 0 ? "+" : ""}
                  {marketSnapshot.usdChangePercent.toFixed(2)}%)
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Weighted Average • 6 Currencies
                </div>
              </div>

              {/* YER */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    USD/YER
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      LIVE
                    </span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-200 mb-1">
                  {marketSnapshot.yerRate.toFixed(2)}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    marketSnapshot.yerChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {marketSnapshot.yerChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {marketSnapshot.yerChange >= 0 ? "+" : ""}
                  {marketSnapshot.yerChange.toFixed(2)} (
                  {marketSnapshot.yerChangePercent >= 0 ? "+" : ""}
                  {marketSnapshot.yerChangePercent.toFixed(2)}%)
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Central Bank Rate • Yemen
                </div>
              </div>
            </div>
          </div>

          {/* Professional News Feed */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLiveMode ? "bg-red-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                {t("professionalNewsFeed")}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="w-4 h-4" />
                  <span>
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {newsItems.filter((item) => item.isLive).length} {t("live")}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div
              className="flex flex-wrap gap-2 mb-4 items-center"
              dir={textDirection}
            >
              {(
                [
                  { key: "all", label: t("all") },
                  { key: "gold", label: t("gold") },
                  { key: "usd", label: t("usd") },
                  { key: "yer", label: t("yer") },
                  { key: "breaking", label: t("breaking") },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setActiveFilter(f.key);
                    setVisibleCount(8);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    activeFilter === f.key
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-foreground"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {/* Search */}
              <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <Search className="w-4 h-4 text-muted" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(8);
                  }}
                  placeholder={`${t("searchPlaceholder")} (/)`}
                  className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted"
                />
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <Filter className="w-4 h-4 text-muted" />
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setVisibleCount(8);
                  }}
                  className="bg-transparent outline-none text-xs text-foreground"
                >
                  {allSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impact Filter */}
              <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <Zap className="w-4 h-4 text-muted" />
                <select
                  value={impactFilter}
                  onChange={(e) => {
                    setImpactFilter(e.target.value as any);
                    setVisibleCount(8);
                  }}
                  className="bg-transparent outline-none text-xs text-foreground"
                >
                  {(["All", "high", "medium", "low"] as const).map((v) => (
                    <option key={v} value={v}>
                      {typeof v === "string"
                        ? v[0].toUpperCase() + v.slice(1)
                        : v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sentiment Filter */}
              <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <Meh className="w-4 h-4 text-muted" />
                <select
                  value={sentimentFilter}
                  onChange={(e) => {
                    setSentimentFilter(e.target.value as any);
                    setVisibleCount(8);
                  }}
                  className="bg-transparent outline-none text-xs text-foreground"
                >
                  {(["All", "positive", "negative", "neutral"] as const).map(
                    (v) => (
                      <option key={v} value={v}>
                        {typeof v === "string"
                          ? v[0].toUpperCase() + v.slice(1)
                          : v}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Only Live Toggle */}
              <button
                onClick={() => {
                  setOnlyLive((v) => !v);
                  setVisibleCount(8);
                }}
                className={`ml-2 px-2 py-1 rounded text-xs font-medium border ${
                  onlyLive
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-foreground"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
                aria-pressed={onlyLive}
              >
                {t("liveOnly")}
              </button>

              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="text-muted">Sort:</span>
                <button
                  onClick={() => setSortMode("latest")}
                  className={`px-2 py-1 rounded border ${
                    sortMode === "latest"
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {t("latest")}
                </button>
                <button
                  onClick={() => setSortMode("top")}
                  className={`px-2 py-1 rounded border ${
                    sortMode === "top"
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {t("top")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedNews.map((news) => (
                <div
                  key={news.id}
                  className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    news.isLive
                      ? "bg-white dark:bg-gray-900 border-l-2 border-l-red-400 border-gray-200 dark:border-gray-800"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* News Image */}
                    <div className="flex-shrink-0">
                      <DynamicNewsImage
                        news={news}
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                    </div>

                    {/* News Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {news.isLive && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}
                            dir={textDirection}
                          >
                            {(news.category === "breaking"
                              ? t("breaking")
                              : news.category === "gold"
                              ? t("gold")
                              : news.category === "usd"
                              ? t("usd")
                              : t("yer")
                            ).toUpperCase()}
                          </span>
                          <span className={`${getImpactColor(news.impact)}`}>
                            {getImpactIcon(news.impact)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {news.source}
                          </span>
                          <span dir={textDirection}>{news.readTime}</span>
                          <ExternalLink
                            className="w-3 h-3"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <h4
                        className="font-semibold text-sm text-foreground mb-2 line-clamp-2"
                        dir={textDirection}
                      >
                        {highlight(news.title, searchQuery)}
                      </h4>
                      <p
                        className="text-xs text-muted mb-3 line-clamp-2"
                        dir={textDirection}
                      >
                        {news.summary}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span
                            className={`${getSentimentColor(
                              news.sentiment
                            )} font-medium`}
                          >
                            {news.sentiment.toUpperCase()}
                          </span>
                          <span>{formatTimeAgo(news.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {news.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {canLoadMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 8)}
                  className="px-4 py-2 text-sm font-medium rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LiveGoldNews;
