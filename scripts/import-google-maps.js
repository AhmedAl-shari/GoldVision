#!/usr/bin/env node

/**
 * Import shops from Google Maps scraped CSV
 * Handles all columns: hfpxzc href, IqBF1Pd, MW4etd, UY7F9, W4Efsd, W4Efsd 2, W4Efsd 3, etc.
 * Usage: node scripts/import-google-maps.js
 */

const { PrismaClient, YemenRegion, ShopService } = require("@prisma/client");
const fs = require("fs");
const https = require("https");

const prisma = new PrismaClient();
const CSV_PATH = "/Users/ahmedalshari/Desktop/Jewelry stores.csv";

// Extract lat/lng from Google Maps URL (Column A: hfpxzc href)
function extractLatLngFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Pattern 1: !3dLAT!4dLNG (Google Maps data format)
  const match1 = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (match1) {
    return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  }

  // Pattern 2: @lat,lng in URL
  const match2 = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match2) {
    return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  }

  // Pattern 3: /place/.../@lat,lng
  const match3 = url.match(/place\/[^@]+@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match3) {
    return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
  }

  return null;
}

// Convert Plus Code to lat/lng (Column F: W4Efsd 2)
async function plusCodeToLatLng(plusCode) {
  if (!plusCode || !/^[A-Z0-9]{8,}\+[A-Z0-9]{2,}$/i.test(plusCode)) return null;

  try {
    // Use OpenLocationCode API or geocoding as fallback
    // For now, we'll use geocoding as fallback
    return null;
  } catch (e) {
    return null;
  }
}

// Geocode address using OpenStreetMap Nominatim (FREE)
async function geocodeAddress(address) {
  if (!address || address.trim() === "") return null;

  try {
    const query = `${address}, Yemen`.replace(/"/g, "");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1&countrycodes=ye`;

    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: { "User-Agent": "GoldVision-ShopImporter/1.0" },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                const results = JSON.parse(data);
                if (results && results.length > 0) {
                  resolve({
                    lat: parseFloat(results[0].lat),
                    lng: parseFloat(results[0].lon),
                  });
                } else {
                  resolve(null);
                }
              } catch (e) {
                resolve(null);
              }
            });
          }
        )
        .on("error", () => resolve(null));
    });
  } catch (error) {
    return null;
  }
}

// Extract shop name from Column B (qBF1Pd) - Arabic shop name
function extractShopName(columnB) {
  if (!columnB) return "Unnamed Shop";

  // Clean up the name
  let name = columnB.toString().trim();

  // Remove URL encoding artifacts
  name = name.replace(/%[0-9A-Fa-f]{2}/g, "").trim();

  return name || "Unnamed Shop";
}

// Get region from coordinates (improved bounds)
function getRegionFromCoordinates(lat, lng) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  // SANAA: ~15.3, 44.2 (expanded bounds for better coverage)
  if (lat >= 14.8 && lat <= 15.8 && lng >= 43.8 && lng <= 44.5) {
    return YemenRegion.SANAA;
  }
  // ADEN: ~12.8, 45.0 (expanded bounds)
  if (lat >= 12.3 && lat <= 13.2 && lng >= 44.7 && lng <= 45.3) {
    return YemenRegion.ADEN;
  }
  // TAIZ: ~13.6, 44.0 (expanded bounds)
  if (lat >= 13.2 && lat <= 14.0 && lng >= 43.7 && lng <= 44.4) {
    return YemenRegion.TAIZ;
  }
  // HODEIDAH: ~14.8, 42.9 (expanded bounds)
  if (lat >= 14.3 && lat <= 15.2 && lng >= 42.5 && lng <= 43.3) {
    return YemenRegion.HODEIDAH;
  }

  return null;
}

