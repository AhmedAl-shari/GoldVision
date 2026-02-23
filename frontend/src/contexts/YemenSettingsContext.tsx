import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useLocale } from "./useLocale";
import { useSearchParams, useLocation } from "react-router-dom";

export interface YemenSettings {
  region: "ADEN" | "SANAA" | "TAIZ" | "HODEIDAH" | "IBB" | "DHAMAR";
  unit: "gram" | "ounce" | "tola" | "mithqal";
  karat: 24 | 22 | 21 | 18;
  fxSource?: "official" | "market" | "custom";
  customRate?: number;
  marketRate?: number;
  effectiveRate?: number;
  // City-specific pricing knobs
  spotPremium?: number;      // % above spot price (e.g., 1.5 = 1.5%)
  makingCharge?: number;     // YER per gram for craftsmanship
  shopCommission?: number;   // % for shop profit (e.g., 2.5 = 2.5%)
}

interface YemenSettingsContextType {
  yemenSettings: YemenSettings;
  settings: YemenSettings;
  updateSettings: (newSettings: Partial<YemenSettings>) => void;
  convertPrice: (
    price: number,
    fromUnit?: string,
    toUnit?: string,
    fromKarat?: number,
    toKarat?: number
  ) => number;
  formatPrice: (price: number, currency?: string) => string;
  getRegionLabel: (region: string) => string;
  getUnitLabel: (unit: string) => string;
  getKaratLabel: (karat: number) => string;
  getConversionTooltip: (
    fromUnit: string,
    toUnit: string,
    fromKarat: number,
    toKarat: number
  ) => string;
  getFXBadge: (region: string, timestamp?: string) => string;
}

const YemenSettingsContext = createContext<
  YemenSettingsContextType | undefined
>(undefined);

const defaultSettings: YemenSettings = {
  region: "ADEN",
  unit: "gram",
  karat: 24,
  fxSource: "market",
  marketRate: 530, // Current parallel market rate (example)
  effectiveRate: 530,
};

import { CONVERSION_FACTORS, KARAT_PURITY } from "../lib/constants";

