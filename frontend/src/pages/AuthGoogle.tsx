import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

const AuthGoogle: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [message, setMessage] = useState("Redirecting to Google...");
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false); // prevent double-run under StrictMode

  useEffect(() => {
    if (ranRef.current) return; // guard
    ranRef.current = true;

    const oauthUrl = (import.meta as any).env.VITE_GOOGLE_OAUTH_URL as
      | string
      | undefined;

    // If a backend OAuth URL is configured, go there
    if (oauthUrl) {
      window.location.href = oauthUrl;
      return;
    }

    // Fallback: use backend URL directly
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    window.location.href = `${backendUrl}/auth/google`;
  }, [login, navigate]);

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
          Redirecting to login page...
        </p>
      </div>
    </div>
  );
};

export default AuthGoogle;
