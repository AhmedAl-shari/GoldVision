import type { RouteInfo } from "./shopTypes";

// OpenRouteService API (free tier available)
// Using OpenStreetMap routing as fallback
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || "";

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo | null> {
  // If we have an API key, use OpenRouteService
  if (ORS_API_KEY) {
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`
      );

      if (response.ok) {
        const data = await response.json();
        const route = data.features[0];
        const distance = route.properties.segments[0].distance / 1000; // Convert to km
        const duration = route.properties.segments[0].duration / 60; // Convert to minutes

        return {
          distance,
          duration,
          geometry: route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          ),
        };
      }
    } catch (error) {
      console.warn("OpenRouteService error:", error);
    }
  }

  // Fallback: Calculate straight-line distance and estimate duration
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  const duration = distance * 2; // Rough estimate: 2 minutes per km

  return {
    distance,
    duration,
  };
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Open directions in external map service
export function openDirections(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  shopName?: string
): void {
  // Try to use device's default map app
  if (navigator.userAgent.includes("Mobile")) {
    // Mobile: Use geo: protocol
    const url = `geo:${to.lat},${to.lng}?q=${encodeURIComponent(
      shopName || "Gold Shop"
    )}`;
    window.location.href = url;
  } else {
    // Desktop: Use OpenStreetMap
    const url = `https://www.openstreetmap.org/directions?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`;
    window.open(url, "_blank");
  }
}
