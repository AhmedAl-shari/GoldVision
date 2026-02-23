import React, { useState, useEffect } from "react";
import { apiClient } from "../lib/api";

interface HealthStatus {
  status: "ok" | "error" | "checking";
  request_id?: string;
  error?: string;
}

const HealthBanner: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: "checking",
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.healthCheck();
        setHealthStatus({ status: "ok" });
      } catch (error: unknown) {
        const err = error as {
          response?: { headers?: { "x-request-id"?: string } };
          message?: string;
        };
        const requestId = err.response?.headers?.["x-request-id"];
        setHealthStatus({
          status: "error",
          request_id: requestId,
          error: err.message || "Backend service unavailable",
        });
      }
    };

    checkHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (healthStatus.status === "ok" || healthStatus.status === "checking") {
    return null;
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            <strong>Service Warning:</strong> {healthStatus.error}
            {healthStatus.request_id && (
              <span className="block text-xs text-red-600 mt-1">
                Request ID: {healthStatus.request_id}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthBanner;
