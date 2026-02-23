import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Mail,
  Shield,
  Calendar,
  Bell,
  Calculator,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User as UserIcon,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import type { User } from "../contexts/authTypes";

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: User | null;
  alertsTotal?: number;
  triggeredAlerts?: number;
}

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
};

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
  isOpen,
  onClose,
  onLogout,
  user,
  alertsTotal = 0,
  triggeredAlerts = 0,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const displayEmail = user?.email ?? "Unknown user";
  const initials = useMemo(() => {
    const source = displayEmail.split("@")[0];
    if (!source) return "GV";
    const parts = source.replace(/[^a-zA-Z0-9]/g, " ").trim().split(" ");
    const chars =
      parts.length >= 2
        ? parts[0].charAt(0) + parts[1].charAt(0)
        : source.slice(0, 2);
    return chars.toUpperCase();
  }, [displayEmail]);

  if (!isOpen) {
    return null;
  }

  const handleCloseAndNavigate = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="relative flex h-full w-full max-w-sm flex-col border-r border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 ease-out dark:border-slate-700/60 dark:bg-slate-900/95"
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
      >
        {/* Header with gradient overlay */}
        <div className="relative overflow-hidden border-b border-slate-200/60 px-6 py-6 dark:border-slate-700/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-xl font-bold text-white shadow-lg ring-2 ring-white/20 dark:ring-slate-800/50">
                  {initials}
                </span>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {displayEmail.split("@")[0]}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                  {user?.role ?? "member"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-500 transition-all hover:bg-gray-100/80 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-100"
              aria-label="Close profile"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Account Overview - Glassmorphic Panel */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/4 to-purple-500/8" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-blue-500/15 p-2 ring-1 ring-blue-400/40">
                    <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    Account Overview
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-white/5">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{displayEmail}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-white/5">
                    <div className="rounded-lg bg-indigo-500/10 p-2">
                      <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      Role: <span className="font-medium">{user?.role ?? "member"}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-white/5">
                    <div className="rounded-lg bg-purple-500/10 p-2">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Member since <span className="font-medium">{user?.created_at ? formatDate(user.created_at) : "N/A"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Activity - Glassmorphic Panel */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-teal-500/4 to-cyan-500/8" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-400/40">
                    <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    Activity
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50/80 p-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                    <div className="relative">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Alerts
                      </p>
                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {alertsTotal}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        total configured
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50/80 p-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
                    <div className="relative">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Triggered
                      </p>
                      <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {triggeredAlerts}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        recent signals
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Access - Glassmorphic Panel */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-pink-500/4 to-rose-500/8" />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-purple-500/15 p-2 ring-1 ring-purple-400/40">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    Quick Access
                  </h3>
                </div>
                <div className="grid gap-2">
                  <Link
                    to="/dashboard"
                    onClick={handleCloseAndNavigate}
                    className="group relative flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-blue-500/60 hover:bg-blue-50/80 hover:text-blue-700 hover:shadow-md dark:border-slate-700/60 dark:bg-white/5 dark:text-gray-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                  >
                    <span className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-1.5 group-hover:bg-blue-500/20 transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Dashboard
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </Link>
                  <Link
                    to="/alerts"
                    onClick={handleCloseAndNavigate}
                    className="group relative flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-orange-500/60 hover:bg-orange-50/80 hover:text-orange-700 hover:shadow-md dark:border-slate-700/60 dark:bg-white/5 dark:text-gray-300 dark:hover:border-orange-500/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                  >
                    <span className="flex items-center gap-3">
                      <div className="rounded-lg bg-orange-500/10 p-1.5 group-hover:bg-orange-500/20 transition-colors">
                        <Bell className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      Manage alerts
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                  </Link>
                  <Link
                    to="/calculator"
                    onClick={handleCloseAndNavigate}
                    className="group relative flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-emerald-500/60 hover:bg-emerald-50/80 hover:text-emerald-700 hover:shadow-md dark:border-slate-700/60 dark:bg-white/5 dark:text-gray-300 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                  >
                    <span className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-1.5 group-hover:bg-emerald-500/20 transition-colors">
                        <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Portfolio tools
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer with Logout Button */}
        <div className="border-t border-slate-200/60 px-6 py-5 dark:border-slate-700/60">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-red-600 hover:via-red-700 hover:to-red-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <LogOut className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default UserProfileDrawer;

