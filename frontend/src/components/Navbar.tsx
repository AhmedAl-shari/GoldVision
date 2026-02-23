import { Link, useLocation } from "react-router-dom";
import React from "react";
import { useLocale } from "../contexts/useLocale";
import { useAuth } from "../contexts/useAuth";
import { API_BASE_URL } from "../lib/config";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { getProviderStatus, getAlerts } from "../lib/api";
import { tokens } from "../lib/design-tokens";
import { Chip } from "./Chip";
import ProviderStatusBadge from "./ProviderStatusBadge";
import UserProfileDrawer from "./UserProfileDrawer";
import {
  Home,
  TrendingUp,
  Bell,
  Newspaper,
  MapPin,
  Calculator,
  Settings,
  Menu,
} from "lucide-react";

// Export navbar height constant for use in other components if needed
export const NAVBAR_HEIGHT = "7.5rem";

interface NavbarProps {
  onSidebarToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSidebarToggle }) => {
  const location = useLocation();
  const { t, isRTL } = useLocale();
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth();
  const [liveUser, setLiveUser] = React.useState<typeof user | null>(user);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  // Check if token exists in localStorage as additional safeguard
  const hasToken = (() => {
    try {
      return !!localStorage.getItem("access_token");
    } catch {
      return false;
    }
  })();

  // Check if in demo mode
  const { data: providerStatus } = useQuery({
    queryKey: ["provider-status"],
    queryFn: getProviderStatus,
    enabled: isAuthenticated && !authLoading && hasToken, // Only fetch when authenticated, auth check complete, and token exists
    refetchInterval: 30000,
  });

  // Fetch alerts to show notification badge
  const { data: alertsData } = useQuery({
    queryKey: ["navbar-alerts"],
    queryFn: () => getAlerts(),
    enabled: isAuthenticated && !authLoading && hasToken, // Only fetch when authenticated, auth check complete, and token exists
    refetchInterval: 60000, // Check every minute
  });

  // Count triggered alerts
  const triggeredAlertsCount =
    alertsData?.alerts?.filter(
      (alert: { triggered_at: Date | null }) => alert.triggered_at
    ).length || 0;
  const totalAlerts = alertsData?.alerts?.length || 0;

  const displayEmail = liveUser?.email || user?.email || "";
  const profileInitials = React.useMemo(() => {
    if (!displayEmail) {
      return "GV";
    }
    const namePart = displayEmail.split("@")[0];
    if (!namePart) {
      return displayEmail.slice(0, 2).toUpperCase();
    }
    const cleaned = namePart.replace(/[^a-zA-Z0-9]/g, " ").trim();
    const pieces = cleaned.split(" ").filter(Boolean);
    if (pieces.length >= 2) {
      return (pieces[0][0] + pieces[1][0]).toUpperCase();
    }
    return namePart.slice(0, 2).toUpperCase();
  }, [displayEmail]);

  const navItems = [
    { path: "/dashboard", label: t("dashboard"), tier: "mvp", icon: Home },
    { path: "/trends", label: t("trends"), tier: "mvp", icon: TrendingUp },
    { path: "/alerts", label: t("alerts"), tier: "mvp", icon: Bell },
    {
      path: "/news",
      label: t("News") || "News",
      tier: "enhanced",
      icon: Newspaper,
    },
    {
      path: "/regional",
      label: t("Regional Pricing") || "Regional Pricing",
      tier: "enhanced",
      icon: MapPin,
    },
    { path: "/calculator", label: "Calculator", tier: "mvp", icon: Calculator },
  ];

  // Fetch live user (bypass any cached /auth/me)
  React.useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!isAuthenticated || !token) {
      setLiveUser(null);
      return;
    }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/auth/me?ts=` + Date.now(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setLiveUser(u || user))
      .catch(() => setLiveUser(user));
    return () => controller.abort();
  }, [isAuthenticated, user?.email]);

  // Add admin link if live user is admin
  if (isAuthenticated && liveUser?.role === "admin") {
    navItems.push({
      path: "/admin",
      label: "Admin",
      tier: "enhanced",
      icon: Settings,
    });
  }

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-40 overflow-hidden w-full flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        style={{
          width: "100%",
          height: "var(--navbar-height, 7.5rem)",
          minHeight: "var(--navbar-height, 7.5rem)",
          top: "7rem", // Position below market ticker
        }}
      >
        {/* Sidebar Toggle Button - Absolute left corner */}
        {isAuthenticated && onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-20"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Full-width container with centered content */}
        <div className="relative w-full z-10">
          <div
            className="mx-auto max-w-7xl"
            style={{
              paddingLeft: tokens.spacing.md,
              paddingRight: tokens.spacing.md,
            }}
          >
            <div
              className="flex items-center justify-between w-full"
              style={{
                height: "var(--navbar-height, 7.5rem)",
                gap: tokens.spacing.md,
                minHeight: "var(--navbar-height, 7.5rem)",
              }}
            >
              {/* Left Group: Logo + Nav */}
              <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
                {/* Left Section - Logo and Demo Badge */}
                <div
                  className="flex items-center space-x-3 flex-shrink-0"
                  style={{ gap: "var(--space-3)" }}
                >
                  <Link
                    to="/"
                    className="group inline-flex items-center transition-transform duration-200 hover:scale-105"
                    style={{ gap: tokens.spacing.sm }}
                  >
                    <span
                      className="inline-flex items-center justify-center text-white font-bold transition-all duration-200 shadow-lg group-hover:shadow-xl"
                      style={{
                        height: "2.5rem", // Increased from 32px to 40px
                        width: "2.5rem", // Increased from 32px to 40px
                        borderRadius: tokens.radius.lg,
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #3b82f6 100%)",
                      }}
                    >
                      GV
                    </span>
                    <span
                      className="font-semibold tracking-tight text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        lineHeight: tokens.typography.fontSize.lg[1].lineHeight,
                      }}
                    >
                      GoldVision
                    </span>
                  </Link>
                  {providerStatus?.demo_mode && (
                    <span className="inline-flex items-center px-2.5 py-0.5 pill-badge text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Demo
                    </span>
                  )}
                  {isAuthenticated && <ProviderStatusBadge />}
                </div>

                {/* Center Section - Navigation Links */}
                {isAuthenticated && (
                  <div
                    className="hidden lg:flex overflow-x-auto scrollbar-hide rounded-lg bg-gray-100/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50"
                    style={{
                      gap: "0.5rem",
                      flexShrink: 1,
                      minWidth: 0,
                      padding: "0.5rem",
                    }}
                  >
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      const isAlertsPage = item.path === "/alerts";
                      const IconComponent = item.icon;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`font-medium transition-all duration-200 whitespace-nowrap relative flex-shrink-0 flex items-center gap-2 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md dark:bg-blue-700"
                              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                          style={{
                            padding: "0.625rem 1rem",
                            borderRadius: "0.5rem",
                            fontSize: tokens.typography.fontSize.sm[0],
                            lineHeight:
                              tokens.typography.fontSize.sm[1].lineHeight,
                          }}
                        >
                          {IconComponent && (
                            <IconComponent className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="flex items-center gap-1.5">
                            {item.label}
                            {isAlertsPage && triggeredAlertsCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {triggeredAlertsCount > 9
                                  ? "9+"
                                  : triggeredAlertsCount}
                              </span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Section - Controls */}
              <div className="flex items-center space-x-3 ml-auto flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>

                {isAuthenticated ? (
                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    aria-label={t("profile") ?? "User profile"}
                  >
                    {profileInitials}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-lg transition-all duration-200 whitespace-nowrap border border-gray-200/50 dark:border-gray-700/50"
                  >
                    {t("login")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <UserProfileDrawer
        isOpen={isAuthenticated && isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={logout}
        user={liveUser || user}
        alertsTotal={totalAlerts}
        triggeredAlerts={triggeredAlertsCount}
      />
    </>
  );
};

export default Navbar;
