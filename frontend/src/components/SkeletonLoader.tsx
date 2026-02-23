import React from "react";

interface SkeletonLoaderProps {
  variant?: "text" | "rectangular" | "circular" | "card" | "table" | "chart";
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  lines = 1,
  animate = true,
}) => {
  const baseClasses = `bg-gray-200 dark:bg-gray-700 ${
    animate ? "animate-pulse" : ""
  }`;

  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return "h-4 rounded";
      case "circular":
        return "rounded-full";
      case "card":
        return "rounded-lg";
      case "table":
        return "h-12 rounded";
      case "chart":
        return "rounded-lg";
      default:
        return "rounded";
    }
  };

  const getDimensions = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === "number" ? `${width}px` : width;
    if (height)
      style.height = typeof height === "number" ? `${height}px` : height;
    return style;
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={getDimensions()}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getDimensions()}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
  >
    <SkeletonLoader variant="text" width="60%" height="24px" className="mb-4" />
    <SkeletonLoader variant="text" width="100%" className="mb-2" />
    <SkeletonLoader variant="text" width="80%" className="mb-4" />
    <SkeletonLoader variant="rectangular" height="200px" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = "",
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
  >
    <SkeletonLoader variant="text" width="40%" height="24px" className="mb-6" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex space-x-4">
          <SkeletonLoader variant="rectangular" width="20%" height="16px" />
          <SkeletonLoader variant="rectangular" width="30%" height="16px" />
          <SkeletonLoader variant="rectangular" width="25%" height="16px" />
          <SkeletonLoader variant="rectangular" width="25%" height="16px" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
  >
    <SkeletonLoader variant="text" width="50%" height="24px" className="mb-6" />
    <SkeletonLoader variant="rectangular" height="300px" />
  </div>
);

export const SkeletonNewsCard: React.FC<{
  size?: "small" | "large" | "hero";
  className?: string;
}> = ({ size = "small", className = "" }) => {
  const getImageHeight = () => {
    switch (size) {
      case "hero":
        return "h-80";
      case "large":
        return "h-56";
      default:
        return "h-40";
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}
    >
      <SkeletonLoader
        variant="rectangular"
        className={`w-full ${getImageHeight()}`}
      />
      <div className="p-4 space-y-3">
        <SkeletonLoader variant="text" width="90%" height="20px" />
        <SkeletonLoader variant="text" width="100%" />
        <SkeletonLoader variant="text" width="70%" />
        <div className="flex justify-between items-center mt-4">
          <SkeletonLoader variant="text" width="30%" height="14px" />
          <SkeletonLoader variant="text" width="20%" height="14px" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <SkeletonLoader variant="text" width="200px" height="32px" />
      <SkeletonLoader variant="rectangular" width="120px" height="40px" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <SkeletonLoader
            variant="text"
            width="60%"
            height="16px"
            className="mb-2"
          />
          <SkeletonLoader
            variant="text"
            width="80%"
            height="24px"
            className="mb-1"
          />
          <SkeletonLoader variant="text" width="40%" height="14px" />
        </div>
      ))}
    </div>

    {/* Chart */}
    <SkeletonChart />

    {/* News Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonNewsCard key={index} size="small" />
      ))}
    </div>
  </div>
);

export default SkeletonLoader;
