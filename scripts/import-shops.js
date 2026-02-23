#!/usr/bin/env node

/**
 * Bulk import shops from JSON/CSV file
 * Usage: node scripts/import-shops.js <file.json|file.csv>
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const prisma = new PrismaClient();

// CSV parsing helper - handles quoted fields
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const shops = [];

  // Skip header rows (first 3 rows appear to be headers/empty)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line handling quoted fields
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value

    if (
      values.length >= 10 &&
      values[0] &&
      values[0].includes("google.com/maps")
    ) {
      shops.push({
        url: values[0] || "",
        nameAr: values[1] || "",
        rating: values[2] || "",
        reviewCount: values[3] || "",
        type: values[4] || "",
        status: values[5] || "",
        openingHours: values[6] || "",
        plusCode: values[7] || "",
        phone: values[8] || "",
        imageUrl: values[9] || "",
      });
    }
  }

  return shops;
}

// Extract coordinates from Google Maps URL
function extractCoordinates(url) {
  if (!url) return { lat: null, lng: null };

  // Format: !3dLAT!4dLNG
  const latMatch = url.match(/!3d(-?\d+\.?\d*)/);
  const lngMatch = url.match(/!4d(-?\d+\.?\d*)/);

  const lat = latMatch ? parseFloat(latMatch[1]) : null;
  const lng = lngMatch ? parseFloat(lngMatch[1]) : null;

  return { lat, lng };
}

// Determine region based on coordinates (improved bounds)
function getRegionFromCoordinates(lat, lng) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return "SANAA";

  // SANAA: ~15.3, 44.2 (expanded bounds for better coverage)
  if (lat >= 14.8 && lat <= 15.8 && lng >= 43.8 && lng <= 44.5) {
    return "SANAA";
  }
  // ADEN: ~12.8, 45.0 (expanded bounds)
  if (lat >= 12.3 && lat <= 13.2 && lng >= 44.7 && lng <= 45.3) {
    return "ADEN";
  }
  // TAIZ: ~13.6, 44.0 (expanded bounds)
  if (lat >= 13.2 && lat <= 14.0 && lng >= 43.7 && lng <= 44.4) {
    return "TAIZ";
  }
  // HODEIDAH: ~14.8, 42.9 (expanded bounds)
  if (lat >= 14.3 && lat <= 15.2 && lng >= 42.5 && lng <= 43.3) {
    return "HODEIDAH";
  }

  // Default to SANAA if coordinates don't match known regions
  return "SANAA";
}

// Transform shop data to Prisma format
function transformShopData(shop) {
  // Handle both old format (with explicit fields) and new format (from CSV)
  if (shop.url) {
    // New CSV format with Google Maps URL
    const { lat, lng } = extractCoordinates(shop.url || "");
    const region = getRegionFromCoordinates(lat, lng);

    // Parse rating
    const rating = shop.rating ? parseFloat(shop.rating) : 0;

    // Parse review count (format: "(158)")
    let reviewCount = 0;
    if (shop.reviewCount) {
      const match = shop.reviewCount.match(/\((\d+)\)/);
      if (match) {
        reviewCount = parseInt(match[1]);
      }
    }

    // Build address from status and plus code
    const addressParts = [shop.status, shop.plusCode].filter(Boolean);
    const address = addressParts.join(", ") || "";

    // Clean opening hours (remove "· " prefix if present)
    const openingHours = shop.openingHours
      ? shop.openingHours.replace(/^·\s*/, "")
      : null;

    return {
      name: shop.nameAr || "Unknown Shop",
      nameAr: shop.nameAr || "",
      region: region,
      lat: lat || 0,
      lng: lng || 0,
      address: address,
      addressAr: address,
      phone: shop.phone || null,
      openingHours: openingHours,
      openingHoursAr: openingHours,
      rating: rating,
      reviewCount: reviewCount,
      services: ["buy_gold", "sell_gold"],
      certified: false,
      verified: false,
      website: shop.url || null,
    };
  } else {
    // Old format (JSON or standard CSV)
    return {
      name: shop.name || shop.Name,
      nameAr: shop.nameAr || shop.name_ar || shop["Name (Arabic)"],
      region: (shop.region || shop.Region || "SANAA").toUpperCase(),
      lat: parseFloat(shop.lat || shop.Lat || shop.latitude || 0),
      lng: parseFloat(shop.lng || shop.Lng || shop.longitude || 0),
      address: shop.address || shop.Address || "",
      addressAr: shop.addressAr || shop.address_ar || shop["Address (Arabic)"],
      phone: shop.phone || shop.Phone,
      email: shop.email || shop.Email,
      website: shop.website || shop.Website,
      openingHours:
        shop.openingHours || shop.opening_hours || shop["Opening Hours"],
      openingHoursAr:
        shop.openingHoursAr ||
        shop.opening_hours_ar ||
        shop["Opening Hours (Arabic)"],
      description: shop.description || shop.Description,
      descriptionAr:
        shop.descriptionAr ||
        shop.description_ar ||
        shop["Description (Arabic)"],
      priceMin:
        shop.priceMin || shop.price_min
          ? parseFloat(shop.priceMin || shop.price_min)
          : null,
      priceMax:
        shop.priceMax || shop.price_max
          ? parseFloat(shop.priceMax || shop.price_max)
          : null,
      services: shop.services
        ? Array.isArray(shop.services)
          ? shop.services
          : shop.services.split(",").map((s) => s.trim())
        : [],
      certified:
        shop.certified === "true" ||
        shop.certified === true ||
        shop.Certified === "true",
      verified:
        shop.verified === "true" ||
        shop.verified === true ||
        shop.Verified === "true",
      trustScore:
        shop.trustScore || shop.trust_score
          ? parseInt(shop.trustScore || shop.trust_score)
          : null,
    };
  }
}

