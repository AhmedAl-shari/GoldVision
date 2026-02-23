import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { saveAs } from "file-saver";
import { useLocale } from "../contexts/useLocale";

export interface ExplorerPoint {
  ds: string | Date;
  price: number;
}

interface TimeSeriesExplorerProps {
  asset: string;
  currency: string;
  region?: string;
  from?: string;
  to?: string;
  series: ExplorerPoint[];
  technicalIndicators?: any; // Technical analysis data
  onRangeChange?: (fromISO: string, toISO: string) => void;
}

// Lightweight LTTB downsampling (client fallback)
function lttb(points: ExplorerPoint[], threshold: number): ExplorerPoint[] {
  if (threshold >= points.length || threshold === 0) return points;
  const data = points.map((p) => ({
    x: typeof p.ds === "string" ? new Date(p.ds).getTime() : p.ds.getTime(),
    y: p.price,
    raw: p,
  }));
  const sampled: ExplorerPoint[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);
  let a = 0;
  sampled.push(data[a].raw);
  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const range = data.slice(rangeStart, rangeEnd);
    const nextRangeStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextRangeEnd = Math.floor((i + 3) * bucketSize) + 1;
    const nextRange = data.slice(nextRangeStart, nextRangeEnd);
    const avgX =
      nextRange.reduce((s, p) => s + p.x, 0) / (nextRange.length || 1);
    const avgY =
      nextRange.reduce((s, p) => s + p.y, 0) / (nextRange.length || 1);
    let maxArea = -1;
    let maxAreaPointIndex = 0;
    for (let j = 0; j < range.length; j++) {
      const area =
        Math.abs(
          (data[a].x - avgX) * (range[j].y - data[a].y) -
            (data[a].x - range[j].x) * (avgY - data[a].y)
        ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxAreaPointIndex = j;
      }
    }
    const point = range[maxAreaPointIndex];
    if (point) sampled.push(point.raw);
    a = rangeStart + maxAreaPointIndex;
  }
  sampled.push(data[data.length - 1].raw);
  return sampled;
}

const presets: Array<{ key: string; label: string; days?: number }> = [
  { key: "1m", label: "1m", days: 30 },
  { key: "3m", label: "3m", days: 90 },
  { key: "6m", label: "6m", days: 180 },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1y", days: 365 },
  { key: "all", label: "All" },
];

