// Legacy region type for backward compatibility (used in pricing)
export type YemenRegion = "SANAA" | "ADEN" | "TAIZ" | "HODEIDAH";

// New location structure for shops (supports all governorates)
export type YemenGovernorateId =
  | "ADEN"
  | "SANAA"
  | "TAIZ"
  | "HODEIDAH"
  | "IBB"
  | "DHAMAR"
  | "HADRAMOUT"
  | "HAJJAH"
  | "AL_MAHWIT"
  | "AMRAN"
  | "AL_BAYDA"
  | "AL_JAWF"
  | "AL_MAHRAH"
  | "DHALE"
  | "LAHJ"
  | "MARIB"
  | "RAYMAH"
  | "SAADA"
  | "SHABWAH"
  | "SOCOTRA"
  | "ABYAN";

export interface ShopReview {
  id: string;
  userId?: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verified?: boolean;
}

export interface ShopPhoto {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
}

export type ShopService =
  | "buy_gold"
  | "sell_gold"
  | "jewelry_repair"
  | "custom_design"
  | "appraisal"
  | "gold_exchange"
  | "certification";

export interface GoldShop {
  id: string;
  name: string;
  nameAr?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    addressAr?: string;
  };
  rating: number; // 1-5
  reviewCount: number;
  reviews?: ShopReview[];
  distance?: number; // km from user (calculated)
  certified: boolean;
  phone?: string;
  email?: string;
  website?: string;
  region: YemenRegion; // Legacy field for backward compatibility
  cityName?: string; // Readable city name (e.g., "Aden", "Sana'a")
  cityNameAr?: string; // Readable city name in Arabic
  governorate?: YemenGovernorateId; // New field for governorate
  district?: string; // New field for district
  openingHours?: string;
  openingHoursAr?: string;
  verified: boolean; // GoldVision verified
  trustScore?: number; // 0-100
  photos?: ShopPhoto[];
  services?: ShopService[];
  priceRange?: {
    min: number; // YER per gram
    max: number; // YER per gram
    currency: string;
  };
  description?: string;
  descriptionAr?: string;
  lastUpdated?: string;
}

export interface ShopFilters {
  region?: YemenRegion; // Legacy field for backward compatibility
  governorate?: YemenGovernorateId; // New field for governorate filter
  district?: string; // New field for district filter
  maxDistance?: number; // km
  minRating?: number;
  certifiedOnly?: boolean;
  searchQuery?: string;
  services?: ShopService[];
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface RouteInfo {
  distance: number; // km
  duration: number; // minutes
  geometry?: number[][]; // coordinates for route line
}