async function importShops(filePath) {
  console.log(`📂 Reading file: ${filePath}`);

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  let shops;

  if (ext === ".json") {
    shops = JSON.parse(fileContent);
    if (!Array.isArray(shops)) {
      shops = [shops];
    }
  } else if (ext === ".csv") {
    shops = parseCSV(fileContent);
  } else {
    throw new Error("Unsupported file format. Use .json or .csv");
  }

  console.log(`📊 Found ${shops.length} shops to import\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < shops.length; i++) {
    const shopData = transformShopData(shops[i]);

    // Validation
    if (!shopData.name || !shopData.region || !shopData.lat || !shopData.lng) {
      console.error(
        `❌ Shop ${i + 1}: Missing required fields (name, region, lat, lng)`
      );
      errors++;
      continue;
    }

    try {
      // Check if exists
      const existing = await prisma.goldShop.findFirst({
        where: {
          name: shopData.name,
          region: shopData.region,
        },
      });

      if (existing) {
        // Update existing
        await prisma.goldShop.update({
          where: { id: existing.id },
          data: {
            ...shopData,
            lastUpdated: new Date(),
          },
        });
        console.log(`🔄 Updated: ${shopData.name} (${shopData.region})`);
        updated++;
      } else {
        // Create new
        await prisma.goldShop.create({
          data: {
            ...shopData,
            lastUpdated: new Date(),
          },
        });
        console.log(`✅ Created: ${shopData.name} (${shopData.region})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error importing ${shopData.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n✨ Import complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
}

// Main
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: node scripts/import-shops.js <file.json|file.csv>");
    console.error("\nExample CSV format:");
    console.error("name,region,lat,lng,address,phone");
    console.error("Shop Name,SANAA,15.3694,44.191,Address,+967 1 234 567");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  importShops(filePath)
    .then(() => {
      console.log("🎉 Import completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Import failed:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { importShops, transformShopData };
