import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "../lib/config";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        setError("Authentication failed. Please try again.");
        setMessage("Authentication failed");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
        return;
      }

      if (token) {
        try {
          // Clear old user data when new user logs in
          // This ensures new user doesn't see previous user's cached alerts
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          // Clear React Query cache to remove old alerts data
          queryClient.clear();

          // Store the new token and redirect to dashboard
          localStorage.setItem("access_token", token);
          setMessage("Authentication successful! Redirecting...");

          // Call loginWithToken to update auth context
          await loginWithToken(token);

          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1000);
        } catch (err) {
          setError("Failed to process authentication token.");
          setMessage("Authentication failed");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 3000);
        }
      } else {
        setError("No authentication token received.");
        setMessage("Authentication failed");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    handleAuth();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-700 dark:text-gray-200 text-sm mb-4">
          {message}
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          Please wait while we complete your authentication...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
