import React from "react";
import { useLocale } from "../contexts/useLocale";

const YemenPreset: React.FC = () => {
  const { locale } = useLocale();

  const isArabic = locale === "ar";

  return (
    <div className="card border-yellow-200 bg-yellow-50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🇾🇪</span>
        <h3 className="text-lg font-semibold text-gray-900">
          {isArabic ? "إعدادات سريعة - اليمن" : "Quick Settings - Yemen"}
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {isArabic
          ? "إعدادات محلية للعملة والتوقيت المناسب للسوق اليمني"
          : "Localized currency and timezone defaults for the Yemen market"}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">
            {isArabic ? "العملة:" : "Currency:"}
          </span>
          <span className="font-medium">
            {isArabic
              ? "دولار أمريكي (USD) / ريال يمني (YER)"
              : "US Dollar (USD) / Yemeni Rial (YER)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            {isArabic ? "التوقيت:" : "Timezone:"}
          </span>
          <span className="font-medium">
            GMT+3 {isArabic ? "(اليمن)" : "(Yemen)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            {isArabic ? "التنسيق:" : "Layout:"}
          </span>
          <span className="font-medium">
            {isArabic ? "من اليمين لليسار" : "Left-to-right"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            {isArabic ? "التاريخ:" : "Calendar:"}
          </span>
          <span className="font-medium">
            {isArabic ? "التقويم الميلادي" : "Gregorian"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default YemenPreset;
