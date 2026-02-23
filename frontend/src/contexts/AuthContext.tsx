import React, {
  createContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { apiClient } from "../lib/api";
import type { User, AuthContextType } from "./authTypes";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Removed autoLogin: users must sign in explicitly to avoid unintended admin role

  // Check for existing tokens on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          // Set the token in the API client
          apiClient.setToken(token);

          // Verify token by getting user info
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
        } catch (error: any) {
          // Check if it's a 404 (no user) vs 401 (invalid token)
          const isUnauthorized = error?.response?.status === 401;
          const isNotFound = error?.response?.status === 404;

          // Only try to refresh if we got 401 (unauthorized), not 404 (no user found)
          if (isUnauthorized) {
            try {
              await refreshToken();
              const userData = await apiClient.getCurrentUser();
              setUser(userData);
            } catch {
              // Refresh failed, clear tokens
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              apiClient.setToken(null);
              setUser(null);
            }
          } else if (isNotFound) {
            // 404 means token is valid but user not found - clear tokens
            console.warn("Token valid but user not found, clearing auth");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            apiClient.setToken(null);
            setUser(null);
          } else {
            // Other errors - keep token but don't set user
            console.warn("Auth check failed:", error?.message);
            setUser(null);
          }
        }
      } else {
        // No token; show login screen
        setUser(null);
      }
      setIsLoading(false);
    };

    // Listen for logout events from API client
    const handleAuthLogout = () => {
      setUser(null);
    };

    window.addEventListener("auth:logout", handleAuthLogout);
    checkAuth();

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login(email, password);

    // Store tokens
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
    if (response.session_id) {
      localStorage.setItem("session_id", response.session_id);
    }

    // Set token in API client
    apiClient.setToken(response.access_token);
    await apiClient.ensureCSRFToken();

    // Get user info
    const userData = await apiClient.getCurrentUser();
    setUser(userData);
  };

  const loginWithToken = async (token: string) => {
    // Store token
    localStorage.setItem("access_token", token);

    // Set token in API client first
    apiClient.setToken(token);

    // Reset session state to get fresh CSRF token
    apiClient.resetSessionState();

    // Ensure CSRF token is fetched after reset
    await apiClient.ensureCSRFToken(true); // Force refresh to get new token

    // Get user info
    const userData = await apiClient.getCurrentUser();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("session_id");
    apiClient.setToken(null);
    apiClient.resetSessionState();
    setUser(null);
  };

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem("refresh_token");
    if (!refreshTokenValue) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.refreshToken(refreshTokenValue);

    // Update tokens
    localStorage.setItem("access_token", response.access_token);
    apiClient.setToken(response.access_token);
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithToken,
    logout,
    refreshToken,
    isAdmin,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
