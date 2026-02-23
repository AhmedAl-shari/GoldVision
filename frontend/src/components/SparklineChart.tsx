import React, { useMemo } from "react";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showRegressionBand?: boolean;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 40,
  color = "currentColor",
  showArea = false,
  showRegressionBand = false,
}) => {
  const { path, areaPath, gradientId, regressionLine, regressionBand, pointArray } = useMemo(() => {
    if (data.length === 0) return { path: "", areaPath: "", gradientId: "", regressionLine: "", regressionBand: "", pointArray: [] };

    // Ensure we have valid numeric data
    const validData = data.filter(d => typeof d === 'number' && !isNaN(d) && isFinite(d));
    if (validData.length === 0) return { path: "", areaPath: "", gradientId: "", regressionLine: "", regressionBand: "", pointArray: [] };

    const maxValue = Math.max(...validData);
    const minValue = Math.min(...validData);
    // Ensure minimum range for visibility (at least 0.5% of the average value)
    const avgValue = validData.reduce((a, b) => a + b, 0) / validData.length;
    const minRange = avgValue * 0.005; // 0.5% minimum range
    const range = Math.max(maxValue - minValue, minRange);
    
    // Add padding to prevent clipping at edges
    const padding = 4;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const pointArray = validData.map((val, i) => {
      const x = padding + (i / (validData.length - 1 || 1)) * chartWidth;
      // Center the line vertically if range is too small
      const normalizedValue = range > minRange 
        ? ((val - minValue) / range) 
        : 0.5; // Center if all values are the same
      const y = padding + chartHeight - (normalizedValue * chartHeight);
      return { x, y, value: val };
    });

    // Create smooth curve using quadratic bezier curves
    let pathD = `M ${pointArray[0].x},${pointArray[0].y}`;
    for (let i = 1; i < pointArray.length; i++) {
      const prev = pointArray[i - 1];
      const curr = pointArray[i];
      const next = pointArray[i + 1] || curr;
      
      // Control point for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = curr.x - (next.x - curr.x) / 2;
      const cp2y = curr.y;
      
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }

    // Create area path for gradient fill
    const firstPoint = pointArray[0];
    const lastPoint = pointArray[pointArray.length - 1];
    const bottomY = height - padding;
    const areaPathD = `${pathD} L ${lastPoint.x},${bottomY} L ${firstPoint.x},${bottomY} Z`;

    const gradientId = `gradient-${color.replace('#', '').replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate linear regression line if showRegressionBand is true
    let regressionLinePath = "";
    let regressionBandPath = "";
    if (showRegressionBand && validData.length >= 2) {
      // Calculate linear regression using least squares method
      const n = validData.length;
      const xValues = Array.from({ length: n }, (_, i) => i);
      const yValues = validData;
      
      // Calculate means
      const xMean = xValues.reduce((a, b) => a + b, 0) / n;
      const yMean = yValues.reduce((a, b) => a + b, 0) / n;
      
      // Calculate slope (m) and intercept (b) for y = mx + b
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
        denominator += Math.pow(xValues[i] - xMean, 2);
      }
      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;
      
      // Calculate standard error for confidence band
      let sumSquaredErrors = 0;
      for (let i = 0; i < n; i++) {
        const predicted = slope * xValues[i] + intercept;
        sumSquaredErrors += Math.pow(yValues[i] - predicted, 2);
      }
      const standardError = Math.sqrt(sumSquaredErrors / (n - 2)) || 0;
      const confidenceLevel = 1.96; // 95% confidence interval
      
      // Calculate regression line points
      const regressionPoints = pointArray.map((point, i) => {
        const predictedValue = slope * i + intercept;
        const y = padding + chartHeight - ((predictedValue - minValue) / range) * chartHeight;
        return { x: point.x, y };
      });
      
      // Create regression line path
      if (regressionPoints.length > 0) {
        regressionLinePath = `M ${regressionPoints[0].x},${regressionPoints[0].y}`;
        for (let i = 1; i < regressionPoints.length; i++) {
          regressionLinePath += ` L ${regressionPoints[i].x},${regressionPoints[i].y}`;
        }
      }
      
      // Create confidence band (upper and lower bounds)
      if (regressionPoints.length > 0) {
        const upperBand = regressionPoints.map((point, i) => {
          const predictedValue = slope * i + intercept;
          const upperValue = predictedValue + confidenceLevel * standardError;
          const y = padding + chartHeight - ((upperValue - minValue) / range) * chartHeight;
          return { x: point.x, y };
        });
        
        const lowerBand = regressionPoints.map((point, i) => {
          const predictedValue = slope * i + intercept;
          const lowerValue = predictedValue - confidenceLevel * standardError;
          const y = padding + chartHeight - ((lowerValue - minValue) / range) * chartHeight;
          return { x: point.x, y };
        });
        
        // Create band path (upper line + lower line reversed + close)
        let bandPath = `M ${upperBand[0].x},${upperBand[0].y}`;
        for (let i = 1; i < upperBand.length; i++) {
          bandPath += ` L ${upperBand[i].x},${upperBand[i].y}`;
        }
        for (let i = lowerBand.length - 1; i >= 0; i--) {
          bandPath += ` L ${lowerBand[i].x},${lowerBand[i].y}`;
        }
        bandPath += " Z";
        regressionBandPath = bandPath;
      }
    }

    return { path: pathD, areaPath: areaPathD, gradientId, regressionLine: regressionLinePath, regressionBand: regressionBandPath, pointArray };
  }, [data, width, height, color, showRegressionBand]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
        <filter id={`glow-${gradientId}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {showArea && areaPath && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
      )}
      {showRegressionBand && regressionBand && (
        <path
          d={regressionBand}
          fill={color}
          fillOpacity="0.1"
          stroke="none"
        />
      )}
      {showRegressionBand && regressionLine && (
        <path
          d={regressionLine}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4,2"
          strokeOpacity="0.6"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        filter={`url(#glow-${gradientId})`}
        style={{
          filter: `drop-shadow(0 0 2px ${color}40)`,
        }}
      />
      {/* Add data points for better visibility */}
      {pointArray && pointArray.length > 0 && pointArray.map((point, i) => {
        return (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={i === pointArray.length - 1 ? 3 : 2}
            fill={color}
            stroke="white"
            strokeWidth={i === pointArray.length - 1 ? 1.5 : 1}
            opacity={i === pointArray.length - 1 ? 1 : 0.6}
            style={{
              filter: `drop-shadow(0 0 3px ${color}60)`,
            }}
          />
        );
      })}
    </svg>
  );
};

export default SparklineChart;

