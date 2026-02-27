import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import {
  MapPin,
  Star,
  Shield,
  Phone,
  Clock,
  Navigation,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  WifiOff,
  MapPin as MapPinIcon,
  Navigation2,
  AlertCircle as AlertCircleIcon,
  Info,
} from "lucide-react";
import { useLocale } from "../contexts/useLocale";
import { getShops, type GoldShop, type ShopFilters } from "../lib/shops";
import * as shopAPI from "../lib/api";
import type {
  YemenRegion,
  ShopService,
  RouteInfo,
  YemenGovernorateId,
} from "../lib/shopTypes";
import {
  YEMEN_GOVERNORATES,
  getGovernorateById,
  getDistrictById,
  getDistrictsByGovernorate,
  getLocationCoordinates,
  type YemenGovernorate,
} from "../lib/yemenLocations";
import {
  cacheShops,
  getCachedShops,
  clearShopCache,
  isOnline,
  debounce,
} from "../lib/shopUtils";
import { getRoute, openDirections } from "../lib/routingUtils";

interface GoldShopsMapProps {
  region?: YemenRegion;
  onShopSelect?: (shop: GoldShop) => void;
}

// Helper to get map center coordinates based on selected governorate/district
const getMapCenter = (
  governorateId: YemenGovernorateId | "",
  districtId?: string
): [number, number] => {
  if (!governorateId) {
    // Default to Sana'a if nothing selected
    return [15.3694, 44.191];
  }
  return getLocationCoordinates(governorateId, districtId);
};

// Legacy helper for region-based views (fallback until all pages use governorates)
const getRegionCenter = (region: YemenRegion): [number, number] => {
  const regionCenters: Record<YemenRegion, [number, number]> = {
    SANAA: [15.3694, 44.191],
    ADEN: [12.7855, 45.0187],
    TAIZ: [13.5779, 44.017],
    HODEIDAH: [14.7978, 42.9545],
  };
  return regionCenters[region] ?? [15.3694, 44.191];
};

