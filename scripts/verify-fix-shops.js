#!/usr/bin/env node

/**
 * Verify and Fix Shop Region Assignments
 *
 * This script:
 * 1. Checks actual shop counts by region in the database
 * 2. Reviews and improves region detection logic (prioritizes coordinates over text)
 * 3. Verifies and fixes incorrect region assignments
 *
 * Usage: node scripts/verify-fix-shops.js [--fix]
 *   --fix: Actually update the database (default: dry-run mode)
 */

const { PrismaClient, YemenRegion } = require("@prisma/client");
const prisma = new PrismaClient();

// Improved region detection - prioritizes coordinates over text
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

// Detect region from text (fallback method)
function detectRegionFromText(address, shopName) {
  const text = `${address || ""} ${shopName || ""}`.toLowerCase();

  // Check for Aden first (most common)
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

  return null;
}

// Improved region detection - prioritizes coordinates
function detectRegion(lat, lng, address, shopName) {
  // First, try coordinates (most accurate)
  const regionFromCoords = getRegionFromCoordinates(lat, lng);
  if (regionFromCoords) {
    return regionFromCoords;
  }

  // Fallback to text detection
  const regionFromText = detectRegionFromText(address, shopName);
  if (regionFromText) {
    return regionFromText;
  }

  // Last resort: default to SANAA (but log warning)
  console.warn(
    `⚠️  Could not determine region for shop: ${shopName} (${lat}, ${lng})`
  );
  return YemenRegion.SANAA;
}

// Check shop counts by region
async function checkShopCounts() {
  console.log("\n📊 Current Shop Counts by Region:\n");
  console.log("=".repeat(50));

  const regions = [
    YemenRegion.SANAA,
    YemenRegion.ADEN,
    YemenRegion.TAIZ,
    YemenRegion.HODEIDAH,
  ];

  const counts = {};
  let total = 0;

  for (const region of regions) {
    const count = await prisma.goldShop.count({
      where: { region },
    });
    counts[region] = count;
    total += count;
    console.log(
      `  ${region.padEnd(10)}: ${count.toString().padStart(4)} shops`
    );
  }

  console.log("=".repeat(50));
  console.log(`  TOTAL     : ${total.toString().padStart(4)} shops\n`);

  return counts;
}

// Verify and fix region assignments
async function verifyAndFixRegions(fix = false) {
  console.log(
    `\n🔍 Verifying shop region assignments${
      fix ? " (FIX MODE)" : " (DRY-RUN)"
    }...\n`
  );

  const allShops = await prisma.goldShop.findMany({
    select: {
      id: true,
      name: true,
      nameAr: true,
      region: true,
      lat: true,
      lng: true,
      address: true,
      addressAr: true,
    },
  });

  console.log(`Found ${allShops.length} shops to verify\n`);

  const issues = [];
  const fixes = [];

  for (const shop of allShops) {
    const correctRegion = detectRegion(
      shop.lat,
      shop.lng,
      shop.address || shop.addressAr || "",
      shop.name || shop.nameAr || ""
    );

    if (correctRegion !== shop.region) {
      issues.push({
        shop,
        currentRegion: shop.region,
        correctRegion,
      });

      if (fix) {
        fixes.push({
          id: shop.id,
          name: shop.name || shop.nameAr,
          from: shop.region,
          to: correctRegion,
        });
      }
    }
  }

  // Report issues
  if (issues.length === 0) {
    console.log("✅ All shops have correct region assignments!\n");
    return { issues: [], fixes: [] };
  }

  console.log(
    `⚠️  Found ${issues.length} shops with incorrect region assignments:\n`
  );

  // Group by current region
  const byCurrentRegion = {};
  for (const issue of issues) {
    const region = issue.currentRegion;
    if (!byCurrentRegion[region]) {
      byCurrentRegion[region] = [];
    }
    byCurrentRegion[region].push(issue);
  }

  // Show summary by region
  console.log("Summary by Current Region:");
  console.log("=".repeat(50));
  for (const [region, regionIssues] of Object.entries(byCurrentRegion)) {
    const toRegions = {};
    for (const issue of regionIssues) {
      const to = issue.correctRegion;
      toRegions[to] = (toRegions[to] || 0) + 1;
    }
    console.log(`\n  ${region}: ${regionIssues.length} incorrect assignments`);
    for (const [toRegion, count] of Object.entries(toRegions)) {
      console.log(`    → Should be ${toRegion}: ${count} shops`);
    }
  }

  // Show detailed list (first 20)
  console.log("\n\nDetailed List (first 20):");
  console.log("=".repeat(80));
  for (let i = 0; i < Math.min(20, issues.length); i++) {
    const issue = issues[i];
    const shop = issue.shop;
    console.log(`\n${i + 1}. ${shop.name || shop.nameAr || "Unnamed"}`);
    console.log(
      `   Current: ${issue.currentRegion} → Should be: ${issue.correctRegion}`
    );
    console.log(`   Location: (${shop.lat}, ${shop.lng})`);
    console.log(`   Address: ${shop.address || shop.addressAr || "N/A"}`);
  }

  if (issues.length > 20) {
    console.log(`\n... and ${issues.length - 20} more issues`);
  }

  // Apply fixes if requested
  if (fix && fixes.length > 0) {
    console.log(`\n\n🔧 Applying fixes to ${fixes.length} shops...\n`);

    let updated = 0;
    let errors = 0;

    for (const fixItem of fixes) {
      try {
        await prisma.goldShop.update({
          where: { id: fixItem.id },
          data: { region: fixItem.to },
        });
        console.log(
          `  ✅ Fixed: "${fixItem.name}" (${fixItem.from} → ${fixItem.to})`
        );
        updated++;
      } catch (error) {
        console.error(`  ❌ Error fixing "${fixItem.name}": ${error.message}`);
        errors++;
      }
    }

    console.log(`\n✨ Fix complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}\n`);
  } else if (!fix) {
    console.log(
      `\n💡 Run with --fix flag to apply these corrections to the database\n`
    );
  }

  return { issues, fixes };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");

  try {
    // 1. Check current shop counts
    await checkShopCounts();

    // 2. Verify and fix region assignments
    const { issues, fixes } = await verifyAndFixRegions(fix);

    // 3. Show updated counts if fixes were applied
    if (fix && fixes.length > 0) {
      console.log("\n📊 Updated Shop Counts:\n");
      await checkShopCounts();
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    if (issues.length === 0) {
      console.log("✅ All regions are correctly assigned!");
    } else if (fix) {
      console.log(`✅ Fixed ${fixes.length} incorrect region assignments`);
    } else {
      console.log(`⚠️  Found ${issues.length} issues (run with --fix to fix)`);
    }
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkShopCounts,
  verifyAndFixRegions,
  detectRegion,
  getRegionFromCoordinates,
  detectRegionFromText,
};