const TimeSeriesExplorer: React.FC<TimeSeriesExplorerProps> = ({
  asset,
  currency,
  series,
  technicalIndicators,
  onRangeChange,
  from,
  to,
}) => {
  const { locale, formatNumber } = useLocale();
  const [selectedPreset, setSelectedPreset] = useState<string>("3m");
  const [fromDate, setFromDate] = useState<string | undefined>(from);
  const [toDate, setToDate] = useState<string | undefined>(to);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fullSorted = useMemo(() => {
    const sorted = [...series].sort(
      (a, b) => new Date(a.ds).getTime() - new Date(b.ds).getTime()
    );
    return lttb(sorted, 1500);
  }, [series]);

  // Current pair badge
  const pair = `${asset}-${currency}`;

  // Apply date window and add technical indicators
  const [windowed, brushIndex] = useMemo(() => {
    if (!fromDate && !toDate) {
      const dataWithIndicators = fullSorted.map((point) => ({
        ...point,
        sma20: technicalIndicators?.sma20,
        sma50: technicalIndicators?.sma50,
        bollingerUpper: technicalIndicators?.bollingerUpper,
        bollingerLower: technicalIndicators?.bollingerLower,
        bollingerMiddle: technicalIndicators?.bollingerMiddle,
      }));
      return [dataWithIndicators, { start: 0, end: fullSorted.length - 1 }];
    }

    const startTs = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const endTs = toDate ? new Date(toDate).getTime() : Infinity;
    const filtered = fullSorted.filter((p) => {
      const ts = new Date(p.ds).getTime();
      return ts >= startTs && ts <= endTs;
    });

    const dataWithIndicators = filtered.map((point) => ({
      ...point,
      sma20: technicalIndicators?.sma20,
      sma50: technicalIndicators?.sma50,
      bollingerUpper: technicalIndicators?.bollingerUpper,
      bollingerLower: technicalIndicators?.bollingerLower,
      bollingerMiddle: technicalIndicators?.bollingerMiddle,
    }));

    const startIdx = Math.max(
      0,
      fullSorted.findIndex((p) => new Date(p.ds).getTime() >= startTs)
    );
    const endIdx = Math.max(
      startIdx,
      fullSorted.findIndex((p) => new Date(p.ds).getTime() >= endTs)
    );
    return [
      dataWithIndicators.length
        ? dataWithIndicators
        : [fullSorted[fullSorted.length - 1]],
      { start: startIdx, end: endIdx },
    ];
  }, [fullSorted, fromDate, toDate, technicalIndicators]);

  // Preset handling
  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const now = new Date();
    if (key === "ytd") {
      const start = new Date(now.getFullYear(), 0, 1);
      setFromDate(start.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
      onRangeChange?.(
        start.toISOString().slice(0, 10),
        now.toISOString().slice(0, 10)
      );
      return;
    }
    if (key === "all") {
      const start = new Date(fullSorted[0]?.ds as any);
      const end = new Date(fullSorted[fullSorted.length - 1]?.ds as any);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(e);
      onRangeChange?.(s, e);
      return;
    }
    const preset = presets.find((p) => p.key === key);
    if (preset?.days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - preset.days);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(e);
      onRangeChange?.(s, e);
    }
  };

  useEffect(() => {
    // Default initial window
    if (!from && !to && fullSorted.length) applyPreset("3m");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullSorted.length]);

  const formatYAxis = (v: number) => {
    if (currency === "YER") {
      // compact like 875k
      return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
        notation: "compact",
        maximumFractionDigits: 0,
      }).format(v);
    }
    return `$${formatNumber(v as any)}`;
  };

  const exportCSV = () => {
    const rows = windowed.map(
      (p) => `${new Date(p.ds).toISOString()},${p.price}`
    );
    const blob = new Blob([`ds,price\n${rows.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `${pair}-${fromDate || "start"}-${toDate || "end"}.csv`);
    console.log("ui_chart_export_total", {
      type: "csv",
      asset,
      currency,
      from: fromDate,
      to: toDate,
      numPoints: windowed.length,
    });
  };

  const exportPNG = () => {
    const el = containerRef.current?.querySelector("svg");
    if (!el) return;
    const svg = new XMLSerializer().serializeToString(el);
    const canvas = document.createElement("canvas");
    const bbox = el.getBoundingClientRect();
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) =>
          b &&
          saveAs(b, `${pair}-${fromDate || "start"}-${toDate || "end"}.png`)
      );
    };
    img.src =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    console.log("ui_chart_export_total", {
      type: "png",
      asset,
      currency,
      from: fromDate,
      to: toDate,
      numPoints: windowed.length,
    });
  };

  const handleBrush = (e: any) => {
    if (!e) return;
    const start = fullSorted[e.startIndex]?.ds as any;
    const end = fullSorted[e.endIndex]?.ds as any;
    if (start && end) {
      const s = new Date(start).toISOString().slice(0, 10);
      const t = new Date(end).toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(t);
      onRangeChange?.(s, t);
      console.log("ui_chart_range_change_total", {
        preset: selectedPreset,
        asset,
        currency,
        from: s,
        to: t,
        numPoints: windowed.length,
      });
    }
  };

  const deltaTooltip = (index: number) => {
    if (index <= 0 || index >= windowed.length) return null; // Return null instead of 0
    const prev = windowed[index - 1]?.price;
    const curr = windowed[index]?.price;
    // Only return delta if both prices are valid numbers
    if (typeof prev === 'number' && typeof curr === 'number' && !isNaN(prev) && !isNaN(curr)) {
      return curr - prev;
    }
    return null; // Return null for invalid data
  };

  return (
    <div ref={containerRef} className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-2 py-1 rounded text-sm border ${
                selectedPreset === p.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => applyPreset("all")}
            className="px-2 py-1 rounded text-sm border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
          >
            Reset
          </button>
        </div>
        <div className="text-sm font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
          {pair}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate || ""}
            onChange={(e) => setFromDate(e.target.value)}
            onBlur={() =>
              fromDate && toDate && onRangeChange?.(fromDate, toDate!)
            }
            className="form-input text-sm"
          />
          <span>–</span>
          <input
            type="date"
            value={toDate || ""}
            onChange={(e) => setToDate(e.target.value)}
            onBlur={() =>
              fromDate && toDate && onRangeChange?.(fromDate!, toDate)
            }
            className="form-input text-sm"
          />
          <button onClick={exportPNG} className="btn btn-secondary text-sm">
            PNG
          </button>
          <button onClick={exportCSV} className="btn btn-secondary text-sm">
            CSV
          </button>
        </div>
      </div>

      <div style={{ height: 420, minHeight: 420 }}>
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={windowed}
            margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={(d) =>
                new Date(d.ds).toLocaleDateString(
                  locale === "ar" ? "ar-YE" : "en-US"
                )
              }
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis
              tickFormatter={formatYAxis as any}
              width={72}
              tick={{ fill: "#9ca3af" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                
                const dataPoint = payload[0].payload;
                const value = payload[0].value;
                
                // Find the actual index of this data point in the windowed array
                const idx = windowed.findIndex(
                  (p) => p.ds === dataPoint.ds && Math.abs(p.price - dataPoint.price) < 0.01
                );
                
                // Format the main price
                const priceText = `${formatNumber(value)} ${currency}`;
                
                // Calculate delta
                let deltaText = '(First point - no change data)';
                if (idx > 0 && idx < windowed.length) {
                  const prev = windowed[idx - 1]?.price;
                  const curr = windowed[idx]?.price;
                  
                  if (typeof prev === 'number' && typeof curr === 'number' && !isNaN(prev) && !isNaN(curr)) {
                    const delta = curr - prev;
                    const sign = delta >= 0 ? "▲ +" : "▼ ";
                    deltaText = `${sign}${formatNumber(Math.abs(delta))} ${currency}`;
                  }
                }
                
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-lg min-w-[220px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">
                      {label}
                    </p>
                    
                    {/* Main Price */}
                    <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {priceText}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {deltaText}
                      </p>
                    </div>
                    
                    {/* Technical Indicators */}
                    {payload.length > 1 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                          Indicators:
                        </p>
                        {payload.slice(1).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs gap-3">
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.name}:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatNumber(item.value)} {currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#1f77b4"
              dot={false}
              strokeWidth={2}
            />
            {/* Technical Indicator Lines */}
            {technicalIndicators?.sma20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#8b5cf6"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1.5}
                name="SMA 20"
              />
            )}
            {technicalIndicators?.sma50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#f59e0b"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1.5}
                name="SMA 50"
              />
            )}
            {technicalIndicators?.bollingerUpper && (
              <Line
                type="monotone"
                dataKey="bollingerUpper"
                stroke="#ef4444"
                strokeDasharray="2 2"
                dot={false}
                strokeWidth={1}
                name="BB Upper"
              />
            )}
            {technicalIndicators?.bollingerLower && (
              <Line
                type="monotone"
                dataKey="bollingerLower"
                stroke="#ef4444"
                strokeDasharray="2 2"
                dot={false}
                strokeWidth={1}
                name="BB Lower"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 64, minHeight: 64 }}>
        <ResponsiveContainer width="100%" height={64}>
          <LineChart
            data={fullSorted}
            margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
          >
            <XAxis dataKey={(d) => new Date(d.ds).getTime()} hide />
            <YAxis hide />
            <Brush
              dataKey={(d) => new Date(d.ds).getTime()}
              startIndex={brushIndex.start}
              endIndex={brushIndex.end}
              onChange={handleBrush}
              travellerWidth={8}
              height={24}
              stroke="#9ca3af"
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#93c5fd"
              dot={false}
              strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TimeSeriesExplorer;
