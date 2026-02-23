import { format } from "date-fns";
import { useSettings } from "../contexts/SettingsContext";
import { useLocale } from "../contexts/useLocale";

interface PriceCardProps {
  title: string;
  price?: number;
  date?: string;
  change?: number;
  confidence?: {
    lower: number;
    upper: number;
  };
  isForecast?: boolean;
}

const PriceCard = ({
  title,
  price,
  date,
  change,
  confidence,
  isForecast = false,
}: PriceCardProps) => {
  const { settings } = useSettings();
  const { locale, t, formatDate } = useLocale();

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";

    if (settings.currency === "YER") {
      // For YER, show without currency symbol but with proper formatting
      return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    } else {
      // For USD, show with $ symbol
      return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    }
  };

  // Use formatDate from useLocale hook

  return (
    <div
      className={`${
        isForecast
          ? "" // Remove card class when used in styled container (Dashboard)
          : "card"
      } ${
        isForecast
          ? "" // Styling handled by parent container
          : ""
      }`}
      data-testid="price-card"
    >
      <h3 className="text-base font-medium text-indigo-600 dark:text-indigo-400 mb-1">
        {title}
      </h3>
      <div
        className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
        data-testid={isForecast ? "forecast-price" : "current-price"}
      >
        {formatPrice(price)}
        {settings.currency === "YER" && (
          <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
            YER
          </span>
        )}
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
      {confidence && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t("confidence")}: {formatPrice(confidence.lower)} -{" "}
          {formatPrice(confidence.upper)}
        </div>
      )}
    </div>
  );
};

export default PriceCard;
