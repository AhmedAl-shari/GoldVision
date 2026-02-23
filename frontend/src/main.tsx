import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";
import { LocaleProvider } from "./contexts/LocaleContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { YemenSettingsProvider } from "./contexts/YemenSettingsContext";
import App from "./App.tsx";
import "./index.css";
import "./styles/tokens.css";
import "leaflet/dist/leaflet.css";

// Service worker cleanup - only clean up non-push service workers
// Push notification service worker (sw.js) should be preserved
if ("serviceWorker" in navigator && import.meta.env.DEV) {
  console.log(
    "🧹 Cleaning up old service workers (preserving push notification SW)..."
  );
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      console.log(`Found ${regs.length} service worker(s)`);
      regs.forEach((r) => {
        // Don't unregister the push notification service worker
        if (r.active?.scriptURL?.includes("/sw.js")) {
          console.log("Preserving push notification service worker:", r.scope);
          return;
        }
        console.log("Unregistering old service worker:", r.scope);
        r.unregister();
      });
    })
    .catch((err) => console.warn("SW cleanup error:", err));

  // Cache cleanup (only in development)
  if (typeof caches !== "undefined") {
    caches
      .keys()
      .then((keys) => {
        // Don't delete push notification related caches
        const keysToDelete = keys.filter(
          (k) => !k.includes("push") && !k.includes("notification")
        );
        console.log(`Clearing ${keysToDelete.length} cache(s)`);
        return Promise.all(keysToDelete.map((k) => caches.delete(k)));
      })
      .catch((err) => console.warn("Cache cleanup error:", err));
  }

  console.log("✅ Service worker cleanup complete");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000, // 60 seconds
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SettingsProvider>
              <BrowserRouter>
                <YemenSettingsProvider>
                  <App />
                  <Toaster position="top-right" />
                </YemenSettingsProvider>
              </BrowserRouter>
            </SettingsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </HelmetProvider>
  </React.StrictMode>
);
