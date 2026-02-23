import type {
  GoldShop,
  YemenRegion,
  ShopFilters,
  ShopService,
} from "./shopTypes";
import { getShops as getShopsAPI, isOnline } from "./shopUtils";
import * as api from "./api";
import { getLocationCoordinates } from "./yemenLocations";

// Mock shop data for Yemen - Realistic locations and data with enhanced details
const MOCK_SHOPS: GoldShop[] = [
  {
    id: "1",
    name: "Al-Noor Gold Shop",
    nameAr: "محل النور للذهب",
    location: {
      lat: 15.3694,
      lng: 44.191,
      address: "Old City, Sanaa",
      addressAr: "البلدة القديمة، صنعاء",
    },
    rating: 4.5,
    reviewCount: 127,
    certified: true,
    phone: "+967 1 234 567",
    email: "info@alnoor-gold.ye",
    region: "SANAA",
    openingHours: "9:00 AM - 8:00 PM",
    openingHoursAr: "9:00 صباحاً - 8:00 مساءً",
    verified: true,
    trustScore: 92,
    services: [
      "buy_gold",
      "sell_gold",
      "jewelry_repair",
      "custom_design",
      "appraisal",
    ],
    priceRange: { min: 25000, max: 28000, currency: "YER" },
    description:
      "Trusted gold shop with certified gold and professional service",
    descriptionAr: "محل ذهب موثوق مع ذهب معتمد وخدمة احترافية",
    reviews: [
      {
        id: "r1",
        userName: "Ahmed Ali",
        rating: 5,
        comment: "Excellent service and fair prices",
        date: "2024-01-15",
        verified: true,
      },
      {
        id: "r2",
        userName: "Fatima Hassan",
        rating: 4,
        comment: "Good quality gold, professional staff",
        date: "2024-01-10",
        verified: true,
      },
    ],
    photos: [
      {
        id: "p1",
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
        thumbnail:
          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200",
      },
    ],
    lastUpdated: "2024-01-20",
  },
  {
    id: "2",
    name: "Yemen Gold Market",
    nameAr: "سوق اليمن للذهب",
    location: {
      lat: 15.3522,
      lng: 44.2065,
      address: "Hadda Street, Sanaa",
      addressAr: "شارع حدة، صنعاء",
    },
    rating: 4.8,
    reviewCount: 89,
    certified: false,
    phone: "+967 1 234 568",
    region: "SANAA",
    openingHours: "8:00 AM - 9:00 PM",
    openingHoursAr: "8:00 صباحاً - 9:00 مساءً",
    verified: true,
    trustScore: 88,
    services: ["buy_gold", "sell_gold", "gold_exchange"],
    priceRange: { min: 24500, max: 27500, currency: "YER" },
    description: "Large gold market with competitive prices",
    descriptionAr: "سوق ذهب كبير بأسعار تنافسية",
    reviews: [
      {
        id: "r3",
        userName: "Mohammed Saleh",
        rating: 5,
        comment: "Best prices in the area",
        date: "2024-01-18",
        verified: true,
      },
    ],
    lastUpdated: "2024-01-19",
  },
  {
    id: "3",
    name: "Al-Sabah Gold Center",
    nameAr: "مركز الصباح للذهب",
    location: {
      lat: 15.3856,
      lng: 44.2198,
      address: "Zubairy Street, Sanaa",
      addressAr: "شارع الزبيري، صنعاء",
    },
    rating: 4.6,
    reviewCount: 203,
    certified: true,
    phone: "+967 1 345 679",
    region: "SANAA",
    openingHours: "8:30 AM - 8:30 PM",
    verified: true,
    trustScore: 95,
  },
  {
    id: "4",
    name: "Aden Gold Center",
    nameAr: "مركز عدن للذهب",
    location: {
      lat: 12.7855,
      lng: 45.0187,
      address: "Al-Mansoura, Aden",
      addressAr: "المنصورة، عدن",
    },
    rating: 4.3,
    reviewCount: 156,
    certified: true,
    phone: "+967 2 345 678",
    email: "contact@aden-gold.ye",
    region: "ADEN",
    openingHours: "9:00 AM - 7:00 PM",
    openingHoursAr: "9:00 صباحاً - 7:00 مساءً",
    verified: true,
    trustScore: 85,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "certification"],
    priceRange: { min: 24800, max: 28200, currency: "YER" },
    description: "Certified gold center with professional appraisal services",
    descriptionAr: "مركز ذهب معتمد مع خدمات تقييم احترافية",
    reviews: [
      {
        id: "r4",
        userName: "Sara Ahmed",
        rating: 4,
        comment: "Certified gold, trustworthy",
        date: "2024-01-16",
        verified: true,
      },
      {
        id: "r5",
        userName: "Omar Khaled",
        rating: 5,
        comment: "Professional service, highly recommended",
        date: "2024-01-12",
        verified: true,
      },
    ],
    photos: [
      {
        id: "p2",
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400",
        thumbnail:
          "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200",
      },
    ],
    lastUpdated: "2024-01-20",
  },
  {
    id: "5",
    name: "Aden Gold Souk",
    nameAr: "سوق عدن للذهب",
    location: {
      lat: 12.7923,
      lng: 45.0098,
      address: "Crater District, Aden",
      addressAr: "حي كريتر، عدن",
    },
    rating: 4.7,
    reviewCount: 178,
    certified: false,
    phone: "+967 2 456 789",
    region: "ADEN",
    openingHours: "8:00 AM - 8:00 PM",
    verified: true,
    trustScore: 87,
  },
  {
    id: "6",
    name: "Taiz Gold Exchange",
    nameAr: "صيرفة تعز للذهب",
    location: {
      lat: 13.5779,
      lng: 44.017,
      address: "City Center, Taiz",
      addressAr: "وسط المدينة، تعز",
    },
    rating: 4.6,
    reviewCount: 94,
    certified: true,
    phone: "+967 4 456 789",
    region: "TAIZ",
    openingHours: "8:30 AM - 8:00 PM",
    verified: true,
    trustScore: 90,
  },
  {
    id: "7",
    name: "Al-Madina Gold Shop",
    nameAr: "محل المدينة للذهب",
    location: {
      lat: 13.5687,
      lng: 44.0256,
      address: "Al-Madina Street, Taiz",
      addressAr: "شارع المدينة، تعز",
    },
    rating: 4.4,
    reviewCount: 112,
    certified: false,
    phone: "+967 4 567 890",
    region: "TAIZ",
    openingHours: "9:00 AM - 7:30 PM",
    verified: false,
    trustScore: 82,
  },
  {
    id: "8",
    name: "Hodeidah Gold Shop",
    nameAr: "محل الحديدة للذهب",
    location: {
      lat: 14.7978,
      lng: 42.9545,
      address: "Port Road, Hodeidah",
      addressAr: "طريق الميناء، الحديدة",
    },
    rating: 4.2,
    reviewCount: 67,
    certified: false,
    phone: "+967 3 567 890",
    region: "HODEIDAH",
    openingHours: "9:00 AM - 7:30 PM",
    verified: false,
    trustScore: 78,
  },
  {
    id: "9",
    name: "Al-Khair Gold Market",
    nameAr: "سوق الخير للذهب",
    location: {
      lat: 14.8023,
      lng: 42.9612,
      address: "City Center, Hodeidah",
      addressAr: "وسط المدينة، الحديدة",
    },
    rating: 4.5,
    reviewCount: 145,
    certified: true,
    phone: "+967 3 678 901",
    region: "HODEIDAH",
    openingHours: "8:00 AM - 8:00 PM",
    verified: true,
    trustScore: 88,
  },
  {
    id: "10",
    name: "Sanaa Gold Souk",
    nameAr: "سوق صنعاء للذهب",
    location: {
      lat: 15.3547,
      lng: 44.2156,
      address: "Bab Al-Yemen, Sanaa",
      addressAr: "باب اليمن، صنعاء",
    },
    rating: 4.9,
    reviewCount: 312,
    certified: true,
    phone: "+967 1 456 789",
    region: "SANAA",
    openingHours: "8:00 AM - 9:00 PM",
    verified: true,
    trustScore: 98,
  },
];

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get shops with filters (uses API if available, falls back to mock data)
export async function getShops(
  filters: ShopFilters = {},
  userLocation?: { lat: number; lng: number } // Legacy parameter, kept for backward compatibility
): Promise<GoldShop[]> {
  // Try API first if online
  if (isOnline() && typeof window !== "undefined") {
    try {
      // Calculate center coordinates if governorate/district selected
      let centerLat: number | undefined;
      let centerLng: number | undefined;
      if (filters.governorate) {
        [centerLat, centerLng] = getLocationCoordinates(
          filters.governorate,
          filters.district
        );
      }

      const apiFilters: api.ShopFilters = {
        region: filters.region, // Legacy support
        governorate: filters.governorate,
        district: filters.district,
        // If coordinates are provided but maxDistance is not set, default to 999 (no limit)
        maxDistance:
          filters.maxDistance ||
          (centerLat || userLocation?.lat ? 999 : undefined),
        minRating: filters.minRating,
        certifiedOnly: filters.certifiedOnly,
        searchQuery: filters.searchQuery,
        services: filters.services,
        priceMin: filters.priceRange?.min,
        priceMax: filters.priceRange?.max,
        lat: centerLat || userLocation?.lat,
        lng: centerLng || userLocation?.lng,
      };

      console.log("[Shops API] Fetching shops with filters:", {
        governorate: apiFilters.governorate,
        district: apiFilters.district,
        region: apiFilters.region,
      });
      const response = await api.getShops(apiFilters);
      if (response.success && response.data !== undefined) {
        // If a specific region/governorate filter is set and API returns empty, don't fallback to mock
        const hasRegionFilter = filters.governorate || filters.region;
        if (hasRegionFilter && response.data.length === 0) {
          console.log(
            `[Shops API] No shops found for filter, returning empty array`
          );
          return [];
        }
        console.log(
          `[Shops API] Successfully fetched ${response.data.length} shops from API`
        );
        return response.data as GoldShop[];
      } else {
        console.warn("[Shops API] API response not successful:", response);
        // If a specific filter is set, return empty instead of falling back to mock
        if (filters.governorate || filters.region) {
          return [];
        }
      }
    } catch (error) {
      console.warn("Failed to fetch shops from API:", error);
      // If a specific filter is set, return empty instead of falling back to mock
      if (filters.governorate || filters.region) {
        return [];
      }
    }
  }

  // No fallback to mock data - return empty array
  return [];
}

// Synchronous version for backward compatibility (returns empty - no mock data)
export function getShopsSync(
  filters: ShopFilters = {},
  userLocation?: { lat: number; lng: number } // Legacy parameter, kept for backward compatibility
): GoldShop[] {
  // No mock data - return empty array
  return [];
}

// Get shop by ID (no mock data - returns undefined)
export function getShopById(id: string): GoldShop | undefined {
  return undefined;
}

// Get shops by region (no mock data - returns empty array)
export function getShopsByRegion(region: YemenRegion): GoldShop[] {
  return [];
}