const GoldShopsMap: React.FC<GoldShopsMapProps> = ({
  region = "SANAA",
  onShopSelect,
}) => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const [shops, setShops] = useState<GoldShop[]>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState<
    YemenGovernorateId | ""
  >("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [filters, setFilters] = useState<ShopFilters>({
    governorate: undefined,
    district: undefined,
    maxDistance: 999, // Show all shops by default (no distance limit)
    minRating: 0,
    certifiedOnly: false,
  });
  const [selectedShop, setSelectedShop] = useState<GoldShop | null>(null);
  const [expandedShop, setExpandedShop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapComponents, setMapComponents] = useState<{
    L: any;
    MapContainer: any;
    TileLayer: any;
    Marker: any;
    Popup: any;
    Polyline?: any;
    useMap?: any;
  } | null>(null);
  const [mapKey, setMapKey] = useState(() => Date.now());
  const [shouldRenderMap, setShouldRenderMap] = useState(true);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const routeLayerRef = useRef<any>(null);
  const isChangingRegionRef = useRef(false);
  const userInitiatedLocationRef = useRef(false);
  const regionInitializedRef = useRef(false);

  const [isUsingActualLocation, setIsUsingActualLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Global error handler for map initialization errors
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMapError = (event: ErrorEvent) => {
      if (
        event.message?.includes("already initialized") ||
        event.message?.includes("Map container is already initialized")
      ) {
        event.preventDefault();
        console.warn("Map initialization error detected, retrying...");
        setShouldRenderMap(false);
        setMapKey(Date.now());
      }
    };

    window.addEventListener("error", handleMapError);
    return () => {
      window.removeEventListener("error", handleMapError);
    };
  }, []);

  // Load leaflet libraries (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = async () => {
      try {
        // Import leaflet
        const leaflet = await import("leaflet");
        const L = leaflet.default || leaflet;

        if (!L || !L.Icon || !L.Icon.Default) {
          throw new Error("Leaflet library not properly loaded");
        }

        // Fix default marker icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Import react-leaflet
        const reactLeaflet = await import("react-leaflet");

        if (
          !reactLeaflet.MapContainer ||
          !reactLeaflet.TileLayer ||
          !reactLeaflet.Marker ||
          !reactLeaflet.Popup
        ) {
          throw new Error("React-Leaflet components not properly loaded");
        }

        setMapComponents({
          L,
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          Polyline: reactLeaflet.Polyline,
          useMap: reactLeaflet.useMap,
        });
        // Use timestamp to ensure unique key
        setMapKey(Date.now());
        console.log("[Map] Leaflet libraries loaded successfully");
      } catch (error) {
        console.error("[Map] Failed to load Leaflet:", error);
        // Set a flag to show error state
        setMapComponents(null);
      }
    };

    loadLeaflet();
  }, []);

  // Cleanup map instance when component unmounts or mapKey changes
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          // Map might already be removed, ignore error
        }
        mapRef.current = null;
      }
      // Clean up container element
      if (containerRef.current) {
        const container = containerRef.current;
        // Remove any Leaflet-related data
        if ((container as any)._leaflet_id) {
          delete (container as any)._leaflet_id;
        }
        // Clear innerHTML to ensure clean state
        const mapDiv = container.querySelector(".leaflet-container");
        if (mapDiv && (mapDiv as any)._leaflet_id) {
          delete (mapDiv as any)._leaflet_id;
        }
      }
    };
  }, [mapKey]);

  // Reset map rendering on error
  useEffect(() => {
    if (!shouldRenderMap) {
      // Clean up any existing map references
      if (containerRef.current) {
        const container = containerRef.current;
        const mapDiv = container.querySelector(".leaflet-container");
        if (mapDiv) {
          // Remove Leaflet ID to allow re-initialization
          delete (mapDiv as any)._leaflet_id;
          // Also check for any Leaflet instances
          if ((window as any).L && (window as any).L.DomUtil) {
            try {
              const mapInstance = (window as any).L.DomUtil.get(mapDiv);
              if (mapInstance && typeof mapInstance.remove === "function") {
                mapInstance.remove();
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }

      const timer = setTimeout(() => {
        setMapKey(Date.now());
        setShouldRenderMap(true);
      }, 300); // Longer delay to ensure complete cleanup
      return () => clearTimeout(timer);
    }
  }, [shouldRenderMap]);

  // Clear old cache to force fresh API fetch on mount
  useEffect(() => {
    clearShopCache();
  }, []);

  // Initialize with default governorate if region prop is provided (for backward compatibility)
  // Only initialize once on mount, don't override user selection
  useEffect(() => {
    if (region && !selectedGovernorate && !regionInitializedRef.current) {
      // Map legacy region to governorate
      const regionToGovernorate: Record<string, YemenGovernorateId> = {
        SANAA: "SANAA",
        ADEN: "ADEN",
        TAIZ: "TAIZ",
        HODEIDAH: "HODEIDAH",
      };
      const governorate = regionToGovernorate[region];
      if (governorate) {
        setSelectedGovernorate(governorate);
        regionInitializedRef.current = true;
      }
    }
  }, [region, selectedGovernorate]);

  // Update filters when governorate/district changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      governorate: selectedGovernorate || undefined,
      district: selectedDistrict || undefined,
      // Clear legacy region filter when using new system
      region: undefined,
    }));
  }, [selectedGovernorate, selectedDistrict]);

  // Load shops with caching
  useEffect(() => {
    const loadShops = async () => {
      setLoadingShops(true);
      setError(null);

      try {
        // Always try API first if online (prefer fresh data over cache)
        let loadedShops: GoldShop[] = [];

        const regionKey = filters.governorate || filters.region;

        if (isOnline()) {
          try {
            // Try API first to get fresh data
            loadedShops = await getShops({ ...filters, searchQuery });

            // If API returns data, cache it
            if (loadedShops.length > 0) {
              // If API returns more shops than cache, clear old cache and use fresh data
              const cached = getCachedShops(regionKey);
              if (cached && cached.length < loadedShops.length) {
                console.log(
                  `[Shops] API returned ${loadedShops.length} shops, cache had ${cached.length}. Using fresh data.`
                );
                clearShopCache(regionKey);
              }

              // Cache the fresh data with region key
              cacheShops(loadedShops, regionKey);
            }
          } catch (apiError) {
            console.warn("API failed, trying cache:", apiError);
            // If API fails, try region-specific cache
            const cached = getCachedShops(regionKey);
            if (cached && cached.length > 0) {
              // Filter cached shops manually
              loadedShops = cached.filter((shop) => {
                // Apply filters to cached data
                if (
                  filters.governorate &&
                  shop.governorate !== filters.governorate
                )
                  return false;
                if (filters.district && shop.district !== filters.district)
                  return false;
                if (filters.region && shop.region !== filters.region)
                  return false;
                if (filters.minRating && shop.rating < filters.minRating)
                  return false;
                if (filters.certifiedOnly && !shop.certified) return false;
                if (filters.searchQuery) {
                  const query = filters.searchQuery.toLowerCase();
                  if (
                    !shop.name.toLowerCase().includes(query) &&
                    !shop.nameAr?.toLowerCase().includes(query) &&
                    !shop.location.address.toLowerCase().includes(query) &&
                    !shop.location.addressAr?.toLowerCase().includes(query)
                  ) {
                    return false;
                  }
                }
                return true;
              });
            } else {
              loadedShops = []; // No shops available
            }
          }
        } else {
          // Offline: use region-specific cache only
          const cached = getCachedShops(regionKey);
          if (cached && cached.length > 0) {
            // Filter cached shops manually
            loadedShops = cached.filter((shop) => {
              // Apply filters to cached data
              if (
                filters.governorate &&
                shop.governorate !== filters.governorate
              )
                return false;
              if (filters.district && shop.district !== filters.district)
                return false;
              if (filters.region && shop.region !== filters.region)
                return false;
              if (filters.minRating && shop.rating < filters.minRating)
                return false;
              if (filters.certifiedOnly && !shop.certified) return false;
              if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                if (
                  !shop.name.toLowerCase().includes(query) &&
                  !shop.nameAr?.toLowerCase().includes(query) &&
                  !shop.location.address.toLowerCase().includes(query) &&
                  !shop.location.addressAr?.toLowerCase().includes(query)
                ) {
                  return false;
                }
              }
              return true;
            });
          } else {
            loadedShops = []; // No shops available
          }
        }

        setShops(loadedShops);

        // Cache shops if online (with region key)
        if (isOnline() && loadedShops.length > 0) {
          cacheShops(loadedShops, regionKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shops");
        // Try to use cached data if available, otherwise show empty
        const regionKey = filters.governorate || filters.region;
        const cached = getCachedShops(regionKey);
        if (cached && cached.length > 0) {
          setShops(cached);
        } else {
          setShops([]); // No shops available
        }
      } finally {
        setLoadingShops(false);
      }
    };

    loadShops();
  }, [filters, searchQuery]);

  // Handle governorate selection change
  const handleGovernorateChange = (governorateId: string) => {
    setSelectedGovernorate(governorateId as YemenGovernorateId);
    setSelectedDistrict(""); // Reset district when governorate changes
  };

  // Handle district selection change
  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
  };

  // REMOVED: Request user location function - replaced with governorate/district selection
  /* const requestUserLocation = useCallback(async () => {
    if (typeof window === "undefined") {
      // SSR - use region center
      const center = REGION_CENTERS[region] || REGION_CENTERS.SANAA;
      setUserLocation({ lat: center[0], lng: center[1] });
      setIsUsingActualLocation(false);
      setLocationError(null);
      setLoadingLocation(false);
      return;
    }

    // If permission was permanently denied, don't try again unless user explicitly clicks
    if (permissionDenied.current) {
      console.log(
        "[Geolocation] Permission was denied, skipping automatic request"
      );
      return;
    }

    // Prevent multiple simultaneous requests - use a more strict check
    if (
      locationRequestInProgress.current ||
      activeGeolocationCall.current !== null
    ) {
      console.log("[Geolocation] Request already in progress, skipping...", {
        inProgress: locationRequestInProgress.current,
        activeCall: activeGeolocationCall.current,
      });
      return;
    }

    locationRequestInProgress.current = true;
    setLoadingLocation(true);
    setLocationError(null);

    // Reset retry counter if starting fresh (not a retry)
    if (retryAttempt.current === 0) {
      console.log("[Geolocation] Starting location request...");
    }

    // Check permission state first (if available) - for informational purposes only
    // Don't block on "denied" - let geolocation API handle the actual permission request
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        // Listen for permission changes (don't block on "denied" - let geolocation API handle it)
        permissionStatus.onchange = () => {
          if (
            permissionStatus.state === "granted" &&
            !locationRequestInProgress.current
          ) {
            // Permission was granted, try again (but only if not already requesting)
            console.log(
              "[Geolocation] Permission granted, requesting location..."
            );
            permissionDenied.current = false; // Reset permission denied flag
            retryAttempt.current = 0; // Reset retry counter
            requestUserLocation();
          } else if (permissionStatus.state === "denied") {
            // Permission was denied, mark it
            permissionDenied.current = true;
            locationRequestInProgress.current = false;
            setLoadingLocation(false);
          }
        };
      } catch (e) {
        // Permissions API not supported or failed, continue with normal flow
        console.warn("Permissions API not available:", e);
      }
    }

    if (navigator.geolocation) {
      // Double-check permission wasn't denied while we were setting up
      if (permissionDenied.current) {
        console.log(
          "[Geolocation] Permission denied, skipping geolocation call"
        );
        locationRequestInProgress.current = false;
        setLoadingLocation(false);
        return;
      }

      // Safety timeout to ensure loading state is reset even if geolocation hangs
      const safetyTimeout = setTimeout(() => {
        if (locationRequestInProgress.current) {
          console.warn(
            "[Geolocation] Safety timeout - resetting loading state"
          );
          locationRequestInProgress.current = false;
          setLoadingLocation(false);
          setLocationError(
            isArabic
              ? "انتهت مهلة طلب الموقع. يرجى المحاولة مرة أخرى."
              : "Location request timed out. Please try again."
          );
        }
      }, 20000); // 20 seconds safety timeout (longer than geolocation timeout)

      // Store a unique ID for this geolocation call to track it
      const callId = Date.now();
      activeGeolocationCall.current = callId;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Only process if this is still the active call
          if (activeGeolocationCall.current !== callId) {
            console.log("[Geolocation] Ignoring stale success callback");
            return;
          }
          activeGeolocationCall.current = null;

          clearTimeout(safetyTimeout);
          locationRequestInProgress.current = false;
          retryAttempt.current = 0; // Reset retry counter on success
          lastErrorCode.current = null; // Clear error code on success
          lastErrorTime.current = 0; // Clear error timestamp on success
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log("[Geolocation] Success! Location obtained:", newLocation);

          // Ensure we're in "My Location" mode
          setIsUsingActualLocation(true);
          userInitiatedLocationRef.current = true; // Keep flag set to prevent region override
          isChangingRegionRef.current = false; // Clear region change flag

          setUserLocation(newLocation);
          setLocationError(null);
          setLoadingLocation(false);

          // Clear region filter when using actual location so map centers on user
          setFilters((prev) => ({ ...prev, region: undefined }));

          console.log(
            "[Map] Using actual location mode - region changes will be ignored"
          );
        },
        (error) => {
          // Only process if this is still the active call
          if (activeGeolocationCall.current !== callId) {
            console.log("[Geolocation] Ignoring stale error callback");
            return;
          }
          activeGeolocationCall.current = null;

          // Prevent duplicate error handling - check and set atomically
          // For PERMISSION_DENIED, check if we've already handled it
          if (error.code === error.PERMISSION_DENIED) {
            // Mark as denied FIRST to prevent race conditions with other in-flight requests
            const wasAlreadyDenied = permissionDenied.current;
            permissionDenied.current = true;

            // If permission was already marked as denied, this is a duplicate - ignore it
            if (wasAlreadyDenied) {
              console.log(
                "[Geolocation] Duplicate PERMISSION_DENIED error, ignoring..."
              );
              locationRequestInProgress.current = false;
              clearTimeout(safetyTimeout);
              return;
            }
          }

          // If we've already processed this exact error code recently, skip (for any error type)
          // Check this AFTER setting permissionDenied to avoid race conditions
          // Use a more strict check: if same error code AND it was set very recently (< 500ms), it's likely a duplicate
          const now = Date.now();
          if (
            lastErrorCode.current === error.code &&
            now - lastErrorTime.current < 500
          ) {
            console.log(
              `[Geolocation] Duplicate error code ${error.code} (within ${
                now - lastErrorTime.current
              }ms), ignoring...`
            );
            locationRequestInProgress.current = false;
            clearTimeout(safetyTimeout);
            return;
          }

          // Set the error code and timestamp BEFORE logging to prevent race conditions
          lastErrorCode.current = error.code;
          lastErrorTime.current = now;

          clearTimeout(safetyTimeout);
          // Don't reset retryAttempt here if it's a timeout - let the timeout handler manage it
          if (error.code !== error.TIMEOUT) {
            retryAttempt.current = 0;
          }
          locationRequestInProgress.current = false;

          // User denied or error - use region center
          // Only log error once per unique error code to avoid console spam
          // Use console.warn instead of console.error for expected errors on localhost
          const isLocalhost =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

          if (error.code === error.PERMISSION_DENIED) {
            if (isLocalhost) {
              console.warn(
                "[Geolocation] Location blocked on localhost (expected). See instructions in UI or Chrome settings to enable."
              );
            } else {
              console.warn("[Geolocation] Location permission denied:", {
                code: error.code,
                message: error.message,
              });
            }
          } else if (error.code === error.TIMEOUT && isLocalhost) {
            // Timeout on localhost is also expected when geolocation is blocked
            console.warn(
              "[Geolocation] Location timeout on localhost (expected). Chrome blocks geolocation on HTTP localhost. See instructions in UI or Chrome settings to enable."
            );
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            // Position unavailable - GPS might be off or location services unavailable
            // This is a normal fallback scenario, not an error
            console.info(
              "[Geolocation] Location unavailable (GPS may be disabled). Falling back to region-based location."
            );
          } else {
            console.error("[Geolocation] Error getting location:", {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.PERMISSION_DENIED,
              POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
              TIMEOUT: error.TIMEOUT,
            });
          }

          const center = REGION_CENTERS[region] || REGION_CENTERS.SANAA;
          setUserLocation({ lat: center[0], lng: center[1] });
          setIsUsingActualLocation(false);

          // Set appropriate error message with instructions
          let errorMsg = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              // Permission denied is already handled above, just set the error message
              retryAttempt.current = 0; // Reset retry counter

              // Check if we're on localhost and provide specific instructions
              const isLocalhost =
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";

              if (isLocalhost) {
                errorMsg = isArabic
                  ? "تم حظر الموقع تلقائياً على localhost. لحل هذه المشكلة:\n1. افتح إعدادات Chrome\n2. ابحث عن 'Privacy and security' → 'Site settings'\n3. ابحث عن 'localhost:5173'\n4. غيّر 'Location' من 'Block' إلى 'Ask' أو 'Allow'\n\nأو استخدم HTTPS بدلاً من HTTP."
                  : "Location is automatically blocked on localhost. To fix this:\n1. Open Chrome Settings\n2. Go to 'Privacy and security' → 'Site settings'\n3. Search for 'localhost:5173'\n4. Change 'Location' from 'Block' to 'Ask' or 'Allow'\n\nAlternatively, use HTTPS instead of HTTP for localhost.";
              } else {
                errorMsg = isArabic
                  ? "تم رفض إذن الموقع. يرجى تفعيل الموقع في إعدادات المتصفح: اضغط على أيقونة القفل في شريط العنوان → إعدادات الموقع → Location → Allow."
                  : "Location permission denied. Please enable location in browser settings: Click the lock icon in the address bar → Site settings → Location → Allow.";
              }
              break;
            case error.POSITION_UNAVAILABLE:
              // Try retrying with lower accuracy if first attempt failed
              if (retryAttempt.current === 0 && !permissionDenied.current) {
                console.log(
                  "[Geolocation] Position unavailable, retrying with lower accuracy..."
                );
                retryAttempt.current = 1;
                locationRequestInProgress.current = false;
                setLoadingLocation(false);

                // Retry with lower accuracy and longer timeout
                setTimeout(() => {
                  if (permissionDenied.current || !navigator.geolocation) {
                    console.log(
                      "[Geolocation] Skipping retry - permission denied or geolocation unavailable"
                    );
                    retryAttempt.current = 0;
                    return;
                  }
                  requestUserLocation();
                }, 1000);
                return; // Don't set error message yet, wait for retry
              }
              errorMsg = isArabic
                ? "الموقع غير متاح. تأكد من تفعيل GPS أو خدمات الموقع على جهازك."
                : "Location unavailable. Make sure GPS or location services are enabled on your device.";
              break;
            case error.TIMEOUT:
              // If timeout and we haven't retried with lower accuracy, try again
              if (retryAttempt.current === 0 && !permissionDenied.current) {
                console.log(
                  "[Geolocation] Timeout with high accuracy, retrying with lower accuracy..."
                );
                retryAttempt.current = 1;
                locationRequestInProgress.current = false;
                setLoadingLocation(false);

                // Retry with lower accuracy and longer timeout
                setTimeout(() => {
                  // Check again before retrying - permission might have been denied
                  if (permissionDenied.current || !navigator.geolocation) {
                    console.log(
                      "[Geolocation] Skipping retry - permission denied or geolocation unavailable"
                    );
                    retryAttempt.current = 0;
                    return;
                  }

                  // Check if another request is already in progress
                  if (locationRequestInProgress.current) {
                    console.log(
                      "[Geolocation] Another request in progress, skipping retry"
                    );
                    return;
                  }

                  locationRequestInProgress.current = true;
                  setLoadingLocation(true);

                  const retryCallId = Date.now();
                  activeGeolocationCall.current = retryCallId;

                  const retrySafetyTimeout = setTimeout(() => {
                    if (
                      locationRequestInProgress.current &&
                      activeGeolocationCall.current === retryCallId
                    ) {
                      console.warn("[Geolocation] Retry also timed out");
                      activeGeolocationCall.current = null;
                      locationRequestInProgress.current = false;
                      setLoadingLocation(false);
                      retryAttempt.current = 0;
                      setLocationError(
                        isArabic
                          ? "انتهت مهلة طلب الموقع. يرجى المحاولة مرة أخرى."
                          : "Location request timed out. Please try again."
                      );
                    }
                  }, 25000);

                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      // Only process if this is still the active retry call
                      if (activeGeolocationCall.current !== retryCallId) {
                        console.log(
                          "[Geolocation] Ignoring stale retry success callback"
                        );
                        return;
                      }
                      activeGeolocationCall.current = null;

                      clearTimeout(retrySafetyTimeout);
                      locationRequestInProgress.current = false;
                      retryAttempt.current = 0;
                      lastErrorCode.current = null;
                      const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      };
                      console.log(
                        "[Geolocation] Success on retry! Location obtained:",
                        newLocation
                      );
                      setUserLocation(newLocation);
                      setIsUsingActualLocation(true);
                      setLocationError(null);
                      setLoadingLocation(false);
                      setFilters((prev) => ({ ...prev, region: undefined }));
                    },
                    (retryError) => {
                      // Only process if this is still the active retry call
                      if (activeGeolocationCall.current !== retryCallId) {
                        console.log(
                          "[Geolocation] Ignoring stale retry error callback"
                        );
                        return;
                      }
                      activeGeolocationCall.current = null;

                      clearTimeout(retrySafetyTimeout);
                      locationRequestInProgress.current = false;
                      retryAttempt.current = 0;

                      // Handle permission denied in retry
                      if (retryError.code === retryError.PERMISSION_DENIED) {
                        permissionDenied.current = true;
                        lastErrorCode.current = retryError.PERMISSION_DENIED;
                        setLocationError(
                          isArabic
                            ? "تم رفض إذن الموقع. يرجى تفعيل الموقع في إعدادات المتصفح: اضغط على أيقونة القفل في شريط العنوان → إعدادات الموقع → السماح."
                            : "Location permission denied. Please enable location in browser settings: Click the lock icon in the address bar → Site settings → Location → Allow."
                        );
                      } else {
                        lastErrorCode.current = retryError.code;
                        setLocationError(
                          isArabic
                            ? "انتهت مهلة طلب الموقع. يرجى المحاولة مرة أخرى."
                            : "Location request timed out. Please try again."
                        );
                      }

                      const center =
                        REGION_CENTERS[region] || REGION_CENTERS.SANAA;
                      setUserLocation({ lat: center[0], lng: center[1] });
                      setIsUsingActualLocation(false);
                      setLoadingLocation(false);
                    },
                    {
                      enableHighAccuracy: false, // Lower accuracy for retry (uses network location)
                      timeout: 20000, // Longer timeout for retry
                      maximumAge: 300000, // Accept cached location up to 5 minutes old (more lenient)
                    }
                  );
                }, 500);
                return; // Exit early, retry will handle the rest
              }
              errorMsg = isArabic
                ? "انتهت مهلة طلب الموقع. يرجى المحاولة مرة أخرى."
                : "Location request timed out. Please try again.";
              break;
            default:
              errorMsg = isArabic
                ? "فشل في الحصول على الموقع. يرجى التحقق من إعدادات الموقع في المتصفح."
                : "Failed to get location. Please check location settings in your browser.";
          }
          setLocationError(errorMsg);
          setLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds for high accuracy attempt (increased for better reliability)
          maximumAge: 300000, // Accept cached location up to 5 minutes old (more lenient)
        }
      );
    } else {
      locationRequestInProgress.current = false;
      // Fallback to region center
      const center = REGION_CENTERS[region] || REGION_CENTERS.SANAA;
      setUserLocation({ lat: center[0], lng: center[1] });
      setIsUsingActualLocation(false);
      setLocationError(
        isArabic
          ? "الموقع الجغرافي غير مدعوم في هذا المتصفح. يتم استخدام مركز المنطقة المحددة."
          : "Geolocation not supported in this browser. Using selected region center."
      );
      setLoadingLocation(false);
    }
  }, [region, isArabic]); */

  // REMOVED: Region change logic - now handled by governorate/district selection
  /* setFilters((prev) => ({ ...prev, region }));

    // Update userLocation to region center (for map centering)
    const center = getRegionCenter(region);
    console.log(
      "[Map] Region:",
      region,
      "Center coordinates:",
      center,
      "Lat:",
      center[0],
      "Lng:",
      center[1]
    );

    setUserLocation({ lat: center[0], lng: center[1] });
    console.log(
      "[Map] Updated userLocation to region center:",
      center,
      "for region:",
      region
    );

    // Center the map immediately if it's available
    // Use multiple attempts to ensure it works even if map isn't ready immediately
    const centerMap = () => {
      if (mapRef.current) {
        console.log(
          "[Map] Centering map on region:",
          region,
          "Coordinates:",
          center,
          "mapRef exists:",
          !!mapRef.current
        );
        try {
          const [lat, lng] = center;
          console.log(
            "[Map] Setting map view to:",
            lat,
            lng,
            "for region:",
            region
          );

          // Force immediate centering - try multiple methods to ensure it works
          console.log("[Map] Attempting to center map at:", lat, lng);

          // Method 1: setView without animation (most reliable)
          try {
            mapRef.current.setView([lat, lng], 12, {
              animate: false,
            });
            console.log("[Map] Called setView (no animation)");
          } catch (e) {
            console.error("[Map] setView failed:", e);
          }

          // Method 2: panTo as backup
          try {
            mapRef.current.panTo([lat, lng], { animate: false });
            console.log("[Map] Called panTo (no animation)");
          } catch (e) {
            console.error("[Map] panTo failed:", e);
          }

          // Verify the map actually moved after a short delay
          setTimeout(() => {
            if (mapRef.current) {
              const currentCenter = mapRef.current.getCenter();
              const latDiff = Math.abs(currentCenter.lat - lat);
              const lngDiff = Math.abs(currentCenter.lng - lng);
              const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

              console.log(
                "[Map] Verification - Current center:",
                currentCenter.lat.toFixed(6),
                currentCenter.lng.toFixed(6),
                "Target:",
                lat.toFixed(6),
                lng.toFixed(6),
                "Difference:",
                latDiff.toFixed(6),
                lngDiff.toFixed(6),
                "Distance:",
                distance.toFixed(6)
              );

              // If map didn't move enough (more than 0.01 degrees), force it again
              if (distance > 0.01) {
                console.warn(
                  "[Map] Map didn't move enough, forcing again with different methods..."
                );
                // Try setView with different zoom
                mapRef.current.setView([lat, lng], 13, { animate: false });
                // Try flyTo as last resort
                setTimeout(() => {
                  if (mapRef.current) {
                    mapRef.current.flyTo([lat, lng], 12, { duration: 0.5 });
                  }
                }, 50);
              } else {
                console.log("[Map] Map successfully centered!");
              }

              // Then animate for smooth transition (only if already centered)
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.setView([lat, lng], 12, {
                    animate: true,
                    duration: 1.0,
                  });
                  const finalCenter = mapRef.current.getCenter();
                  console.log(
                    "[Map] Final animated center:",
                    finalCenter.lat.toFixed(6),
                    finalCenter.lng.toFixed(6)
                  );
                }
              }, 200);
            }
          }, 150);
          console.log(
            "[Map] Successfully centered on region:",
            region,
            "at",
            lat,
            lng
          );
          isChangingRegionRef.current = false; // Reset flag after successful centering
        } catch (error) {
          console.warn("[Map] Failed to center map on region:", error);
        }
      } else {
        console.log(
          "[Map] Map not ready yet (mapRef.current is null), will retry..."
        );
      }
    };

    // Try immediately, and also after delays in case map isn't ready
    centerMap();
    const timeoutId1 = setTimeout(centerMap, 100);
    const timeoutId2 = setTimeout(centerMap, 300);
    const timeoutId3 = setTimeout(centerMap, 500);
    const timeoutId4 = setTimeout(() => {
      isChangingRegionRef.current = false; // Reset flag even if centering failed
    }, 1000);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
    };
  }, [region]); // Only depend on region

  */

  // Center map on region when map becomes ready (if in region mode)
  useEffect(() => {
    if (
      mapLoaded &&
      mapRef.current &&
      !isUsingActualLocation &&
      !isChangingRegionRef.current &&
      !userInitiatedLocationRef.current
    ) {
      const center = getRegionCenter(region);
      console.log(
        "[Map] Map loaded - ensuring center on region:",
        region,
        "at coordinates:",
        center
      );
      try {
        mapRef.current.setView([center[0], center[1]], 12, {
          animate: true,
          duration: 1.0,
        });
        console.log("[Map] Map centered on region:", region);
      } catch (error) {
        console.warn(
          "[Map] Failed to center on region when map loaded:",
          error
        );
      }
    }
  }, [mapLoaded, region, isUsingActualLocation]);

  // Re-center map when user location changes (if using actual location)
  // But NOT if we're currently changing regions
  useEffect(() => {
    // Skip if we're in the middle of changing regions
    if (isChangingRegionRef.current) {
      console.log(
        "[Map] Skipping 'My Location' centering - region change in progress"
      );
      return;
    }

    if (isUsingActualLocation && userLocation && mapRef.current && mapLoaded) {
      console.log("[Map] Re-centering map to user location:", userLocation);
      try {
        // Use a higher zoom level (15) for better visibility of user location
        mapRef.current.setView([userLocation.lat, userLocation.lng], 15, {
          animate: true,
          duration: 1.5,
        });
        console.log("[Map] Map centered successfully on user location");
      } catch (error) {
        console.warn("[Map] Failed to re-center map:", error);
      }
    }
  }, [userLocation, isUsingActualLocation, mapLoaded]);

  // Custom marker icon
  const createCustomIcon = (shop: GoldShop) => {
    if (!mapComponents?.L) return null;
    return mapComponents.L.divIcon({
      className: "custom-marker",
      html: `
        <div class="relative">
          <div class="w-10 h-10 bg-emerald-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z"/>
            </svg>
          </div>
          ${
            shop.certified
              ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>'
              : ""
          }
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  const handleShopClick = (shop: GoldShop) => {
    setSelectedShop(shop);
    onShopSelect?.(shop);
  };

  const handleGetDirections = useCallback(
    async (shop: GoldShop) => {
      // Use selected governorate/district center as starting point, or shop location if none selected
      const startLocation = selectedGovernorate
        ? (() => {
            const [lat, lng] = getLocationCoordinates(
              selectedGovernorate,
              selectedDistrict
            );
            return { lat, lng };
          })()
        : { lat: shop.location.lat, lng: shop.location.lng };

      setLoadingRoute(true);
      try {
        const route = await getRoute(startLocation, shop.location);
        if (route) {
          setRouteInfo(route);
        }
        openDirections(startLocation, shop.location, shop.name);
      } catch (err) {
        console.error("Failed to get route:", err);
        // Fallback to simple directions
        openDirections(startLocation, shop.location, shop.name);
      } finally {
        setLoadingRoute(false);
      }
    },
    [selectedGovernorate, selectedDistrict]
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setFilters((prev) => ({ ...prev, searchQuery: query }));
      }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Calculate initial map center based on selected governorate/district
  const center = useMemo(() => {
    const mapCenter = getMapCenter(selectedGovernorate, selectedDistrict);
    console.log(
      "[Map] Using map center:",
      selectedGovernorate,
      selectedDistrict,
      mapCenter
    );
    return mapCenter;
  }, [selectedGovernorate, selectedDistrict]);

  // Center map when governorate/district changes (with retries for reliability)
  useEffect(() => {
    if (!selectedGovernorate) return;

    const [lat, lng] = getMapCenter(selectedGovernorate, selectedDistrict);
    const zoom = selectedDistrict ? 13 : 11;
    console.log(
      "[Map] Attempting to center map to:",
      selectedGovernorate,
      selectedDistrict,
      "coordinates:",
      [lat, lng],
      "zoom:",
      zoom
    );

    // Try multiple times with different delays to ensure it works
    const centerMap = (attempt: number = 0) => {
      if (!mapRef.current) {
        // Map not ready yet, retry
        if (attempt < 10) {
          setTimeout(() => centerMap(attempt + 1), 100 * (attempt + 1));
        } else {
          console.warn("[Map] Map ref not available after 10 attempts");
        }
        return;
      }

      try {
        // Always center when governorate/district changes - remove distance check
        mapRef.current.setView([lat, lng], zoom, {
          animate: true,
          duration: 1.5,
        });
        console.log(
          "[Map] Map centered successfully to:",
          selectedGovernorate,
          selectedDistrict || "no district",
          "at",
          [lat, lng],
          "zoom:",
          zoom
        );

        // Verify it worked after a delay
        setTimeout(() => {
          if (mapRef.current) {
            try {
              const newCenter = mapRef.current.getCenter();
              const newDistance = Math.sqrt(
                Math.pow(newCenter.lat - lat, 2) +
                  Math.pow(newCenter.lng - lng, 2)
              );
              if (newDistance > 0.1) {
                console.warn(
                  "[Map] Map may not have centered correctly, retrying without animation..."
                );
                mapRef.current.setView([lat, lng], zoom, {
                  animate: false,
                  duration: 0,
                });
              } else {
                console.log("[Map] Map centered verified successfully");
              }
            } catch (verifyError) {
              console.warn(
                "[Map] Could not verify center, but map was updated"
              );
            }
          }
        }, 2000);
      } catch (error) {
        console.warn("[Map] Failed to center map:", error);
        // Retry if map is still available
        if (attempt < 5 && mapRef.current) {
          setTimeout(() => centerMap(attempt + 1), 200 * (attempt + 1));
        }
      }
    };

    // Try immediately
    centerMap();

    // Also try after delays to ensure it works even if map loads later
    const timeout1 = setTimeout(() => centerMap(1), 100);
    const timeout2 = setTimeout(() => centerMap(2), 500);
    const timeout3 = setTimeout(() => centerMap(3), 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [selectedGovernorate, selectedDistrict]);

  // Render map content function (defined before early return)
  const renderMapContent = () => {
    if (!mapComponents || !mapComponents.L || !mapComponents.MapContainer) {
      return (
        <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/40 shadow-xl">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4 animate-pulse">
              <MapPin className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {isArabic ? "جارٍ تحميل الخريطة..." : "Loading map..."}
            </p>
          </div>
        </div>
      );
    }

    try {
      const { L, MapContainer, TileLayer, Marker, Popup, Polyline, useMap } =
        mapComponents;

      console.log(
        "[Map Render] Map components loaded, shouldRenderMap:",
        shouldRenderMap
      );

      // Component to update map center when governorate/district changes
      const MapCenterUpdater = () => {
        const map = useMap();
        const prevCenterRef = useRef<[number, number] | null>(null);
        const prevZoomRef = useRef<number | null>(null);
        if (!map) return null;

        useEffect(() => {
          const newCenter = center as [number, number];
          const newZoom = selectedDistrict ? 13 : selectedGovernorate ? 11 : 10;

          // Check if center or zoom actually changed
          const centerChanged =
            !prevCenterRef.current ||
            prevCenterRef.current[0] !== newCenter[0] ||
            prevCenterRef.current[1] !== newCenter[1];
          const zoomChanged = prevZoomRef.current !== newZoom;

          if (centerChanged || zoomChanged) {
            console.log(
              "[MapCenterUpdater] Updating map center to:",
              newCenter,
              "zoom:",
              newZoom,
              "governorate:",
              selectedGovernorate
            );
            try {
              map.setView(newCenter, newZoom, {
                animate: true,
                duration: 1.0,
              });
              prevCenterRef.current = newCenter;
              prevZoomRef.current = newZoom;
              console.log("[MapCenterUpdater] Map center updated successfully");
            } catch (error) {
              console.warn(
                "[MapCenterUpdater] Failed to update map center:",
                error
              );
            }
          }
        }, [center, selectedDistrict, selectedGovernorate, map]);

        return null;
      };

      if (!shouldRenderMap) {
        console.log(
          "[Map Render] shouldRenderMap is false, showing reloading state"
        );
        return (
          <div className="h-[600px] rounded-2xl overflow-hidden border-2 border-slate-200/60 dark:border-slate-700/40 shadow-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4 animate-pulse">
                <MapPin className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {isArabic ? "إعادة تحميل الخريطة..." : "Reloading map..."}
              </p>
            </div>
          </div>
        );
      }

      // Render shop markers
      const shopMarkers = Array.isArray(shops)
        ? shops
            .filter((shop) => {
              if (!shop || !shop.location) return false;
              const icon = createCustomIcon(shop);
              return icon !== null;
            })
            .map((shop) => {
              const icon = createCustomIcon(shop);
              return (
                <Marker
                  key={shop.id}
                  position={[shop.location.lat, shop.location.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleShopClick(shop),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-sm mb-1">
                        {isArabic ? shop.nameAr || shop.name : shop.name}
                      </h3>
                      <div className="flex items-center gap-1 text-yellow-500 mb-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs font-semibold">
                          {shop.rating}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({shop.reviewCount})
                        </span>
                      </div>
                      {shop.distance && (
                        <p className="text-xs text-gray-600 mb-2">
                          {shop.distance.toFixed(1)} km
                        </p>
                      )}
                      <button
                        onClick={() => handleGetDirections(shop)}
                        className="w-full mt-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        {isArabic ? "احصل على الاتجاهات" : "Get Directions"}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })
        : null;

      // Render route polyline
      const routePolyline =
        routeInfo &&
        routeInfo.geometry &&
        selectedGovernorate &&
        selectedShop &&
        Polyline ? (
          <Polyline
            positions={[
              getLocationCoordinates(selectedGovernorate, selectedDistrict),
              ...routeInfo.geometry,
              [selectedShop.location.lat, selectedShop.location.lng],
            ]}
            color="#10b981"
            weight={4}
            opacity={0.7}
          />
        ) : null;

      console.log(
        "[Map Render] Rendering MapContainer with center:",
        center,
        "zoom:",
        selectedDistrict ? 13 : selectedGovernorate ? 11 : 10
      );

      return (
        <div
          ref={containerRef}
          key={`map-wrapper-${mapKey}`}
          id={`map-wrapper-${mapKey}`}
          className="h-[600px] rounded-2xl overflow-hidden border-2 border-slate-200/60 dark:border-slate-700/40 shadow-xl hover:shadow-2xl transition-shadow duration-300"
        >
          <MapContainer
            key={`map-container-${mapKey}`}
            center={center as [number, number]}
            zoom={selectedDistrict ? 13 : selectedGovernorate ? 11 : 10}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
            id={`leaflet-map-${mapKey}`}
            whenCreated={(mapInstance: any) => {
              // Clean up any existing map instance in ref (only if different)
              if (mapRef.current && mapRef.current !== mapInstance) {
                try {
                  console.log(
                    "[Map] Cleaning up existing map instance from ref"
                  );
                  mapRef.current.remove();
                } catch (error) {
                  console.warn(
                    "[Map] Error cleaning up existing map ref:",
                    error
                  );
                }
              }

              // Set the new map instance
              mapRef.current = mapInstance;
              setMapLoaded(true);
              console.log("[Map] Map instance created and ready");

              // Center on selected governorate/district
              setTimeout(() => {
                if (mapRef.current && selectedGovernorate) {
                  const [lat, lng] = getMapCenter(
                    selectedGovernorate,
                    selectedDistrict
                  );
                  console.log(
                    "[Map] Map ready - centering on:",
                    selectedGovernorate,
                    selectedDistrict,
                    "at coordinates:",
                    [lat, lng]
                  );
                  try {
                    mapRef.current.setView(
                      [lat, lng],
                      selectedDistrict ? 13 : 11,
                      {
                        animate: true,
                        duration: 1.0,
                      }
                    );
                    console.log(
                      "[Map] Map centered on:",
                      selectedGovernorate,
                      selectedDistrict
                    );
                  } catch (error) {
                    console.warn(
                      "[Map] Failed to center map when ready:",
                      error
                    );
                  }
                }
              }, 100);
            }}
            eventHandlers={{
              error: (e: any) => {
                console.error("Map error:", e);
                setShouldRenderMap(false);
              },
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterUpdater />
            <Fragment>
              {routePolyline}
              {shopMarkers}
            </Fragment>
          </MapContainer>
        </div>
      );
    } catch (error: any) {
      console.error("Error rendering map:", error);

      // If it's the "already initialized" error, trigger a retry
      if (
        error?.message?.includes("already initialized") ||
        error?.message?.includes("Map container is already initialized")
      ) {
        // Reset and retry
        setTimeout(() => {
          setShouldRenderMap(false);
          setMapKey(Date.now());
        }, 100);
        return (
          <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-yellow-200/60 dark:border-yellow-800/40 shadow-xl">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4 animate-pulse">
                <MapPin className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 font-semibold text-lg">
                {isArabic ? "إعادة تهيئة الخريطة..." : "Reinitializing map..."}
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-red-200/60 dark:border-red-800/40 shadow-xl">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <MapPin className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">
              {isArabic ? "خطأ في تحميل الخريطة" : "Error loading map"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isArabic ? "يرجى تحديث الصفحة" : "Please refresh the page"}
            </p>
          </div>
        </div>
      );
    }
  };

  // Show loading state if map components aren't loaded
  if (typeof window === "undefined" || !mapComponents) {
    return (
      <div className="space-y-4">
        {/* Filters - Show even while loading */}
        <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <select
            value={filters.maxDistance || 999}
            onChange={(e) =>
              setFilters({ ...filters, maxDistance: Number(e.target.value) })
            }
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={999}>{isArabic ? "الكل" : "All"}</option>
          </select>

          <select
            value={filters.minRating || 0}
            onChange={(e) =>
              setFilters({ ...filters, minRating: Number(e.target.value) })
            }
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={0}>
              {isArabic ? "جميع التقييمات" : "All Ratings"}
            </option>
            <option value={3}>3+ ⭐</option>
            <option value={4}>4+ ⭐</option>
            <option value={4.5}>4.5+ ⭐</option>
          </select>
        </div>

        {/* Map and List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Loading Map */}
          <div className="lg:col-span-2 h-[600px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 dark:text-gray-400">
                {isArabic ? "جارٍ تحميل الخريطة..." : "Loading map..."}
              </p>
            </div>
          </div>

          {/* Shop List - Show even while loading */}
          <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 z-10">
              <h3 className="font-bold text-lg">
                {isArabic ? "المحلات القريبة" : "Nearby Shops"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {shops.length}{" "}
                {isArabic
                  ? "محل وجد"
                  : shops.length === 1
                  ? "shop found"
                  : "shops found"}
              </p>
            </div>
            {shops.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {isArabic
                  ? "لا توجد محلات في هذا النطاق"
                  : "No shops found in this range"}
              </div>
            )}
            {shops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => handleShopClick(shop)}
                className={
                  selectedShop?.id === shop.id
                    ? "p-4 rounded-xl border-2 cursor-pointer transition-all border-emerald-500 bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-20"
                    : "p-4 rounded-xl border-2 cursor-pointer transition-all border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-sm flex-1">
                    {isArabic ? shop.nameAr || shop.name : shop.name}
                  </h4>
                  {shop.certified && (
                    <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                  <span className="text-xs font-semibold">{shop.rating}</span>
                  <span className="text-xs text-gray-500">
                    ({shop.reviewCount})
                  </span>
                </div>
                {shop.distance && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{shop.distance.toFixed(1)} km</span>
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic
                    ? shop.cityNameAr || shop.cityName || shop.region
                    : shop.cityName || shop.region}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {isArabic
                    ? shop.location.addressAr || shop.location.address
                    : shop.location.address}
                </p>
                {shop.phone && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <Phone className="h-3 w-3" />
                    <span>{shop.phone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const serviceOptions: {
    value: ShopService;
    label: string;
    labelAr: string;
  }[] = [
    { value: "buy_gold", label: "Buy Gold", labelAr: "شراء ذهب" },
    { value: "sell_gold", label: "Sell Gold", labelAr: "بيع ذهب" },
    { value: "jewelry_repair", label: "Repair", labelAr: "إصلاح" },
    { value: "custom_design", label: "Custom Design", labelAr: "تصميم مخصص" },
    { value: "appraisal", label: "Appraisal", labelAr: "تقييم" },
    { value: "gold_exchange", label: "Exchange", labelAr: "صرف" },
    { value: "certification", label: "Certification", labelAr: "اعتماد" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={
                isArabic ? "ابحث عن محل أو منطقة..." : "Search shop or area..."
              }
              className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-sm font-medium shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilters((prev) => ({ ...prev, searchQuery: undefined }));
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Governorate and District Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Governorate Selector */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
            <select
              value={selectedGovernorate}
              onChange={(e) => handleGovernorateChange(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-sm font-semibold shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 cursor-pointer appearance-none"
            >
              <option value="">
                {isArabic ? "اختر المحافظة" : "Select Governorate"}
              </option>
              {YEMEN_GOVERNORATES.map((gov) => (
                <option key={gov.id} value={gov.id}>
                  {isArabic ? gov.nameAr : gov.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* District Selector */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedGovernorate}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-sm font-semibold shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {isArabic ? "اختر المنطقة" : "Select District"}
              </option>
              {selectedGovernorate &&
                getDistrictsByGovernorate(
                  selectedGovernorate,
                  isArabic ? "ar" : "en"
                ).map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected Location Indicator */}
        {selectedGovernorate && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200/60 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/90 via-green-50/70 to-emerald-50/90 dark:from-emerald-900/20 dark:via-green-900/15 dark:to-emerald-900/20 p-4 shadow-lg backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5"></div>
            <div className="relative flex items-center gap-3">
              <div className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {isArabic ? "✓ الموقع الحالي" : "✓ Current Location"}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {(() => {
                    const gov = getGovernorateById(selectedGovernorate);
                    const dist = selectedDistrict
                      ? getDistrictById(selectedGovernorate, selectedDistrict)
                      : null;
                    if (dist) {
                      return isArabic
                        ? `${dist.nameAr}, ${gov?.nameAr}`
                        : `${dist.name}, ${gov?.name}`;
                    }
                    return isArabic ? gov?.nameAr : gov?.name;
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/95 dark:bg-slate-900/40 p-5 shadow-lg backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-teal-500/3"></div>
          <div className="relative flex flex-wrap gap-3">
            <select
              value={filters.maxDistance || 999}
              onChange={(e) =>
                setFilters({ ...filters, maxDistance: Number(e.target.value) })
              }
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-sm font-semibold shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 cursor-pointer"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={999}>{isArabic ? "الكل" : "All"}</option>
            </select>

            <select
              value={filters.minRating || 0}
              onChange={(e) =>
                setFilters({ ...filters, minRating: Number(e.target.value) })
              }
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-sm font-semibold shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 cursor-pointer"
            >
              <option value={0}>
                {isArabic ? "جميع التقييمات" : "All Ratings"}
              </option>
              <option value={3}>3+ ⭐</option>
              <option value={4}>4+ ⭐</option>
              <option value={4.5}>4.5+ ⭐</option>
            </select>
          </div>
        </div>

        {/* REMOVED: Location status indicators - replaced with governorate/district selection */}

        {/* Offline Indicator */}
        {!isOnline() && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              {isArabic
                ? "وضع عدم الاتصال - عرض البيانات المخزنة مؤقتاً"
                : "Offline - Showing cached data"}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {error}
            </span>
          </div>
        )}
      </div>

      {/* Map and List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">{renderMapContent()}</div>

        {/* Shop List */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/30 scrollbar-track-transparent">
          <div className="sticky top-0 bg-gradient-to-b from-white/95 via-white/95 to-transparent dark:from-slate-900/95 dark:via-slate-900/95 backdrop-blur-md p-4 border-b-2 border-emerald-200/50 dark:border-emerald-800/50 z-10">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                {isArabic ? "المحلات القريبة" : "Nearby Shops"}
              </h3>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-7">
              {shops.length}{" "}
              {isArabic
                ? "محل وجد"
                : shops.length === 1
                ? "shop found"
                : "shops found"}
            </p>
          </div>
          {loadingShops ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            shops.map((shop) => {
              const isExpanded = expandedShop === shop.id;

              return (
                <div
                  key={shop.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                    selectedShop?.id === shop.id
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 dark:from-emerald-900/30 dark:to-teal-900/20 shadow-xl shadow-emerald-500/20 scale-[1.02]"
                      : "border-slate-200/60 dark:border-slate-700/40 bg-white/95 dark:bg-slate-900/40 hover:border-emerald-400/60 dark:hover:border-emerald-600/40 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                  }`}
                >
                  {/* Gradient overlay on hover */}
                  {selectedShop?.id !== shop.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}

                  <div
                    onClick={() => handleShopClick(shop)}
                    className="relative p-5 cursor-pointer"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-gray-900 dark:text-white mb-1.5 leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {isArabic ? shop.nameAr || shop.name : shop.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {shop.rating}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({shop.reviewCount})
                            </span>
                          </div>
                          {shop.distance && (
                            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                              <MapPin className="h-3 w-3" />
                              <span>{shop.distance.toFixed(1)} km</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {shop.certified && (
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* City Name */}
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isArabic
                        ? shop.cityNameAr || shop.cityName || shop.region
                        : shop.cityName || shop.region}
                    </p>
                    {/* Address */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                      {isArabic
                        ? shop.location.addressAr || shop.location.address
                        : shop.location.address}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                      {isArabic
                        ? shop.location.addressAr || shop.location.address
                        : shop.location.address}
                    </p>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      {shop.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium">{shop.phone}</span>
                        </div>
                      )}
                      {shop.priceRange && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {isArabic ? "السعر:" : "Price:"}
                          </span>
                          <span>
                            {shop.priceRange.min.toLocaleString()} -{" "}
                            {shop.priceRange.max.toLocaleString()}{" "}
                            {shop.priceRange.currency}/gram
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetDirections(shop);
                        }}
                        disabled={loadingRoute}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {loadingRoute ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        {isArabic ? "الاتجاهات" : "Directions"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedShop(isExpanded ? null : shop.id);
                        }}
                        className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex items-center gap-1.5"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            {isArabic ? "إخفاء" : "Less"}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            {isArabic ? "المزيد" : "More"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t-2 border-emerald-200/50 dark:border-emerald-800/50 pt-5 space-y-4 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/30">
                      {/* Full Address */}
                      <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {isArabic ? "العنوان الكامل:" : "Full Address:"}
                          </p>
                          <p>
                            {isArabic
                              ? shop.location.addressAr || shop.location.address
                              : shop.location.address}
                          </p>
                          {shop.cityName && (
                            <p className="mt-1 text-gray-500 dark:text-gray-500">
                              {isArabic
                                ? shop.cityNameAr || shop.cityName
                                : shop.cityName}
                              {shop.district && `, ${shop.district}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      {(shop.phone || shop.email || shop.website) && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {isArabic
                              ? "معلومات الاتصال:"
                              : "Contact Information:"}
                          </p>
                          {shop.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <a
                                href={`tel:${shop.phone}`}
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                              >
                                {shop.phone}
                              </a>
                            </div>
                          )}
                          {shop.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <a
                                href={`mailto:${shop.email}`}
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                              >
                                {shop.email}
                              </a>
                            </div>
                          )}
                          {shop.website && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <a
                                href={shop.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                              >
                                {shop.website}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {shop.description && (
                        <div>
                          <p className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {isArabic ? "الوصف:" : "Description:"}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {isArabic
                              ? shop.descriptionAr || shop.description
                              : shop.description}
                          </p>
                        </div>
                      )}

                      {/* Opening Hours */}
                      {shop.openingHours && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">
                              {isArabic ? "ساعات العمل:" : "Opening Hours:"}
                            </p>
                            <p>
                              {isArabic
                                ? shop.openingHoursAr || shop.openingHours
                                : shop.openingHours}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Services */}
                      {shop.services && shop.services.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            {isArabic ? "الخدمات:" : "Services:"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {shop.services.map((service) => {
                              const serviceOpt = serviceOptions.find(
                                (s) => s.value === service
                              );
                              return serviceOpt ? (
                                <span
                                  key={service}
                                  className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded"
                                >
                                  {isArabic
                                    ? serviceOpt.labelAr
                                    : serviceOpt.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Photos */}
                      {shop.photos && shop.photos.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {isArabic ? "الصور:" : "Photos:"}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {shop.photos.slice(0, 2).map((photo) => {
                              // Get image URL - try thumbnail first, then full URL
                              let imageUrl: string | null =
                                photo.thumbnail || photo.url || null;

                              // Debug: Log original photo data in development
                              if (process.env.NODE_ENV === "development") {
                                if (
                                  !imageUrl ||
                                  imageUrl === "null" ||
                                  imageUrl === "undefined"
                                ) {
                                  console.warn(
                                    `[GoldShopsMap] Invalid photo URL for shop ${shop.id}:`,
                                    {
                                      photoId: photo.id,
                                      thumbnail: photo.thumbnail,
                                      url: photo.url,
                                      caption: photo.caption,
                                    }
                                  );
                                }
                              }

                              // Process and validate URL
                              if (imageUrl && typeof imageUrl === "string") {
                                const trimmedUrl = imageUrl.trim();

                                // Skip if it's clearly invalid
                                if (
                                  trimmedUrl === "" ||
                                  trimmedUrl === "null" ||
                                  trimmedUrl === "undefined" ||
                                  trimmedUrl.toLowerCase() === "null" ||
                                  trimmedUrl.toLowerCase() === "undefined"
                                ) {
                                  imageUrl = null;
                                } else {
                                  // Handle different URL formats
                                  if (
                                    trimmedUrl.startsWith("http://") ||
                                    trimmedUrl.startsWith("https://")
                                  ) {
                                    // Already absolute URL
                                    imageUrl = trimmedUrl;
                                  } else if (trimmedUrl.startsWith("//")) {
                                    // Protocol-relative URL - add https
                                    imageUrl = `https:${trimmedUrl}`;
                                  } else if (trimmedUrl.startsWith("/")) {
                                    // Relative path - make it absolute
                                    imageUrl = `${window.location.origin}${trimmedUrl}`;
                                  } else if (trimmedUrl.startsWith("data:")) {
                                    // Data URI
                                    imageUrl = trimmedUrl;
                                  } else {
                                    // Try as relative path
                                    imageUrl = `${window.location.origin}/${trimmedUrl}`;
                                  }
                                }
                              } else {
                                imageUrl = null;
                              }

                              // Final validation
                              const isValidUrl =
                                imageUrl !== null &&
                                typeof imageUrl === "string" &&
                                imageUrl.length > 0 &&
                                (imageUrl.startsWith("http://") ||
                                  imageUrl.startsWith("https://") ||
                                  imageUrl.startsWith("/") ||
                                  imageUrl.startsWith("data:"));

                              return (
                                <div
                                  key={photo.id}
                                  className="relative w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden"
                                >
                                  {isValidUrl && imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={photo.caption || shop.name}
                                      className="w-full h-24 object-cover rounded-lg"
                                      loading="lazy"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        // Debug: Log failed image loads in development
                                        if (
                                          process.env.NODE_ENV === "development"
                                        ) {
                                          console.warn(
                                            `[GoldShopsMap] Failed to load image for shop ${shop.id}:`,
                                            imageUrl
                                          );
                                        }
                                        target.style.display = "none";
                                        // Show placeholder
                                        const placeholder =
                                          target.nextElementSibling as HTMLElement;
                                        if (placeholder) {
                                          placeholder.style.display = "flex";
                                        }
                                      }}
                                      onLoad={(e) => {
                                        // Hide placeholder when image loads successfully
                                        const placeholder = (
                                          e.target as HTMLImageElement
                                        ).nextElementSibling as HTMLElement;
                                        if (placeholder) {
                                          placeholder.style.display = "none";
                                        }
                                      }}
                                    />
                                  ) : null}
                                  {/* Placeholder for failed/empty images */}
                                  <div
                                    className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center rounded-lg"
                                    style={{
                                      display: isValidUrl ? "none" : "flex",
                                    }}
                                  >
                                    <ImageIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reviews */}
                      {shop.reviews && shop.reviews.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            {isArabic ? "آراء العملاء:" : "Customer Reviews:"}
                          </p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {shop.reviews.slice(0, 2).map((review) => (
                              <div
                                key={review.id}
                                className="text-xs border-l-2 border-emerald-500 pl-2"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">
                                    {review.userName}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < review.rating
                                            ? "text-yellow-500 fill-current"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">
                                  {review.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {shops.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <MapPin className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {isArabic
                  ? "لا توجد محلات في هذا النطاق"
                  : "No shops found in this range"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isArabic
                  ? "جرب تغيير الفلاتر أو البحث في منطقة أخرى"
                  : "Try adjusting filters or search in another area"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Shop Details */}
      {selectedShop && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 dark:border-emerald-600/50 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-slate-900 dark:via-emerald-900/20 dark:to-teal-900/10 p-6 shadow-2xl shadow-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isArabic
                      ? selectedShop.nameAr || selectedShop.name
                      : selectedShop.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-xl">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedShop.rating}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({selectedShop.reviewCount}{" "}
                      {isArabic ? "تقييم" : "reviews"})
                    </span>
                  </div>
                  {selectedShop.certified && (
                    <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-xl border border-blue-200 dark:border-blue-800">
                      {isArabic ? "معتمد" : "Certified"}
                    </span>
                  )}
                  {selectedShop.trustScore && (
                    <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-xl border border-emerald-200 dark:border-emerald-800">
                      {isArabic ? "ثقة" : "Trust"}: {selectedShop.trustScore}%
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedShop(null);
                  setRouteInfo(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-3xl leading-none ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
              >
                ×
              </button>
            </div>

            {selectedShop.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {isArabic
                  ? selectedShop.descriptionAr || selectedShop.description
                  : selectedShop.description}
              </p>
            )}

            {selectedShop.photos && selectedShop.photos.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-2">
                  {selectedShop.photos.slice(0, 3).map((photo) => {
                    // Get image URL - try thumbnail first, then full URL
                    let imageUrl: string | null =
                      photo.thumbnail || photo.url || null;

                    // Process and validate URL
                    if (imageUrl && typeof imageUrl === "string") {
                      const trimmedUrl = imageUrl.trim();

                      // Skip if it's clearly invalid
                      if (
                        trimmedUrl === "" ||
                        trimmedUrl === "null" ||
                        trimmedUrl === "undefined" ||
                        trimmedUrl.toLowerCase() === "null" ||
                        trimmedUrl.toLowerCase() === "undefined"
                      ) {
                        imageUrl = null;
                      } else {
                        // Handle different URL formats
                        if (
                          trimmedUrl.startsWith("http://") ||
                          trimmedUrl.startsWith("https://")
                        ) {
                          // Already absolute URL
                          imageUrl = trimmedUrl;
                        } else if (trimmedUrl.startsWith("//")) {
                          // Protocol-relative URL - add https
                          imageUrl = `https:${trimmedUrl}`;
                        } else if (trimmedUrl.startsWith("/")) {
                          // Relative path - make it absolute
                          imageUrl = `${window.location.origin}${trimmedUrl}`;
                        } else if (trimmedUrl.startsWith("data:")) {
                          // Data URI
                          imageUrl = trimmedUrl;
                        } else {
                          // Try as relative path
                          imageUrl = `${window.location.origin}/${trimmedUrl}`;
                        }
                      }
                    } else {
                      imageUrl = null;
                    }

                    // Final validation
                    const isValidUrl =
                      imageUrl !== null &&
                      typeof imageUrl === "string" &&
                      imageUrl.length > 0 &&
                      (imageUrl.startsWith("http://") ||
                        imageUrl.startsWith("https://") ||
                        imageUrl.startsWith("/") ||
                        imageUrl.startsWith("data:"));

                    return (
                      <div
                        key={photo.id}
                        className="relative w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden"
                      >
                        {isValidUrl && imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={photo.caption || selectedShop.name}
                            className="w-full h-32 object-cover rounded-lg"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // Debug: Log failed image loads in development
                              if (process.env.NODE_ENV === "development") {
                                console.warn(
                                  `[GoldShopsMap] Failed to load image for selected shop ${selectedShop.id}:`,
                                  imageUrl
                                );
                              }
                              target.style.display = "none";
                              // Show placeholder
                              const placeholder =
                                target.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = "flex";
                              }
                            }}
                            onLoad={(e) => {
                              // Hide placeholder when image loads successfully
                              const placeholder = (e.target as HTMLImageElement)
                                .nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = "none";
                              }
                            }}
                          />
                        ) : null}
                        {/* Placeholder for failed/empty images */}
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center rounded-lg"
                          style={{ display: isValidUrl ? "none" : "flex" }}
                        >
                          <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold mb-1">
                  {isArabic ? "العنوان" : "Address"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic
                    ? selectedShop.location.addressAr ||
                      selectedShop.location.address
                    : selectedShop.location.address}
                </p>
              </div>
              {selectedShop.phone && (
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {isArabic ? "الهاتف" : "Phone"}
                  </p>
                  <a
                    href={`tel:${selectedShop.phone}`}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    {selectedShop.phone}
                  </a>
                </div>
              )}
              {selectedShop.openingHours && (
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {isArabic ? "ساعات العمل" : "Opening Hours"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isArabic
                      ? selectedShop.openingHoursAr || selectedShop.openingHours
                      : selectedShop.openingHours}
                  </p>
                </div>
              )}
              {selectedShop.distance && (
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {isArabic ? "المسافة" : "Distance"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedShop.distance.toFixed(1)} km
                    {routeInfo && (
                      <span className="ml-2 text-xs">
                        ({Math.round(routeInfo.duration)}{" "}
                        {isArabic ? "دقيقة" : "min"})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {selectedShop.priceRange && (
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {isArabic ? "نطاق السعر" : "Price Range"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedShop.priceRange.min.toLocaleString()} -{" "}
                    {selectedShop.priceRange.max.toLocaleString()}{" "}
                    {selectedShop.priceRange.currency}/gram
                  </p>
                </div>
              )}
              {selectedShop.email && (
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {isArabic ? "البريد الإلكتروني" : "Email"}
                  </p>
                  <a
                    href={`mailto:${selectedShop.email}`}
                    className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    {selectedShop.email}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {selectedShop.services && selectedShop.services.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">
                  {isArabic ? "الخدمات المتاحة:" : "Available Services:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedShop.services.map((service) => {
                    const serviceOpt = serviceOptions.find(
                      (s) => s.value === service
                    );
                    return serviceOpt ? (
                      <span
                        key={service}
                        className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm rounded"
                      >
                        {isArabic ? serviceOpt.labelAr : serviceOpt.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedShop.reviews && selectedShop.reviews.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-3">
                  {isArabic ? "آراء العملاء:" : "Customer Reviews:"}
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedShop.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-l-2 border-emerald-500 pl-3 py-2"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {review.userName}
                        </span>
                        {review.verified && (
                          <Shield className="h-3 w-3 text-blue-500" />
                        )}
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating
                                  ? "text-yellow-500 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {review.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleGetDirections(selectedShop)}
              disabled={loadingRoute || !userLocation}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 text-base"
            >
              {loadingRoute ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isArabic
                    ? "جاري الحصول على الاتجاهات..."
                    : "Getting directions..."}
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  {isArabic ? "احصل على الاتجاهات" : "Get Directions"}
                  {routeInfo && (
                    <span className="text-xs ml-2">
                      ({routeInfo.distance.toFixed(1)} km,{" "}
                      {Math.round(routeInfo.duration)}{" "}
                      {isArabic ? "دقيقة" : "min"})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldShopsMap;
