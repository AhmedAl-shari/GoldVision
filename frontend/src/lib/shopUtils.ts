import type { GoldShop } from "./shopTypes";

// Caching shop data - region-specific cache
const CACHE_KEY_PREFIX = "goldvision-shops-cache";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface CachedShops {
  data: GoldShop[];
  timestamp: number;
}

function getCacheKey(region?: string): string {
  return region ? `${CACHE_KEY_PREFIX}-${region}` : CACHE_KEY_PREFIX;
}

export function cacheShops(shops: GoldShop[], region?: string): void {
  if (typeof window === "undefined") return;
  try {
    const cache: CachedShops = {
      data: shops,
      timestamp: Date.now(),
    };
    localStorage.setItem(getCacheKey(region), JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to cache shops:", error);
  }
}

export function getCachedShops(region?: string): GoldShop[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getCacheKey(region));
    if (!stored) return null;

    const cache: CachedShops = JSON.parse(stored);
    const age = Date.now() - cache.timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(getCacheKey(region));
      return null;
    }

    return cache.data;
  } catch {
    return null;
  }
}

export function clearShopCache(region?: string): void {
  if (typeof window === "undefined") return;
  if (region) {
    localStorage.removeItem(getCacheKey(region));
  } else {
    // Clear all region caches
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Check if online
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
