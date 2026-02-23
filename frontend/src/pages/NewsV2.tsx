import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NewsErrorBoundary } from "../components/ErrorBoundary";
import SkeletonLoader from "../components/SkeletonLoader";
import SEO from "../components/SEO";
import { copyToClipboard } from "../lib/clipboard";
import {
  ExternalLink,
  Clock,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  Search,
  Filter,
  RefreshCw,
  Share2,
  Copy,
  Link,
  Globe,
  Zap,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useLocale } from "../contexts/useLocale";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  image?: string;
  imageUrl?: string;
  video?: string;
  videoUrl?: string;
  source: string;
  source_logo?: string;
  published_at: string;
  publishedAt?: string;
  tags: string[];
  sentiment: number;
}

interface NewsResponse {
  items: NewsArticle[];
  count: number;
  total_count: number;
  next_cursor: string | null;
  has_more: boolean;
}

interface NewsCardProps {
  article: NewsArticle;
  size?: "hero" | "large" | "small";
  isLive?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  size = "small",
  isLive = false,
}) => {
  const { t } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const published = new Date(date);
    const diffMs = now.getTime() - published.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m ago` : "Just now";
    }
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.1)
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (sentiment < -0.1)
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.1) return "Positive";
    if (sentiment < -0.1) return "Negative";
    return "Neutral";
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1)
      return "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400";
    if (sentiment < -0.1)
      return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400";
    return "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
  };

  const handleClick = () => {
    window.open(article.url, "_blank", "noopener,noreferrer");
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: article.url,
        });
      } catch (error) {
        // Share cancelled or failed - silently ignore
        if (process.env.NODE_ENV === 'development') {
          console.log("Share cancelled");
        }
      }
    } else {
      // Fallback to clipboard
      await copyToClipboard(article.url);
    }
  };

  const imageClasses = {
    hero: "h-80",
    large: "h-56",
    small: "h-40",
  };

  const cardClasses = {
    hero: "col-span-2 row-span-2",
    large: "col-span-1",
    small: "col-span-1",
  };

  // Get image URL from either image or imageUrl field
  const imageUrl = article.image || article.imageUrl;
  // Get video URL from either video or videoUrl field
  const videoUrl = article.video || article.videoUrl;
  
  // Always use proxy for external images to avoid CORS issues
  const getImageSrc = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // If it's already a proxy URL, return as-is
    if (url.includes('/api/news/image')) return url;
    // If it's an external URL (not relative), use proxy
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `/api/news/image?u=${encodeURIComponent(url)}`;
    }
    // Relative URLs can be used directly
    return url;
  };

  const imageSrc = getImageSrc(imageUrl);

  const isDark = typeof document !== "undefined" 
    ? document.documentElement.classList.contains("dark")
    : false;

  // Don't hide the card - show fallback UI instead when image fails
  // This allows users to see articles even when images don't load

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-xl ${
        isDark
          ? "border-slate-200/15 bg-white/70 dark:border-slate-700/40 dark:bg-slate-900/40"
          : "border-slate-200/60 bg-white/95"
      } ${cardClasses[size]}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Read article: ${article.title}`}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden rounded-t-2xl ${imageClasses[size]} bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900`}
      >
        {/* Show video if available, otherwise show image */}
        {videoUrl && !imageFailed ? (
          // Check if it's a web page URL (Bloomberg, YouTube) or direct video file
          videoUrl.toLowerCase().includes('bloomberg.com') || 
          videoUrl.toLowerCase().includes('youtube.com') || 
          videoUrl.toLowerCase().includes('youtu.be') || 
          videoUrl.toLowerCase().includes('vimeo.com') ? (
            // For web page URLs (Bloomberg/YouTube), show clickable video preview
            <div 
              className="w-full h-full relative cursor-pointer bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group"
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoUrl, '_blank', 'noopener,noreferrer');
              }}
              title="Click to watch video"
            >
              {/* Video thumbnail/background */}
              {imageSrc ? (
                <img 
                  src={imageSrc} 
                  alt={article.title}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                />
              ) : null}
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              {/* Video badge */}
              <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                VIDEO
              </div>
            </div>
          ) : (
            // For direct video files, use video element
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
              poster={imageSrc || undefined}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                // If video fails, try to show image instead
                const target = e.target as HTMLVideoElement;
                setImageFailed(true);
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          )
        ) : imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Mark image as failed
              setImageFailed(true);
              
              // Track failed image URL for parent component filtering
              const originalImageUrl = imageUrl;
              if (originalImageUrl) {
                // Dispatch event so parent can filter out this article
                window.dispatchEvent(new CustomEvent('imageLoadFailed', {
                  detail: { imageUrl: originalImageUrl }
                }));
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('[NewsCard] Image failed to load:', originalImageUrl.substring(0, 50));
                }
              }
              
              // Hide the image element and show fallback
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
            onLoad={(e) => {
              // Image loaded successfully
              const target = e.target as HTMLImageElement;
              
              // Check if this is a 1x1 transparent pixel (our error placeholder)
              // If the image is 1x1, it means the backend returned an error placeholder
              if (target.naturalWidth === 1 && target.naturalHeight === 1) {
                // This is an error placeholder, mark as failed
                setImageFailed(true);
                
                // Track failed image URL for parent component filtering
                const originalImageUrl = imageUrl;
                if (originalImageUrl) {
                  window.dispatchEvent(new CustomEvent('imageLoadFailed', {
                    detail: { imageUrl: originalImageUrl }
                  }));
                }
                
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
                return;
              }
              
              // Real image loaded successfully
              target.style.display = "block";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "none";
            }}
          />
        ) : null}
        {/* Fallback for missing or failed images/videos */}
        <div
          className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center"
          style={{ display: ((imageUrl || videoUrl) && !imageFailed) ? "none" : "flex" }}
        >
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ExternalLink className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {size === "hero" ? "Gold Market News" : "News Article"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {article.source || "News Source"}
            </p>
          </div>
        </div>

        {/* Source chip */}
        <div className="absolute top-3 left-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md ${
            isDark
              ? "bg-white/10 border border-white/20 text-white"
              : "bg-white/90 border border-white/50 text-gray-700"
          }`}>
            {article.source_logo && (
              <img
                src={article.source_logo}
                alt={article.source}
                className="w-4 h-4 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span>
              {article.source}
            </span>
          </div>
        </div>

        {/* LIVE indicator */}
        {isLive && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              LIVE
            </div>
          </div>
        )}

        {/* Sentiment pill */}
        <div className="absolute bottom-3 right-3">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(
              article.sentiment
            )}`}
          >
            {getSentimentIcon(article.sentiment)}
            <span>{getSentimentLabel(article.sentiment)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {article.summary}
          </p>
        </div>

        {/* Meta information */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{getTimeAgo(article.published_at || article.publishedAt || "")}</span>
            </div>
            {(() => {
              // Parse tags if it's a JSON string
              let tagsArray: string[] = [];
              if (article.tags) {
                if (typeof article.tags === 'string') {
                  try {
                    tagsArray = JSON.parse(article.tags);
                  } catch {
                    tagsArray = [article.tags];
                  }
                } else if (Array.isArray(article.tags)) {
                  tagsArray = article.tags;
                }
              }
              return tagsArray.length > 0 ? (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>{tagsArray[0]}</span>
                </div>
              ) : null;
            })()}
          </div>

          <button
            onClick={handleShare}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Share article"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );
};

const NewsPageV2: React.FC = () => {
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  
  // Check if dark mode is active
  const isDark = typeof document !== "undefined" 
    ? document.documentElement.classList.contains("dark")
    : false;
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const [initialDelay, setInitialDelay] = useState(true);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(false);
  const rateLimitCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [withImagesOnly, setWithImagesOnly] = useState(true); // Toggle for showing only articles with images - DEFAULT: TRUE (show only articles with images/videos)

  // Add initial delay to prevent immediate rate limit hits
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialDelay(false);
    }, 2000); // Wait 2 seconds before first request
    return () => clearTimeout(timer);
  }, []);

  // Keywords for filtering relevant news
  const relevantKeywords = useMemo(() => [
    // Gold-related
    "gold", "xau", "precious metal", "precious metals", "bullion", "gold price", 
    "gold market", "gold trading", "gold futures", "gold etf", "gold mining",
    "gold reserve", "gold standard", "gold bar", "gold coin",
    
    // YER (Yemeni Rial) related
    "yer", "yemen", "yemeni", "yemeni rial", "yemen currency", "yemen economy",
    "yemen market", "sana", "aden", "taiz", "hodeidah",
    
    // USD related
    "usd", "dollar", "us dollar", "american dollar", "greenback", "dxy",
    "dollar index", "us currency", "dollar strength", "dollar weakness",
    
    // Federal Reserve related
    "federal reserve", "fed", "fomc", "jerome powell", "interest rate",
    "interest rates", "monetary policy", "federal reserve meeting",
    "fed meeting", "fomc meeting", "rate hike", "rate cut", "quantitative easing",
    "qe", "tapering", "fed chair", "central bank", "us central bank",
    
    // Economic indicators that influence prices
    "inflation", "cpi", "ppi", "consumer price index", "producer price index",
    "employment", "jobs report", "non-farm payroll", "nfp", "unemployment",
    "gdp", "gross domestic product", "economic growth", "economic data",
    "retail sales", "manufacturing", "ism", "pmi", "purchasing managers index",
    "housing starts", "consumer confidence", "durable goods", "trade balance",
    "current account", "budget deficit", "debt ceiling", "treasury", "bond yield",
    "10-year", "30-year", "treasury bond", "government bond",
    
    // Market factors
    "safe haven", "risk-off", "risk-on", "geopolitical", "geopolitics",
    "crisis", "recession", "economic slowdown", "market volatility",
    "commodity", "commodities", "metals", "currency", "forex", "fx",
  ], []);

  // Check if news is "live" (published within last 24 hours)
  const isLiveNews = (publishedAt: string): boolean => {
    if (!publishedAt) return false;
    const published = new Date(publishedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24; // Last 24 hours
  };

  // Check if article is relevant to Gold, YER, USD, Fed, or price influencers
  const isRelevantNews = (article: NewsArticle): boolean => {
    // Parse tags if it's a JSON string
    let tagsArray: string[] = [];
    if (article.tags) {
      if (typeof article.tags === 'string') {
        try {
          const parsed = JSON.parse(article.tags);
          tagsArray = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          tagsArray = [article.tags];
        }
      } else if (Array.isArray(article.tags)) {
        tagsArray = article.tags;
      }
    }
    
    // Ensure tagsArray is always an array before calling join
    const tagsText = Array.isArray(tagsArray) ? tagsArray.join(" ") : "";
    const searchText = `${article.title || ""} ${article.summary || ""} ${tagsText}`.toLowerCase();
    
    // Check if any relevant keyword appears in title, summary, or tags
    return relevantKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  };

  // Check if article has a valid image URL
  const hasImage = (article: NewsArticle): boolean => {
    const imageUrl = article.image || article.imageUrl;
    // Explicitly check for null, undefined, empty string, and string "null"
    if (!imageUrl || imageUrl === null || imageUrl === undefined || imageUrl === '' || String(imageUrl).toLowerCase() === 'null' || String(imageUrl).toLowerCase() === 'undefined') {
      return false;
    }
    
    // Convert to string and check for null/undefined/empty
    const imageUrlStr = String(imageUrl).trim();
    if (!imageUrlStr || imageUrlStr === 'null' || imageUrlStr === 'undefined' || imageUrlStr === '') {
      return false;
    }
    
    // Filter out common invalid patterns
    const invalidPatterns = [
      'placeholder',
      'unavailable',
      'no-image',
      'default',
      'data:image', // Data URIs are usually placeholders
    ];
    
    const lowerUrl = imageUrlStr.toLowerCase();
    if (invalidPatterns.some(pattern => lowerUrl.includes(pattern))) {
      return false;
    }
    
    // Validate URL format
    try {
      const url = new URL(imageUrl);
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(url.protocol)) return false;
      // Check if URL is not empty and has a reasonable length
      if (imageUrl.length < 10) return false;
      // Check if pathname suggests it's not an actual image
      const pathname = url.pathname.toLowerCase();
      if (pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname.endsWith('/')) {
        return false; // Likely not an image file
      }
      return true;
    } catch {
      // If URL parsing fails, it's not a valid URL
      return false;
    }
  };

  // Check if article has a valid video URL
  const hasVideo = (article: NewsArticle): boolean => {
    const videoUrl = article.video || article.videoUrl;
    
    // Explicit null/undefined/empty checks
    if (!videoUrl || videoUrl === null || videoUrl === undefined) {
      return false;
    }
    
    const videoUrlStr = String(videoUrl).trim();
    
    // Check for empty or null-like strings
    if (!videoUrlStr || 
        videoUrlStr === '' || 
        videoUrlStr.toLowerCase() === 'null' || 
        videoUrlStr.toLowerCase() === 'undefined' ||
        videoUrlStr === 'None') { // Handle Python None
      return false;
    }
    
    // Filter out invalid patterns
    const invalidPatterns = ['placeholder', 'unavailable', 'no-video', 'default'];
    const lowerUrl = videoUrlStr.toLowerCase();
    if (invalidPatterns.some(pattern => lowerUrl.includes(pattern))) {
      return false;
    }
    
    // Validate URL format - must be a valid HTTP/HTTPS URL
    try {
      const url = new URL(videoUrlStr);
      if (!['http:', 'https:'].includes(url.protocol)) return false;
      if (videoUrlStr.length < 10) return false;
      // Allow video domains (Bloomberg, YouTube, Vimeo) - these are web pages with videos
      const videoDomains = ['bloomberg.com', 'youtube.com', 'youtu.be', 'vimeo.com'];
      if (videoDomains.some(domain => url.hostname.includes(domain))) {
        // For video domains, require a pathname to ensure it's an actual video page
        return url.pathname !== '' && url.pathname !== '/';
      }
      // For other URLs (direct video files), ensure it's not just a domain
      if (url.pathname === '/' && !url.search && !url.hash) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Check if article has either image or video (media)
  const hasMedia = (article: NewsArticle): boolean => {
    return hasImage(article) || hasVideo(article);
  };

  // Memoize the date filter to prevent query key changes on every render
  // Round to nearest 15 minutes to drastically reduce refetches
  const dateFilter = useMemo(() => {
    if (isLive) {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      // Round to nearest 15 minutes to stabilize the query key and reduce refetches
      const minutes = oneDayAgo.getMinutes();
      oneDayAgo.setMinutes(Math.floor(minutes / 15) * 15);
      oneDayAgo.setSeconds(0, 0);
      return oneDayAgo.toISOString();
    }
    return null;
  }, [isLive]);

  // Fetch news from database
  const {
    data: newsData,
    isLoading,
    error,
    refetch,
  } = useQuery<NewsResponse>({
    queryKey: ["news", searchQuery, isLive, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Only add search query if user provided one
      // Backend doesn't support OR logic, so we'll filter on frontend
      if (searchQuery) {
        params.append("q", searchQuery);
      }
      
      params.append("limit", "200"); // Fetch more to account for filtering
      
      // Add date filter for live news (last 24 hours)
      if (dateFilter) {
        params.append("from", dateFilter);
      }

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
        throw new Error("Failed to fetch news");
      }
      return response.json();
    },
    enabled: !initialDelay && !rateLimitCooldown, // Don't fetch during cooldown
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: isLive && !rateLimitCooldown ? 300000 : false, // Refresh every 5 minutes if live (increased to reduce requests)
    staleTime: isLive ? 240000 : 600000, // 4min if live, 10min if not (increased to reduce refetches)
    gcTime: 600000, // Keep in cache for 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 429 errors, wait for rate limit to reset
      if (error instanceof Error && (error.message.includes("429") || error.message.includes("Too many requests"))) {
        return false;
      }
      return failureCount < 1; // Only retry once
    },
    retryDelay: 10000, // Wait 10 seconds between retries
  });

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    setAllArticles([]);
    setFailedImages(new Set()); // Clear failed images on refresh
    try {
      await refetch({ cancelRefetch: false });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle rate limit cooldown (must be after useQuery to access error)
  useEffect(() => {
    if (error instanceof Error && (error.message.includes("429") || error.message.includes("Too many requests"))) {
      setRateLimitCooldown(true);
      // Clear any existing cooldown timer
      if (rateLimitCooldownRef.current) {
        clearTimeout(rateLimitCooldownRef.current);
      }
      // Set cooldown for 30 seconds
      rateLimitCooldownRef.current = setTimeout(() => {
        setRateLimitCooldown(false);
      }, 30000);
    }
    return () => {
      if (rateLimitCooldownRef.current) {
        clearTimeout(rateLimitCooldownRef.current);
      }
    };
  }, [error]);

  // Listen for image load failures
  useEffect(() => {
    const handleImageLoadFailed = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageUrl: string }>;
      const failedImageUrl = customEvent.detail.imageUrl;
      
      setFailedImages((prev) => {
        const newSet = new Set(prev);
        newSet.add(failedImageUrl);
        return newSet;
      });
      
      // If withImagesOnly is true, remove articles with failed images from allArticles
      if (withImagesOnly) {
        setAllArticles((prev) => {
          return prev.filter((article) => {
            const imageUrl = article.image || article.imageUrl;
            // Keep article if it has a valid video or if the failed image is not its image
            if (hasVideo(article)) {
              return true; // Keep articles with videos even if image fails
            }
            return imageUrl !== failedImageUrl;
          });
        });
      }
    };

    window.addEventListener('imageLoadFailed', handleImageLoadFailed as EventListener);
    return () => {
      window.removeEventListener('imageLoadFailed', handleImageLoadFailed as EventListener);
    };
  }, [withImagesOnly]);

  // Update articles when data changes - STRICT FILTER: IMAGES/VIDEOS, LIVE NEWS, AND RELEVANCE
  useEffect(() => {
    if (newsData?.items) {
      // STRICT FILTER: Articles MUST have image or video, be relevant, and be live (if live mode)
      const filtered = newsData.items.filter((article: NewsArticle) => {
        const hasImageCheck = hasImage(article);
        const hasVideoCheck = hasVideo(article);
        const isRelevantCheck = isRelevantNews(article);
        // Handle both published_at and publishedAt field names
        const publishedDate = article.published_at || article.publishedAt || "";
        const isRecentCheck = isLive ? isLiveNews(publishedDate) : true;
        
        // Check if image has failed to load
        const imageUrl = article.image || article.imageUrl;
        const imageFailed = imageUrl ? failedImages.has(imageUrl) : false;
        
        // STRICT check: filter out articles with null/empty/invalid image URLs
        // This is a double-check to ensure articles without images are hidden
        const hasValidImageUrl = imageUrl && 
          imageUrl !== null &&
          imageUrl !== undefined &&
          imageUrl !== 'null' && 
          imageUrl !== 'undefined' && 
          imageUrl !== '' &&
          String(imageUrl).trim() !== '' &&
          !String(imageUrl).toLowerCase().includes('unavailable') &&
          !String(imageUrl).toLowerCase().includes('placeholder');
        
        // If withImagesOnly is true, filter by image/video requirements
        // If withImagesOnly is false, skip media filtering and show all relevant articles
        if (withImagesOnly) {
          // First check if article has valid video
          if (hasVideoCheck) {
            const videoUrl = article.video || article.videoUrl;
            // If video URL exists and is valid, include article
            if (videoUrl && String(videoUrl).trim() && String(videoUrl).trim() !== 'null') {
              return isRelevantCheck && isRecentCheck;
            }
          }
          
          // If no valid video, check for valid image
          // ALL conditions must be met: image + relevant + recent + image not failed + valid image URL
          if (!hasImageCheck) return false;
          if (!hasValidImageUrl) return false;
          if (imageFailed) return false;
          
          return isRelevantCheck && isRecentCheck;
        } else {
          // Show all relevant articles regardless of media status
          return isRelevantCheck && isRecentCheck;
        }
      });

      // Remove duplicates based on article ID, URL, or image URL
      const seenImageUrls = new Set<string>();
      const uniqueFiltered = filtered.filter((article, index, self) => {
        // STRICT: When withImagesOnly is true, double-check that article has valid media
        if (withImagesOnly) {
          const hasImageCheck = hasImage(article);
          const hasVideoCheck = hasVideo(article);
          
          // If article has no valid image or video, exclude it immediately
          if (!hasImageCheck && !hasVideoCheck) {
            return false;
          }
          
          // Double-check image validity
          if (hasImageCheck && !hasVideoCheck) {
            const imageUrl = article.image || article.imageUrl;
            if (!imageUrl || 
                String(imageUrl).trim() === '' ||
                String(imageUrl).toLowerCase() === 'null' ||
                String(imageUrl).toLowerCase() === 'undefined') {
              return false;
            }
          }
          
          // Double-check video validity  
          if (hasVideoCheck && !hasImageCheck) {
            const videoUrl = article.video || article.videoUrl;
            if (!videoUrl || 
                String(videoUrl).trim() === '' ||
                String(videoUrl).toLowerCase() === 'null' ||
                String(videoUrl).toLowerCase() === 'undefined') {
              return false;
            }
          }
        }
        
        // Check for duplicate IDs/URLs
        const isDuplicate = index !== self.findIndex((a) => 
          a.id === article.id || 
          (a.url && article.url && a.url === article.url)
        );
        
        if (isDuplicate) return false;
        
        // Check for duplicate image URLs (only for articles with images)
        const imageUrl = article.image || article.imageUrl || "";
        if (imageUrl && seenImageUrls.has(imageUrl)) {
          return false; // Skip if we've already seen this image
        }
        if (imageUrl) {
          seenImageUrls.add(imageUrl);
        }
        
        return true;
      });

      if (page === 1) {
        setAllArticles(uniqueFiltered);
      } else {
        // When loading more, also check against existing articles to prevent duplicates
        setAllArticles((prev) => {
          const existingIds = new Set(prev.map(a => a.id || a.url));
          const newArticles = uniqueFiltered.filter(a => 
            !existingIds.has(a.id || a.url)
          );
          return [...prev, ...newArticles];
        });
      }
    } else {
      // Clear articles if no data
      if (page === 1) {
        setAllArticles([]);
      }
    }
  }, [newsData, page, isLive, relevantKeywords, failedImages, withImagesOnly]);

  // Infinite scroll observer (disabled for now since we fetch 200 articles at once)
  const lastArticleRef = useCallback(
    (node: HTMLDivElement) => {
      // Disable infinite scroll - we already fetch 200 articles
      // If needed, implement cursor-based pagination later
      if (node) {
        // Just observe but don't trigger loading
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(() => {
          // Do nothing - infinite scroll disabled
        });
        observerRef.current.observe(node);
      }
    },
    []
  );

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    setAllArticles([]);
    setSearchParams(query ? { q: query } : {});
  };

  // Layout articles for display - respect withImagesOnly toggle
  const layoutArticles = useMemo(() => {
    // If showing all articles (withImagesOnly is false), return all articles
    if (!withImagesOnly) {
      return allArticles.map((article) => ({
        article,
        size: "large" as const,
      }));
    }
    
    // STRICT: Only show articles with valid images or videos (when toggle is ON)
    const articlesWithMedia = allArticles.filter((article) => {
      // Check for video first (video takes priority)
      const videoUrl = article.video || article.videoUrl;
      const hasVideoCheck = hasVideo(article);
      
      // If article has valid video, include it (but verify the video URL is not null/empty)
      if (hasVideoCheck && videoUrl) {
        const videoStr = String(videoUrl).trim();
        if (videoStr && videoStr !== 'null' && videoStr !== 'undefined' && videoStr !== '') {
          return true;
        }
      }
      
      // Check for image
      const imageUrl = article.image || article.imageUrl;
      const hasImageCheck = hasImage(article);
      
      // STRICT: If article doesn't have valid image, exclude it immediately
      if (!hasImageCheck) {
        return false;
      }
      
      // If no image URL, exclude it
      if (!imageUrl) {
        return false;
      }
      
      // Check if image has failed to load
      const imageFailed = failedImages.has(imageUrl);
      
      // Exclude articles with failed images
      if (imageFailed) {
        return false;
      }
      
      // Final validation: ensure image URL is truly valid
      const imageUrlStr = String(imageUrl).trim();
      const hasValidImage = imageUrlStr && 
        imageUrlStr !== 'null' && 
        imageUrlStr !== 'undefined' && 
        imageUrlStr !== '' &&
        !imageUrlStr.toLowerCase().includes('unavailable') &&
        !imageUrlStr.toLowerCase().includes('placeholder');
      
      // Only return true if we have a valid image URL
      if (!hasValidImage) {
        return false;
      }
      
      // Double-check using hasImage function to ensure it passes all validation
      return hasImageCheck;
    });
    
    // All articles use "large" size for uniform appearance
    return articlesWithMedia.map((article) => ({
      article,
      size: "large" as const,
    }));
  }, [allArticles, hasImage, hasVideo, withImagesOnly, failedImages]);

  if (error) {
    const isRateLimitError = error instanceof Error && (error.message.includes("429") || error.message.includes("Too many requests"));
    return (
      <div className="space-y-8">
        <SEO
          title="Gold News - GoldVision"
          description="Latest gold market news and analysis"
        />
        <div className="text-center py-12">
          <WifiOff className="h-24 w-24 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isRateLimitError ? "Rate Limit Exceeded" : "Unable to Load News"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {isRateLimitError 
              ? "Too many requests. Please wait 30 seconds before trying again. The news will automatically refresh after the cooldown period."
              : "We're having trouble connecting to our news sources. Please try again later."}
          </p>
          <button
            onClick={() => {
              if (!rateLimitCooldown) {
                refetch();
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRateLimitError || rateLimitCooldown}
          >
            <RefreshCw className={`h-5 w-5 ${(isRateLimitError || rateLimitCooldown) ? 'animate-spin' : ''}`} />
            {(isRateLimitError || rateLimitCooldown) ? "Waiting..." : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SEO
        title="Gold News - GoldVision"
        description="Latest gold market news and analysis"
      />

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Live Gold, USD & YER News
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Real-time market news: Gold, USD, YER, Federal Reserve & economic indicators
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {layoutArticles.length} Articles
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isLive ? "Live (Auto-refresh)" : "Paused (Manual)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isLive ? "Last 24h" : "All Time"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setWithImagesOnly(!withImagesOnly);
                    setPage(1);
                    setAllArticles([]);
                  }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                    withImagesOnly
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/40"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  title={withImagesOnly ? "Showing only articles with images/videos - Click to show all articles" : "Showing all articles - Click to filter to articles with images/videos only"}
                >
                  {withImagesOnly ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    With Images
                  </span>
                </button>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsLive((prev) => {
                    const newValue = !prev;
                    // Reset page and clear articles when toggling to prevent stale data
                    setPage(1);
                    setAllArticles([]);
                    return newValue;
                  });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  isLive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
                aria-label={isLive ? "Pause live updates" : "Resume live updates"}
              >
                {isLive ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {isLive ? "LIVE" : "PAUSED"}
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800/50 dark:via-slate-800/40 dark:to-slate-900/50 p-[1px] shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10"></div>
        <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/30 p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Search className={`h-5 w-5 transition-colors ${
                  searchQuery 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-400 dark:text-gray-500"
                }`} />
              </div>
              <input
                type="text"
                placeholder="Search news (e.g., 'gold OR fed OR inflation')..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-gray-200/50 dark:border-slate-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500/50 dark:focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group/clear"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover/clear:text-gray-600 dark:group-hover/clear:text-gray-300" />
                </button>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 text-gray-700 dark:text-gray-200 hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-700 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 border border-gray-200/50 dark:border-slate-600/50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Search className="h-3.5 w-3.5" />
                <span>Searching for: <strong className="font-semibold">{searchQuery}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* News Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} variant="rectangular" height="320px" className="rounded-lg" />
            ))}
          </div>
        ) : layoutArticles.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Articles Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              {newsData?.items && newsData.items.length > 0 ? (
                <>
                  {withImagesOnly 
                    ? "No articles with images or videos found. Try clicking 'All Articles' to see all articles regardless of media."
                    : "No news articles found matching your criteria."}
                  {isLive && " Try turning off 'LIVE' mode to see older articles."}
                  {searchQuery && " Try clearing your search query."}
                </>
              ) : (
                <>
                  No news articles found in the database. 
                  {error ? (
                    <span className="block mt-2 text-red-500">Error: {error.message}</span>
                  ) : (
                    " The news service may need to fetch articles. Try refreshing the page."
                  )}
                </>
              )}
            </p>
            {newsData?.items && newsData.items.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Filtering Criteria:</strong> {withImagesOnly ? "Showing only articles with images or videos" : "Showing all articles"}, relevant to Gold/USD/YER/Fed, 
                  {isLive ? " and published within last 24 hours" : " from all time periods"}.
                  <br />
                  <strong>Database Stats:</strong> {newsData.items.length} total articles, 
                  {newsData.items.filter((a: NewsArticle) => hasImage(a) || hasVideo(a)).length} with images/videos,
                  {newsData.items.filter((a: NewsArticle) => isRelevantNews(a)).length} relevant,
                  {isLive ? newsData.items.filter((a: NewsArticle) => {
                    const date = a.published_at || a.publishedAt || "";
                    return isLiveNews(date);
                  }).length : newsData.items.length} {isLive ? "within 24h" : "total"}
                </p>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh News"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layoutArticles.map((item, index) => (
              <div
                key={item.article.id || `${item.article.url}-${index}`}
                ref={
                  index === layoutArticles.length - 1 ? lastArticleRef : null
                }
              >
                <NewsCard
                  article={item.article}
                  size={item.size}
                  isLive={isLive}
                />
              </div>
            ))}
          </div>
        )}

        {/* End of results */}
        {!isLoading &&
          !isLoadingMore &&
          allArticles.length > 0 &&
          newsData &&
          layoutArticles.length > 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Showing {layoutArticles.length} article{layoutArticles.length !== 1 ? 's' : ''}
                {newsData.items && newsData.items.length > layoutArticles.length && (
                  <span className="block mt-2 text-xs">
                    (Filtered from {newsData.items.length} total articles)
                  </span>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default NewsPageV2;
