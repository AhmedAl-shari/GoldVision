import { useQuery } from "@tanstack/react-query";
import { Info, GitBranch, Calendar, Code } from "lucide-react";

interface BuildInfo {
  version: string;
  commit: string;
  buildTime: string;
  environment: string;
}

const BuildInfoCard = () => {
  const { data: buildInfo, isLoading } = useQuery({
    queryKey: ["build-info"],
    queryFn: async (): Promise<BuildInfo> => {
      // Get build info from environment variables or API
      const version = import.meta.env.VITE_APP_VERSION || "1.0.0";
      const commit = import.meta.env.VITE_GIT_COMMIT || "unknown";
      const buildTime =
        import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
      const environment = import.meta.env.MODE || "development";

      return {
        version,
        commit: commit.substring(0, 7), // Short commit hash
        buildTime,
        environment,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="card !p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatBuildTime = (buildTime: string) => {
    try {
      const date = new Date(buildTime);
      return date.toLocaleString();
    } catch {
      return buildTime;
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env.toLowerCase()) {
      case "production":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
      case "staging":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "development":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  return (
    <div className="card !p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
            <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Build Information
          </h3>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full border ${getEnvironmentColor(
            buildInfo?.environment || "unknown"
          )}`}
        >
          {buildInfo?.environment?.toUpperCase() || "UNKNOWN"}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Version
            </span>
          </div>
          <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
            {buildInfo?.version || "unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Commit
            </span>
          </div>
          <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
            {buildInfo?.commit || "unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Built
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {buildInfo?.buildTime
              ? formatBuildTime(buildInfo.buildTime)
              : "unknown"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Build info loaded from environment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildInfoCard;
