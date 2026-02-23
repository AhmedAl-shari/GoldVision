import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  TrendingUp,
  Bell,
  Calculator,
  Home,
  Newspaper,
} from "lucide-react";

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: Home,
      exact: true,
    },
    {
      path: "/trends",
      label: "Trends",
      icon: TrendingUp,
    },
    {
      path: "/alerts",
      label: "Alerts",
      icon: Bell,
    },
    {
      path: "/news",
      label: "News",
      icon: Newspaper,
    },
    {
      path: "/calculator",
      label: "Calc",
      icon: Calculator,
    },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                active
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              aria-label={item.label}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? "text-blue-600 dark:text-blue-400" : ""
                }`}
              />
              <span className="text-xs font-medium truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
