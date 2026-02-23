import { useState, useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface TickData {
  asset: string;
  currency: string;
  ds: string;
  price: number;
}

interface LiveTickerProps {
  onTick?: (tick: TickData) => void;
  className?: string;
}

const LiveTicker = ({ onTick, className = "" }: LiveTickerProps) => {
  const { settings } = useSettings();
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(() => {
    const saved = localStorage.getItem("liveMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/stream/prices?asset=${settings.asset}&currency=${settings.currency}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            if (data.asset && data.currency && data.price) {
              const tick: TickData = {
                asset: data.asset,
                currency: data.currency,
                ds: data.ds,
                price: data.price,
              };

              setPreviousPrice(currentPrice);
              setCurrentPrice(tick.price);

              if (onTick) {
                onTick(tick);
              }
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setIsConnected(false);
        eventSource.close();

        // Exponential backoff reconnection
        if (reconnectAttempts.current < maxReconnectAttempts && isLiveMode) {
          const delay =
            baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          reconnectAttempts.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... attempt ${reconnectAttempts.current}`);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  };

  const toggleLiveMode = () => {
    const newMode = !isLiveMode;
    setIsLiveMode(newMode);
    localStorage.setItem("liveMode", JSON.stringify(newMode));

    if (newMode) {
      connect();
    } else {
      disconnect();
    }
  };

  useEffect(() => {
    if (isLiveMode) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [settings.asset, settings.currency, isLiveMode]);

  const getPriceChange = () => {
    if (currentPrice === null || previousPrice === null) return null;
    return currentPrice - previousPrice;
  };

  const getChangeColor = () => {
    const change = getPriceChange();
    if (change === null) return "text-gray-500";
    return change > 0
      ? "text-green-600"
      : change < 0
      ? "text-red-600"
      : "text-gray-500";
  };

  const getChangeIcon = () => {
    const change = getPriceChange();
    if (change === null) return "●";
    return change > 0 ? "▲" : change < 0 ? "▼" : "●";
  };

  if (!isLiveMode) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={toggleLiveMode}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Live Mode OFF
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className={`text-xs ${
            isConnected ? "text-green-600" : "text-red-600"
          }`}
        >
          {isConnected ? "●" : "●"}
        </div>
        <div className="text-sm font-medium">
          {currentPrice !== null ? (
            <span className="flex items-center gap-1">
              <span className={getChangeColor()}>{getChangeIcon()}</span>
              <span>
                {currentPrice.toFixed(2)} {settings.currency}
              </span>
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Loading...</span>
          )}
        </div>
      </div>
      <button
        onClick={toggleLiveMode}
        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
      >
        Live
      </button>
    </div>
  );
};

export default LiveTicker;