export const YemenSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<YemenSettings>(defaultSettings);
  const { locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Define pages where Yemen settings are relevant
  const yemenRelevantPages: string[] = [];

  // Check if current page should have Yemen parameters
  const shouldUpdateURL = yemenRelevantPages.includes(location.pathname);

  // Load settings from URL params first, then localStorage, then defaults
  useEffect(() => {
    // Only load from URL if we're on a relevant page
    if (!shouldUpdateURL) {
      // Load from localStorage or use defaults
      const savedSettings = localStorage.getItem("yemen-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...defaultSettings, ...parsed });
        } catch (error) {
          console.error("Failed to parse saved Yemen settings:", error);
          setSettings(defaultSettings);
        }
      } else {
        setSettings(defaultSettings);
      }
      return;
    }

    const urlRegion = searchParams.get("region") as YemenSettings["region"];
    const urlUnit = searchParams.get("unit") as YemenSettings["unit"];
    const urlKarat = searchParams.get("karat");

    let initialSettings = { ...defaultSettings };

    // Apply URL parameters if valid
    if (
      urlRegion &&
      ["ADEN", "SANAA", "TAIZ", "HODEIDAH", "IBB", "DHAMAR"].includes(urlRegion)
    ) {
      initialSettings.region = urlRegion;
    }
    if (urlUnit && ["gram", "ounce", "tola", "mithqal"].includes(urlUnit)) {
      initialSettings.unit = urlUnit;
    }
    if (urlKarat && ["24", "22", "21", "18"].includes(urlKarat)) {
      initialSettings.karat = parseInt(urlKarat) as YemenSettings["karat"];
    }

    // If no URL params, try localStorage
    if (!urlRegion && !urlUnit && !urlKarat) {
      const savedSettings = localStorage.getItem("yemen-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          initialSettings = { ...defaultSettings, ...parsed };
        } catch (error) {
          console.error("Failed to parse saved Yemen settings:", error);
        }
      }
    }

    setSettings(initialSettings);
  }, [searchParams, shouldUpdateURL]);

  // Save settings to localStorage and update URL whenever they change
  useEffect(() => {
    localStorage.setItem("yemen-settings", JSON.stringify(settings));

    // Only update URL if we're on a relevant page
    if (shouldUpdateURL) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("region", settings.region);
      newSearchParams.set("unit", settings.unit);
      newSearchParams.set("karat", settings.karat.toString());
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [settings, shouldUpdateURL, searchParams, setSearchParams]);

  // Add URL cleanup for all pages - remove Yemen parameters from all URLs
  useEffect(() => {
    // Remove Yemen-specific parameters from URL if they exist
    const newSearchParams = new URLSearchParams(searchParams);
    const hasYemenParams =
      newSearchParams.has("region") ||
      newSearchParams.has("unit") ||
      newSearchParams.has("karat");

    if (hasYemenParams) {
      newSearchParams.delete("region");
      newSearchParams.delete("unit");
      newSearchParams.delete("karat");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [location.pathname]); // Only depend on pathname, not searchParams to avoid loops

  const updateSettings = (newSettings: Partial<YemenSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const convertPrice = (
    price: number,
    fromUnit: string = settings.unit,
    toUnit: string = settings.unit,
    fromKarat: number = settings.karat,
    toKarat: number = settings.karat
  ): number => {
    // Convert between units
    let convertedPrice = price;
    if (fromUnit !== toUnit) {
      const fromFactor =
        CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
      const toFactor =
        CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];
      convertedPrice = (price * fromFactor) / toFactor;
    }

    // Convert between karats
    if (fromKarat !== toKarat) {
      const fromPurity = KARAT_PURITY[fromKarat as keyof typeof KARAT_PURITY];
      const toPurity = KARAT_PURITY[toKarat as keyof typeof KARAT_PURITY];
      convertedPrice = (convertedPrice * toPurity) / fromPurity;
    }

    return convertedPrice;
  };

  const formatPrice = (price: number, currency: string = "USD"): string => {
    if (currency === "YER") {
      // YER: Round to whole numbers (0 decimal places)
      return `${Math.round(price).toLocaleString()} YER`;
    }
    // USD: Round to 2 decimal places
    return `$${price.toFixed(2)}`;
  };

  const getRegionLabel = (region: string): string => {
    const labels = {
      ADEN: locale === "ar" ? "عدن (Aden)" : "Aden",
      SANAA: locale === "ar" ? "صنعاء (Sana'a)" : "Sana'a",
      TAIZ: locale === "ar" ? "تعز (Taiz)" : "Taiz",
      HODEIDAH: locale === "ar" ? "الحديدة (Hodeidah)" : "Hodeidah",
      IBB: locale === "ar" ? "إب (Ibb)" : "Ibb",
      DHAMAR: locale === "ar" ? "ذمار (Dhamar)" : "Dhamar",
    };
    return labels[region as keyof typeof labels] || region;
  };

  const getUnitLabel = (unit: string): string => {
    const labels = {
      gram: locale === "ar" ? "جرام (Gram)" : "Gram (g)",
      ounce: locale === "ar" ? "أونصة (Ounce)" : "Ounce (oz)",
      tola: locale === "ar" ? "تولا (Tola)" : "Tola",
      mithqal: locale === "ar" ? "مثقال (Mithqal)" : "Mithqal",
    };
    return labels[unit as keyof typeof labels] || unit;
  };

  const getKaratLabel = (karat: number): string => {
    const labels = {
      24: locale === "ar" ? "24K ذهب خالص" : "24K Pure Gold",
      22: locale === "ar" ? "22K ذهب عيار" : "22K Gold",
      21: locale === "ar" ? "21K ذهب عيار" : "21K Gold",
      18: locale === "ar" ? "18K ذهب عيار" : "18K Gold",
    };
    return labels[karat as keyof typeof labels] || `${karat}K Gold`;
  };

  const getConversionTooltip = (
    fromUnit: string,
    toUnit: string,
    fromKarat: number,
    toKarat: number
  ): string => {
    const tooltips = [];

    // Unit conversion
    if (fromUnit !== toUnit) {
      const conversions = {
        "gram-ounce": "1 gram = 0.032 ounce",
        "ounce-gram": "1 ounce = 31.1034768 grams",
        "gram-tola": "1 gram = 0.0858 tola",
        "tola-gram": "1 tola = 11.6638038 grams",
        "gram-mithqal": "1 gram = 0.235 mithqal",
        "mithqal-gram": "1 mithqal = 4.25 grams",
        "ounce-tola": "1 ounce = 2.67 tola",
        "tola-ounce": "1 tola = 0.375 ounce",
        "ounce-mithqal": "1 ounce = 7.32 mithqal",
        "mithqal-ounce": "1 mithqal = 0.137 ounce",
        "tola-mithqal": "1 tola = 2.74 mithqal",
        "mithqal-tola": "1 mithqal = 0.365 tola",
      };
      const key = `${fromUnit}-${toUnit}`;
      if (conversions[key as keyof typeof conversions]) {
        tooltips.push(conversions[key as keyof typeof conversions]);
      }
    }

    // Karat conversion
    if (fromKarat !== toKarat) {
      tooltips.push(`${toKarat}K = ${fromKarat}K × (${toKarat}/${fromKarat})`);
    }

    return tooltips.join("; ");
  };

  const getFXBadge = (region: string, timestamp?: string): string => {
    const badges = {
      ADEN: "Commercial",
      SANAA: "Official",
      TAIZ: "Regional",
      HODEIDAH: "Port",
      IBB: "Agricultural",
      DHAMAR: "Educational",
    };

    const regionType = badges[region as keyof typeof badges] || "Regional";
    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

    return `${regionType} | Mid | as-of ${timeStr}`;
  };

  const value: YemenSettingsContextType = {
    yemenSettings: settings,
    settings,
    updateSettings,
    convertPrice,
    formatPrice,
    getRegionLabel,
    getUnitLabel,
    getKaratLabel,
    getConversionTooltip,
    getFXBadge,
  };

  return (
    <YemenSettingsContext.Provider value={value}>
      {children}
    </YemenSettingsContext.Provider>
  );
};

export const useYemenSettings = (): YemenSettingsContextType => {
  const context = useContext(YemenSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useYemenSettings must be used within a YemenSettingsProvider"
    );
  }
  return context;
};
