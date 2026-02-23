import React from "react";
import { Bell, Calendar, MapPin, TrendingUp } from "lucide-react";
import { useLocale } from "../contexts/useLocale";
import { useYemenSettings } from "../contexts/YemenSettingsContext";

interface RegionalPricingTopBarProps {
  onCreateAlert?: () => void;
  activeTab?: "summary" | "table" | "shops";
}

const RegionalPricingTopBar: React.FC<RegionalPricingTopBarProps> = ({
  onCreateAlert,
  activeTab,
}) => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const { settings, updateSettings } = useYemenSettings();

  const regions = [
    { value: "SANAA", label: isArabic ? "صنعاء" : "Sana'a" },
    { value: "ADEN", label: isArabic ? "عدن" : "Aden" },
    { value: "TAIZ", label: isArabic ? "تعز" : "Taiz" },
    { value: "HODEIDAH", label: isArabic ? "الحديدة" : "Hodeidah" },
  ];

  const units = [
    { value: "gram", label: isArabic ? "جرام" : "Gram" },
    { value: "ounce", label: isArabic ? "أونصة" : "Ounce" },
    { value: "tola", label: isArabic ? "تولة" : "Tola" },
    { value: "mithqal", label: isArabic ? "مثقال" : "Mithqal" },
  ];

  const karats = [24, 22, 21, 18];

  const fxSources = [
    { value: "market", label: isArabic ? "سوق" : "Market" },
    { value: "official", label: isArabic ? "رسمي" : "Official" },
  ];

  const currentDate = new Date().toLocaleString(isArabic ? "ar-YE" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="static z-50 bg-gradient-to-b from-white via-white to-gray-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/30 backdrop-blur-xl border-b-2 border-emerald-100/60 dark:border-emerald-900/30 shadow-lg shadow-emerald-500/5">
      <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          {/* Region Selector - Enhanced (Hidden on Shops tab) */}
          {activeTab !== "shops" && (
            <div className="flex items-center gap-3 group">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  {isArabic ? "المنطقة" : "Region"}
                </span>
              </div>
              <div className="relative">
                <select
                  value={settings.region}
                  onChange={(e) =>
                    updateSettings({ region: e.target.value as any })
                  }
                  className="appearance-none px-5 py-2.5 pr-10 rounded-xl border-2 border-emerald-200/60 dark:border-emerald-800/40 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 shadow-md hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2310b981%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat min-w-[140px]"
                >
                  {regions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          )}

          {/* FX Source - Enhanced */}
          <div className="flex items-center gap-3 group">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                {isArabic ? "مصدر الصرف" : "FX"}
              </span>
            </div>
            <div className="relative">
              <select
                value={settings.fxSource || "market"}
                onChange={(e) =>
                  updateSettings({ fxSource: e.target.value as any })
                }
                className="appearance-none px-5 py-2.5 pr-10 rounded-xl border-2 border-blue-200/60 dark:border-blue-800/40 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 shadow-md hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%233b82f6%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat min-w-[120px]"
              >
                {fxSources.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>

          {/* Date/Time - Enhanced */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/30 dark:via-emerald-900/20 dark:to-emerald-800/20 border-2 border-emerald-200/60 dark:border-emerald-800/40 shadow-md backdrop-blur-sm">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
              {currentDate}
            </span>
          </div>

          {/* Create Alert Button - Enhanced */}
          <button
            onClick={onCreateAlert}
            className="ml-auto relative flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transform hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100 border-2 border-emerald-400/30 overflow-hidden group"
          >
            {/* Shine effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>

            {/* Content */}
            <div className="relative flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <span className="hidden sm:inline tracking-wide uppercase">
                {isArabic ? "إنشاء تنبيه" : "Create Alert"}
              </span>
              <span className="sm:hidden font-bold">
                {isArabic ? "تنبيه" : "Alert"}
              </span>
            </div>

            {/* Glow effect */}
            <span className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionalPricingTopBar;
