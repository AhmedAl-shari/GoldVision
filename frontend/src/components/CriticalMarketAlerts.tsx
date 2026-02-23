import React from "react";
import { Bell } from "lucide-react";

interface MarketAlert {
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  severity: "high" | "medium" | "low";
  icon: React.ReactNode;
  timestamp: Date;
}

interface CriticalMarketAlertsProps {
  marketAlerts: MarketAlert[];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "border-red-500";
    case "medium":
      return "border-yellow-500";
    case "low":
      return "border-blue-500";
    default:
      return "border-gray-500";
  }
};

const CriticalMarketAlerts: React.FC<CriticalMarketAlertsProps> = ({
  marketAlerts,
}) => {
  if (marketAlerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Critical Market Alerts
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {marketAlerts.map((alert, index) => (
          <div
            key={index}
            className={`card !p-3 border-l-4 ${getSeverityColor(
              alert.severity
            )} animate-pulse`}
          >
            <div className="flex items-start gap-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20">
                <div className="text-red-600 dark:text-red-400">
                  {alert.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                  {alert.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {alert.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-red-600 font-medium">
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {alert.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CriticalMarketAlerts;
