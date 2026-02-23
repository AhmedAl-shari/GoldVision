import { Link, useLocation } from "react-router-dom";
import React from "react";
import { useAuth } from "../contexts/useAuth";
import {
  Home,
  TrendingUp,
  Bell,
  MapPin,
  Calculator,
  Settings,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/alerts", label: "Alerts", icon: Bell },
    { path: "/regional", label: "Regional", icon: MapPin },
    { path: "/calculator", label: "Calculator", icon: Calculator },
  ];

  // Add admin link if user is admin
  if (isAuthenticated && user?.role === "admin") {
    navItems.push({
      path: "/admin",
      label: "Admin",
      icon: Settings,
    });
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Backdrop with blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-25 transition-opacity duration-300 lg:block hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 w-72 bg-slate-900/95 dark:bg-slate-900/95 z-30 transform transition-transform duration-300 ease-in-out lg:block hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col border-r border-slate-700/60 dark:border-slate-700/60 shadow-2xl backdrop-blur-xl`}
        style={{
          top: "14.5rem", // Position below market ticker (7rem) + navbar (7.5rem) = 14.5rem
          height: "calc(100vh - 14.5rem)",
        }}
      >
        {/* Professional Header with Gradient */}
        <div className="relative overflow-hidden border-b border-slate-700/60 dark:border-slate-700/60">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-purple-600/20" />
          
          <div className="relative flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-lg ring-2 ring-blue-500/20">
                <span className="text-white font-bold text-sm">GV</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">GoldVision</h2>
                <p className="text-xs text-slate-400 font-medium">Navigation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 dark:hover:bg-slate-800/80 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60 dark:hover:bg-slate-800/60"
                }`}
              >
                {/* Active indicator line */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}
                
                {/* Icon with enhanced styling */}
                <div
                  className={`relative flex items-center justify-center w-5 h-5 transition-transform duration-200 ${
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-blue-400 group-hover:scale-110"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                </div>
                
                {/* Label */}
                <span className={`font-semibold text-sm tracking-wide ${
                  active ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}>
                  {item.label}
                </span>

                {/* Hover effect overlay */}
                {!active && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Subtle bottom decoration */}
        <div className="px-4 py-4 border-t border-slate-700/40 dark:border-slate-700/40">
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
              <span className="text-xs font-medium text-slate-400">Live System</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
