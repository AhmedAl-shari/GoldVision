// API Configuration
const getApiBaseUrl = () => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return "/api"; // Default for SSR
  }

  // Detect if we're running on localhost (HTTP or HTTPS)
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isHttps = window.location.protocol === "https:";

  // Always use proxy for localhost development (especially HTTPS for geolocation)
  // This avoids CORS issues and works with both HTTP and HTTPS frontend
  if (isLocalhost) {
    return "/api"; // Use Vite proxy
  }

  // If we have an explicit API base URL from env and not on localhost, use it
  if (import.meta.env?.VITE_API_BASE_URL && !isLocalhost) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // For mobile/LAN access, use the same hostname with backend port
  return `http://${hostname}:8000`;
};

export const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API base URL (only in browser)
if (typeof window !== "undefined") {
  console.log("🔧 API_BASE_URL:", API_BASE_URL);
  console.log("🔧 VITE_API_BASE_URL:", import.meta.env?.VITE_API_BASE_URL);
  console.log("🔧 Hostname:", window.location.hostname);
  console.log(
    "🔧 Is localhost:",
    window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
  );
  console.log("🔧 Cache bust timestamp:", Date.now());
  console.log("🔧 Current URL:", window.location.href);
}

// Force clear any cached API calls
if (typeof window !== "undefined") {
  // Clear any cached API responses
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.includes("api") || name.includes("vite")) {
          caches.delete(name);
          console.log("🗑️ Cleared cache:", name);
        }
      });
    });
  }
}
