import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getFxStatus } from "@/lib/api";
import { apiClient } from "@/lib/api";

export type Asset = "XAU";
export type Currency = "USD" | "YER";
export type Region = "ADEN" | "SANAA";
export type Karat = 22 | 24;
export type Unit = "gram" | "tola";
export type Theme = "light" | "dark" | "system";
export type Locale = "en" | "ar";

export interface Settings {
  asset: Asset;
  currency: Currency;
  region: Region;
  karat: Karat;
  unit: Unit;
  liveMode: boolean;
  theme: Theme;
  locale: Locale;
  forceLTR: boolean;
}

interface SettingsContextType {
  settings: Settings;
  asset: Asset;
  currency: Currency;
  region: Region;
  karat: Karat;
  unit: Unit;
  liveMode: boolean;
  theme: Theme;
  locale: Locale;
  forceLTR: boolean;
  setAsset: (asset: Asset) => void;
  setCurrency: (currency: Currency) => void;
  setRegion: (region: Region) => void;
  setKarat: (karat: Karat) => void;
  setUnit: (unit: Unit) => void;
  setLiveMode: (liveMode: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setForceLTR: (forceLTR: boolean) => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const STORAGE_KEY = "goldvision-settings";
const DEFAULT_SETTINGS: Settings = {
  asset: "XAU",
  currency: "USD",
  region: "ADEN",
  karat: 24,
  unit: "gram",
  liveMode: true,
  theme: "system",
  locale: "en",
  forceLTR: false,
};

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Get system theme preference
  const getSystemTheme = () => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  };

  // Get effective theme (resolves 'system' to actual theme)
  const getEffectiveTheme = (theme: Theme) => {
    return theme === "system" ? getSystemTheme() : theme;
  };

  // Apply theme to document
  const applyTheme = (theme: Theme) => {
    const effectiveTheme = getEffectiveTheme(theme);
    const root = document.documentElement;
    const body = document.body;

    // Remove any existing theme classes first
    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light");

    // Apply the new theme
    const isDark = effectiveTheme === "dark";
    root.classList.add(isDark ? "dark" : "light");
    body.classList.add(isDark ? "dark" : "light");

    // Expose theme to CSS and native UI (scrollbars, form controls)
    root.style.colorScheme = isDark ? "dark" : "light";
    root.setAttribute("data-theme", effectiveTheme);

    // Force a re-render by updating a data attribute
    root.setAttribute("data-theme-applied", effectiveTheme);

    console.log(`Theme applied: ${effectiveTheme} (isDark: ${isDark})`);
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Validate the stored settings
        if (
          parsedSettings &&
          typeof parsedSettings === "object" &&
          ["XAU"].includes(parsedSettings.asset) &&
          ["USD", "YER"].includes(parsedSettings.currency) &&
          ["ADEN", "SANAA"].includes(parsedSettings.region) &&
          [22, 24].includes(parsedSettings.karat) &&
          ["gram", "tola"].includes(parsedSettings.unit) &&
          typeof parsedSettings.liveMode === "boolean" &&
          ["light", "dark", "system"].includes(parsedSettings.theme) &&
          (typeof parsedSettings.forceLTR === "boolean" ||
            typeof parsedSettings.forceLTR === "undefined")
        ) {
          // Merge with defaults to ensure new fields exist
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        }
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }
    // Also attempt to load user prefs from backend (optional)
    (async () => {
      try {
        const prefs = await apiClient.getFxStatus; // no-op to ensure import tree-shakes
      } catch {}

      // Only attempt backend fetch if enabled
      if (
        import.meta.env.PROD ||
        import.meta.env.VITE_ENABLE_BACKEND_PREFS === "true"
      ) {
        try {
          const res = await fetch(
            (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000") +
              "/copilot/prefs",
            { headers: { "Content-Type": "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            setSettings((prev) => ({
              ...prev,
              currency: (data.currency as Currency) || prev.currency,
              region: (data.region as Region) || prev.region,
              unit: (data.unit as Unit) || prev.unit,
              karat: (data.karat as Karat) || prev.karat,
              locale: (data.locale as Locale) || prev.locale,
              theme: (data.theme as Theme) || prev.theme,
              forceLTR:
                typeof data.forceLTR === "boolean"
                  ? data.forceLTR
                  : prev.forceLTR,
            }));
          }
        } catch (e) {
          // ignore - backend prefs are optional
        }
      }
    })();
  }, []);

  // Apply theme when settings change
  useEffect(() => {
    console.log(`Settings changed, applying theme: ${settings.theme}`);
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }
  }, [settings]);

  const setAsset = (asset: Asset) => {
    setSettings((prev) => ({ ...prev, asset }));
  };

  const setCurrency = (currency: Currency) => {
    setSettings((prev) => ({ ...prev, currency }));
  };

  const setRegion = (region: Region) => {
    setSettings((prev) => ({ ...prev, region }));
  };

  const setKarat = (karat: Karat) => {
    setSettings((prev) => ({ ...prev, karat }));
  };

  const setUnit = (unit: Unit) => {
    setSettings((prev) => ({ ...prev, unit }));
  };

  const setLiveMode = (liveMode: boolean) => {
    setSettings((prev) => ({ ...prev, liveMode }));
  };

  const setTheme = (theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setLocale = (locale: Locale) => {
    setSettings((prev) => ({ ...prev, locale }));
  };

  const setForceLTR = (forceLTR: boolean) => {
    setSettings((prev) => ({ ...prev, forceLTR }));
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));

    // Persist to backend preferences (optional)
    if (
      import.meta.env.PROD ||
      import.meta.env.VITE_ENABLE_BACKEND_PREFS === "true"
    ) {
      try {
        fetch(
          (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000") +
            "/copilot/prefs",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currency: newSettings.currency,
              region: newSettings.region,
              unit: newSettings.unit,
              karat: newSettings.karat,
              locale: newSettings.locale,
              theme: newSettings.theme,
              forceLTR: newSettings.forceLTR,
              horizon: undefined,
            }),
          }
        );
      } catch {}
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        asset: settings.asset,
        currency: settings.currency,
        region: settings.region,
        karat: settings.karat,
        unit: settings.unit,
        liveMode: settings.liveMode,
        theme: settings.theme,
        locale: settings.locale,
        forceLTR: settings.forceLTR,
        setAsset,
        setCurrency,
        setRegion,
        setKarat,
        setUnit,
        setLiveMode,
        setTheme,
        setLocale,
        setForceLTR,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Helper functions for asset/currency labels
export const getAssetLabel = (asset: Asset): string => {
  const labels = {
    XAU: "Gold",
  };
  return labels[asset];
};

export const getCurrencyLabel = (currency: Currency): string => {
  const labels = {
    USD: "US Dollar",
    YER: "Yemen Rial",
  };
  return labels[currency];
};

export const getRegionLabel = (region: Region): string => {
  const labels = {
    ADEN: "Aden",
    SANAA: "Sana'a",
  };
  return labels[region];
};

export const getKaratLabel = (karat: Karat): string => {
  return `${karat}K`;
};

export const getUnitLabel = (unit: Unit): string => {
  const labels = {
    gram: "Gram",
    tola: "Tola",
  };
  return labels[unit];
};

export const getAssetSymbol = (asset: Asset): string => {
  const symbols = {
    XAU: "Au",
  };
  return symbols[asset];
};
