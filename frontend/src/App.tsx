import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./contexts/useAuth";
import Navbar from "./components/Navbar";
import HealthBanner from "./components/HealthBanner";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ChatButton from "./components/ChatButton";
import ProMarketTicker from "./components/ProMarketTicker";
import ProFooter from "./components/ProFooter";
import MobileBottomNav from "./components/MobileBottomNav";
import SkeletonLoader from "./components/SkeletonLoader";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Trends from "./pages/Trends";
import Alerts from "./pages/Alerts";
import Admin from "./pages/Admin";
import Calculator from "./pages/Calculator";
import NewsV2 from "./pages/NewsV2";
import Login from "./pages/Login";
import AuthGoogle from "./pages/AuthGoogle";
import AuthCallback from "./pages/AuthCallback";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Offline from "./pages/Offline";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import RegionalPricing from "./pages/RegionalPricing";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import BeginnerTutorial from "./components/BeginnerTutorial";
import { Menu, X } from "lucide-react";
import SkipLinks from "./components/SkipLinks";
import { useLocale } from "./contexts/useLocale";
import { useSettings } from "./contexts/SettingsContext";
import LocaleDirection from "./components/LocaleDirection";
import ErrorBoundary from "./components/ErrorBoundary";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <SkeletonLoader variant="circular" width={48} height={48} />
          <div className="space-y-2">
            <SkeletonLoader variant="text" width="200px" height="24px" />
            <SkeletonLoader variant="text" width="150px" height="16px" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Mobile navigation component
const MobileNav = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/trends", label: "Trends", icon: "📈" },
    { path: "/alerts", label: "Alerts", icon: "🔔" },
    { path: "/regional", label: "Regional", icon: "🌍" },
    { path: "/calculator", label: "Calculator", icon: "🧮" },
    { path: "/admin", label: "Admin", icon: "⚙️" },
  ];

  if (!isAuthenticated || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            GoldVision
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

function AppContent() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { locale } = useLocale();
  const { forceLTR } = useSettings();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile nav when route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Get context based on current page
  const getContext = () => {
    const path = location.pathname;
    const context: any = { currentPage: path.replace("/", "") };

    // Add page-specific context
    if (path === "/dashboard") {
      context.symbol = "XAU";
      context.currency = "USD";
    } else if (path === "/trends") {
      context.symbol = "XAU";
      context.currency = "USD";
      context.dateRange = "30d";
    }

    return context;
  };

  // Check if current path is an auth page (should render standalone without navbar)
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/auth/google" ||
    location.pathname === "/auth/callback" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <LocaleDirection locale={locale} forceLTR={forceLTR} />
      {/* Accessibility: Skip Links */}
      <SkipLinks />

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Sidebar - Desktop only */}
      {isAuthenticated && !isMobile && !isAuthPage && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Mobile Header */}
      {isAuthenticated && isMobile && !isAuthPage && (
        <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                GoldVision
              </span>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Home page and Auth pages render standalone */}
      {location.pathname === "/" || isAuthPage ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/google" element={<AuthGoogle />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      ) : (
        <div className={`flex flex-col min-h-screen w-full transition-all duration-300 ${
          isSidebarOpen && !isMobile ? 'lg:ml-64' : ''
        }`}>
          {/* Professional Market Ticker - Fixed at top */}
          {isAuthenticated &&
            !isMobile &&
            location.pathname !== "/" &&
            !isAuthPage && (
              <>
                <div className="hidden lg:block fixed top-0 left-0 right-0 z-50">
                  <ProMarketTicker />
                </div>
                {/* Spacer to push content below fixed ticker */}
                <div className="hidden lg:block" style={{ height: "7rem" }} />
              </>
            )}

          {/* Navbar - Fixed below market ticker */}
          <div className="hidden lg:block w-full flex-shrink-0">
            <Navbar onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            {/* Spacer to push content below fixed navbar */}
            <div style={{ height: "7.5rem" }} />
          </div>

          {/* Main Content - Starts below both fixed elements */}
          <main
            id="main-content"
            role="main"
            className={`flex-1 w-full ${
              isMobile
                ? "px-4 py-4 space-y-4"
                : "mx-auto max-w-7xl px-4 lg:px-6 xl:px-8 py-6 space-y-6"
            }`}
          >
            {/* Health Banner - Hidden on mobile for space */}
            <div className="hidden md:block">
              <HealthBanner />
            </div>

            {/* Yemen Settings Bar - Moved to Dashboard component */}

            {/* Page Content */}
            <div className={isMobile ? "pb-20" : ""}>
              <Routes>
                <Route path="/offline" element={<Offline />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trends"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Trends />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Alerts />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/news"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <NewsV2 />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Admin />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calculator"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Calculator />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/regional"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <RegionalPricing />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/education"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/checkout-success"
                  element={<CheckoutSuccess />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </div>

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />

            {/* Beginner Tutorial */}
            {isAuthenticated && <BeginnerTutorial />}

            {/* Chat Button - Positioned for mobile */}
            {isAuthenticated && (
              <div className={isMobile ? "fixed bottom-4 right-4 z-30" : ""}>
                <ChatButton context={getContext()} />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Professional Footer - Only show on desktop when authenticated */}
      {isAuthenticated && !isMobile && !isAuthPage && <ProFooter />}

      {/* Mobile Bottom Navigation - Only show when authenticated (not on homepage or auth pages) */}
      {location.pathname !== "/" && !isAuthPage && <MobileBottomNav />}
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