// Improved region detection - prioritizes coordinates over text
function detectRegion(lat, lng, address, shopName) {
  // First, try coordinates (most accurate)
  const regionFromCoords = getRegionFromCoordinates(lat, lng);
  if (regionFromCoords) {
    return regionFromCoords;
  }

  // Fallback to text detection
  const text = `${address || ""} ${shopName || ""}`.toLowerCase();
  if (text.includes("عدن") || text.includes("aden")) return YemenRegion.ADEN;
  if (text.includes("تعز") || text.includes("taiz") || text.includes("taizz"))
    return YemenRegion.TAIZ;
  if (
    text.includes("الحديدة") ||
    text.includes("hodeidah") ||
    text.includes("hudaydah")
  )
    return YemenRegion.HODEIDAH;
  if (text.includes("صنعاء") || text.includes("sanaa") || text.includes("sana"))
    return YemenRegion.SANAA;

  return YemenRegion.SANAA; // Default
}

// Map shop type to services (from Column C or D)
function mapShopTypeToServices(shopType) {
  if (!shopType) return [ShopService.buy_gold, ShopService.sell_gold];

  const lower = shopType.toLowerCase();
  const services = [];

  if (
    lower.includes("jewelry") ||
    lower.includes("gold") ||
    lower.includes("مجوهرات")
  ) {
    services.push(ShopService.buy_gold);
    services.push(ShopService.sell_gold);
  }
  if (
    lower.includes("goldsmith") ||
    lower.includes("صاغة") ||
    lower.includes("صياغة")
  ) {
    services.push(ShopService.jewelry_repair);
    services.push(ShopService.custom_design);
  }
  if (lower.includes("designer") || lower.includes("مصمم")) {
    services.push(ShopService.custom_design);
  }
  if (lower.includes("appraisal") || lower.includes("تقييم")) {
    services.push(ShopService.appraisal);
  }
  if (lower.includes("exchange") || lower.includes("صرف")) {
    services.push(ShopService.gold_exchange);
  }

  return services.length > 0
    ? services
    : [ShopService.buy_gold, ShopService.sell_gold];
}

// Parse CSV with proper handling
function parseCSV(content) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse headers
  const headers = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < lines[0].length; i++) {
    const char = lines[0][i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      headers.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  headers.push(current.trim());

  // Parse rows
  const shops = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = [];
    current = "";
    inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const shop = {};
    headers.forEach((header, index) => {
      shop[header] = values[index] || "";
    });
    shops.push(shop);
  }

  return shops;
}

// Transform Google Maps CSV data
async function transformShopData(shop) {
  // Column A: hfpxzc href - Google Maps URL
  const googleMapsUrl = shop["hfpxzc href"] || "";
  let lat = null,
    lng = null;
  const coordsFromUrl = extractLatLngFromUrl(googleMapsUrl);
  if (coordsFromUrl) {
    lat = coordsFromUrl.lat;
    lng = coordsFromUrl.lng;
    console.log(`   ✅ Found coordinates from URL: ${lat}, ${lng}`);
  }

  // Column B: qBF1Pd - Shop name (Arabic)
  const shopName = extractShopName(shop["qBF1Pd"] || "");

  // Column C: MW4etd - Rating
  const rating = parseFloat(shop["MW4etd"] || 0) || 0;

  // Column D: UY7F9 - Review count (e.g., "(158)")
  const reviewCountStr = shop["UY7F9"] || "";
  const reviewCount =
    Math.abs(parseInt(reviewCountStr.replace(/\D/g, ""), 10)) || 0;

  // Column E: W4Efsd - Shop type (e.g., "Goldsmith", "Jewelry store")
  const shopType = shop["W4Efsd"] || "";

  // Column F: W4Efsd 2 - Opening status (e.g., "Closed", "Open 24 hours")
  const openingStatus = shop["W4Efsd 2"] || "";

  // Column G: W4Efsd 3 - Opening hours detail (e.g., "· Opens 9 am")
  const openingHoursDetail = shop["W4Efsd 3"] || "";

  // Combine opening hours
  const openingHours =
    [openingStatus, openingHoursDetail].filter(Boolean).join(" ").trim() ||
    null;

  // Column H: W4Efsd 4 - Plus Code (e.g., "3MR9+23M")
  const plusCode = shop["W4Efsd 4"] || "";

  // Column I: UsdlK - Phone number
  const phone = (shop["UsdlK"] || "").trim() || null;

  // If no coordinates yet, try geocoding with shop name + region
  if ((!lat || !lng) && shopName) {
    console.log(`   🗺️  Geocoding: ${shopName.substring(0, 50)}...`);
    const coords = await geocodeAddress(shopName);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      console.log(`   ✅ Found coordinates: ${lat}, ${lng}`);
    } else {
      console.log(`   ⚠️  Could not geocode`);
    }
  }

  // Detect region - prioritize coordinates, then text
  const region = detectRegion(lat, lng, "", shopName);

  // Map services
  const services = mapShopTypeToServices(shopType);

  // Extract image URL from Column J (FQ2IWe src)
  const imageUrl = shop["FQ2IWe src"] || null;

  // Construct address from shop name and region
  const address = shopName || "Address not available";

  return {
    name: shopName,
    nameAr: shopName,
    region: region,
    lat: lat,
    lng: lng,
    address: address,
    addressAr: address,
    rating: rating,
    reviewCount: reviewCount,
    phone: phone,
    openingHours: openingHours,
    openingHoursAr: openingHours,
    services: services,
    certified: false,
    verified: false,
    imageUrl: imageUrl,
  };
}

