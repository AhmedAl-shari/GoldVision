import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Check if mkcert certificates exist (trusted certificates)
  let useMkcert = false;
  let certPath: string;
  let keyPath: string;

  try {
    certPath = path.resolve(__dirname, ".cert/localhost+2.pem");
    keyPath = path.resolve(__dirname, ".cert/localhost+2-key.pem");
    useMkcert = fs.existsSync(certPath) && fs.existsSync(keyPath);
  } catch (error) {
    // If certificate check fails, fall back to basicSsl plugin
    useMkcert = false;
  }

  return {
    plugins: [
      react(),
      // HTTPS (dev): Use mkcert certificates if available (trusted by browser).
      // Avoid self-signed certs in dev because some browsers refuse Service Worker registration
      // with "An unknown error occurred when fetching the script".
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false,
          type: "module",
        },
        injectRegister: false, // Don't inject service worker registration in dev
        manifest: {
          name: "GoldVision - Gold Price Forecasting",
          short_name: "GoldVision",
          description:
            "Real-time gold price tracking, AI-powered forecasting, and comprehensive market analysis",
          theme_color: "#1e40af",
          background_color: "#ffffff",
          display: "standalone",
          display_override: ["standalone"],
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "/icons/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-192x192-maskable.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/offline",
          navigateFallbackDenylist: [/^\/api/, /^\/proxy/],
          // Exclude messaging-channels from service worker caching
          navigateFallbackAllowlist: [/^(?!.*\/user\/messaging-channels).*/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
              },
            },
            {
              urlPattern: /\/api\/news\/image/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
              },
            },
            {
              urlPattern: /\/api\/.*\.json$/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "json-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
              },
            },
            {
              urlPattern: /\/api\/prices/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "prices-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
              },
            },
            {
              urlPattern: /\/api\/forecast/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "forecast-cache",
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 15, // 15 minutes
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: false, // Allow port override via CLI (e.g., --port 3000 in Docker)
      host: "0.0.0.0",
      // Make HMR websocket explicit to avoid browsers/extensions/proxies guessing wrong.
      // This is especially helpful when switching between http/https or when using LAN URLs.
      // When running in Docker with --port 3000, HMR should also use port 3000
      hmr: process.env.VITE_HMR_PORT
        ? {
            protocol: "ws",
            host: "localhost",
            port: parseInt(process.env.VITE_HMR_PORT),
            clientPort: parseInt(process.env.VITE_HMR_PORT),
          }
        : {
            protocol: "ws",
            host: "localhost",
            // Default to 5173 for local dev, but allow override via env
            port: 5173,
            clientPort: 5173,
          },
      // Prefer HTTP for dev unless mkcert is available.
      // - localhost over HTTP is still considered a secure context by browsers for SW/Geolocation.
      // - self-signed HTTPS often breaks Service Worker registration.
      ...(useMkcert
        ? {
            https: {
              cert: fs.readFileSync(certPath),
              key: fs.readFileSync(keyPath),
            },
          }
        : {}),
      proxy: {
        // Use local backend by default; allow override via env
        "/proxy": {
          target: process.env.VITE_BACKEND_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: process.env.VITE_BACKEND_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      target: "esnext",
      minify: "terser",
      sourcemap: mode === "development",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-icons"],
            charts: ["recharts", "chart.js", "react-chartjs-2"],
            query: ["@tanstack/react-query"],
            utils: ["axios", "date-fns", "clsx"],
            forms: ["react-hook-form"],
            animations: ["framer-motion"],
          },
          // Optimize chunk names for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId
                  .split("/")
                  .pop()
                  .replace(".tsx", "")
                  .replace(".ts", "")
              : "chunk";
            return `js/[name]-[hash].js`;
          },
          entryFileNames: "js/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
              return `css/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `images/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
      },
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production",
          pure_funcs:
            mode === "production" ? ["console.log", "console.info"] : [],
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
      },
      chunkSizeWarningLimit: 1000,
      // Enable compression
      reportCompressedSize: true,
      // Optimize CSS
      cssCodeSplit: true,
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
          ...(mode === "production" ? [cssnano] : []),
        ],
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version || "1.0.0"
      ),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
