import type { Locale, Translations } from "../lib/i18n";

export interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Translations) => string;
  isRTL: boolean;
  textDirection: "ltr" | "rtl";
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatDate: (date: string | Date) => string;
}
