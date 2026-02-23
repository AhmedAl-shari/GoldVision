import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://s3.tradingview.com/tv.js";
const CONTAINER_ID = "tradingview_xauusd_widget";

const TradingViewXauusdWidget = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createWidget = () => {
      if (!containerRef.current) return;
      if (!(window as any).TradingView?.widget) return;

      // Cleanup previous widget if re-rendered
      containerRef.current.innerHTML = "";

      new (window as any).TradingView.widget({
        autosize: true,
        symbol: "OANDA:XAUUSD",
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "rgba(0, 0, 0, 0)",
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: CONTAINER_ID,
        hide_side_toolbar: false,
        hide_legend: false,
        studies: [],
        details: true,
        watchlist: ["OANDA:XAUUSD"],
      });
    };

    if (!(window as any).TradingView?.widget) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = createWidget;
      document.head.appendChild(script);
    } else {
      createWidget();
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="h-[600px] w-full">
      <div id={CONTAINER_ID} ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default TradingViewXauusdWidget;