// Main import function
async function importShops() {
  console.log(`📂 Reading file: ${CSV_PATH}\n`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
  const shops = parseCSV(fileContent);

  console.log(`📊 Found ${shops.length} shops to import\n`);
  console.log(
    `⚠️  Note: Geocoding may take time (1 second per shop for rate limiting)\n`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < shops.length; i++) {
    console.log(`\n[${i + 1}/${shops.length}] Processing shop...`);

    try {
      const shopData = await transformShopData(shops[i]);

      // Skip if no coordinates
      if (
        !shopData.lat ||
        !shopData.lng ||
        isNaN(shopData.lat) ||
        isNaN(shopData.lng)
      ) {
        console.log(`   ⚠️  Skipping: ${shopData.name} (no coordinates found)`);
        skipped++;
        continue;
      }

      // Check if shop exists
      const existing = await prisma.goldShop.findFirst({
        where: {
          OR: [
            { name: shopData.name, region: shopData.region },
            {
              lat: { gte: shopData.lat - 0.001, lte: shopData.lat + 0.001 },
              lng: { gte: shopData.lng - 0.001, lte: shopData.lng + 0.001 },
            },
          ],
        },
      });

      const imageUrl = shopData.imageUrl;
      delete shopData.imageUrl;

      if (existing) {
        await prisma.goldShop.update({
          where: { id: existing.id },
          data: { ...shopData, lastUpdated: new Date() },
        });

        // Add photo if provided
        if (imageUrl) {
          const existingPhoto = await prisma.shopPhoto.findFirst({
            where: { shopId: existing.id, url: imageUrl },
          });
          if (!existingPhoto) {
            await prisma.shopPhoto.create({
              data: { shopId: existing.id, url: imageUrl, thumbnail: imageUrl },
            });
          }
        }

        console.log(`   🔄 Updated: ${shopData.name} (${shopData.region})`);
        updated++;
      } else {
        const newShop = await prisma.goldShop.create({
          data: {
            ...shopData,
            lastUpdated: new Date(),
            photos: imageUrl
              ? {
                  create: { url: imageUrl, thumbnail: imageUrl },
                }
              : undefined,
          },
        });

        console.log(
          `   ✅ Created: ${shopData.name} (${shopData.region}) - ${shopData.rating}⭐`
        );
        created++;
      }

      // Rate limiting
      if (i < shops.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✨ Import complete!`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
}

// Run
if (require.main === module) {
  importShops()
    .then(() => {
      console.log("\n🎉 Import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Import failed:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { importShops, transformShopData };
