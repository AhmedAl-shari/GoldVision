import React, { createContext, useState, useEffect } from "react";
import type { Locale, Translations } from "../lib/i18n";
import { t, isRTL, getTextDirection } from "../lib/i18n";
import type { LocaleContextType } from "./localeTypes";

export const LocaleContext = createContext<LocaleContextType | undefined>(
  undefined
);

interface LocaleProviderProps {
  children: React.ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem("goldvision-locale") as Locale;
    if (savedLocale && (savedLocale === "en" || savedLocale === "ar")) {
      setLocaleState(savedLocale);
    }
  }, []);

  // Save locale to localStorage and persist to backend when it changes
  const setLocale = async (newLocale: Locale) => {
    const prev = locale;
    setLocaleState(newLocale);
    localStorage.setItem("goldvision-locale", newLocale);

    document.documentElement.lang = newLocale;

    // Persist preference to backend (best-effort, optional)
    // Only attempt if we're in a production environment or if the endpoint is known to exist
    if (
      import.meta.env.PROD ||
      import.meta.env.VITE_ENABLE_BACKEND_PREFS === "true"
    ) {
      try {
        const response = await fetch(
          (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000") +
            "/copilot/prefs",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: newLocale }),
          }
        );

        // Only log success if the endpoint exists and responds successfully
        if (response.ok) {
          console.log("ui_lang_change_total", {
            from: prev,
            to: newLocale,
            ts: Date.now(),
          });
        }
      } catch (error) {
        // Silently ignore network errors - localStorage already holds the value
        // This prevents console errors when the endpoint doesn't exist
      }
    }
  };

  // Update document language attribute when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(dateObj);
  };

  const value: LocaleContextType = {
    locale,
    setLocale,
    t: (key: keyof Translations) => t(key, locale),
    isRTL: isRTL(locale),
    textDirection: getTextDirection(locale),
    formatNumber,
    formatCurrency,
    formatDate,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};
