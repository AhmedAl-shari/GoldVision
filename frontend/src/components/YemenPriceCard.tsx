import React from "react";
import { format } from "date-fns";
import { useYemenSettings } from "../contexts/YemenSettingsContext";
import { useLocale } from "../contexts/useLocale";
import { Info } from "lucide-react";

interface YemenPriceCardProps {
  title: string;
  price?: number;
  date?: string;
  change?: number;
  confidence?: {
    lower: number;
    upper: number;
  };
  isForecast?: boolean;
  showFXBadge?: boolean;
  showTooltip?: boolean;
}

const YemenPriceCard: React.FC<YemenPriceCardProps> = ({
  title,
  price,
  date,
  change,
  confidence,
  isForecast = false,
  showFXBadge = true,
  showTooltip = true,
}) => {
  const {
    settings,
    convertPrice,
    formatPrice,
    getFXBadge,
    getConversionTooltip,
  } = useYemenSettings();
  const { locale, t } = useLocale();

  const formatPriceWithYemenSettings = (price?: number) => {
    if (!price) return "N/A";

    // Convert price to user's selected unit and karat
    const convertedPrice = convertPrice(
      price,
      "gram",
      settings.unit,
      24,
      settings.karat
    );

    // Format based on currency (assuming USD for now, could be extended)
    return formatPrice(convertedPrice, "USD");
  };

  // Use formatDate from useLocale hook

  const getTooltipContent = () => {
    if (!price || !showTooltip) return "";

    const tooltip = getConversionTooltip(
      "gram",
      settings.unit,
      24,
      settings.karat
    );
    return tooltip;
  };

  const fxBadge = showFXBadge ? getFXBadge(settings.region, date) : null;

  return (
    <div
      className={`card ${
        isForecast
          ? "border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20"
          : ""
      }`}
      data-testid="yemen-price-card"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-medium text-indigo-600 dark:text-indigo-400">
          {title}
        </h3>
        {showTooltip && getTooltipContent() && (
          <div className="group relative">
            <Info
              className="h-4 w-4 text-gray-400 cursor-help"
              data-testid="info-icon"
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
              {getTooltipContent()}
            </div>
          </div>
        )}
      </div>

      <div
        className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
        data-testid={isForecast ? "forecast-price" : "current-price"}
      >
        {formatPriceWithYemenSettings(price)}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        {date && formatDate(date)}
        {change !== undefined && change !== null && (
          <span
            className={`ml-2 ${
              change >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        )}
      </div>

      {fxBadge && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {fxBadge}
          </span>
        </div>
      )}

      {confidence && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t("confidence")}: {formatPriceWithYemenSettings(confidence.lower)} -{" "}
          {formatPriceWithYemenSettings(confidence.upper)}
        </div>
      )}
    </div>
  );
};

export default YemenPriceCard;
